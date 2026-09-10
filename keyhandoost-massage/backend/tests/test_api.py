import os
import shutil
from pathlib import Path

TEST_DB = Path("test_letters.db")
TEST_UPLOADS = Path("test_uploads")
TEST_DB.unlink(missing_ok=True)
shutil.rmtree(TEST_UPLOADS, ignore_errors=True)

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["UPLOAD_DIR"] = str(TEST_UPLOADS)
os.environ["SECRET_KEY"] = "test-secret-key-for-letter-project"

from fastapi.testclient import TestClient

from app.main import app


def login_header(client: TestClient, username: str):
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": "123456"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_register_new_user():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/register",
            json={
                "username": "new_student",
                "full_name": "دانشجوی جدید",
                "password": "123456",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["user"]["username"] == "new_student"
        assert data["access_token"]

        login_response = client.post(
            "/api/auth/login",
            json={"username": "new_student", "password": "123456"},
        )
        assert login_response.status_code == 200


def test_wrong_password():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/login",
            json={"username": "ali", "password": "wrong"},
        )
        assert response.status_code == 401


def test_send_and_receive_letter():
    with TestClient(app) as client:
        ali_header = login_header(client, "ali")
        users = client.get("/api/users", headers=ali_header).json()
        sara = next(user for user in users if user["username"] == "sara")

        response = client.post(
            "/api/letters",
            headers=ali_header,
            data={
                "receiver_id": str(sara["id"]),
                "subject": "نامه آزمایشی",
                "body": "متن نامه برای بررسی مسیر ارسال و دریافت.",
            },
            files={"attachment": ("sample.txt", b"sample file", "text/plain")},
        )
        assert response.status_code == 201
        assert response.json()["has_attachment"] is True

        sara_header = login_header(client, "sara")
        inbox = client.get("/api/letters/inbox", headers=sara_header)
        assert inbox.status_code == 200
        letter = inbox.json()[0]
        assert letter["sender"]["username"] == "ali"
        assert letter["subject"] == "نامه آزمایشی"

        file_response = client.get(
            f"/api/letters/{letter['id']}/attachment",
            headers=sara_header,
        )
        assert file_response.status_code == 200
        assert file_response.content == b"sample file"
