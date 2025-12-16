from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..database import get_session
from ..deps import get_current_user
from ..models import Appointment, User, Notification
from ..schemas import AppointmentCreate, AppointmentRead, AppointmentUpdate

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("/", response_model=List[AppointmentRead])
async def list_appointments(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = select(Appointment)
    if current_user.role == "client":
        query = query.where(Appointment.client_id == current_user.id)
    else:
        query = query.where(Appointment.professional_id == current_user.id)
    result = await session.execute(query.order_by(Appointment.scheduled_at))
    return result.scalars().all()


@router.post("/", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current_user.role == "client":
        client_id = current_user.id
    else:
        client_id = payload.professional_id  # fallback for manual creation

    appointment = Appointment(
        client_id=client_id,
        professional_id=payload.professional_id,
        scheduled_at=payload.scheduled_at,
        mode=payload.mode,
        notes=payload.notes,
    )
    session.add(appointment)
    await session.commit()
    await session.refresh(appointment)
    
    # Create notification for professional
    notification = Notification(
        user_id=payload.professional_id,
        type="appointment",
        title="New Appointment",
        message=f"New appointment scheduled for {payload.scheduled_at}",
        is_read=False,
    )
    session.add(notification)
    await session.commit()
    
    return appointment


@router.get("/{appointment_id}", response_model=AppointmentRead)
async def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get a specific appointment."""
    result = await session.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )
    
    # Check access
    if (
        current_user.role == "client"
        and appointment.client_id != current_user.id
    ) or (
        current_user.role != "client"
        and appointment.professional_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this appointment",
        )
    
    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentRead)
async def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update an appointment."""
    result = await session.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )
    
    # Check access
    if (
        current_user.role == "client"
        and appointment.client_id != current_user.id
    ) or (
        current_user.role != "client"
        and appointment.professional_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this appointment",
        )
    
    # Update fields
    if appointment_update.scheduled_at is not None:
        appointment.scheduled_at = appointment_update.scheduled_at
    if appointment_update.mode is not None:
        appointment.mode = appointment_update.mode
    if appointment_update.notes is not None:
        appointment.notes = appointment_update.notes
    if appointment_update.status is not None:
        appointment.status = appointment_update.status
    
    await session.commit()
    await session.refresh(appointment)
    
    # Create notification for the other party
    notify_user_id = (
        appointment.professional_id
        if current_user.role == "client"
        else appointment.client_id
    )
    notification = Notification(
        user_id=notify_user_id,
        type="appointment",
        title="Appointment Updated",
        message=f"Appointment for {appointment.scheduled_at} has been updated",
        is_read=False,
    )
    session.add(notification)
    await session.commit()
    
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Cancel (delete) an appointment."""
    result = await session.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )
    
    # Check access
    if (
        current_user.role == "client"
        and appointment.client_id != current_user.id
    ) or (
        current_user.role != "client"
        and appointment.professional_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this appointment",
        )
    
    # Create notification for the other party before deleting
    notify_user_id = (
        appointment.professional_id
        if current_user.role == "client"
        else appointment.client_id
    )
    notification = Notification(
        user_id=notify_user_id,
        type="appointment",
        title="Appointment Cancelled",
        message=f"Appointment for {appointment.scheduled_at} has been cancelled",
        is_read=False,
    )
    session.add(notification)
    
    await session.delete(appointment)
    await session.commit()
    
    return None


@router.get("/availability")
async def mock_availability(
    professional_id: int,
):
    base_time = datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)
    slots = [
        {
            "start": (base_time + timedelta(hours=i)).isoformat(),
            "end": (base_time + timedelta(hours=i + 1)).isoformat(),
        }
        for i in range(0, 8)
    ]
    return {"professional_id": professional_id, "slots": slots}

