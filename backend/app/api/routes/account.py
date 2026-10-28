from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from firebase_admin import auth, storage

from app.core.config import settings
from app.core.security import CurrentUser
from app.repositories import firestore as repository

router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("/export")
def export_data(user: CurrentUser) -> JSONResponse:
    return JSONResponse(repository.export_user_data(user["uid"]), headers={"Content-Disposition": "attachment; filename=nutrisense-export.json"})


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(user: CurrentUser) -> None:
    uid = user["uid"]
    repository.delete_user_data(uid)
    if settings.firebase_storage_bucket:
        try:
            bucket = storage.bucket()
            for blob in bucket.list_blobs(prefix=f"users/{uid}/"):
                blob.delete()
        except Exception:
            raise HTTPException(502, "Account data was removed but Storage cleanup failed; contact the project administrator.") from None
    try:
        auth.delete_user(uid)
    except Exception:
        raise HTTPException(502, "Application data was removed but Firebase Authentication could not delete the account.") from None

