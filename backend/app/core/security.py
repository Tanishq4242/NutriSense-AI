from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from app.core.firebase import firebase_ready

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to access this resource.", headers={"WWW-Authenticate": "Bearer"})
    if not firebase_ready():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Firebase Authentication is not configured.")
    try:
        decoded = auth.verify_id_token(credentials.credentials, check_revoked=True)
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session is invalid or expired. Sign in again.", headers={"WWW-Authenticate": "Bearer"}) from None
    uid = decoded.get("uid")
    if not isinstance(uid, str) or not uid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "The authentication token has no user identity.")
    return {"uid": uid, "email": decoded.get("email")}


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]

