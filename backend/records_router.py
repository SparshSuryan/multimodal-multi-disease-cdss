import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field

DB_PATH = Path(__file__).resolve().parent / "cdss_records.db"
SECRET_KEY = os.environ.get("CDSS_AUTH_SECRET", "jiit-cdss-2026-secret-key").encode("utf-8")

router = APIRouter(prefix="/api/v1", tags=["Auth & Patient Records"])


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"{salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
        return hmac.compare_digest(hash_password(password, salt), stored)
    except Exception:
        return False


def create_token(user_id: int, email: str, role: str, full_name: str) -> str:
    payload = json.dumps({
        "sub": user_id,
        "email": email,
        "role": role,
        "name": full_name,
        "exp": int(time.time()) + 86400 * 7,
    }, separators=(",", ":")).encode("utf-8")
    sig = hmac.new(SECRET_KEY, payload, hashlib.sha256).hexdigest()
    return f"{payload.hex()}.{sig}"


def decode_token(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload_hex, sig = token.split(".", 1)
        payload = bytes.fromhex(payload_hex)
        expected_sig = hmac.new(SECRET_KEY, payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            raise ValueError("Invalid signature")
        data = json.loads(payload.decode("utf-8"))
        if data.get("exp", 0) < int(time.time()):
            raise ValueError("Token expired")
        return data
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session token.")


def require_admin(user: Dict[str, Any] = Depends(decode_token)) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator privileges required.")
    return user


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('doctor', 'admin')),
                department TEXT DEFAULT 'General Medicine',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_uid TEXT NOT NULL UNIQUE,
                full_name TEXT NOT NULL,
                phone TEXT NOT NULL UNIQUE,
                age INTEGER,
                sex TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS consultations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                doctor_name TEXT NOT NULL,
                module_name TEXT NOT NULL,
                prediction TEXT,
                risk_score REAL,
                risk_level TEXT,
                reliability REAL,
                inputs_json TEXT,
                result_json TEXT,
                created_at TEXT NOT NULL
            );
            """
        )
        now = datetime.now(timezone.utc).isoformat()
        # Seed default Doctor & Admin accounts if empty
        cur = conn.execute("SELECT COUNT(*) AS c FROM users")
        if cur.fetchone()["c"] == 0:
            conn.execute(
                "INSERT INTO users (full_name, email, password_hash, role, department, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                ("Dr. Sparsh Suryan", "doctor@cdss.org", hash_password("Doctor@123"), "doctor", "Internal Medicine & Cardiology", now),
            )
            conn.execute(
                "INSERT INTO users (full_name, email, password_hash, role, department, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                ("System Administrator", "admin@cdss.org", hash_password("Admin@123"), "admin", "Clinical IT Governance", now),
            )


init_db()


# --- Schemas ---
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterUserRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = Field(default="doctor", pattern="^(doctor|admin)$")
    department: str = "General Medicine"


class PatientUpsertRequest(BaseModel):
    full_name: str
    phone: str
    age: Optional[int] = None
    sex: Optional[str] = None
    patient_uid: Optional[str] = None


class ConsultationCreateRequest(BaseModel):
    module_name: str
    prediction: Optional[str] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    reliability: Optional[float] = None
    inputs: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None


# --- Auth Endpoints ---
@router.post("/auth/login")
def login(body: LoginRequest):
    email = body.email.strip().lower()
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE lower(email) = ?", (email,)).fetchone()
        if not row or not verify_password(body.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        token = create_token(row["id"], row["email"], row["role"], row["full_name"])
        return {
            "access_token": token,
            "user": {
                "id": row["id"],
                "full_name": row["full_name"],
                "email": row["email"],
                "role": row["role"],
                "department": row["department"],
            },
        }


@router.post("/auth/register")
def register_user(body: RegisterUserRequest, _admin: Dict[str, Any] = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO users (full_name, email, password_hash, role, department, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (body.full_name.strip(), body.email.strip().lower(), hash_password(body.password), body.role, body.department.strip(), now),
            )
            return {"id": cur.lastrowid, "email": body.email.strip().lower(), "role": body.role}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")


@router.get("/admin/overview")
def admin_overview(_admin: Dict[str, Any] = Depends(require_admin)):
    with get_conn() as conn:
        users = [dict(r) for r in conn.execute("SELECT id, full_name, email, role, department, created_at FROM users ORDER BY id ASC").fetchall()]
        patient_count = conn.execute("SELECT COUNT(*) AS c FROM patients").fetchone()["c"]
        consult_count = conn.execute("SELECT COUNT(*) AS c FROM consultations").fetchone()["c"]
        by_module = [
            dict(r)
            for r in conn.execute(
                "SELECT module_name, COUNT(*) AS count FROM consultations GROUP BY module_name ORDER BY count DESC"
            ).fetchall()
        ]
        recent = [
            dict(r)
            for r in conn.execute(
                """
                SELECT c.id, p.patient_uid, p.full_name AS patient_name, c.doctor_name,
                       c.module_name, c.prediction, c.risk_score, c.risk_level, c.created_at
                FROM consultations c
                JOIN patients p ON p.id = c.patient_id
                ORDER BY c.id DESC LIMIT 20
                """
            ).fetchall()
        ]
        return {
            "total_users": len(users),
            "total_patients": patient_count,
            "total_consultations": consult_count,
            "by_module": by_module,
            "users": users,
            "recent_consultations": recent,
        }


# --- Patient & Consultation Endpoints ---
def _format_patient_with_history(conn: sqlite3.Connection, patient_row: sqlite3.Row) -> Dict[str, Any]:
    p = dict(patient_row)
    rows = conn.execute(
        "SELECT * FROM consultations WHERE patient_id = ? ORDER BY id DESC",
        (p["id"],),
    ).fetchall()
    history = []
    for r in rows:
        item = dict(r)
        item["inputs"] = json.loads(item.pop("inputs_json") or "{}")
        item["result"] = json.loads(item.pop("result_json") or "{}")
        history.append(item)
    p["consultations"] = history
    return p


@router.post("/patients")
def create_or_update_patient(body: PatientUpsertRequest, _user: Dict[str, Any] = Depends(decode_token)):
    phone = body.phone.strip()
    if not phone or not body.full_name.strip():
        raise HTTPException(status_code=400, detail="Patient name and contact number are required.")

    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT * FROM patients WHERE phone = ? OR patient_uid = ?",
            (phone, (body.patient_uid or "").strip().upper()),
        ).fetchone()

        if existing:
            conn.execute(
                "UPDATE patients SET full_name = ?, phone = ?, age = COALESCE(?, age), sex = COALESCE(?, sex) WHERE id = ?",
                (body.full_name.strip(), phone, body.age, body.sex, existing["id"]),
            )
            updated = conn.execute("SELECT * FROM patients WHERE id = ?", (existing["id"],)).fetchone()
            return _format_patient_with_history(conn, updated)

        next_num = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM patients").fetchone()["n"]
        uid = (body.patient_uid or f"PT-2026-{next_num:04d}").strip().upper()
        cur = conn.execute(
            "INSERT INTO patients (patient_uid, full_name, phone, age, sex, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (uid, body.full_name.strip(), phone, body.age, body.sex, now),
        )
        created = conn.execute("SELECT * FROM patients WHERE id = ?", (cur.lastrowid,)).fetchone()
        return _format_patient_with_history(conn, created)


@router.get("/patients/search")
def search_patients(
    q: str = Query(..., min_length=1, description="Patient ID (PT-2026-XXXX), phone number, or name"),
    _user: Dict[str, Any] = Depends(decode_token),
):
    term = q.strip()
    like_term = f"%{term}%"
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT * FROM patients
            WHERE upper(patient_uid) = upper(?)
               OR phone LIKE ?
               OR lower(full_name) LIKE lower(?)
            ORDER BY id DESC LIMIT 10
            """,
            (term, like_term, like_term),
        ).fetchall()
        return {"results": [_format_patient_with_history(conn, r) for r in rows]}


