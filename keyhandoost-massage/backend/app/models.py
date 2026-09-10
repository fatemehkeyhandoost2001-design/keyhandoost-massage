from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def current_time() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=current_time)

    sent_letters: Mapped[list["Letter"]] = relationship(
        back_populates="sender",
        foreign_keys="Letter.sender_id",
    )
    received_letters: Mapped[list["Letter"]] = relationship(
        back_populates="receiver",
        foreign_keys="Letter.receiver_id",
    )


class Letter(Base):
    __tablename__ = "letters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=current_time, index=True)

    sender: Mapped[User] = relationship(back_populates="sent_letters", foreign_keys=[sender_id])
    receiver: Mapped[User] = relationship(back_populates="received_letters", foreign_keys=[receiver_id])
    attachment: Mapped["Attachment | None"] = relationship(
        back_populates="letter",
        cascade="all, delete-orphan",
        uselist=False,
    )


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    letter_id: Mapped[int] = mapped_column(ForeignKey("letters.id"), unique=True, nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    saved_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)

    letter: Mapped[Letter] = relationship(back_populates="attachment")
