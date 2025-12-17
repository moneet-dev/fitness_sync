from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, and_, case

from ..database import get_session
from ..deps import get_current_user
from ..models import Conversation, Message, Participant, User, TypingIndicator, Assignment
from ..schemas import ConversationRead, ConversationCreate, MessageCreate, MessageRead, TypingStatus

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/conversations", response_model=ConversationRead)
async def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a new conversation with multiple participants.
    
    The current user is automatically added as a participant if not in the list.
    For backwards compatibility, also supports query parameter ?participant_id=X
    """
    participant_ids = list(set(payload.participant_ids))  # Remove duplicates
    
    # Ensure current user is in the participant list
    if current_user.id not in participant_ids:
        participant_ids.append(current_user.id)
    
    # Sort for consistent comparison
    participant_ids.sort()
    
    # Check if a conversation with this exact set of participants already exists
    # Get all conversations where current user is a participant
    stmt = select(Participant.conversation_id).where(Participant.user_id == current_user.id)
    result = await session.execute(stmt)
    my_conv_ids = result.scalars().all()
    
    if my_conv_ids:
        # For each conversation, check if it has the exact same participant set
        for conv_id in my_conv_ids:
            stmt = select(Participant.user_id).where(Participant.conversation_id == conv_id)
            result = await session.execute(stmt)
            conv_participant_ids = sorted(result.scalars().all())
            
            if conv_participant_ids == participant_ids:
                # Found existing conversation with exact same participants
                stmt = select(Conversation).where(Conversation.id == conv_id)
                result = await session.execute(stmt)
                conversation = result.scalar_one()
                
                # Get participant info for response
                stmt = select(User).where(User.id.in_(participant_ids))
                result = await session.execute(stmt)
                users = result.scalars().all()
                
                participant_names = [u.full_name for u in users if u.id != current_user.id]
                is_group = len(participant_ids) > 2
                
                return ConversationRead(
                    id=conversation.id,
                    created_at=conversation.created_at,
                    other_participant_name=participant_names[0] if len(participant_names) == 1 else None,
                    participant_names=participant_names,
                    participant_count=len(participant_ids),
                    is_group=is_group,
                    last_message=None,
                    last_message_at=None,
                    unread_count=0
                )
    
    # Create new conversation
    conversation = Conversation()
    session.add(conversation)
    await session.flush()  # Get ID
    
    # Add all participants
    for user_id in participant_ids:
        participant = Participant(user_id=user_id, conversation_id=conversation.id)
        session.add(participant)
    
    await session.commit()
    await session.refresh(conversation)
    
    # Get participant info for response
    stmt = select(User).where(User.id.in_(participant_ids))
    result = await session.execute(stmt)
    users = result.scalars().all()
    
    participant_names = [u.full_name for u in users if u.id != current_user.id]
    is_group = len(participant_ids) > 2
    
    return ConversationRead(
        id=conversation.id,
        created_at=conversation.created_at,
        other_participant_name=participant_names[0] if len(participant_names) == 1 else None,
        participant_names=participant_names,
        participant_count=len(participant_ids),
        is_group=is_group,
        last_message=None,
        last_message_at=None,
        unread_count=0
    )


@router.post("/care-team-thread", response_model=ConversationRead)
async def get_or_create_care_team_conversation(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get or create the Care Team conversation for the current user.
    
    For clients: includes the client + all their assigned professionals/supporters.
    For professionals/supporters: returns 404 as they don't have a single care team.
    """
    if current_user.role != "client":
        raise HTTPException(
            status_code=400,
            detail="Care team conversations are only available for clients"
        )
    
    # Get all assigned professionals/supporters for this client
    stmt = select(Assignment.professional_id).where(Assignment.client_id == current_user.id)
    result = await session.execute(stmt)
    professional_ids = result.scalars().all()
    
    if not professional_ids:
        raise HTTPException(
            status_code=404,
            detail="No care team members found. Connect with professionals using invite codes."
        )
    
    # Participant IDs: client + all professionals
    participant_ids = sorted([current_user.id] + list(professional_ids))
    
    # Check if care team conversation already exists
    stmt = select(Participant.conversation_id).where(Participant.user_id == current_user.id)
    result = await session.execute(stmt)
    my_conv_ids = result.scalars().all()
    
    if my_conv_ids:
        # Check each conversation to see if it matches the care team
        for conv_id in my_conv_ids:
            stmt = select(Participant.user_id).where(Participant.conversation_id == conv_id)
            result = await session.execute(stmt)
            conv_participant_ids = sorted(result.scalars().all())
            
            if conv_participant_ids == participant_ids:
                # Found existing care team conversation
                stmt = select(Conversation).where(Conversation.id == conv_id)
                result = await session.execute(stmt)
                conversation = result.scalar_one()
                
                # Get participant info
                stmt = select(User).where(User.id.in_(participant_ids))
                result = await session.execute(stmt)
                users = result.scalars().all()
                
                participant_names = [u.full_name for u in users if u.id != current_user.id]
                
                return ConversationRead(
                    id=conversation.id,
                    created_at=conversation.created_at,
                    other_participant_name="Care Team",
                    participant_names=participant_names,
                    participant_count=len(participant_ids),
                    is_group=True,
                    last_message=None,
                    last_message_at=None,
                    unread_count=0
                )
    
    # Create new care team conversation
    conversation = Conversation()
    session.add(conversation)
    await session.flush()
    
    # Add all participants
    for user_id in participant_ids:
        participant = Participant(user_id=user_id, conversation_id=conversation.id)
        session.add(participant)
    
    await session.commit()
    await session.refresh(conversation)
    
    # Get participant info
    stmt = select(User).where(User.id.in_(participant_ids))
    result = await session.execute(stmt)
    users = result.scalars().all()
    
    participant_names = [u.full_name for u in users if u.id != current_user.id]
    
    return ConversationRead(
        id=conversation.id,
        created_at=conversation.created_at,
        other_participant_name="Care Team",
        participant_names=participant_names,
        participant_count=len(participant_ids),
        is_group=True,
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
        # Get all participants except current user
        other_participant_ids = [p.user_id for p in conv.participants if p.user_id != current_user.id]
        
        # Fetch user details for other participants
        participant_names = []
        if other_participant_ids:
            stmt = select(User).where(User.id.in_(other_participant_ids))
            res = await session.execute(stmt)
            users = res.scalars().all()
            participant_names = [u.full_name for u in users]
        
        # Determine conversation type
        is_group = len(conv.participants) > 2
        participant_count = len(conv.participants)
        
        # For display: if 1:1, use single name; if group, use "Care Team" or list
        other_name = None
        if not is_group and participant_names:
            other_name = participant_names[0]
        elif is_group:
            other_name = "Care Team"
        
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
            participant_names=participant_names,
            participant_count=participant_count,
            is_group=is_group,
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
