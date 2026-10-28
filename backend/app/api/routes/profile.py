from fastapi import APIRouter

from app.core.security import CurrentUser
from app.repositories import firestore as repository
from app.schemas import ProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("")
def read_profile(user: CurrentUser) -> dict:
    return repository.get_profile(user["uid"])


@router.put("")
def update_profile(payload: ProfileUpdate, user: CurrentUser) -> dict:
    return repository.put_profile(user["uid"], payload.model_dump())

