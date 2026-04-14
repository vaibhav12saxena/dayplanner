from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from app.database import get_db
from app.models import Task, TaskStatus, TaskPriority, PRIORITY_ORDER, User, Notification, Comment, Tag, TaskTag, TaskDependency
from app.auth import get_current_user
from app.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, MoveRequest, MoveResponse, OverflowInfo,
    CommentCreate, CommentResponse, TagCreate, TagResponse,
    DependencyUpdate, ReorderRequest,
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _task_query(db: Session):
    return db.query(Task).options(joinedload(Task.assignee), joinedload(Task.creator))


def _get_day_total_hours(db: Session, user_id: int, day_status: str) -> float:
    tasks = db.query(Task).filter(Task.assignee_id == user_id, Task.status == day_status).all()
    return sum(t.allocated_hours for t in tasks)


def _find_lowest_priority_task(db: Session, user_id: int, day_status: str, exclude_id: int) -> Optional[Task]:
    tasks = (
        db.query(Task)
        .filter(Task.assignee_id == user_id, Task.status == day_status, Task.id != exclude_id)
        .all()
    )
    if not tasks:
        return None
    return max(tasks, key=lambda t: PRIORITY_ORDER.get(TaskPriority(t.priority), 99))


def _notify(db: Session, user_id: int, title: str, message: str, link: Optional[str] = None):
    notif = Notification(user_id=user_id, title=title, message=message, link=link)
    db.add(notif)


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    status: Optional[str] = Query(default=None),
    view: Optional[str] = Query(default="my", description="my=assigned to me, created=I created, all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = _task_query(db)

    if view == "created":
        query = query.filter(Task.creator_id == current_user.id)
    elif view == "all":
        pass
    else:
        query = query.filter(Task.assignee_id == current_user.id)

    if status:
        query = query.filter(Task.status == status)
    return query.order_by(Task.sort_order.asc(), Task.created_at.desc()).all()


@router.get("/user/{user_id}", response_model=List[TaskResponse])
def list_user_tasks(
    user_id: int,
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """View another user's tasks (for team view)."""
    query = _task_query(db).filter(Task.assignee_id == user_id)
    if status:
        query = query.filter(Task.status == status)
    return query.order_by(Task.created_at.desc()).all()


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = _task_query(db).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("", response_model=TaskResponse)
def create_task(data: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assignee_id = data.assignee_id if data.assignee_id else current_user.id
    is_self = assignee_id == current_user.id

    if not is_self and not data.due_date:
        raise HTTPException(status_code=400, detail="Due date is required when assigning to others")

    target_status = TaskStatus(data.status) if is_self else TaskStatus.backlog

    if is_self and target_status in (TaskStatus.today, TaskStatus.tomorrow):
        current_total = _get_day_total_hours(db, current_user.id, target_status.value)
        new_total = current_total + data.allocated_hours
        if new_total > current_user.daily_work_hours:
            lowest = _find_lowest_priority_task(db, current_user.id, target_status.value, -1)
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "overflow",
                    "overflow": OverflowInfo(
                        current_total_hours=new_total,
                        daily_limit=current_user.daily_work_hours,
                        overflow_task_id=lowest.id if lowest else None,
                        overflow_task_title=lowest.title if lowest else None,
                        message=f"Adding this task ({data.allocated_hours}h) exceeds your {current_user.daily_work_hours}h daily limit ({new_total}h total).",
                    ).model_dump(),
                },
            )

    task = Task(
        title=data.title,
        description=data.description,
        status=target_status,
        priority=data.priority,
        allocated_hours=data.allocated_hours,
        project=data.project,
        creator_id=current_user.id,
        assignee_id=assignee_id,
        due_date=data.due_date if data.due_date else None,
    )
    if target_status in (TaskStatus.today, TaskStatus.tomorrow):
        task.date_assigned = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    db.add(task)
    db.flush()

    if data.tag_ids:
        for tid in data.tag_ids:
            db.execute(TaskTag.__table__.insert().values(task_id=task.id, tag_id=tid))

    if not is_self:
        due_msg = f" Expected by: {data.due_date}." if data.due_date else ""
        _notify(
            db, assignee_id,
            "New task assigned to you",
            f'"{data.title}" was assigned to you by {current_user.full_name or current_user.username}.{due_msg}',
            link="/backlog",
        )

    db.commit()
    db.refresh(task)
    return _task_query(db).filter(Task.id == task.id).first()


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, data: TaskUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_priority = task.priority
    old_due_date = task.due_date
    update_data = data.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)
    for key, value in update_data.items():
        setattr(task, key, value)

    task.updated_at = datetime.now(timezone.utc)

    if tag_ids is not None:
        db.execute(TaskTag.__table__.delete().where(TaskTag.task_id == task.id))
        for tid in tag_ids:
            db.execute(TaskTag.__table__.insert().values(task_id=task.id, tag_id=tid))

    if data.priority and data.priority != old_priority and task.creator_id and task.creator_id != current_user.id:
        _notify(
            db, task.creator_id,
            "Task priority changed",
            f'"{task.title}" priority changed from {old_priority} to {data.priority} by {current_user.username}.',
            link="/backlog",
        )

    if data.due_date and data.due_date != old_due_date and task.creator_id and task.creator_id != current_user.id:
        _notify(
            db, task.creator_id,
            "Expected date changed",
            f'"{task.title}" expected date changed to {data.due_date} by {current_user.username}.',
            link="/assigned",
        )

    db.commit()
    db.refresh(task)
    return _task_query(db).filter(Task.id == task.id).first()


