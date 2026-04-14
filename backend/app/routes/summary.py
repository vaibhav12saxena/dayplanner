from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import Task, TaskStatus, User
from app.auth import get_current_user
from app.schemas import DailySummaryResponse, TaskResponse

router = APIRouter(prefix="/api/summary", tags=["summary"])


@router.get("/{date}", response_model=DailySummaryResponse)
def get_daily_summary(date: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get summary of tasks completed on a given date (YYYY-MM-DD)."""
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        target_date = datetime.now(timezone.utc) - timedelta(days=1)
        target_date = target_date.replace(hour=0, minute=0, second=0, microsecond=0)

    start = target_date
    end = target_date + timedelta(days=1)

    completed_tasks = (
        db.query(Task)
        .options(joinedload(Task.assignee), joinedload(Task.creator))
        .filter(
            Task.assignee_id == current_user.id,
            Task.status == TaskStatus.done,
            Task.completed_at >= start,
            Task.completed_at < end,
        )
        .order_by(Task.completed_at.desc())
        .all()
    )

    total_hours_spent = sum(t.hours_spent for t in completed_tasks)
    total_hours_allocated = sum(t.allocated_hours for t in completed_tasks)

    return DailySummaryResponse(
        date=date,
        tasks_completed=[TaskResponse.model_validate(t) for t in completed_tasks],
        total_hours_spent=total_hours_spent,
        total_hours_allocated=total_hours_allocated,
    )
