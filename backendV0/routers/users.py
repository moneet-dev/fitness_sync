from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta

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
    ProfessionalStatsRead
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
    all_clients: bool = Query(False, description="Show all clients (for assignment UI)"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List clients. If all_clients=true, show all clients for assignment. 
    Otherwise show only assigned clients."""
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can view clients",
        )

    if all_clients:
        # Return all users with client role
        result = await session.execute(
            select(User).where(User.role == "client").order_by(User.full_name)
        )
    else:
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


@router.post("/assignments", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    assignment: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create an assignment between a professional and a client.
    
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
    """Get goals for a specific client. Only assigned professionals can access."""
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
    
    # Get goals
    result = await session.execute(
        select(Goal)
        .where(Goal.user_id == client_id)
        .order_by(Goal.id.desc())
    )
    return result.scalars().all()


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
    """Get all notes for a client. Only assigned professionals can access."""
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can access notes",
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
    
    # Get notes
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
