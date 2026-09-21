from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
import logging

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_capability
from app.enums.permission import CapabilityScope
from app.models.user import User
from app.schemas.user import UserRead, UserCreate
from app.core.rbac import validate_capability_scope
from app.core.security import get_password_hash
from app.schemas.envelope import ResponseEnvelope
from app.repositories.user_permission import UserPermissionRepository
from app.schemas.user_permission import UserPermissionRead, UserPermissionCreate
from app.enums.user import UserRole
from app.repositories.audit import AuditLogRepository
from app.services.audit import AuditLogService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=ResponseEnvelope[List[UserRead]], tags=["Users"])
async def list_users(
    request: Request,
    db: AsyncSession = Depends(get_db),
    scope: CapabilityScope = Depends(require_capability("users.view")),
):
    """
    List all users/therapists in the clinic.
    """
    clinic_id = request.state.clinic_id
    
    stmt = select(User).where(User.clinic_id == clinic_id)
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    # We must return dicts with 'name' since User doesn't have it.
    users_data = []
    for user in users:
        u_dict = {
            "id": user.id,
            "clinic_id": user.clinic_id,
            "name": f"{user.first_name} {user.last_name}".strip(),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        }
        users_data.append(u_dict)
        
    return ResponseEnvelope(data=users_data)


