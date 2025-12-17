from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
import secrets

from ..database import get_session
from ..deps import get_current_user
from ..models import Assignment, User, Metric, Goal, Task, Note, Appointment
from ..schemas import (
    UserRead, 
    AssignmentCreate, 
    AssignmentRead, 
    MetricRead, 
    GoalRead, 
    TaskRead,
    NoteCreate,
    NoteRead,
    ProfessionalStatsRead,
    InviteCodeGenerate,
    InviteCodeRead,
    ConnectRequest
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/professionals", response_model=list[UserRead])
async def list_professionals(
    assigned_only: bool = Query(False, description="Filter to only assigned professionals"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if assigned_only and current_user.role == "client":
        # Return only professionals assigned to this client
        result = await session.execute(
            select(User)
            .join(Assignment, Assignment.professional_id == User.id)
            .where(Assignment.client_id == current_user.id)
            .order_by(User.created_at.desc())
        )
        return result.scalars().all()
    
    # Return all professionals
    result = await session.execute(
        select(User).where(User.role != "client").order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.get("/clients", response_model=list[UserRead])
async def list_clients(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List clients assigned to the current professional."""
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can view clients",
        )

    # Return only assigned clients
    result = await session.execute(
        select(User)
        .join(Assignment, Assignment.client_id == User.id)
        .where(Assignment.professional_id == current_user.id)
        .order_by(User.full_name)
    )
    
    return result.scalars().all()


@router.get("/my-professionals", response_model=list[UserRead])
async def get_my_professionals(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get all professionals assigned to the current client."""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can access this endpoint",
        )

    result = await session.execute(
        select(User)
        .join(Assignment, Assignment.professional_id == User.id)
        .where(Assignment.client_id == current_user.id)
        .order_by(User.full_name)
    )
    return result.scalars().all()


@router.post("/invite-code", response_model=InviteCodeRead, status_code=status.HTTP_201_CREATED)
async def generate_invite_code(
    payload: InviteCodeGenerate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Generate an invite code for the current user.
    
    Only clients can generate invite codes to allow professionals to connect.
    The code expires after the specified hours (default 24 hours).
    """
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can generate invite codes",
        )
    
    # Generate unique 8-character code
    invite_code = secrets.token_urlsafe(6)  # Generates ~8 chars base64url
    expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.expires_in_hours)
    
    # Update user with new invite code
    current_user.invite_code = invite_code
    current_user.invite_code_expires_at = expires_at
    
    await session.commit()
    await session.refresh(current_user)
    
    return InviteCodeRead(
        invite_code=invite_code,
        expires_at=expires_at
    )


@router.post("/connect", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED)
async def connect_with_invite_code(
    payload: ConnectRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Connect to a client using their invite code.
    
    Only professionals can use this endpoint to connect to clients.
    The invite code must be valid and not expired.
    """
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can connect using invite codes",
        )
    
    # Find user with matching invite code
    result = await session.execute(
        select(User).where(User.invite_code == payload.invite_code)
    )
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite code",
        )
    
    # Check if code has expired
    if not client.invite_code_expires_at or client.invite_code_expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite code has expired",
        )
    
    # Verify target user is a client
    if client.role != "client":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite code is not from a client",
        )
    
    # Check if assignment already exists
    result = await session.execute(
        select(Assignment).where(
            Assignment.client_id == client.id,
            Assignment.professional_id == current_user.id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="You are already connected to this client",
        )
    
    # Create assignment
    new_assignment = Assignment(
        client_id=client.id,
        professional_id=current_user.id
    )
    session.add(new_assignment)
    
    # Clear the used invite code
    client.invite_code = None
    client.invite_code_expires_at = None
    
    await session.commit()
    await session.refresh(new_assignment)
    
    return AssignmentRead(
        id=new_assignment.id,
        client_id=new_assignment.client_id,
        professional_id=new_assignment.professional_id,
        created_at=new_assignment.created_at
    )


@router.post("/assignments", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    assignment: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create an assignment between a professional and a client.
    
    DEPRECATED: Use /connect endpoint with invite codes instead.
    This endpoint is kept for backward compatibility but will be removed.
    
    Only professionals can create assignments.
    Professionals can only assign themselves to clients.
    """
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can create assignments",
        )

    # Verify professional can only assign themselves
    if assignment.professional_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only assign yourself to clients",
        )

    # Verify client exists and is a client role
    result = await session.execute(
        select(User).where(User.id == assignment.client_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    if client.role != "client":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target user is not a client",
        )

    # Check if assignment already exists
    result = await session.execute(
        select(Assignment).where(
            Assignment.client_id == assignment.client_id,
            Assignment.professional_id == assignment.professional_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assignment already exists",
        )

    # Create assignment
    new_assignment = Assignment(
        client_id=assignment.client_id,
        professional_id=assignment.professional_id,
    )
    session.add(new_assignment)
    await session.commit()
    await session.refresh(new_assignment)
    
    return new_assignment


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete an assignment. Only the professional who created it can delete it."""
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can delete assignments",
        )

    # Get assignment
    result = await session.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    # Verify professional owns this assignment
    if assignment.professional_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own assignments",
        )

    await session.delete(assignment)
    await session.commit()
    return None


# Client data access for professionals

@router.get("/clients/{client_id}/metrics", response_model=list[MetricRead])
async def get_client_metrics(
    client_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get metrics for a specific client. Only assigned professionals can access."""
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can access client data",
        )
    
    # Verify assignment exists
    result = await session.execute(
        select(Assignment).where(
            Assignment.client_id == client_id,
            Assignment.professional_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this client",
        )
    
    # Get metrics
    result = await session.execute(
        select(Metric)
        .where(Metric.user_id == client_id)
        .order_by(Metric.recorded_at.desc())
    )
    return result.scalars().all()


@router.get("/clients/{client_id}/goals", response_model=list[GoalRead])
async def get_client_goals(
    client_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get all goals for a client. Accessible to the client and all assigned care team members."""
    
    # Check if requester is the client themselves or in their care team
    if current_user.id == client_id:
        # Client can view their own goals
        is_authorized = True
    elif current_user.role == "client":
        # Other clients cannot view goals
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own goals",
        )
    else:
        # Check if professional/supporter is assigned to this client
        result = await session.execute(
            select(Assignment).where(
                Assignment.client_id == client_id,
                Assignment.professional_id == current_user.id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this client",
            )
        is_authorized = True
    
    # Get ALL goals for this client (collaborative visibility)
    result = await session.execute(
        select(Goal)
        .where(Goal.user_id == client_id)
        .order_by(Goal.id.desc())
    )
    goals = result.scalars().all()
    
    # Enrich with creator names
    response = []
    for goal in goals:
        created_by_name = None
        if goal.created_by_id:
            result = await session.execute(
                select(User).where(User.id == goal.created_by_id)
            )
            creator = result.scalar_one_or_none()
            if creator:
                created_by_name = creator.full_name
        
        response.append(GoalRead(
            id=goal.id,
            user_id=goal.user_id,
            title=goal.title,
            target_value=goal.target_value,
            current_value=goal.current_value,
            unit=goal.unit,
            progress=goal.progress,
            status=goal.status,
            deadline=goal.deadline,
            created_by_name=created_by_name
        ))
    
    return response


@router.get("/clients/{client_id}/tasks", response_model=list[TaskRead])
async def get_client_tasks(
    client_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get tasks for a specific client. Only assigned professionals can access."""
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can access client data",
        )
    
    # Verify assignment exists
    result = await session.execute(
        select(Assignment).where(
            Assignment.client_id == client_id,
            Assignment.professional_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this client",
        )
    
    # Get tasks
    result = await session.execute(
        select(Task)
        .where(Task.user_id == client_id)
        .order_by(Task.created_at.desc())
    )
    return result.scalars().all()


# Notes system

@router.post("/clients/{client_id}/notes", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(
    client_id: int,
    note: NoteCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a note for a client. Only assigned professionals can create notes."""
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can create notes",
        )
    
    # Verify assignment exists
    result = await session.execute(
        select(Assignment).where(
            Assignment.client_id == client_id,
            Assignment.professional_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this client",
        )
    
    # Create note
    new_note = Note(
        client_id=client_id,
        professional_id=current_user.id,
        content=note.content
    )
    session.add(new_note)
    await session.commit()
    await session.refresh(new_note)
    
    # Add professional name
    return NoteRead(
        id=new_note.id,
        client_id=new_note.client_id,
        professional_id=new_note.professional_id,
        content=new_note.content,
        created_at=new_note.created_at,
        updated_at=new_note.updated_at,
        professional_name=current_user.full_name
    )


@router.get("/clients/{client_id}/notes", response_model=list[NoteRead])
async def get_client_notes(
    client_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get all notes for a client. Accessible to the client and all assigned care team members."""
    
    # Check if requester is the client themselves or in their care team
    if current_user.id == client_id:
        # Client can view their own notes
        is_authorized = True
    elif current_user.role == "client":
        # Other clients cannot view notes
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own notes",
        )
    else:
        # Check if professional/supporter is assigned to this client
        result = await session.execute(
            select(Assignment).where(
                Assignment.client_id == client_id,
                Assignment.professional_id == current_user.id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this client",
            )
        is_authorized = True
    
    # Get ALL notes for this client (collaborative visibility)
    result = await session.execute(
        select(Note)
        .where(Note.client_id == client_id)
        .order_by(Note.created_at.desc())
    )
    notes = result.scalars().all()
    
    # Enrich with professional names
    response = []
    for note in notes:
        result = await session.execute(
            select(User).where(User.id == note.professional_id)
        )
        professional = result.scalar_one()
        response.append(NoteRead(
            id=note.id,
            client_id=note.client_id,
            professional_id=note.professional_id,
            content=note.content,
            created_at=note.created_at,
            updated_at=note.updated_at,
            professional_name=professional.full_name
        ))
    
    return response


@router.get("/professional/stats", response_model=ProfessionalStatsRead)
async def get_professional_stats(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get statistics for the current professional."""
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can access this endpoint",
        )
    
    # Get total clients count
    result = await session.execute(
        select(func.count(Assignment.id)).where(
            Assignment.professional_id == current_user.id
        )
    )
    total_clients = result.scalar() or 0
    
    # Get appointments this week
    today = datetime.now()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)
    
    result = await session.execute(
        select(func.count(Appointment.id)).where(
            Appointment.professional_id == current_user.id,
            Appointment.scheduled_at >= week_start,
            Appointment.scheduled_at < week_end
        )
    )
    appointments_this_week = result.scalar() or 0
    
    # Get upcoming appointments (next 7 days)
    next_week = today + timedelta(days=7)
    result = await session.execute(
        select(func.count(Appointment.id)).where(
            Appointment.professional_id == current_user.id,
            Appointment.scheduled_at >= today,
            Appointment.scheduled_at < next_week
        )
    )
    upcoming_appointments = result.scalar() or 0
    
    # Get total notes created
    result = await session.execute(
        select(func.count(Note.id)).where(
            Note.professional_id == current_user.id
        )
    )
    total_notes = result.scalar() or 0
    
    return ProfessionalStatsRead(
        total_clients=total_clients,
        appointments_this_week=appointments_this_week,
        upcoming_appointments=upcoming_appointments,
        total_notes=total_notes
    )