@router.delete("/{task_id}")
def delete_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}


@router.post("/{task_id}/move", response_model=MoveResponse)
def move_task(task_id: int, data: MoveRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    valid_targets = {"today", "tomorrow", "backlog", "in_progress", "done"}
    if data.target not in valid_targets:
        raise HTTPException(status_code=400, detail=f"Invalid target: {data.target}")

    overflow_info = None

    if data.target in ("today", "tomorrow"):
        current_total = _get_day_total_hours(db, current_user.id, data.target)
        new_total = current_total + task.allocated_hours

        if new_total > current_user.daily_work_hours and not data.force:
            lowest = _find_lowest_priority_task(db, current_user.id, data.target, task.id)
            overflow_info = OverflowInfo(
                current_total_hours=new_total,
                daily_limit=current_user.daily_work_hours,
                overflow_task_id=lowest.id if lowest else None,
                overflow_task_title=lowest.title if lowest else None,
                message=f"Adding this task exceeds your {current_user.daily_work_hours}h daily limit ({new_total}h total). "
                        + (f'Lowest priority task "{lowest.title}" will be pushed.' if lowest else "No task to push."),
            )
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "overflow",
                    "overflow": overflow_info.model_dump(),
                },
            )

        if new_total > current_user.daily_work_hours and data.force:
            lowest = _find_lowest_priority_task(db, current_user.id, data.target, task.id)
            if lowest:
                bump_target = "tomorrow" if data.target == "today" else "backlog"
                old_status = lowest.status
                lowest.status = TaskStatus(bump_target)
                lowest.updated_at = datetime.now(timezone.utc)

                if lowest.creator_id and lowest.creator_id != current_user.id:
                    _notify(
                        db, lowest.creator_id,
                        "Task deprioritized",
                        f'"{lowest.title}" was moved from {old_status} to {bump_target} due to capacity overflow. '
                        f'New estimated delivery: {lowest.delivery_date or "TBD"}.',
                        link=f"/backlog",
                    )

                overflow_info = OverflowInfo(
                    current_total_hours=new_total,
                    daily_limit=current_user.daily_work_hours,
                    overflow_task_id=lowest.id,
                    overflow_task_title=lowest.title,
                    message=f'"{lowest.title}" was moved to {bump_target}.',
                )

    task.status = TaskStatus(data.target)
    task.updated_at = datetime.now(timezone.utc)

    if data.target == "done":
        task.completed_at = datetime.now(timezone.utc)
        if task.creator_id and task.creator_id != current_user.id:
            _notify(
                db, task.creator_id,
                "Task completed",
                f'"{task.title}" has been marked as done by {current_user.username}.',
                link=f"/yesterday",
            )

    if data.target in ("today", "tomorrow"):
        task.date_assigned = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if data.target in ("today", "tomorrow") and task.creator_id and task.creator_id != current_user.id:
        _notify(
            db, task.creator_id,
            "Task accepted",
            f'"{task.title}" was moved to {data.target} by {current_user.username}.',
            link="/assigned",
        )

    db.commit()
    db.refresh(task)
    task_resp = _task_query(db).filter(Task.id == task.id).first()
    return MoveResponse(task=TaskResponse.model_validate(task_resp), overflow=overflow_info)


