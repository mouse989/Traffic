import pytest
from httpx import AsyncClient
from app.tests.conftest import get_token


SCAN_PAYLOAD = {
    "qr_code_id": "QR-LOC-001",
    "latitude": 10.7769,
    "longitude": 106.7009,
}


@pytest.mark.asyncio
async def test_scan_requires_auth(client: AsyncClient):
    resp = await client.post("/api/scan", json=SCAN_PAYLOAD)
    assert resp.status_code in (401, 403)  # 403 when no bearer header, 401 when invalid token


@pytest.mark.asyncio
async def test_staff_can_submit_scan(client: AsyncClient, staff_user):
    token = await get_token(client, "test_staff", "staff_pass")
    resp = await client.post(
        "/api/scan",
        json=SCAN_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["qr_code_id"] == "QR-LOC-001"
    assert data["username"] == "test_staff"
    assert data["latitude"] == 10.7769
    assert data["longitude"] == 106.7009


@pytest.mark.asyncio
async def test_scan_ip_from_x_forwarded_for(client: AsyncClient, staff_user):
    """Server must extract leftmost IP from X-Forwarded-For, not trust client."""
    token = await get_token(client, "test_staff", "staff_pass")
    resp = await client.post(
        "/api/scan",
        json=SCAN_PAYLOAD,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Forwarded-For": "1.2.3.4, 10.0.0.1, 192.168.1.1",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["ip_address"] == "1.2.3.4"


@pytest.mark.asyncio
async def test_scan_invalid_coordinates(client: AsyncClient, staff_user):
    token = await get_token(client, "test_staff", "staff_pass")
    resp = await client.post(
        "/api/scan",
        json={"qr_code_id": "QR-001", "latitude": 999, "longitude": 106.7},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_staff_cannot_list_scans(client: AsyncClient, staff_user):
    token = await get_token(client, "test_staff", "staff_pass")
    resp = await client.get("/api/scans", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_list_scans(client: AsyncClient, admin_user):
    token = await get_token(client, "test_admin", "admin_pass")
    resp = await client.get("/api/scans", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_scan_filter_by_username(client: AsyncClient, admin_user, staff_user):
    staff_token = await get_token(client, "test_staff", "staff_pass")
    for i in range(3):
        await client.post(
            "/api/scan",
            json={"qr_code_id": f"QR-{i}", "latitude": 10.7, "longitude": 106.7},
            headers={"Authorization": f"Bearer {staff_token}"},
        )

    admin_token = await get_token(client, "test_admin", "admin_pass")
    resp = await client.get(
        "/api/scans?username=test_staff",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert all(item["username"] == "test_staff" for item in data["items"])
