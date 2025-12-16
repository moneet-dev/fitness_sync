from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, and_, case

from ..database import get_session
from ..deps import get_current_user
from ..models import Conversation, Message, Participant, User, TypingIndicator
from ..schemas import ConversationRead, MessageCreate, MessageRead, TypingStatus

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/conversations", response_model=ConversationRead)
async def get_or_create_conversation(
    participant_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Check if conversation exists
    # This is a simplified check; for production, a more robust query is needed
    # to find a conversation where BOTH users are participants.
    
    # Find conversations where current user is a participant
    stmt = select(Participant.conversation_id).where(Participant.user_id == current_user.id)
    result = await session.execute(stmt)
    my_conv_ids = result.scalars().all()

    if my_conv_ids:
        # Check if target user is in any of these conversations
        stmt = select(Participant).where(
            Participant.conversation_id.in_(my_conv_ids),
            Participant.user_id == participant_id
        )
        result = await session.execute(stmt)
        existing_participant = result.scalar_one_or_none()

        if existing_participant:
            # Found existing conversation
            stmt = select(Conversation).where(Conversation.id == existing_participant.conversation_id)
            result = await session.execute(stmt)
            conversation = result.scalar_one()
            
            # Hacky way to get other participant name for now
            stmt = select(User).where(User.id == participant_id)
            res = await session.execute(stmt)
            other_user = res.scalar_one()
            
            return ConversationRead(
                id=conversation.id,
                created_at=conversation.created_at,
                other_participant_name=other_user.full_name,
                last_message=None,
                last_message_at=None,
                unread_count=0
            )

    # Create new conversation
    conversation = Conversation()
    session.add(conversation)
    await session.flush() # Get ID

    p1 = Participant(user_id=current_user.id, conversation_id=conversation.id)
    p2 = Participant(user_id=participant_id, conversation_id=conversation.id)
    session.add_all([p1, p2])
    await session.commit()
    await session.refresh(conversation)
    
    stmt = select(User).where(User.id == participant_id)
    res = await session.execute(stmt)
    other_user = res.scalar_one()

    return ConversationRead(
        id=conversation.id,
        created_at=conversation.created_at,
        other_participant_name=other_user.full_name,
        last_message=None,
        last_message_at=None,
        unread_count=0
    )


@router.get("/conversations", response_model=list[ConversationRead])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Get all conversations for current user with last message and unread count
    stmt = (
        select(Conversation)
        .join(Participant)
        .where(Participant.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
        .options(selectinload(Conversation.participants))
    )
    result = await session.execute(stmt)
    conversations = result.scalars().all()
    
    response = []
    for conv in conversations:
        # Find the "other" participant
        other_p = next((p for p in conv.participants if p.user_id != current_user.id), None)
        other_name = "Unknown"
        if other_p:
             stmt = select(User).where(User.id == other_p.user_id)
             res = await session.execute(stmt)
             u = res.scalar_one_or_none()
             if u: other_name = u.full_name
        
        # Get last message
        stmt = (
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        res = await session.execute(stmt)
        last_msg = res.scalar_one_or_none()
        
        last_message_text = None
        last_message_time = None
        if last_msg:
            last_message_text = last_msg.content
            last_message_time = last_msg.created_at
        
        # Get current user's participant record for last_read_at
        stmt = select(Participant).where(
            Participant.conversation_id == conv.id,
            Participant.user_id == current_user.id
        )
        res = await session.execute(stmt)
        my_participant = res.scalar_one_or_none()
        
        # Count unread messages
        unread_count = 0
        if my_participant:
            last_read = my_participant.last_read_at
            if last_read:
                stmt = select(func.count(Message.id)).where(
                    Message.conversation_id == conv.id,
                    Message.created_at > last_read,
                    Message.sender_id != current_user.id  # Don't count own messages
                )
            else:
                # Never read, count all messages from others
                stmt = select(func.count(Message.id)).where(
                    Message.conversation_id == conv.id,
                    Message.sender_id != current_user.id
                )
            res = await session.execute(stmt)
            unread_count = res.scalar_one()
        
        response.append(ConversationRead(
            id=conv.id,
            created_at=conv.created_at,
            other_participant_name=other_name,
            last_message=last_message_text,
            last_message_at=last_message_time,
            unread_count=unread_count
        ))
    
    return response


@router.get("/messages/{conversation_id}", response_model=list[MessageRead])
async def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Verify participation
    stmt = select(Participant).where(
        Participant.conversation_id == conversation_id,
        Participant.user_id == current_user.id
    )
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a participant")

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    result = await session.execute(stmt)
    messages = result.scalars().all()
    
    # Enrich with sender names (N+1 query but okay for MVP)
    response = []
    for msg in messages:
        stmt = select(User).where(User.id == msg.sender_id)
        res = await session.execute(stmt)
        sender = res.scalar_one()
        
        response.append(MessageRead(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
            content=msg.content,
            created_at=msg.created_at,
            sender_name=sender.full_name
        ))
    return response


@router.post("/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Verify participation
    stmt = select(Participant).where(
        Participant.conversation_id == payload.conversation_id,
        Participant.user_id == current_user.id
    )
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a participant")

    message = Message(
        conversation_id=payload.conversation_id,
        sender_id=current_user.id,
        content=payload.content,
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)
    
    return MessageRead(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        content=message.content,
        created_at=message.created_at,
        sender_name=current_user.full_name
    )


@router.patch("/conversations/{conversation_id}/mark-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_conversation_read(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Mark all messages in a conversation as read by updating last_read_at"""
    # Get current user's participant record
    stmt = select(Participant).where(
        Participant.conversation_id == conversation_id,
        Participant.user_id == current_user.id
    )
    result = await session.execute(stmt)
    participant = result.scalar_one_or_none()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")
    
    # Update last_read_at to now
    participant.last_read_at = datetime.utcnow()
    await session.commit()
    
    return None


@router.post("/conversations/{conversation_id}/typing", status_code=status.HTTP_204_NO_CONTENT)
async def update_typing_status(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update typing indicator for current user in a conversation"""
    # Verify participation
    stmt = select(Participant).where(
        Participant.conversation_id == conversation_id,
        Participant.user_id == current_user.id
    )
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a participant")
    
    # Check if typing indicator exists
    stmt = select(TypingIndicator).where(
        TypingIndicator.conversation_id == conversation_id,
        TypingIndicator.user_id == current_user.id
    )
    result = await session.execute(stmt)
    indicator = result.scalar_one_or_none()
    
    if indicator:
        # Update timestamp
        indicator.updated_at = datetime.utcnow()
    else:
        # Create new
        indicator = TypingIndicator(
            conversation_id=conversation_id,
            user_id=current_user.id
        )
        session.add(indicator)
    
    await session.commit()
    return None


@router.get("/conversations/{conversation_id}/typing", response_model=list[TypingStatus])
async def get_typing_status(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get typing status for other participants (not including current user)"""
    # Verify participation
    stmt = select(Participant).where(
        Participant.conversation_id == conversation_id,
        Participant.user_id == current_user.id
    )
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a participant")
    
    # Get typing indicators updated in last 5 seconds, excluding current user
    cutoff = datetime.utcnow() - timedelta(seconds=5)
    stmt = (
        select(TypingIndicator)
        .where(
            TypingIndicator.conversation_id == conversation_id,
            TypingIndicator.user_id != current_user.id,
            TypingIndicator.updated_at > cutoff
        )
    )
    result = await session.execute(stmt)
    indicators = result.scalars().all()
    
    # Get user names
    response = []
    for indicator in indicators:
        stmt = select(User).where(User.id == indicator.user_id)
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()
        if user:
            response.append(TypingStatus(
                user_id=user.id,
                user_name=user.full_name,
                is_typing=True
            ))
    
    return response
