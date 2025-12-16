from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..database import get_session
from ..deps import get_current_user
from ..models import Notification, User
from ..schemas import NotificationRead, NotificationUpdate

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=list[NotificationRead])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/{notification_id}", response_model=NotificationRead)
async def update_notification(
    notification_id: int,
    notification_update: NotificationUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update notification (mark as read/unread)."""
    result = await session.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )
    
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this notification",
        )
    
    notification.is_read = notification_update.is_read
    await session.commit()
    await session.refresh(notification)
    
    return notification


@router.post("/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Mark all notifications as read for current user."""
    result = await session.execute(
        select(Notification).where(
            Notification.user_id == current_user.id, Notification.is_read == False
        )
    )
    notifications = result.scalars().all()
    
    for notification in notifications:
        notification.is_read = True
    
    await session.commit()
    return None
