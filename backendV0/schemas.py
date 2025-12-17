from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class TokenData(BaseModel):
    user_id: int
    role: str


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = Field(default="client", pattern="^(client|doctor|trainer|nutritionist|supporter)$")


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserRead(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

    class Config:
        from_attributes = True


class InviteCodeGenerate(BaseModel):
    expires_in_hours: int = Field(default=24, ge=1, le=168)  # 1 hour to 7 days


class InviteCodeRead(BaseModel):
    invite_code: str
    expires_at: datetime


class ConnectRequest(BaseModel):
    invite_code: str = Field(min_length=1)


class AssignmentCreate(BaseModel):
    client_id: int
    professional_id: int


class AssignmentRead(BaseModel):
    id: int
    client_id: int
    professional_id: int

    class Config:
        from_attributes = True


class MetricCreate(BaseModel):
    metric_type: str
    value: float
    unit: Optional[str] = ""
    recorded_at: Optional[datetime] = None


class MetricRead(MetricCreate):
    id: int
    user_id: int
    recorded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_completed: bool = False
    due_date: Optional[datetime] = None


class TaskRead(TaskCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class GoalCreate(BaseModel):
    title: str
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    progress: float = 0.0
    status: str = "in-progress"
    deadline: Optional[datetime] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    progress: Optional[float] = None
    status: Optional[str] = None
    deadline: Optional[datetime] = None


class GoalRead(GoalCreate):
    id: int
    user_id: int
    created_by_name: Optional[str] = None  # Computed field - name of creator

    class Config:
        from_attributes = True


class GoalProgressLogCreate(BaseModel):
    value: float
    notes: Optional[str] = None


class GoalProgressLogRead(BaseModel):
    id: int
    goal_id: int
    value: float
    progress_percentage: float
    notes: Optional[str] = None
    logged_at: datetime

    class Config:
        from_attributes = True


class AppointmentCreate(BaseModel):
    professional_id: int
    scheduled_at: datetime
    mode: str = "video"
    notes: Optional[str] = None


class AppointmentRead(AppointmentCreate):
    id: int
    client_id: int
    status: str

    class Config:
        from_attributes = True



class ConversationCreate(BaseModel):
    participant_ids: List[int] = Field(min_length=1)


class MessageCreate(BaseModel):
    conversation_id: int
    content: str


class MessageRead(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    created_at: datetime
    sender_name: Optional[str] = None # Computed field

    class Config:
        from_attributes = True


class ConversationRead(BaseModel):
    id: int
    created_at: datetime
    other_participant_name: Optional[str] = None # Computed field - for 1:1 backwards compat
    participant_names: Optional[List[str]] = None # Computed field - for group chats
    participant_count: int = 0 # Computed field - total number of participants
    is_group: bool = False # Computed field - whether this is a group conversation
    last_message: Optional[str] = None # Computed field - preview of last message
    last_message_at: Optional[datetime] = None # Computed field - timestamp of last message
    unread_count: int = 0 # Computed field - number of unread messages

    class Config:
        from_attributes = True


class TypingStatus(BaseModel):
    user_id: int
    user_name: str
    is_typing: bool


class NotificationRead(BaseModel):
    id: int
    title: str
    body: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NoteCreate(BaseModel):
    client_id: int
    content: str = Field(min_length=1)


class NoteRead(BaseModel):
    id: int
    client_id: int
    professional_id: int
    content: str
    created_at: datetime
    updated_at: datetime
    professional_name: Optional[str] = None  # Computed field

    class Config:
        from_attributes = True


class ProfessionalStatsRead(BaseModel):
    total_clients: int
    appointments_this_week: int
    upcoming_appointments: int
    total_notes: int


class PlanCreate(BaseModel):
    client_id: int
    plan_type: str = Field(pattern="^(diet|workout)$")
    title: str = Field(min_length=1)
    description: Optional[str] = None
    content: str = Field(min_length=1)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str = Field(default="active", pattern="^(active|completed|archived)$")


class PlanRead(BaseModel):
    id: int
    client_id: int
    professional_id: int
    plan_type: str
    title: str
    description: Optional[str]
    content: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    status: str
    created_at: datetime
    updated_at: datetime
    professional_name: Optional[str] = None

    class Config:
        from_attributes = True


class PlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = Field(None, pattern="^(active|completed|archived)$")


class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    mode: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(scheduled|completed|cancelled)$")


class NotificationUpdate(BaseModel):
    is_read: bool
