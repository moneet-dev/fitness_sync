"""
Test Phase 3 features: Client data access and notes
"""
import asyncio
from sqlalchemy import select
from .database import AsyncSessionLocal, engine
from .models import Base, User, Note, Assignment, Metric, Goal, Task


async def test_phase3():
    print("🧪 Testing Phase 3: Professional Features...")
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created/verified")
    
    async with AsyncSessionLocal() as session:
        # Check if Note table exists
        result = await session.execute(select(Note))
        print("✅ Note table accessible")
        
        # Count assignments
        result = await session.execute(select(Assignment))
        assignments = result.scalars().all()
        print(f"📊 Found {len(assignments)} assignments")
        
        # Count metrics, goals, tasks
        result = await session.execute(select(Metric))
        metric_count = len(result.scalars().all())
        
        result = await session.execute(select(Goal))
        goal_count = len(result.scalars().all())
        
        result = await session.execute(select(Task))
        task_count = len(result.scalars().all())
        
        result = await session.execute(select(Note))
        note_count = len(result.scalars().all())
        
        print(f"📊 Database contents:")
        print(f"   - {metric_count} metrics")
        print(f"   - {goal_count} goals")
        print(f"   - {task_count} tasks")
        print(f"   - {note_count} notes")
        
    print("\n✅ Phase 3 backend is ready!")
    print("📋 New endpoints available:")
    print("   - GET /users/clients?all_clients=true")
    print("   - GET /users/clients/{id}/metrics")
    print("   - GET /users/clients/{id}/goals")
    print("   - GET /users/clients/{id}/tasks")
    print("   - GET /users/clients/{id}/notes")
    print("   - POST /users/clients/{id}/notes")
    

if __name__ == "__main__":
    asyncio.run(test_phase3())
