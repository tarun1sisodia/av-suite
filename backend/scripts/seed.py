"""
Seed Script — AV Suite
======================
Wipes the entire DB + Supabase storage bucket, then seeds:
  • 2 Clinics
  • 3 Users per clinic  (admin, therapist, front_desk)
  • 2 Patients per clinic
  • UserPermission rows for each non-admin user (role defaults)

Run from the backend/ directory:
    python scripts/seed.py
"""

import asyncio
import sys
import os

# Make sure app imports work when running from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, datetime, timezone, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.core.security import get_password_hash
from app.core.rbac import get_role_template
from app.enums.user import UserRole
from app.enums.permission import CapabilityScope
from app.models import (
    Base,
    Clinic,
    User,
    UserPermission,
    Patient,
)
from app.models.treatment import TreatmentSession
from app.models.clinic import ClinicPlanTier
from app.models.patient import PatientStatus
from app.enums.shared import Gender

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SEED_PASSWORD = "Password@123"

CLINICS = [
    {
        "name": "Sunrise Physio Clinic",
        "branding_color": "#F97316",
        "plan_tier": ClinicPlanTier.practice,
        "index": 1,
    },
    {
        "name": "BluePeak Rehabilitation Centre",
        "branding_color": "#3B82F6",
        "plan_tier": ClinicPlanTier.clinical_pro,
        "index": 2,
    },
]

ROLES_PER_CLINIC = [UserRole.ADMIN, UserRole.THERAPIST, UserRole.FRONT_DESK]

PATIENTS_PER_CLINIC = [
    {
        "first_name": "Arjun",
        "last_name": "Sharma",
        "date_of_birth": date(1990, 4, 15),
        "phone": "9876543210",
        "age": 36,
        "gender": Gender.MALE,
        "chief_complaint": "Lower back pain",
        "status": PatientStatus.active,
    },
    {
        "first_name": "Priya",
        "last_name": "Mehta",
        "date_of_birth": date(1995, 8, 22),
        "phone": "9123456780",
        "age": 31,
        "gender": Gender.FEMALE,
        "chief_complaint": "Shoulder stiffness",
        "status": PatientStatus.active,
    },
]

# ---------------------------------------------------------------------------
# Helper: wipe Supabase storage bucket
# ---------------------------------------------------------------------------

def wipe_storage_bucket() -> None:
    """Delete every object in the Supabase 'documents' bucket."""
    try:
        from supabase import create_client

        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
        bucket = settings.SUPABASE_BUCKET_NAME

        offset = 0
        limit = 100
        total_deleted = 0
        while True:
            response = client.storage.from_(bucket).list(
                path="",
                options={"limit": limit, "offset": offset},
            )
            if not response:
                break
            paths = [f["name"] for f in response if f.get("name")]
            if paths:
                client.storage.from_(bucket).remove(paths)
                total_deleted += len(paths)
            if len(response) < limit:
                break
            offset += limit

        if total_deleted:
            print(f"  🗑️  Deleted {total_deleted} object(s) from bucket '{bucket}'")
        else:
            print(f"  ℹ️  Bucket '{bucket}' was already empty.")
        print(f"  ✅ Bucket '{bucket}' wiped.")
    except Exception as exc:
        print(f"  ⚠️  Could not wipe bucket (continuing): {exc}")


# ---------------------------------------------------------------------------
# Helper: drop + recreate all DB tables
# ---------------------------------------------------------------------------

async def wipe_database(engine) -> None:
    """Drop all tables and recreate them via SQLAlchemy metadata."""
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        print("  ✅ All tables dropped (schema wiped).")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("  ✅ Schema recreated from SQLAlchemy models.")


# ---------------------------------------------------------------------------
# Helper: build UserPermission rows for a non-admin user
# ---------------------------------------------------------------------------

def build_permission_rows(user: User, clinic_id, granted_by_id) -> list:
    rows = []
    template = get_role_template(user.role)
    for cap_key, scope in template.items():
        rows.append(
            UserPermission(
                clinic_id=clinic_id,
                user_id=user.id,
                capability_key=cap_key,
                scope=scope,
                granted_by=granted_by_id,
            )
        )
    return rows


# ---------------------------------------------------------------------------
# Main seed
# ---------------------------------------------------------------------------

