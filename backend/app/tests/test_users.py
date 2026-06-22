import pytest
from httpx import AsyncClient
from app.tests.conftest import get_token


@pytest.mark.asyncio
async def test_staff_cannot_list_users(client: AsyncClient, staff_user):
    token = await get_token(client, "test_staff", "staff_pass")
    resp = await client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_list_users(client: AsyncClient, admin_user):
    token = await get_token(client, "test_admin", "admin_pass")
    resp = await client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_admin_create_user(client: AsyncClient, admin_user):
    token = await get_token(client, "test_admin", "admin_pass")
    resp = await client.post(
        "/api/users",
        json={"username": "new_staff_xyz", "password": "pass123", "role": "STAFF"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "new_staff_xyz"
    assert data["role"] == "STAFF"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_create_duplicate_user(client: AsyncClient, admin_user):
    token = await get_token(client, "test_admin", "admin_pass")
    payload = {"username": "dup_user_xyz", "password": "pass", "role": "STAFF"}
    await client.post("/api/users", json=payload, headers={"Authorization": f"Bearer {token}"})
    resp = await client.post("/api/users", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_reset_password(client: AsyncClient, admin_user, staff_user):
    admin_token = await get_token(client, "test_admin", "admin_pass")
    resp = await client.post(
        f"/api/users/{staff_user.id}/reset-password",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    assert "temp_password" in resp.json()
