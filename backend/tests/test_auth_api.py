"""Authentication and authorization API tests."""

from fastapi.testclient import TestClient


def test_auth_register_and_login(client: TestClient) -> None:
    # 1. Register new user
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "tester@trustmedia.ai",
            "password": "Password@123",
            "full_name": "Test Researcher",
        },
    )
    assert reg_resp.status_code == 200
    token_data = reg_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    assert token_data["user"]["email"] == "tester@trustmedia.ai"

    # 2. Duplicate registration rejected
    dup_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "tester@trustmedia.ai",
            "password": "Password@123",
            "full_name": "Duplicate Tester",
        },
    )
    assert dup_resp.status_code == 400

    # 3. Login with credentials
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "tester@trustmedia.ai",
            "password": "Password@123",
        },
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # 4. Login with incorrect password
    bad_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "tester@trustmedia.ai",
            "password": "WrongPassword",
        },
    )
    assert bad_login.status_code == 401

    # 5. Access profile with token
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "tester@trustmedia.ai"

