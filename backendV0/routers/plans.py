from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..database import get_session
from ..deps import get_current_user
from ..models import Assignment, Plan, User
from ..schemas import PlanCreate, PlanRead, PlanUpdate

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("/", response_model=list[PlanRead])
async def get_plans(
    plan_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get plans. Clients get their own plans, professionals get plans they created."""
    if current_user.role == "client":
        # Get plans assigned to this client
        stmt = select(Plan).where(Plan.client_id == current_user.id)
    else:
        # Get plans created by this professional
        stmt = select(Plan).where(Plan.professional_id == current_user.id)
    
    if plan_type:
        stmt = stmt.where(Plan.plan_type == plan_type)
    
    stmt = stmt.order_by(Plan.created_at.desc())
    result = await session.execute(stmt)
    plans = result.scalars().all()
    
    # Enrich with professional names
    response = []
    for plan in plans:
        result = await session.execute(
            select(User).where(User.id == plan.professional_id)
        )
        professional = result.scalar_one()
        response.append(
            PlanRead(
                id=plan.id,
                client_id=plan.client_id,
                professional_id=plan.professional_id,
                plan_type=plan.plan_type,
                title=plan.title,
                description=plan.description,
                content=plan.content,
                start_date=plan.start_date,
                end_date=plan.end_date,
                status=plan.status,
                created_at=plan.created_at,
                updated_at=plan.updated_at,
                professional_name=professional.full_name,
            )
        )
    
    return response


@router.post("/", response_model=PlanRead, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_data: PlanCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a new plan. Only professionals can create plans for their clients."""
    if current_user.role == "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only professionals can create plans",
        )
    
    # Verify assignment exists
    result = await session.execute(
        select(Assignment).where(
            Assignment.client_id == plan_data.client_id,
            Assignment.professional_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this client",
        )
    
    # Create plan
    new_plan = Plan(
        client_id=plan_data.client_id,
        professional_id=current_user.id,
        plan_type=plan_data.plan_type,
        title=plan_data.title,
        description=plan_data.description,
        content=plan_data.content,
        start_date=plan_data.start_date,
        end_date=plan_data.end_date,
        status=plan_data.status,
    )
    
    session.add(new_plan)
    await session.commit()
    await session.refresh(new_plan)
    
    return PlanRead(
        id=new_plan.id,
        client_id=new_plan.client_id,
        professional_id=new_plan.professional_id,
        plan_type=new_plan.plan_type,
        title=new_plan.title,
        description=new_plan.description,
        content=new_plan.content,
        start_date=new_plan.start_date,
        end_date=new_plan.end_date,
        status=new_plan.status,
        created_at=new_plan.created_at,
        updated_at=new_plan.updated_at,
        professional_name=current_user.full_name,
    )


@router.get("/{plan_id}", response_model=PlanRead)
async def get_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get a specific plan."""
    result = await session.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found"
        )
    
    # Check access: client must own plan or professional must have created it
    if current_user.role == "client" and plan.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this plan",
        )
    elif current_user.role != "client" and plan.professional_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this plan",
        )
    
    # Get professional name
    result = await session.execute(
        select(User).where(User.id == plan.professional_id)
    )
    professional = result.scalar_one()
    
    return PlanRead(
        id=plan.id,
        client_id=plan.client_id,
        professional_id=plan.professional_id,
        plan_type=plan.plan_type,
        title=plan.title,
        description=plan.description,
        content=plan.content,
        start_date=plan.start_date,
        end_date=plan.end_date,
        status=plan.status,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        professional_name=professional.full_name,
    )


@router.patch("/{plan_id}", response_model=PlanRead)
async def update_plan(
    plan_id: int,
    plan_update: PlanUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update a plan. Only the professional who created it can update."""
    result = await session.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found"
        )
    
    if plan.professional_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update plans you created",
        )
    
    # Update fields
    if plan_update.title is not None:
        plan.title = plan_update.title
    if plan_update.description is not None:
        plan.description = plan_update.description
    if plan_update.content is not None:
        plan.content = plan_update.content
    if plan_update.start_date is not None:
        plan.start_date = plan_update.start_date
    if plan_update.end_date is not None:
        plan.end_date = plan_update.end_date
    if plan_update.status is not None:
        plan.status = plan_update.status
    
    await session.commit()
    await session.refresh(plan)
    
    return PlanRead(
        id=plan.id,
        client_id=plan.client_id,
        professional_id=plan.professional_id,
        plan_type=plan.plan_type,
        title=plan.title,
        description=plan.description,
        content=plan.content,
        start_date=plan.start_date,
        end_date=plan.end_date,
        status=plan.status,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        professional_name=current_user.full_name,
    )


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete a plan. Only the professional who created it can delete."""
    result = await session.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found"
        )
    
    if plan.professional_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete plans you created",
        )
    
    await session.delete(plan)
    await session.commit()
    
    return None
