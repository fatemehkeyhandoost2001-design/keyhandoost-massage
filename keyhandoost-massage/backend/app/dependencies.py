from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import decode_access_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="برای انجام این عملیات باید وارد سامانه شوید.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise error

    try:
        token_data = decode_access_token(credentials.credentials)
        user_id = int(token_data.get("sub", ""))
    except (TypeError, ValueError):
        raise error

    user = db.get(User, user_id)
    if user is None:
        raise error
    return user
