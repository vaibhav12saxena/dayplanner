from typing import List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RecurringRule, Task, TaskStatus, User
from app.auth import get_current_user
from app.schemas import RecurringRuleCreate, RecurringRuleResponse

router = APIRouter(prefix="/api/recurring", tags=["recurring"])

WEEKDAY_MAP = {
    "weekly_mon": 0, "weekly_tue": 1, "weekly_wed": 2,
    "weekly_thu": 3, "weekly_fri": 4, "weekly_sat": 5, "weekly_sun": 6,
}


@router.get("", response_model=List[RecurringRuleResponse])
def list_rules(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(RecurringRule).filter(RecurringRule.owner_id == current_user.id).order_by(RecurringRule.created_at.desc()).all()


@router.post("", response_model=RecurringRuleResponse)
def create_rule(data: RecurringRuleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    valid = {"daily"} | set(WEEKDAY_MAP.keys())
    if data.frequency not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid frequency. Must be one of: {', '.join(sorted(valid))}")

    rule = RecurringRule(
        title=data.title,
        description=data.description,
        priority=data.priority,
        allocated_hours=data.allocated_hours,
        project=data.project,
        owner_id=current_user.id,
        frequency=data.frequency,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{rule_id}")
def delete_rule(rule_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rule = db.query(RecurringRule).filter(RecurringRule.id == rule_id, RecurringRule.owner_id == current_user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"ok": True}


@router.patch("/{rule_id}/toggle", response_model=RecurringRuleResponse)
def toggle_rule(rule_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rule = db.query(RecurringRule).filter(RecurringRule.id == rule_id, RecurringRule.owner_id == current_user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.is_active = not rule.is_active
    db.commit()
    db.refresh(rule)
    return rule


@router.post("/generate")
def generate_recurring_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate tasks for today from active recurring rules."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    weekday = datetime.now(timezone.utc).weekday()

    rules = db.query(RecurringRule).filter(
        RecurringRule.owner_id == current_user.id,
        RecurringRule.is_active == True,
    ).all()

    created = 0
    for rule in rules:
        if rule.last_generated == today:
            continue

        should_generate = False
        if rule.frequency == "daily":
            should_generate = True
        elif rule.frequency in WEEKDAY_MAP:
            should_generate = WEEKDAY_MAP[rule.frequency] == weekday

        if should_generate:
            task = Task(
                title=rule.title,
                description=rule.description,
                status=TaskStatus.today,
                priority=rule.priority,
                allocated_hours=rule.allocated_hours,
                project=rule.project,
                creator_id=current_user.id,
                assignee_id=current_user.id,
                date_assigned=today,
            )
            db.add(task)
            rule.last_generated = today
            created += 1

    db.commit()
    return {"created": created}
