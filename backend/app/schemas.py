from pydantic import BaseModel, field_validator
from datetime import datetime, date as date_type
from typing import Optional, List


# ── Auth ──────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    full_name: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    daily_work_hours: float
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    daily_work_hours: Optional[float] = None


class UserBrief(BaseModel):
    id: int
    username: str
    full_name: str

    model_config = {"from_attributes": True}


# ── Tags ──────────────────────────────────────────────────

class TagResponse(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}


class TagCreate(BaseModel):
    name: str
    color: str = "#6b7280"


# ── Comments ──────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    content: str
    created_at: datetime
    user: Optional[UserBrief] = None

    model_config = {"from_attributes": True}


# ── Task Brief (for dependencies) ─────────────────────────

class TaskBrief(BaseModel):
    id: int
    title: str
    status: str
    priority: str

    model_config = {"from_attributes": True}


# ── Tasks ─────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: str = "backlog"
    priority: str = "medium"
    allocated_hours: float = 1.0
    project: str = ""
    assignee_id: Optional[int] = None
    due_date: str = ""
    tag_ids: List[int] = []

    @field_validator("due_date")
    @classmethod
    def due_date_not_in_past(cls, v: str) -> str:
        if v:
            try:
                d = date_type.fromisoformat(v)
                if d < date_type.today():
                    raise ValueError("Due date cannot be in the past")
            except ValueError as e:
                if "Due date" in str(e):
                    raise
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    allocated_hours: Optional[float] = None
    hours_spent: Optional[float] = None
    project: Optional[str] = None
    due_date: Optional[str] = None
    tag_ids: Optional[List[int]] = None

    @field_validator("due_date")
    @classmethod
    def due_date_not_in_past(cls, v: Optional[str]) -> Optional[str]:
        if v:
            try:
                d = date_type.fromisoformat(v)
                if d < date_type.today():
                    raise ValueError("Due date cannot be in the past")
            except ValueError as e:
                if "Due date" in str(e):
                    raise
        return v


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    status: str
    priority: str
    allocated_hours: float
    hours_spent: float
    project: str
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    date_assigned: Optional[str] = None
    delivery_date: Optional[str] = None
    due_date: Optional[str] = None
    assignee_id: Optional[int] = None
    creator_id: Optional[int] = None
    sort_order: int = 0
    assignee: Optional[UserBrief] = None
    creator: Optional[UserBrief] = None
    tags: List[TagResponse] = []
    blocked_by: List[TaskBrief] = []

    model_config = {"from_attributes": True}


class MoveRequest(BaseModel):
    target: str
    force: bool = False


class OverflowInfo(BaseModel):
    current_total_hours: float
    daily_limit: float
    overflow_task_id: Optional[int] = None
    overflow_task_title: Optional[str] = None
    message: str


class MoveResponse(BaseModel):
    task: TaskResponse
    overflow: Optional[OverflowInfo] = None


# ── Approvals ─────────────────────────────────────────────

class ApprovalCreate(BaseModel):
    task_id: int
    requested_target: str
    note: str = ""


class ApprovalResolve(BaseModel):
    status: str
    delivery_date: Optional[str] = None
    due_date: Optional[str] = None


class ApprovalResponse(BaseModel):
    id: int
    task_id: int
    requested_target: str
    status: str
    note: str
    delivery_date: Optional[str] = None
    requested_by: Optional[UserBrief] = None
    requested_at: datetime
    resolved_at: Optional[datetime] = None
    task: Optional[TaskResponse] = None

    model_config = {"from_attributes": True}


# ── Notifications ─────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Recurring ─────────────────────────────────────────────

class RecurringRuleCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"
    allocated_hours: float = 1.0
    project: str = ""
    frequency: str  # daily, weekly_mon, weekly_tue, ...


class RecurringRuleResponse(BaseModel):
    id: int
    title: str
    description: str
    priority: str
    allocated_hours: float
    project: str
    frequency: str
    is_active: bool
    last_generated: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dependencies ──────────────────────────────────────────

class DependencyUpdate(BaseModel):
    blocked_by_ids: List[int]


# ── Reorder ───────────────────────────────────────────────

class ReorderRequest(BaseModel):
    task_ids: List[int]


# ── Summary ───────────────────────────────────────────────

class DailySummaryResponse(BaseModel):
    date: str
    tasks_completed: List[TaskResponse]
    total_hours_spent: float
    total_hours_allocated: float


# ── Analytics ─────────────────────────────────────────────

class DayStats(BaseModel):
    date: str
    hours_allocated: float
    hours_spent: float
    tasks_completed: int
    tasks_total: int


class AnalyticsResponse(BaseModel):
    daily_stats: List[DayStats]
    total_completed: int
    total_tasks: int
    completion_rate: float
    avg_hours_per_day: float
    priority_breakdown: dict
