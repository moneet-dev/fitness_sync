from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
import hashlib
import logging

logger = logging.getLogger("backend.utils")
logging.basicConfig(level=logging.INFO)
logger.setLevel(logging.INFO)

SECRET_KEY = "change_this_secret_for_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Ensure we preprocess long passwords the same way we did when hashing
    proc = _normalize_password_for_bcrypt(plain_password)
    try:
        result = pwd_context.verify(proc, hashed_password)
        logger.info("verify_password: input_bytes=%d proc_len=%d verified=%s",
                     len(plain_password.encode('utf-8')) if plain_password is not None else 0,
                     len(proc.encode('utf-8')) if proc is not None else 0,
                     result)
        return result
    except Exception:
        logger.exception("verify_password failed for proc_len=%d", len(proc.encode('utf-8')) if proc is not None else 0)
        raise


def get_password_hash(password: str) -> str:
    # bcrypt has a 72-byte input limit. For passwords longer than that we
    # pre-hash them with SHA-256 to produce a fixed-length value that can
    # safely be passed to the bcrypt backend.
    proc = _normalize_password_for_bcrypt(password)
    # log byte lengths for debugging (do not log raw passwords)
    try:
        in_len = len(password.encode('utf-8')) if password is not None else 0
        proc_len = len(proc.encode('utf-8')) if proc is not None else 0
        logger.info("get_password_hash: input_bytes=%d proc_len=%d", in_len, proc_len)
    except Exception:
        logger.exception("error logging password lengths")
    return pwd_context.hash(proc)


def _normalize_password_for_bcrypt(password: str) -> str:
    """Return a password string safe for bcrypt hashing.

    If the UTF-8 encoding of `password` is <=72 bytes we return it unchanged.
    For longer inputs we return the hex SHA-256 digest of the password.
    This preserves uniqueness while avoiding bcrypt's 72-byte limit.
    """
    # Passlib's bcrypt backend can pass byte strings for internal self-tests.
    # We should not modify these, so we return them as-is.
    if isinstance(password, bytes):
        logger.info("_normalize_password_for_bcrypt: received bytes, returning unchanged for passlib internal test.")
        return password

    if password is None:
        logger.info("_normalize_password_for_bcrypt: received None, returning None.")
        return password

    pw_bytes = password.encode("utf-8")
    in_len = len(pw_bytes)

    if in_len <= 72:
        logger.info("_normalize_password_for_bcrypt: input is %d bytes (<=72), returning as string.", in_len)
        try:
            # Prefer utf-8 decoding; fall back to latin-1 to preserve bytes
            return pw_bytes.decode("utf-8")
        except Exception:
            return pw_bytes.decode("latin-1")

    # Pre-hash to a fixed-length hex string for inputs >72 bytes
    hashed_output = hashlib.sha256(pw_bytes).hexdigest()
    logger.info("_normalize_password_for_bcrypt: input is %d bytes (>72), returning SHA-256 hash.", in_len)
    return hashed_output


def create_access_token(
    subject: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    to_encode = subject.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
    return payload
