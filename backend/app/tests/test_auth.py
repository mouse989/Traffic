import pytest
from httpx import AsyncClient
from app.tests.conftest import get_token
from app.services.auth_service import create_refresh_token


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, admin_user):
    resp = await client.post("/auth/login", json={"username": "test_admin", "password": "admin_pass"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, admin_user):
    resp = await client.post("/auth/login", json={"username": "test_admin", "password": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    resp = await client.post("/auth/login", json={"username": "ghost", "password": "x"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_token_type_enforcement(client: AsyncClient, admin_user):
    """Refresh token must NOT work on authenticated endpoints."""
    refresh_token = create_refresh_token("test_admin")
    resp = await client.get("/api/scans", headers={"Authorization": f"Bearer {refresh_token}"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_returns_new_access_token(client: AsyncClient, admin_user):
    login = await client.post("/auth/login", json={"username": "test_admin", "password": "admin_pass"})
    refresh_token = login.json()["refresh_token"]

    resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_refresh_with_access_token_fails(client: AsyncClient, admin_user):
    """Access token must NOT work as refresh token."""
    access = await get_token(client, "test_admin", "admin_pass")
    resp = await client.post("/auth/refresh", json={"refresh_token": access})
    assert resp.status_code == 401