async def seed() -> None:
    print("\n🌱  AV Suite — Seed Script")
    print("=" * 40)

    # 1. Wipe bucket
    print("\n[1/3] Wiping Supabase storage bucket …")
    wipe_storage_bucket()

    # 2. Wipe + recreate DB
    print("\n[2/3] Wiping database …")
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
    await wipe_database(engine)

    # 3. Seed data
    print("\n[3/3] Seeding data …")
    password_hash = get_password_hash(SEED_PASSWORD)

    AsyncSession_ = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSession_() as session:
        for clinic_cfg in CLINICS:
            print(f"\n  🏥 Clinic: {clinic_cfg['name']}")

            clinic = Clinic(
                name=clinic_cfg["name"],
                branding_color=clinic_cfg["branding_color"],
                plan_tier=clinic_cfg["plan_tier"],
                is_partner_clinic=False,
                is_documents_enabled=True,
            )
            session.add(clinic)
            await session.flush()

            # ---- Users (3 roles) ----------------------------------------
            admin_user = None
            therapist_user = None
            created_users = []

            role_meta = {
                UserRole.ADMIN:      ("Admin",     "User"),
                UserRole.THERAPIST:  ("Therapist", "User"),
                UserRole.FRONT_DESK: ("FrontDesk", "User"),
            }

            n = clinic_cfg["index"]
            email_map = {
                UserRole.ADMIN:      f"admin{n}@clinic.com",
                UserRole.THERAPIST:  f"therapist{n}_1@gmail.com",
                UserRole.FRONT_DESK: f"frontdesk{n}@gmail.com",
            }

            for role in ROLES_PER_CLINIC:
                first, last = role_meta[role]
                email = email_map[role]
                user = User(
                    clinic_id=clinic.id,
                    email=email,
                    password_hash=password_hash,
                    role=role,
                    first_name=first,
                    last_name=last,
                    phone=None,
                    is_active=True,
                )
                session.add(user)
                await session.flush()

                if role == UserRole.ADMIN:
                    admin_user = user
                elif role == UserRole.THERAPIST:
                    therapist_user = user

                created_users.append(user)
                print(f"    👤 [{role.value:10s}]  {email}")

            # ---- UserPermission rows for non-admin users ------------------
            for user in created_users:
                if user.role == UserRole.ADMIN:
                    continue
                perm_rows = build_permission_rows(
                    user=user,
                    clinic_id=clinic.id,
                    granted_by_id=admin_user.id if admin_user else None,
                )
                session.add_all(perm_rows)
                print(f"    🔐 Permissions seeded for [{user.role.value}] ({len(perm_rows)} caps)")

            # ---- Patients (2 per clinic) ---------------------------------
            for p_cfg in PATIENTS_PER_CLINIC:
                patient = Patient(
                    clinic_id=clinic.id,
                    user_id=None,
                    **p_cfg,
                )
                session.add(patient)
                await session.flush()
                print(f"    🧑‍⚕️ Patient: {p_cfg['first_name']} {p_cfg['last_name']}")

                # ---- Treatment Sessions with Home Advice & Clinical Notes ----
                treatments_seed = [
                    (
                        "Initial Assessment & Lumbar Spine Mobilization (Grade II-III)",
                        "Perform gentle cat-camel stretches twice daily. Avoid prolonged slumped sitting; use a lumbar roll when driving.",
                        "Patient demonstrated 35% restricted lumbar flexion with mild tenderness over L4-L5. Recommended 2 sessions per week.",
                        6,
                        datetime.now(timezone.utc) - timedelta(days=5),
                    ),
                    (
                        "Core Stabilization & Deep Tissue Release",
                        "Continue pelvic tilts (3 sets of 10 reps) and bird-dog exercises daily. Apply heat pack for 15 mins before bed.",
                        "Significant improvement noted: pain score reduced from 6 to 3. Lumbar extension range improved by 15 degrees.",
                        3,
                        datetime.now(timezone.utc) - timedelta(days=1),
                    ),
                ]
                for treat_name, advice, notes, pain, t_date in treatments_seed:
                    t_session = TreatmentSession(
                        clinic_id=clinic.id,
                        patient_id=patient.id,
                        appointment_id=None,
                        therapist_id=therapist_user.id if therapist_user else admin_user.id,
                        treatment_date=t_date,
                        pain_score=pain,
                        treatment=treat_name,
                        home_advice=advice,
                        notes=notes,
                        finalized=True,
                    )
                    session.add(t_session)
                print(f"       🩺 Seeded 2 treatment sessions with home advice & clinical notes")

        await session.commit()

    await engine.dispose()

    # ---- Summary ---------------------------------------------------------
    print("\n" + "=" * 40)
    print("✅  Seed complete!\n")
    print(f"   🔑 Password for ALL accounts : {SEED_PASSWORD}\n")
    print("   📋 Accounts created:\n")
    for clinic_cfg in CLINICS:
        n = clinic_cfg["index"]
        email_map = {
            UserRole.ADMIN:      f"admin{n}@clinic.com",
            UserRole.THERAPIST:  f"therapist{n}_1@gmail.com",
            UserRole.FRONT_DESK: f"frontdesk{n}@gmail.com",
        }
        print(f"   📍 {clinic_cfg['name']}")
        for role in ROLES_PER_CLINIC:
            print(f"      [{role.value:10s}]  {email_map[role]}")
        print()
    print("   Each clinic also has 2 patients: Arjun Sharma & Priya Mehta")
    print()


if __name__ == "__main__":
    asyncio.run(seed())