# ── Comments ─────────────────────────────────────────────

@router.get("/{task_id}/comments", response_model=List[CommentResponse])
def list_comments(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Comment).options(joinedload(Comment.user)).filter(Comment.task_id == task_id).order_by(Comment.created_at.asc()).all()


@router.post("/{task_id}/comments", response_model=CommentResponse)
def add_comment(task_id: int, data: CommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = Comment(task_id=task_id, user_id=current_user.id, content=data.content)
    db.add(comment)
    db.flush()

    notify_ids = set()
    if task.creator_id and task.creator_id != current_user.id:
        notify_ids.add(task.creator_id)
    if task.assignee_id and task.assignee_id != current_user.id:
        notify_ids.add(task.assignee_id)
    for uid in notify_ids:
        _notify(db, uid, "New comment", f'{current_user.username} commented on "{task.title}": {data.content[:80]}', link="/backlog")

    db.commit()
    return db.query(Comment).options(joinedload(Comment.user)).filter(Comment.id == comment.id).first()


# ── Tags ─────────────────────────────────────────────────

@router.get("/meta/tags", response_model=List[TagResponse])
def list_tags(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Tag).order_by(Tag.name).all()


@router.post("/meta/tags", response_model=TagResponse)
def create_tag(data: TagCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Tag).filter(Tag.name == data.name).first()
    if existing:
        return existing
    tag = Tag(name=data.name, color=data.color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


# ── Search ────────────────────────────────────────────────

@router.get("/meta/search", response_model=List[TaskResponse])
def search_tasks(
    q: str = Query(min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = _task_query(db).filter(
        (Task.assignee_id == current_user.id) | (Task.creator_id == current_user.id)
    ).filter(
        Task.title.ilike(f"%{q}%") | Task.description.ilike(f"%{q}%") | Task.project.ilike(f"%{q}%")
    )
    return query.order_by(Task.updated_at.desc()).limit(30).all()


# ── Dependencies ─────────────────────────────────────────

@router.put("/{task_id}/dependencies", response_model=TaskResponse)
def update_dependencies(
    task_id: int,
    data: DependencyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_id in data.blocked_by_ids:
        raise HTTPException(status_code=400, detail="A task cannot block itself")

    db.execute(TaskDependency.__table__.delete().where(TaskDependency.task_id == task_id))
    for bid in data.blocked_by_ids:
        blocker = db.query(Task).filter(Task.id == bid).first()
        if not blocker:
            raise HTTPException(status_code=400, detail=f"Task {bid} not found")
        db.execute(TaskDependency.__table__.insert().values(task_id=task_id, blocked_by_id=bid))

    db.commit()
    db.refresh(task)
    return _task_query(db).filter(Task.id == task.id).first()


# ── Reorder ──────────────────────────────────────────────

@router.post("/meta/reorder")
def reorder_tasks(
    data: ReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for idx, tid in enumerate(data.task_ids):
        task = db.query(Task).filter(Task.id == tid, Task.assignee_id == current_user.id).first()
        if task:
            task.sort_order = idx
    db.commit()
    return {"ok": True}
