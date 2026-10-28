from fastapi import APIRouter, HTTPException, status

from app.core.security import CurrentUser
from app.repositories import firestore as repository
from app.schemas import FavoriteCreate

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("")
def get_favorites(user: CurrentUser, favorite_type: str | None = None) -> dict:
    return {"items": repository.list_favorites(user["uid"], favorite_type)}


@router.post("", status_code=status.HTTP_201_CREATED)
def add_favorite(payload: FavoriteCreate, user: CurrentUser) -> dict:
    return repository.save_favorite(user["uid"], payload.model_dump())


@router.delete("/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(favorite_id: str, user: CurrentUser) -> None:
    if not repository.delete_favorite(user["uid"], favorite_id):
        raise HTTPException(404, "Favorite not found.")

