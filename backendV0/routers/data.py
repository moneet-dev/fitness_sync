from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..database import get_session
from ..deps import get_current_user
from ..models import Goal, GoalProgressLog, Metric, Task, User
from ..schemas import (
    GoalCreate,
    GoalProgressLogCreate,
    GoalProgressLogRead,
    GoalRead,
    GoalUpdate,
    MetricCreate,
    MetricRead,
    TaskCreate,
    TaskRead,
)

router = APIRouter(prefix="/data", tags=["data"])


@router.get("/metrics", response_model=list[MetricRead])
async def list_metrics(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Metric).where(Metric.user_id == current_user.id).order_by(Metric.recorded_at.desc())
    )
    return result.scalars().all()


@router.post("/metrics", response_model=MetricRead, status_code=status.HTTP_201_CREATED)
async def create_metric(
    payload: MetricCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    metric = Metric(
        user_id=current_user.id,
        **payload.model_dump(exclude_unset=True),
    )
    session.add(metric)
    await session.commit()
    await session.refresh(metric)
    return metric


@router.get("/tasks", response_model=list[TaskRead])
async def list_tasks(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Task).where(Task.user_id == current_user.id).order_by(Task.created_at.desc())
    )
    return result.scalars().all()


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    task = Task(user_id=current_user.id, **payload.model_dump(exclude_unset=True))
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Task).where(Task.id == task_id, Task.user_id == current_user.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    await session.commit()
    await session.refresh(task)
    return task


@router.get("/goals", response_model=list[GoalRead])
async def list_goals(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Goal).where(Goal.user_id == current_user.id).order_by(Goal.id.desc())
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


@router.post("/goals", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    goal = Goal(
        user_id=current_user.id,
        created_by_id=current_user.id,
        **payload.model_dump(exclude_unset=True)
    )
    session.add(goal)
    await session.commit()
    await session.refresh(goal)
    
    # Get creator name
    created_by_name = current_user.full_name
    
    return GoalRead(
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
    )


@router.patch("/goals/{goal_id}", response_model=GoalRead)
async def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    # Store old progress for comparison
    old_progress = goal.progress

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, key, value)
    
    # Auto-calculate progress if target_value and current_value are provided
    if goal.target_value and goal.target_value > 0 and goal.current_value is not None:
        goal.progress = min((goal.current_value / goal.target_value) * 100, 100.0)
    
    # Update status based on progress
    if goal.progress >= 100:
        goal.status = "completed"
    elif goal.progress > 0:
        goal.status = "in-progress"
    
    # Log progress change if progress was updated
    if goal.progress != old_progress and goal.current_value is not None:
        progress_log = GoalProgressLog(
            goal_id=goal.id,
            value=goal.current_value,
            progress_percentage=goal.progress,
        )
        session.add(progress_log)
    
    await session.commit()
    await session.refresh(goal)
    return goal


@router.post("/goals/{goal_id}/logs", response_model=GoalProgressLogRead, status_code=status.HTTP_201_CREATED)
async def create_progress_log(
    goal_id: int,
    payload: GoalProgressLogCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Verify goal exists and belongs to user
    result = await session.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    
    # Calculate progress percentage
    progress_percentage = 0.0
    if goal.target_value and goal.target_value > 0:
        progress_percentage = min((payload.value / goal.target_value) * 100, 100.0)
    else:
        # If no target, treat value as direct percentage
        progress_percentage = min(payload.value, 100.0)
    
    # Create log entry
    progress_log = GoalProgressLog(
        goal_id=goal_id,
        value=payload.value,
        progress_percentage=progress_percentage,
        notes=payload.notes,
    )
    session.add(progress_log)
    
    # Update goal's current values
    goal.current_value = payload.value
    goal.progress = progress_percentage
    if progress_percentage >= 100:
        goal.status = "completed"
    elif progress_percentage > 0:
        goal.status = "in-progress"
    
    await session.commit()
    await session.refresh(progress_log)
    return progress_log


@router.get("/goals/{goal_id}/logs", response_model=list[GoalProgressLogRead])
async def list_progress_logs(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Verify goal exists and belongs to user
    result = await session.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    
    # Get all logs for this goal, ordered by date descending
    result = await session.execute(
        select(GoalProgressLog)
        .where(GoalProgressLog.goal_id == goal_id)
        .order_by(GoalProgressLog.logged_at.desc())
    )
    return result.scalars().all()

