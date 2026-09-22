"""
Module: clinic_gate.py
Purpose: Authentication aur authorization middleware
Yeh module JWT token verification aur clinic isolation ensure karta hai.
Middleware request flow mein token validate karta hai aur request context set karta hai.

Key Components:
- ClinicGateMiddleware class: BaseHTTPMiddleware extend karta hai
- JWT token verification: Authorization header se token extract aur validate
- Request context setting: clinic_id, user_id, role set karte hain request.state mein

Security Considerations:
- Bearer token validation: Proper format check
- JWT signature verification: Token tampering detection
- Clinic isolation: Multi-tenant data security ensure
- Error handling: Generic error messages (no info leakage)
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from jose import jwt, JWTError
from app.core.config import settings
from app.enums.user import normalize_user_role
import logging

logger = logging.getLogger(__name__)

PUBLIC_PATH_PREFIXES = (
    f"{settings.API_V1_PREFIX}/auth",
    f"{settings.API_V1_PREFIX}/booking/branding",
    f"{settings.API_V1_PREFIX}/booking/availability",
    f"{settings.API_V1_PREFIX}/booking/request",
)



class ClinicGateMiddleware(BaseHTTPMiddleware):
    """
    Class ka purpose: Authentication aur authorization middleware
    Yeh middleware har API request ko intercept karta hai,
    JWT token verify karta hai, aur clinic/user context set karta hai.
    
    Flow:
    1. Request intercept (BaseHTTPMiddleware from Starlette)
    2. Public endpoints skip karte hain (PUBLIC_PATH_PREFIXES)
    3. Protected endpoints ke liye token check karte hain
    4. Token verify karte hain aur claim extract karte hain
    5. request.state mein clinic_id, user_id, role set karte hain
    6. Endpoint execution ko allow karte hain (token valid ho to)
    
    Middleware Chain Position:
    - Application startup mein add hota hai
    - har incoming request se pehle run hota hai
    - Authorization logic centralized ho jaata hai
    
    Benefits:
    - Single authorization logic: DRY principle follow
    - Consistent token handling: Sab endpoints uniform behavior
    - Request context population: Endpoints easily user info access
    - Early rejection: Invalid tokens immediately reject
    """
    
    async def dispatch(self, request: Request, call_next):
        """
        Function ka purpose: Middleware dispatch logic - token verify aur context set karna
        Yeh function har request ko intercept karta hai aur authentication check karta hai.
        
        Input:
        - request (Request): FastAPI/Starlette request object
        - call_next: Next middleware/endpoint ko call karne ke liye callable
        
        Output: Response
        - JSONResponse: Error response (agar token invalid/missing)
        - Next endpoint response: Agar token valid (successful authentication)
        
        Error Handling:
        - Missing token: 401 UNAUTHORIZED response
        - Invalid format: 401 UNAUTHORIZED response
        - Invalid signature: 401 UNAUTHORIZED response
        - Expired token: 401 UNAUTHORIZED response
        - Missing claims: 401 UNAUTHORIZED response
        
        Flow:
        1. Request path check karte hain (protected endpoint hai ki public)
        2. Authorization header extract karte hain
        3. Bearer token validate karte hain
        4. JWT token decode aur verify karte hain
        5. Claims extract karte hain (clinic_id, user_id, role)
        6. Request state populate karte hain
        7. Next endpoint/middleware ko call karte hain
        
        Security Notes:
        - Token extraction: String split se bearer part extract
        - JWT verification: SECRET_KEY aur algorithm use karte hain
        - Constant-time comparison: Timing attacks prevent
        - Error messages: Generic (no details leak)
        """
        
        # Get request path
        path = request.url.path
        logger.debug(f"Middleware processing request: {request.method} {path}")
        
        # Skip public endpoints
        # PUBLIC_PATH_PREFIXES endpoints ko middleware bypass karte hain (no token needed)
        # Authentication aur public booking endpoints publicly accessible
        # Yeh configuration se configurable hai (settings.API_V1_PREFIX)
        if not path.startswith(settings.API_V1_PREFIX) or path.startswith(PUBLIC_PATH_PREFIXES):
            logger.debug(f"Public endpoint, skipping authentication: {path}")
            return await call_next(request)

        logger.debug(f"Protected endpoint, checking authorization: {path}")
        
        # Extract Authorization header
        # Format: Authorization: Bearer {jwt_token}
        # Case-insensitive header name (HTTP standard)
        auth_header = request.headers.get("Authorization")
        
        # Token presence aur format check
        # Bearer token format required
        # Missing token ya wrong format = 401 Unauthorized
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning(f"Missing or invalid authorization header for {path}")
            return JSONResponse(
                status_code=401,
                content={
                    "data": None,
                    "meta": {
                        "error": {
                            "code": "UNAUTHORIZED",
                            "message": "Missing or invalid token"  # Generic message
                        }
                    }
                }
            )

        try:
            # Extract token from header
            # Split "Bearer {token}" to get token part
            # Index [1] = token part (Index [0] = "Bearer")
            token = auth_header.split(" ")[1]
            logger.debug(f"Token extracted, attempting verification")
            
            # Decode aur verify JWT token
            # JWT.decode automatically:
            # - Signature verify karta hai (tampering detection)
            # - Expiration check karta hai
            # - Algorithm validation karta hai
            # Agar invalid = JWTError exception
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            logger.debug(f"Token verified successfully")
            
            # Extract claims from JWT payload
            # "clinic_id": Multi-tenant isolation key
            # "sub": Subject = user_id (unique user identifier)
            # "role": User role (admin, physio, patient, nurse, etc.)
            clinic_id = payload.get("clinic_id")
            user_id = payload.get("sub")
            raw_role = payload.get("role")
            
            # Validate all required claims present
            # Required claims ensure karte hain complete user context available
            # Missing claims = corrupted token
            if not clinic_id or not user_id or not raw_role:
                logger.warning(f"Missing required JWT claims for {path}")
                raise JWTError("Invalid token payload")

            try:
                role = normalize_user_role(raw_role)
            except ValueError as exc:
                logger.warning(f"Invalid user role in token for {path}: {raw_role}")
                raise JWTError("Invalid token payload") from exc

            # Set request context
            # request.state mein middleware data store karte hain
            # Endpoints yahan se access kar sakte hain: request.state.clinic_id, etc.
            # Multi-tenant isolation: clinic_id har query mein filter karte hain
            request.state.clinic_id = clinic_id
            request.state.user_id = user_id
            request.state.role = role
            
            logger.info(f"Authorization successful - user: {user_id}, clinic: {clinic_id}, role: {role}")

        except JWTError as e:
            # JWT validation failed
            # Reasons:
            # - Invalid signature (tampered token)
            # - Expired token (iat/exp claims)
            # - Wrong algorithm
            # - Corrupted/malformed token
            logger.warning(f"JWT validation failed for {path}: {str(e)}")
            return JSONResponse(
                status_code=401,
                content={
                    "data": None,
                    "meta": {
                        "error": {
                            "code": "UNAUTHORIZED",
                            "message": "Invalid or expired token"  # Generic message
                        }
                    }
                }
            )

        # Call next middleware/endpoint
        # Request context (clinic_id, user_id, role) available endpoints mein
        # Endpoints use karte hain clinic_id multi-tenant filtering ke liye
        response = await call_next(request)
        return response