@router.post("", response_model=ResponseEnvelope[UserRead], status_code=201, tags=["Users"])
async def create_user(
    payload: UserCreate, 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    scope: CapabilityScope = Depends(require_capability("users.create")),
):
    """
    Create a new user in the clinic.
    """
    clinic_id = request.state.clinic_id
    
    # Check if email already exists globally
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
        
    hashed_password = get_password_hash(payload.password)
    
    # Extract first/last name if only name is provided
    fname = payload.first_name
    lname = payload.last_name
    
    if not fname and not lname and payload.name:
        parts = payload.name.split(" ", 1)
        fname = parts[0]
        lname = parts[1] if len(parts) > 1 else ""
        
    new_user = User(
        clinic_id=clinic_id,
        email=payload.email,
        password_hash=hashed_password,
        first_name=fname or "",
        last_name=lname or "",
        phone=payload.phone,
        role=payload.role.value,
        is_active=payload.is_active
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Add name field for UserRead compatibility
    u_dict = {
        "id": new_user.id,
        "clinic_id": new_user.clinic_id,
        "name": f"{new_user.first_name} {new_user.last_name}".strip(),
        "first_name": new_user.first_name,
        "last_name": new_user.last_name,
        "email": new_user.email,
        "phone": new_user.phone,
        "role": new_user.role,
        "is_active": new_user.is_active,
        "created_at": new_user.created_at,
        "updated_at": new_user.updated_at
    }
    
    return ResponseEnvelope(data=u_dict)


@router.get("/{user_id}/permissions", response_model=ResponseEnvelope[List[UserPermissionRead]], tags=["Users"])
async def get_user_permissions(
    user_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    scope: CapabilityScope = Depends(require_capability("permissions.view")),
):
    """
    Get all explicit permission overrides for a user in the clinic.
    """
    clinic_id = request.state.clinic_id
    repo = UserPermissionRepository(db)
    
    # Verify user belongs to clinic
    user_stmt = select(User).where(User.id == user_id, User.clinic_id == clinic_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    permissions = await repo.list_for_user_in_clinic(clinic_id, user_id)
    return ResponseEnvelope(data=permissions)


@router.put("/{user_id}/permissions", response_model=ResponseEnvelope[List[UserPermissionRead]], tags=["Users"])
async def update_user_permissions(
    user_id: UUID, 
    permissions: List[UserPermissionCreate], 
    request: Request, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: CapabilityScope = Depends(require_capability("permissions.edit")),
):
    """
    Completely replace the user's explicit permission overrides.
    Any existing override not in this list will be removed.
    """
    clinic_id = request.state.clinic_id
    repo = UserPermissionRepository(db)
    
    # Verify user belongs to clinic
    user_stmt = select(User).where(User.id == user_id, User.clinic_id == clinic_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    granted_by = current_user.id
    
    # Validate all incoming capabilities and scopes against registry
    for p in permissions:
        try:
            validate_capability_scope(p.capability_key, p.scope)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid capability override: {exc}",
            )

    # Lockout Guard: Prevent removing 'permissions.edit' or 'users.edit' capability from last admin
    new_perms_override = next((p.scope for p in permissions if p.capability_key == 'permissions.edit'), None)
    new_users_override = next((p.scope for p in permissions if p.capability_key == 'users.edit'), None)
    
    # We only care if they are explicitly being set to 'none' and target is currently an Admin
    if user.role == UserRole.ADMIN.value and (new_perms_override == 'none' or new_users_override == 'none'):
        # Check if any OTHER active admin exists without a 'none' override
        all_admins_stmt = select(User).where(User.clinic_id == clinic_id, User.role == UserRole.ADMIN.value, User.is_active == True, User.id != user_id)
        other_admins = (await db.execute(all_admins_stmt)).scalars().all()
        
        has_other_admin_with_perms = False
        for admin in other_admins:
            admin_overrides = await repo.list_for_user_in_clinic(clinic_id, admin.id)
            perms_override = next((p.scope for p in admin_overrides if p.capability_key == 'permissions.edit'), None)
            users_override = next((p.scope for p in admin_overrides if p.capability_key == 'users.edit'), None)
            
            # If the other admin does not have a 'none' override for either, they are safe
            if perms_override != 'none' and users_override != 'none':
                has_other_admin_with_perms = True
                break
                
        if not has_other_admin_with_perms:
            raise HTTPException(status_code=400, detail="Lockout Guard: Cannot revoke permissions/users management capability from the last clinic administrator.")
    
    # Setup audit service
    audit_service = AuditLogService(AuditLogRepository(db))
    
    # Get existing overrides
    existing = await repo.list_for_user_in_clinic(clinic_id, user_id)
    existing_keys = {e.capability_key for e in existing}
    new_keys = {p.capability_key for p in permissions}
    
    # Delete overrides that are not in the new payload
    for key_to_delete in existing_keys - new_keys:
        await repo.delete_for_user_capability(
            clinic_id=clinic_id,
            user_id=user_id,
            capability_key=key_to_delete
        )
        await audit_service.log_event(
            clinic_id=clinic_id,
            user_id=granted_by,
            action="revoke_permission",
            entity_type="user_permissions",
            entity_id=user_id,
            details={"capability_key": key_to_delete, "target_user_id": str(user_id)}
        )
        
    # Upsert the provided overrides
    updated_perms = []
    for p in permissions:
        # Check if it changed or is new
        existing_perm = next((e for e in existing if e.capability_key == p.capability_key), None)
        if not existing_perm or existing_perm.scope != p.scope:
            perm = await repo.set_override(
                clinic_id=clinic_id,
                user_id=user_id,
                capability_key=p.capability_key,
                scope=p.scope,
                granted_by=granted_by
            )
            updated_perms.append(perm)
            await audit_service.log_event(
                clinic_id=clinic_id,
                user_id=granted_by,
                action="grant_permission",
                entity_type="user_permissions",
                entity_id=user_id,
                details={"capability_key": p.capability_key, "scope": p.scope, "target_user_id": str(user_id)}
            )
        else:
            updated_perms.append(existing_perm)
        
    await db.commit()
    
    return ResponseEnvelope(data=updated_perms)


@router.delete("/{user_id}", response_model=ResponseEnvelope[None], tags=["Users"])
async def delete_user(
    user_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope: CapabilityScope = Depends(require_capability("users.delete")),
):
    """
    Remove a user from the clinic.
    """
    clinic_id = request.state.clinic_id
    
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself.")
        
    user_stmt = select(User).where(User.id == user_id, User.clinic_id == clinic_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent deleting the last admin
    if user.role == UserRole.ADMIN.value:
        all_admins_stmt = select(User).where(User.clinic_id == clinic_id, User.role == UserRole.ADMIN.value, User.is_active == True, User.id != user_id)
        other_admins = (await db.execute(all_admins_stmt)).scalars().all()
        if not other_admins:
            raise HTTPException(status_code=400, detail="Cannot remove the last clinic administrator.")
            
    await db.delete(user)
    
    # Audit log
    audit_service = AuditLogService(AuditLogRepository(db))
    await audit_service.log_event(
        clinic_id=clinic_id,
        user_id=current_user.id,
        action="delete_user",
        entity_type="users",
        entity_id=user_id,
        details={"deleted_user_email": user.email, "deleted_user_role": user.role}
    )
    
    await db.commit()
    return ResponseEnvelope(data=None)
