import time
from collections.abc import Generator

from sqlalchemy import create_engine, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import DATABASE_URL


class Base(DeclarativeBase):
    pass


connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_database(attempts: int = 20, delay: int = 2) -> None:
    for number in range(attempts):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return
        except OperationalError:
            if number == attempts - 1:
                raise
            time.sleep(delay)


def init_database() -> None:
    from .models import User
    from .security import hash_password

    Base.metadata.create_all(bind=engine)

    users = [
        ("ali", "علی احمدی", "123456"),
        ("sara", "سارا محمدی", "123456"),
        ("reza", "رضا کریمی", "123456"),
    ]

    with SessionLocal() as db:
        if db.scalar(select(User.id).limit(1)) is not None:
            return

        for username, full_name, password in users:
            db.add(
                User(
                    username=username,
                    full_name=full_name,
                    password_hash=hash_password(password),
                )
            )
        db.commit()
