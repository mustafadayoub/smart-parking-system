from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.enums import UserRole
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.services import ConflictError, NotFoundError, UserService, ValidationError

router = APIRouter()


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.MANAGEMENT)),
) -> list[UserResponse]:
    users = await UserService.list_users(db)
    return [UserResponse.model_validate(user) for user in users]


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.MANAGEMENT)),
) -> UserResponse:
    try:
        user = await UserService.update_user(db, user_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.role != UserRole.MANAGEMENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Management role required")

    try:
        await UserService.delete_user(db, user_id, requesting_user=current_user)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
