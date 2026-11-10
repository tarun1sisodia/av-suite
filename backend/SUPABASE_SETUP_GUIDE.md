<!-- SECURITY NOTICE (2026-11-10): Any secrets previously committed to this file have been REVOKED by the developer and are NO LONGER VALID. Do not use them. -->

"""
SUPABASE SETUP GUIDE - IPv4 Session Pooler Configuration
=========================================================

Purpose: Yeh guide Supabase account setup, IPv4 session pooler configuration,
aur backend connection ke liye step-by-step instructions provide karta hai.

Target Audience: Developers, Admins, DevOps teams
Last Updated: 2026-05-18
"""

# ============================================================================
# STEP 1: Supabase Account Setup
# ============================================================================

/*
Supabase account create karne ke liye:
1. https://supabase.com/auth/signup par jaao
2. Email aur password se signup karo
3. New project create karo:
   - Project name: av-suite-backend (ya aapko jo pasand ho)
   - Database password: Strong password set karo (minimum 16 characters)
   - Region: Apne closest region select karo (latency kam hone ke liye)
   - Project create ho jaane ka wait karo (~2 minutes)
*/


# ============================================================================
# STEP 2: IPv4 Session Pooler Configuration
# ============================================================================

/*
IPv4 support ke liye Session Pooler use karna zaroori hai:

Session Pooler kya hai:
- Yeh connection pooling service hai jo IPv4 connectivity provide karta hai
- Direct PostgreSQL connection IPv6-only hai, Session Pooler IPv4 support karta hai
- Performance bhi better hai kyunki connections reuse hote hain

Session Pooler setup steps:
1. Supabase Dashboard > Database > Connection String
2. "Connection pooler" option select karo (dropdown mein)
3. Session mode select karo (default recommended hai)
4. Minimum and maximum pool sizes set karo:
   - Min: 1
   - Max: 10 (development ke liye)
   - Max for production: 20-50 depending on load
*/


# ============================================================================
# STEP 3: Connection String Extraction
# ============================================================================

/*
Session Pooler connection string format:

Format: postgresql+asyncpg://user.project_id:password@region.pooler.supabase.com:5432/postgres

Components:
- user: Always "postgres" (Supabase ke liye)
- project_id: Your project ID (Supabase dashboard mein visible hai)
- password: Database password jo aapne setup kiya
- region: aws-0-ap-northeast-1 (ya apka region)
- pooler: "pooler" keyword zaroori hai IPv4 ke liye
- port: 5432 (standard PostgreSQL port)
- database: "postgres" (default database)

Example:
postgresql+asyncpg://postgres.vlupywockwfvcduaiwrn:AZ^EYQa$khCa1MCKvUvf@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
*/


# ============================================================================
# STEP 4: Environment Configuration
# ============================================================================

/*
.env file setup steps:

1. Backend directory mein .env file create karo
2. .env.example copy karo aur values fill karo

Example .env file:
---
ENVIRONMENT=development
DEBUG=true
API_V1_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Session Pooler Connection String
DATABASE_URL=postgresql+asyncpg://postgres.project_id:password@region.pooler.supabase.com:5432/postgres

# JWT Configuration - strong secret key use karo
JWT_SECRET_KEY=generate_with_openssl_rand_hex_32
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

REDIS_URL=redis://localhost:6379
---

IMPORTANT SECURITY NOTES:
- .env file NEVER commit karo git mein
- .gitignore mein .env add hai jo files track karta hai
- Har environment (dev/staging/prod) ka alag .env hona chahiye
- Passwords ko strong banao (minimum 16 characters, mix of special chars)
*/


# ============================================================================
# STEP 5: Connection Testing
# ============================================================================

/*
Connection verify karne ke liye:

1. Virtual environment activate karo:
   cd backend
   source .venv/bin/activate

2. Dependencies install karo (pehli baar):
   pip install -e .

3. Test script run karo:
   python3 test_supabase_connection.py

Expected Output:
✅ Async engine created successfully
✅ Session created successfully
✅ Query executed successfully: (1,)
🎉 Supabase connection is working perfectly!

Agar error aaye:
- "Invalid DATABASE_URL format" → Connection string format check karo
- "Password authentication failed" → Password aur project_id verify karo
- "Connection timeout" → Internet connection aur region availability check karo
*/


# ============================================================================
# STEP 6: Troubleshooting
# ============================================================================

/*
Common Issues aur Solutions:

Issue 1: "asyncpg.PostgresError: could not translate host name"
Solution: Connection string mein region/project_id galat ho sakta hai
         Supabase dashboard se verify karo

Issue 2: "FATAL: password authentication failed for user postgres"
Solution: Database password galat hai
         Supabase dashboard > Database > Password reset karo

Issue 3: "Connection timeout or refused"
Solution: 
  - Internet connection check karo
  - Firewall settings check karo
  - Supabase region availability verify karo

Issue 4: "ERROR: relation does not exist"
Solution: Migrations run karo: alembic upgrade head

Security Issue: "secrets found in .env file"
Solution: .gitignore properly configured hai, no worries
         Kabhi bhi committed na ho to GitHub secrets management use karo
*/


# ============================================================================
# STEP 7: Production Deployment
# ============================================================================

/*
Production ke liye recommended setup:

1. Strong Database Password:
   - Minimum 20 characters
   - Mix of uppercase, lowercase, numbers, special chars
   - Password manager use karo

2. Connection Pool Optimization:
   - Min connections: 5
   - Max connections: 50-100 (load estimate karo)
   - Adjust based on monitoring

3. Environment Variables:
   - GitHub Secrets / Environment Variables use karo
   - Never commit .env in production
   - Rotate secrets regularly

4. Monitoring:
   - Supabase dashboard se connection metrics monitor karo
   - Database logs check karo regular intervals par
   - Slow queries identify aur optimize karo

5. Backup Strategy:
   - Supabase backups automatic hain
   - Additional backup solution implement karo (critical data ke liye)
   - Backup recovery plan banao
*/


# ============================================================================
# USEFUL LINKS
# ============================================================================

/*
- Supabase Documentation: https://supabase.com/docs
- Connection Pooling Guide: https://supabase.com/docs/guides/database/connecting-to-postgres
- PostgreSQL AsyncPG: https://github.com/MagicStack/asyncpg
- FastAPI Database Integration: https://fastapi.tiangolo.com/advanced/sql-databases-async/
*/


# ============================================================================
# QUICK REFERENCE
# ============================================================================

Connection String Components Checklist:
✓ Protocol: postgresql+asyncpg:// (for async support)
✓ Username: postgres.YOUR_PROJECT_ID (include project ID)
✓ Password: Your_Database_Password (from Supabase)
✓ Host: region.pooler.supabase.com (POOLER keyword is critical for IPv4)
✓ Port: 5432 (default PostgreSQL port)
✓ Database: postgres (default database)
✓ Format: postgresql+asyncpg://user.projectid:password@region.pooler.supabase.com:5432/postgres

Testing Steps:
1. .env properly configured ✓
2. python3 test_supabase_connection.py ✓
3. No errors in output ✓
4. Ready for deployment ✓
