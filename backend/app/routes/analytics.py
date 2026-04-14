from typing import List
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task, User
from app.auth import get_current_user
from app.schemas import AnalyticsResponse, DayStats

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
def get_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_tasks = db.query(Task).filter(Task.assignee_id == current_user.id).all()

    now = datetime.now(timezone.utc)
    daily_stats: List[DayStats] = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        day_tasks = [t for t in all_tasks if t.date_assigned == day or (t.completed_at and t.completed_at.strftime("%Y-%m-%d") == day)]
        completed = [t for t in day_tasks if t.status == "done" or (t.completed_at and t.completed_at.strftime("%Y-%m-%d") == day)]
        daily_stats.append(DayStats(
            date=day,
            hours_allocated=sum(t.allocated_hours for t in day_tasks),
            hours_spent=sum(t.hours_spent for t in day_tasks),
            tasks_completed=len(completed),
            tasks_total=len(day_tasks),
        ))

    total_completed = len([t for t in all_tasks if t.status == "done"])
    total_tasks = len(all_tasks)
    completion_rate = (total_completed / total_tasks * 100) if total_tasks > 0 else 0.0

    priority_breakdown = {}
    for t in all_tasks:
        p = t.priority if isinstance(t.priority, str) else t.priority.value
        priority_breakdown[p] = priority_breakdown.get(p, 0) + 1

    avg_hours = sum(s.hours_spent for s in daily_stats) / max(len(daily_stats), 1)

    return AnalyticsResponse(
        daily_stats=daily_stats,
        total_completed=total_completed,
        total_tasks=total_tasks,
        completion_rate=round(completion_rate, 1),
        avg_hours_per_day=round(avg_hours, 1),
        priority_breakdown=priority_breakdown,
    )
