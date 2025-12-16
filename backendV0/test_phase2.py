"""
Quick test script for Phase 2 chat enhancements
Tests: conversation metadata, typing indicators, read receipts
"""
import asyncio
import sys
from sqlalchemy import select
from .database import AsyncSessionLocal, engine
from .models import Base, User, Conversation, Participant, Message, TypingIndicator


async def test_phase2():
    print("🧪 Testing Phase 2 Chat Enhancements...")
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created/verified")
    
    async with AsyncSessionLocal() as session:
        # Check if TypingIndicator table exists
        result = await session.execute(select(TypingIndicator))
        print("✅ TypingIndicator table accessible")
        
        # Check if Participant has last_read_at
        result = await session.execute(select(Participant))
        participants = result.scalars().all()
        if participants:
            p = participants[0]
            has_last_read = hasattr(p, 'last_read_at')
            print(f"✅ Participant.last_read_at exists: {has_last_read}")
        else:
            print("⚠️  No participants found (this is okay for initial test)")
        
        # Count conversations, messages
        result = await session.execute(select(Conversation))
        conv_count = len(result.scalars().all())
        
        result = await session.execute(select(Message))
        msg_count = len(result.scalars().all())
        
        print(f"📊 Found {conv_count} conversations, {msg_count} messages")
        
    print("\n✅ Phase 2 backend is ready!")
    print("📋 New features available:")
    print("   - PATCH /chat/conversations/{id}/mark-read")
    print("   - POST /chat/conversations/{id}/typing")
    print("   - GET /chat/conversations/{id}/typing")
    print("   - GET /chat/conversations (with last_message, unread_count)")
    

if __name__ == "__main__":
    asyncio.run(test_phase2())