@router.get("/patients/{patient_uid}")
def get_patient(patient_uid: str, _user: Dict[str, Any] = Depends(decode_token)):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM patients WHERE upper(patient_uid) = upper(?) OR phone = ?",
            (patient_uid.strip(), patient_uid.strip()),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Patient record not found.")
        return _format_patient_with_history(conn, row)


@router.post("/patients/{patient_uid}/consultations")
def add_consultation(
    patient_uid: str,
    body: ConsultationCreateRequest,
    user: Dict[str, Any] = Depends(decode_token),
):
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        patient = conn.execute(
            "SELECT * FROM patients WHERE upper(patient_uid) = upper(?)",
            (patient_uid.strip(),),
        ).fetchone()
        if not patient:
            raise HTTPException(status_code=404, detail="Active patient record not found.")

        conn.execute(
            """
            INSERT INTO consultations
                (patient_id, doctor_name, module_name, prediction, risk_score, risk_level, reliability, inputs_json, result_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient["id"],
                user.get("name", "Attending Physician"),
                body.module_name,
                body.prediction,
                body.risk_score,
                body.risk_level,
                body.reliability,
                json.dumps(body.inputs or {}),
                json.dumps(body.result or {}),
                now,
            ),
        )
        refreshed = conn.execute("SELECT * FROM patients WHERE id = ?", (patient["id"],)).fetchone()
        return _format_patient_with_history(conn, refreshed)