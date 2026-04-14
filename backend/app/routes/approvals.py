from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from app.database import get_db
from app.models import ApprovalRequest, ApprovalStatus, Task, TaskStatus, User, Notification
from app.auth import get_current_user
from app.schemas import ApprovalCreate, ApprovalResolve, ApprovalResponse

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


def _approval_query(db: Session):
    return db.query(ApprovalRequest).options(
        joinedload(ApprovalRequest.task).joinedload(Task.assignee),
        joinedload(ApprovalRequest.task).joinedload(Task.creator),
        joinedload(ApprovalRequest.requested_by),
    )


def _notify(db: Session, user_id: int, title: str, message: str, link: Optional[str] = None):
    notif = Notification(user_id=user_id, title=title, message=message, link=link)
    db.add(notif)


@router.get("", response_model=List[ApprovalResponse])
def list_approvals(
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(ApprovalRequest)
        .join(Task, ApprovalRequest.task_id == Task.id)
        .options(
            joinedload(ApprovalRequest.task).joinedload(Task.assignee),
            joinedload(ApprovalRequest.task).joinedload(Task.creator),
            joinedload(ApprovalRequest.requested_by),
        )
        .filter(
            (Task.assignee_id == current_user.id)
            | (ApprovalRequest.requested_by_id == current_user.id)
        )
    )
    if status:
        query = query.filter(ApprovalRequest.status == status)
    return query.order_by(ApprovalRequest.requested_at.desc()).all()


@router.post("", response_model=ApprovalResponse)
def create_approval(data: ApprovalCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if data.requested_target not in ("today", "tomorrow"):
        raise HTTPException(status_code=400, detail="Target must be 'today' or 'tomorrow'")

    approval = ApprovalRequest(
        task_id=data.task_id,
        requested_target=data.requested_target,
        note=data.note,
        requested_by_id=current_user.id,
    )
    db.add(approval)
    db.flush()

    if task.assignee_id and task.assignee_id != current_user.id:
        _notify(
            db, task.assignee_id,
            "New approval request",
            f'{current_user.username} requests "{task.title}" be moved to {data.requested_target}.',
            link="/approvals",
        )

    db.commit()
    return _approval_query(db).filter(ApprovalRequest.id == approval.id).first()


@router.post("/{approval_id}/resolve", response_model=ApprovalResponse)
def resolve_approval(
    approval_id: int,
    data: ApprovalResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    approval = _approval_query(db).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval.status != ApprovalStatus.pending:
        raise HTTPException(status_code=400, detail="Approval already resolved")

    if data.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    approval.status = ApprovalStatus(data.status)
    approval.resolved_at = datetime.now(timezone.utc)

    if data.delivery_date:
        approval.delivery_date = data.delivery_date

    if data.status == "approved":
        task = approval.task
        if task:
            task.status = TaskStatus(approval.requested_target)
            task.updated_at = datetime.now(timezone.utc)
            task.date_assigned = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            if data.delivery_date:
                task.delivery_date = data.delivery_date
            if data.due_date:
                task.due_date = data.due_date

        if approval.requested_by_id and approval.requested_by_id != current_user.id:
            delivery_msg = f" Estimated delivery: {data.delivery_date}." if data.delivery_date else ""
            due_msg = f" Expected by: {data.due_date}." if data.due_date and data.due_date != (task.due_date if task else None) else ""
            _notify(
                db, approval.requested_by_id,
                "Task approved",
                f'"{task.title}" has been approved and moved to {approval.requested_target}.{delivery_msg}{due_msg}',
                link="/",
            )
    else:
        if approval.requested_by_id and approval.requested_by_id != current_user.id:
            _notify(
                db, approval.requested_by_id,
                "Task rejected",
                f'Your request to move "{approval.task.title}" to {approval.requested_target} was rejected.',
                link="/backlog",
            )

    db.commit()
    return _approval_query(db).filter(ApprovalRequest.id == approval.id).first()
