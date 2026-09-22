import pytest
from httpx import AsyncClient
from app.core.config import settings
from jose import jwt


@pytest.mark.asyncio
async def test_booking_enhancements_flow(client: AsyncClient, auth_headers: dict):
    # 1. Register a dedicated clinic
    reg_response = await client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json={
            "clinic_name": "Enhancement Test Clinic",
            "email": "enhancement_admin@test.com",
            "password": "Password123!",
            "first_name": "Enhance",
            "last_name": "Admin",
        },
    )
    assert reg_response.status_code in (200, 201)
    token = reg_response.json()["data"]["access_token"]
    decoded = jwt.decode(token, key="", options={"verify_signature": False})
    clinic_id = decoded["clinic_id"]
    therapist_id = decoded["sub"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Idempotency & Double Submit Protection
    payload = {
        "name": "Arjun Sharma",
        "phone": "9123456780",
        "age": 28,
        "gender": "male",
        "chief_complaint": "Shoulder stiffness",
        "preferred_date": "2026-09-25",
        "preferred_slot": "10:00 AM",
        "notes": "Prefers morning",
    }

    # Submit 1st request with Idempotency-Key
    res1 = await client.post(
        f"{settings.API_V1_PREFIX}/booking/request?clinic_id={clinic_id}",
        json=payload,
        headers={"Idempotency-Key": "test-idem-key-123"},
    )
    assert res1.status_code in (200, 201)
    data1 = res1.json()["data"]
    req1_id = data1["id"]

    # Submit 2nd request with same Idempotency-Key (immediate duplicate)
    res2 = await client.post(
        f"{settings.API_V1_PREFIX}/booking/request?clinic_id={clinic_id}",
        json=payload,
        headers={"Idempotency-Key": "test-idem-key-123"},
    )
    assert res2.status_code in (200, 201)
    data2 = res2.json()["data"]
    # Should return the identical request from cache
    assert data2["id"] == req1_id

    # 3. Approve the request and schedule it for 10:00:00
    approve_res1 = await client.post(
        f"{settings.API_V1_PREFIX}/appointment-requests/{req1_id}/approve",
        json={
            "therapist_id": therapist_id,
            "scheduled_date": "2026-09-25",
            "start_time": "10:00:00",
            "duration_minutes": 30,
        },
        headers=headers,
    )
    assert approve_res1.status_code == 200
    assert approve_res1.json()["data"]["appointment_id"] is not None

    # 4. Test Slot Availability Endpoint
    # Query availability for this clinic on 2026-09-25
    avail_res = await client.get(
        f"{settings.API_V1_PREFIX}/booking/availability/{clinic_id}?date=2026-09-25"
    )
    assert avail_res.status_code == 200
    avail_data = avail_res.json()["data"]
    assert avail_data["total_busy"] >= 1
    assert any(slot["start_time"] == "10:00" for slot in avail_data["busy_slots"])

    # 5. Test Slot Conflict Rejection
    # Create a 2nd request for a different patient
    payload2 = {
        "name": "Pooja Patel",
        "phone": "9876501234",
        "preferred_date": "2026-09-25",
        "preferred_slot": "10:00 AM",
    }
    res_req2 = await client.post(
        f"{settings.API_V1_PREFIX}/booking/request?clinic_id={clinic_id}",
        json=payload2,
    )
    assert res_req2.status_code in (200, 201)
    req2_id = res_req2.json()["data"]["id"]

    # Attempt to approve 2nd request at the EXACT SAME overlapping time with same therapist (10:00 to 10:30)
    conflict_res = await client.post(
        f"{settings.API_V1_PREFIX}/appointment-requests/{req2_id}/approve",
        json={
            "therapist_id": therapist_id,
            "scheduled_date": "2026-09-25",
            "start_time": "10:15:00",  # Overlaps 10:00 - 10:30
            "duration_minutes": 30,
        },
        headers=headers,
    )
    assert conflict_res.status_code == 400
    assert "already has an appointment scheduled" in conflict_res.json()["detail"]

    # 6. Test Returning Patient Auto-detection
    # Arjun Sharma already has a patient record created from approval above with phone "9123456780".
    # Submit a new booking request with the same phone number.
    payload_returning = {
        "name": "Arjun Sharma",
        "phone": "9123456780",
        "preferred_date": "2026-10-01",
        "preferred_slot": "02:00 PM",
    }
    returning_res = await client.post(
        f"{settings.API_V1_PREFIX}/booking/request?clinic_id={clinic_id}",
        json=payload_returning,
    )
    assert returning_res.status_code in (200, 201)
    returning_data = returning_res.json()["data"]
    assert returning_data["is_returning_patient"] is True
    assert "[Returning Patient:" in returning_data["notes"]
