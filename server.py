from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request, Response, Cookie
from fastapi.responses import FileResponse, Response as StarletteResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
import requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
JWT_EXPIRE_HOURS = 24 * 7

LAWYER_EMAIL = os.environ['LAWYER_EMAIL']
LAWYER_DEFAULT_PASSWORD = os.environ['LAWYER_DEFAULT_PASSWORD']
LAWYER_NAME = os.environ['LAWYER_NAME']
PARTNER_EMAIL = os.environ.get('PARTNER_EMAIL', '').lower()
PARTNER_PASSWORD = os.environ.get('PARTNER_PASSWORD', '')
PARTNER_NAME = os.environ.get('PARTNER_NAME', '')

# ============= EMERGENT OBJECT STORAGE =============
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "obaidi-law")
_storage_key: Optional[str] = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        # Refresh key and retry once
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# ============= UTILS =============
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_jwt(payload: dict) -> str:
    to_encode = payload.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None


# ============= MODELS =============
class LawyerLoginReq(BaseModel):
    email: EmailStr
    password: str


class ClientCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    address: Optional[str] = ""
    notes: Optional[str] = ""


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CaseUpdate_(BaseModel):
    date: str
    note: str


class CaseCreate(BaseModel):
    client_id: str
    title: str
    case_number: Optional[str] = ""
    description: Optional[str] = ""
    case_type: Optional[str] = "مدني"
    status: Literal["open", "in_progress", "court", "closed", "won", "lost"] = "open"
    court: Optional[str] = ""
    next_hearing: Optional[str] = None


class CasePatch(BaseModel):
    title: Optional[str] = None
    case_number: Optional[str] = None
    description: Optional[str] = None
    case_type: Optional[str] = None
    status: Optional[str] = None
    court: Optional[str] = None
    next_hearing: Optional[str] = None


class CaseUpdateAdd(BaseModel):
    note: str


class InvoiceCreate(BaseModel):
    client_id: str
    case_id: Optional[str] = None
    description: str
    amount: float
    paid_amount: float = 0.0
    due_date: Optional[str] = None


class InvoicePatch(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    paid_amount: Optional[float] = None
    due_date: Optional[str] = None


class MessageCreate(BaseModel):
    client_id: str
    content: str


class MessageClientCreate(BaseModel):
    content: str


class NotificationCreate(BaseModel):
    client_id: Optional[str] = None  # None => broadcast
    title: str
    body: str


class AppointmentCreate(BaseModel):
    date: str
    purpose: str
    notes: Optional[str] = ""


class AppointmentPatch(BaseModel):
    status: Optional[Literal["pending", "confirmed", "cancelled", "done"]] = None
    notes: Optional[str] = None
    date: Optional[str] = None


# ============= SEED LAWYER =============
async def seed_lawyer():
    # Owner lawyer (full control)
    existing = await db.lawyers.find_one({"email": LAWYER_EMAIL}, {"_id": 0})
    if not existing:
        await db.lawyers.insert_one({
            "lawyer_id": new_id("lw"),
            "email": LAWYER_EMAIL,
            "password_hash": hash_password(LAWYER_DEFAULT_PASSWORD),
            "name": LAWYER_NAME,
            "role": "owner",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded owner lawyer: {LAWYER_EMAIL}")
    else:
        updates = {"name": LAWYER_NAME, "role": "owner"}
        if not verify_password(LAWYER_DEFAULT_PASSWORD, existing.get("password_hash", "")):
            updates["password_hash"] = hash_password(LAWYER_DEFAULT_PASSWORD)
            logger.info(f"Rotated owner password from env for: {LAWYER_EMAIL}")
        await db.lawyers.update_one({"email": LAWYER_EMAIL}, {"$set": updates})

    # Partner lawyer (read-only)
    if PARTNER_EMAIL and PARTNER_PASSWORD:
        p_existing = await db.lawyers.find_one({"email": PARTNER_EMAIL}, {"_id": 0})
        if not p_existing:
            await db.lawyers.insert_one({
                "lawyer_id": new_id("lw"),
                "email": PARTNER_EMAIL,
                "password_hash": hash_password(PARTNER_PASSWORD),
                "name": PARTNER_NAME,
                "role": "partner",
                "created_at": now_iso(),
            })
            logger.info(f"Seeded partner lawyer: {PARTNER_EMAIL}")
        else:
            updates = {"name": PARTNER_NAME, "role": "partner"}
            if not verify_password(PARTNER_PASSWORD, p_existing.get("password_hash", "")):
                updates["password_hash"] = hash_password(PARTNER_PASSWORD)
                logger.info(f"Rotated partner password from env for: {PARTNER_EMAIL}")
            await db.lawyers.update_one({"email": PARTNER_EMAIL}, {"$set": updates})


@app.on_event("startup")
async def startup():
    await seed_lawyer()
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Object storage init failed: {e}")


# ============= AUTH DEPS =============
async def get_lawyer(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = auth.split(" ", 1)[1]
    payload = decode_jwt(token)
    if not payload or payload.get("role") != "lawyer":
        raise HTTPException(401, "Invalid lawyer token")
    lw = await db.lawyers.find_one({"lawyer_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not lw:
        raise HTTPException(401, "Lawyer not found")
    return lw


async def require_owner(lw: dict = Depends(get_lawyer)) -> dict:
    if lw.get("role", "owner") != "owner":
        raise HTTPException(403, "عملية غير مسموحة — صلاحيات عرض فقط")
    return lw


async def get_client_user(request: Request) -> dict:
    # Check cookie first, then Authorization header
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            session_token = auth.split(" ", 1)[1]
    if not session_token:
        raise HTTPException(401, "Not authenticated")

    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(401, "Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(401, "Session expired")

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")

    # Find linked client record by email
    client_rec = await db.clients.find_one({"email": user["email"]}, {"_id": 0})
    if not client_rec:
        raise HTTPException(403, "لا يوجد ملف موكل مرتبط بهذا البريد. يرجى مراجعة المكتب لإضافتك كموكل.")

    return {"user": user, "client": client_rec}


# ============= PUBLIC =============
@api_router.get("/")
async def root():
    return {"message": "Abdullah Obaidi Law Office API"}


@api_router.get("/public/info")
async def public_info():
    return {
        "name": "عبدالله أحمد العبيدي",
        "name_en": "Abdullah Ahmed Al-Obaidi",
        "phone": "07726317519",
        "email": "aabbbd12341234@gmail.com",
        "address": "بغداد - شارع فلسطين - حي المهندسين",
        "address_en": "Baghdad - Palestine Street - Al-Muhandisin District",
    }


# ============= LAWYER AUTH =============
@api_router.post("/lawyer/login")
async def lawyer_login(req: LawyerLoginReq):
    lw = await db.lawyers.find_one({"email": req.email.lower()}, {"_id": 0})
    if not lw or not verify_password(req.password, lw["password_hash"]):
        raise HTTPException(401, "بيانات الدخول غير صحيحة")
    role = lw.get("role", "owner")
    token = create_jwt({"sub": lw["lawyer_id"], "role": "lawyer", "email": lw["email"]})
    return {"token": token, "lawyer": {"lawyer_id": lw["lawyer_id"], "email": lw["email"], "name": lw["name"], "role": role}}


@api_router.get("/lawyer/me")
async def lawyer_me(lw: dict = Depends(get_lawyer)):
    return lw


# ============= CLIENT AUTH (Emergent Google Auth) =============
@api_router.post("/auth/session")
async def client_auth_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(400, "Missing X-Session-ID")
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.error(f"Emergent auth failed: {e}")
        raise HTTPException(401, "فشل التحقق من جلسة جوجل")

    email = data["email"].lower()
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture", "")
    session_token = data["session_token"]

    # Check if a client record exists with this email
    client_rec = await db.clients.find_one({"email": email}, {"_id": 0})

    # Upsert user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = new_id("user")
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": now_iso(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_iso(),
    })

    # If client exists, link google user_id to it
    if client_rec:
        await db.clients.update_one({"client_id": client_rec["client_id"]}, {"$set": {"google_user_id": user_id}})

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return {
        "user": {"user_id": user_id, "email": email, "name": name, "picture": picture},
        "has_client_record": client_rec is not None,
        "client": client_rec,
        "session_token": session_token,
    }


@api_router.get("/auth/me")
async def auth_me(ctx: dict = Depends(get_client_user)):
    return {"user": ctx["user"], "client": ctx["client"]}


@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ============= LAWYER: CLIENTS =============
@api_router.get("/clients")
async def list_clients(lw: dict = Depends(get_lawyer)):
    docs = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/clients")
async def create_client(body: ClientCreate, lw: dict = Depends(require_owner)):
    email = body.email.lower()
    if await db.clients.find_one({"email": email}, {"_id": 0}):
        raise HTTPException(400, "يوجد موكل بنفس البريد")
    doc = {
        "client_id": new_id("cl"),
        "name": body.name,
        "email": email,
        "phone": body.phone or "",
        "address": body.address or "",
        "notes": body.notes or "",
        "google_user_id": None,
        "created_at": now_iso(),
    }
    await db.clients.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, lw: dict = Depends(get_lawyer)):
    c = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Client not found")
    return c


@api_router.patch("/clients/{client_id}")
async def update_client(client_id: str, body: ClientUpdate, lw: dict = Depends(require_owner)):
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "email" in updates:
        updates["email"] = updates["email"].lower()
    if not updates:
        raise HTTPException(400, "No fields")
    await db.clients.update_one({"client_id": client_id}, {"$set": updates})
    return await db.clients.find_one({"client_id": client_id}, {"_id": 0})


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, lw: dict = Depends(require_owner)):
    await db.clients.delete_one({"client_id": client_id})
    # Cascade delete
    await db.cases.delete_many({"client_id": client_id})
    await db.invoices.delete_many({"client_id": client_id})
    await db.messages.delete_many({"client_id": client_id})
    await db.notifications.delete_many({"client_id": client_id})
    await db.appointments.delete_many({"client_id": client_id})
    await db.documents.delete_many({"client_id": client_id})
    return {"ok": True}


# ============= CASES =============
@api_router.get("/cases")
async def list_cases(client_id: Optional[str] = None, lw: dict = Depends(get_lawyer)):
    q = {"client_id": client_id} if client_id else {}
    docs = await db.cases.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/cases")
async def create_case(body: CaseCreate, lw: dict = Depends(require_owner)):
    doc = {
        "case_id": new_id("cs"),
        **body.model_dump(),
        "updates": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.cases.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/cases/{case_id}")
async def get_case(case_id: str, lw: dict = Depends(get_lawyer)):
    c = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Case not found")
    return c


@api_router.patch("/cases/{case_id}")
async def patch_case(case_id: str, body: CasePatch, lw: dict = Depends(require_owner)):
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    updates["updated_at"] = now_iso()
    await db.cases.update_one({"case_id": case_id}, {"$set": updates})
    return await db.cases.find_one({"case_id": case_id}, {"_id": 0})


@api_router.post("/cases/{case_id}/updates")
async def add_case_update(case_id: str, body: CaseUpdateAdd, lw: dict = Depends(require_owner)):
    entry = {"date": now_iso(), "note": body.note}
    await db.cases.update_one(
        {"case_id": case_id},
        {"$push": {"updates": entry}, "$set": {"updated_at": now_iso()}},
    )
    # Also create a notification for the client
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    if case:
        await db.notifications.insert_one({
            "notification_id": new_id("nt"),
            "client_id": case["client_id"],
            "title": f"تحديث على القضية: {case['title']}",
            "body": body.note,
            "read": False,
            "created_at": now_iso(),
        })
    return await db.cases.find_one({"case_id": case_id}, {"_id": 0})


@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str, lw: dict = Depends(require_owner)):
    await db.cases.delete_one({"case_id": case_id})
    return {"ok": True}


# ============= INVOICES =============
@api_router.get("/invoices")
async def list_invoices(client_id: Optional[str] = None, lw: dict = Depends(get_lawyer)):
    q = {"client_id": client_id} if client_id else {}
    docs = await db.invoices.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api_router.post("/invoices")
async def create_invoice(body: InvoiceCreate, lw: dict = Depends(require_owner)):
    doc = {
        "invoice_id": new_id("in"),
        **body.model_dump(),
        "status": _invoice_status(body.amount, body.paid_amount),
        "created_at": now_iso(),
    }
    await db.invoices.insert_one(doc)
    doc.pop("_id", None)
    return doc


def _invoice_status(amount: float, paid: float) -> str:
    if paid <= 0:
        return "unpaid"
    if paid >= amount:
        return "paid"
    return "partial"


@api_router.patch("/invoices/{invoice_id}")
async def patch_invoice(invoice_id: str, body: InvoicePatch, lw: dict = Depends(require_owner)):
    inv = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Not found")
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    merged = {**inv, **updates}
    updates["status"] = _invoice_status(float(merged["amount"]), float(merged["paid_amount"]))
    await db.invoices.update_one({"invoice_id": invoice_id}, {"$set": updates})
    return await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})


@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, lw: dict = Depends(require_owner)):
    await db.invoices.delete_one({"invoice_id": invoice_id})
    return {"ok": True}


# ============= MESSAGES =============
@api_router.get("/messages")
async def list_messages(client_id: str, lw: dict = Depends(get_lawyer)):
    docs = await db.messages.find({"client_id": client_id}, {"_id": 0}).sort("created_at", 1).to_list(2000)
    return docs


@api_router.post("/messages")
async def send_message_lawyer(body: MessageCreate, lw: dict = Depends(require_owner)):
    doc = {
        "message_id": new_id("ms"),
        "client_id": body.client_id,
        "sender": "lawyer",
        "content": body.content,
        "read": False,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ============= NOTIFICATIONS =============
@api_router.get("/notifications")
async def list_notifications(client_id: Optional[str] = None, lw: dict = Depends(get_lawyer)):
    q = {"client_id": client_id} if client_id else {}
    docs = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api_router.post("/notifications")
async def create_notification(body: NotificationCreate, lw: dict = Depends(require_owner)):
    targets = []
    if body.client_id:
        targets = [body.client_id]
    else:
        clients = await db.clients.find({}, {"_id": 0, "client_id": 1}).to_list(1000)
        targets = [c["client_id"] for c in clients]
    inserted = []
    for cid in targets:
        doc = {
            "notification_id": new_id("nt"),
            "client_id": cid,
            "title": body.title,
            "body": body.body,
            "read": False,
            "created_at": now_iso(),
        }
        await db.notifications.insert_one(doc)
        doc.pop("_id", None)
        inserted.append(doc)
    return {"count": len(inserted)}


# ============= APPOINTMENTS =============
@api_router.get("/appointments")
async def list_appointments(client_id: Optional[str] = None, lw: dict = Depends(get_lawyer)):
    q = {"client_id": client_id} if client_id else {}
    docs = await db.appointments.find(q, {"_id": 0}).sort("date", 1).to_list(500)
    return docs


@api_router.patch("/appointments/{appointment_id}")
async def patch_appointment(appointment_id: str, body: AppointmentPatch, lw: dict = Depends(require_owner)):
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    await db.appointments.update_one({"appointment_id": appointment_id}, {"$set": updates})
    return await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})


# ============= DOCUMENTS =============
@api_router.get("/documents")
async def list_documents(client_id: Optional[str] = None, case_id: Optional[str] = None, lw: dict = Depends(get_lawyer)):
    q = {}
    if client_id:
        q["client_id"] = client_id
    if case_id:
        q["case_id"] = case_id
    docs = await db.documents.find(q, {"_id": 0}).sort("uploaded_at", -1).to_list(500)
    return docs


@api_router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    client_id: str = Form(...),
    case_id: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    lw: dict = Depends(require_owner),
):
    doc_id = new_id("dc")
    ext = Path(file.filename).suffix.lstrip(".") or "bin"
    storage_path = f"{APP_NAME}/documents/{client_id}/{doc_id}.{ext}"
    content = await file.read()
    content_type = file.content_type or "application/octet-stream"
    try:
        result = put_object(storage_path, content, content_type)
        stored_path = result.get("path", storage_path)
        size = result.get("size", len(content))
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(500, "فشل رفع الملف")
    doc = {
        "document_id": doc_id,
        "client_id": client_id,
        "case_id": case_id,
        "title": title or file.filename,
        "filename": file.filename,
        "storage_path": stored_path,
        "mimetype": content_type,
        "size": size,
        "is_deleted": False,
        "uploaded_at": now_iso(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, lw: dict = Depends(require_owner)):
    # Soft delete (storage has no delete API)
    await db.documents.update_one({"document_id": document_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}


@api_router.get("/documents/{document_id}/download")
async def download_document(document_id: str, request: Request):
    doc = await db.documents.find_one({"document_id": document_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")

    auth = request.headers.get("Authorization", "")
    is_lawyer = False
    if auth.startswith("Bearer "):
        payload = decode_jwt(auth.split(" ", 1)[1])
        if payload and payload.get("role") == "lawyer":
            is_lawyer = True

    if not is_lawyer:
        try:
            ctx = await get_client_user(request)
            if ctx["client"]["client_id"] != doc["client_id"]:
                raise HTTPException(403, "Forbidden")
        except HTTPException:
            raise HTTPException(401, "Not authenticated")

    try:
        data, content_type = get_object(doc["storage_path"])
    except Exception as e:
        logger.error(f"Storage download failed: {e}")
        raise HTTPException(404, "File missing in storage")
    return StarletteResponse(
        content=data,
        media_type=doc.get("mimetype") or content_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc["filename"]}"'},
    )


# ============= CLIENT-SIDE ENDPOINTS =============
@api_router.get("/client/cases")
async def client_cases(ctx: dict = Depends(get_client_user)):
    cid = ctx["client"]["client_id"]
    return await db.cases.find({"client_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/client/invoices")
async def client_invoices(ctx: dict = Depends(get_client_user)):
    cid = ctx["client"]["client_id"]
    return await db.invoices.find({"client_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/client/documents")
async def client_documents(ctx: dict = Depends(get_client_user)):
    cid = ctx["client"]["client_id"]
    return await db.documents.find({"client_id": cid}, {"_id": 0}).sort("uploaded_at", -1).to_list(500)


@api_router.get("/client/messages")
async def client_messages(ctx: dict = Depends(get_client_user)):
    cid = ctx["client"]["client_id"]
    msgs = await db.messages.find({"client_id": cid}, {"_id": 0}).sort("created_at", 1).to_list(2000)
    # mark lawyer-sent messages as read
    await db.messages.update_many({"client_id": cid, "sender": "lawyer", "read": False}, {"$set": {"read": True}})
    return msgs


@api_router.post("/client/messages")
async def client_send_message(body: MessageClientCreate, ctx: dict = Depends(get_client_user)):
    cid = ctx["client"]["client_id"]
    doc = {
        "message_id": new_id("ms"),
        "client_id": cid,
        "sender": "client",
        "content": body.content,
        "read": False,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/client/notifications")
async def client_notifications(ctx: dict = Depends(get_client_user)):
    cid = ctx["client"]["client_id"]
    docs = await db.notifications.find({"client_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(300)
    await db.notifications.update_many({"client_id": cid, "read": False}, {"$set": {"read": True}})
    return docs


@api_router.get("/client/appointments")
async def client_appointments(ctx: dict = Depends(get_client_user)):
    cid = ctx["client"]["client_id"]
    return await db.appointments.find({"client_id": cid}, {"_id": 0}).sort("date", 1).to_list(500)


@api_router.post("/client/appointments")
async def client_book_appointment(body: AppointmentCreate, ctx: dict = Depends(get_client_user)):
    cid = ctx["client"]["client_id"]
    doc = {
        "appointment_id": new_id("ap"),
        "client_id": cid,
        "date": body.date,
        "purpose": body.purpose,
        "notes": body.notes or "",
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.appointments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/client/summary")
async def client_summary(ctx: dict = Depends(get_client_user)):
    cid = ctx["client"]["client_id"]
    cases = await db.cases.find({"client_id": cid}, {"_id": 0}).to_list(500)
    invoices = await db.invoices.find({"client_id": cid}, {"_id": 0}).to_list(500)
    total_fees = sum(float(i.get("amount", 0)) for i in invoices)
    paid_fees = sum(float(i.get("paid_amount", 0)) for i in invoices)
    unread_msgs = await db.messages.count_documents({"client_id": cid, "sender": "lawyer", "read": False})
    unread_notifs = await db.notifications.count_documents({"client_id": cid, "read": False})
    open_cases = len([c for c in cases if c.get("status") not in ("closed", "won", "lost")])
    return {
        "cases_total": len(cases),
        "open_cases": open_cases,
        "total_fees": total_fees,
        "paid_fees": paid_fees,
        "remaining_fees": total_fees - paid_fees,
        "unread_messages": unread_msgs,
        "unread_notifications": unread_notifs,
    }


# ============= LAWYER OVERVIEW =============
@api_router.get("/lawyer/summary")
async def lawyer_summary(lw: dict = Depends(get_lawyer)):
    clients = await db.clients.count_documents({})
    cases = await db.cases.count_documents({})
    open_cases = await db.cases.count_documents({"status": {"$nin": ["closed", "won", "lost"]}})
    pending_appts = await db.appointments.count_documents({"status": "pending"})
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(2000)
    total = sum(float(i.get("amount", 0)) for i in invoices)
    paid = sum(float(i.get("paid_amount", 0)) for i in invoices)
    return {
        "clients": clients,
        "cases": cases,
        "open_cases": open_cases,
        "pending_appointments": pending_appts,
        "total_billed": total,
        "total_collected": paid,
        "outstanding": total - paid,
    }


# ============= PROPERTIES =============
class PropertyCreate(BaseModel):
    title: str
    property_type: Literal["apartment", "house", "villa", "land", "commercial", "office"] = "apartment"
    listing_type: Literal["for_sale", "for_rent", "sold", "rented"] = "for_sale"
    area_m2: Optional[float] = 0.0
    price: Optional[float] = 0.0
    currency: Optional[str] = "IQD"
    bedrooms: Optional[int] = 0
    bathrooms: Optional[int] = 0
    floor: Optional[int] = 0
    address: Optional[str] = ""
    description: Optional[str] = ""
    features: Optional[List[str]] = []
    contact_phone: Optional[str] = ""
    is_active: Optional[bool] = True


class PropertyPatch(BaseModel):
    title: Optional[str] = None
    property_type: Optional[str] = None
    listing_type: Optional[str] = None
    area_m2: Optional[float] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    floor: Optional[int] = None
    address: Optional[str] = None
    description: Optional[str] = None
    features: Optional[List[str]] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None


def _property_public_image_url(prop: dict) -> list:
    """Return list of public image URLs for a property."""
    urls = []
    for idx, _img in enumerate(prop.get("images", [])):
        urls.append(f"/api/public/properties/{prop['property_id']}/images/{idx}")
    return urls


# ----- Public endpoints -----
@api_router.get("/public/properties")
async def public_list_properties(listing_type: Optional[str] = None, property_type: Optional[str] = None):
    q = {"is_active": True}
    if listing_type:
        q["listing_type"] = listing_type
    if property_type:
        q["property_type"] = property_type
    docs = await db.properties.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        d["image_urls"] = _property_public_image_url(d)
    return docs


@api_router.get("/public/properties/{property_id}")
async def public_get_property(property_id: str):
    doc = await db.properties.find_one({"property_id": property_id, "is_active": True}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Property not found")
    doc["image_urls"] = _property_public_image_url(doc)
    return doc


@api_router.get("/public/properties/{property_id}/images/{idx}")
async def public_property_image(property_id: str, idx: int):
    doc = await db.properties.find_one({"property_id": property_id, "is_active": True}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Property not found")
    images = doc.get("images", [])
    if idx < 0 or idx >= len(images):
        raise HTTPException(404, "Image not found")
    try:
        data, content_type = get_object(images[idx]["path"])
    except Exception:
        raise HTTPException(404, "Image missing")
    return StarletteResponse(
        content=data,
        media_type=images[idx].get("mimetype") or content_type or "image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"},
    )


# ----- Admin endpoints (both owner & partner can manage properties) -----
@api_router.get("/properties")
async def list_properties(lw: dict = Depends(get_lawyer)):
    docs = await db.properties.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        d["image_urls"] = _property_public_image_url(d)
    return docs


@api_router.post("/properties")
async def create_property(body: PropertyCreate, lw: dict = Depends(get_lawyer)):
    doc = {
        "property_id": new_id("pr"),
        **body.model_dump(),
        "images": [],
        "created_by": lw["lawyer_id"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.properties.insert_one(doc)
    doc.pop("_id", None)
    doc["image_urls"] = []
    return doc


@api_router.get("/properties/{property_id}")
async def get_property_admin(property_id: str, lw: dict = Depends(get_lawyer)):
    doc = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    doc["image_urls"] = _property_public_image_url(doc)
    return doc


@api_router.patch("/properties/{property_id}")
async def patch_property(property_id: str, body: PropertyPatch, lw: dict = Depends(get_lawyer)):
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    updates["updated_at"] = now_iso()
    await db.properties.update_one({"property_id": property_id}, {"$set": updates})
    doc = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    doc["image_urls"] = _property_public_image_url(doc)
    return doc


@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, lw: dict = Depends(get_lawyer)):
    await db.properties.delete_one({"property_id": property_id})
    return {"ok": True}


@api_router.post("/properties/{property_id}/images")
async def upload_property_image(
    property_id: str,
    file: UploadFile = File(...),
    lw: dict = Depends(get_lawyer),
):
    prop = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(404, "Not found")
    ext = Path(file.filename).suffix.lstrip(".") or "jpg"
    img_id = uuid.uuid4().hex[:10]
    storage_path = f"{APP_NAME}/properties/{property_id}/{img_id}.{ext}"
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
    try:
        result = put_object(storage_path, content, content_type)
        stored_path = result.get("path", storage_path)
    except Exception as e:
        logger.error(f"Property image upload failed: {e}")
        raise HTTPException(500, "فشل رفع الصورة")
    img_entry = {
        "path": stored_path,
        "mimetype": content_type,
        "size": len(content),
        "uploaded_at": now_iso(),
    }
    await db.properties.update_one(
        {"property_id": property_id},
        {"$push": {"images": img_entry}, "$set": {"updated_at": now_iso()}},
    )
    doc = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    doc["image_urls"] = _property_public_image_url(doc)
    return doc


@api_router.delete("/properties/{property_id}/images/{idx}")
async def delete_property_image(property_id: str, idx: int, lw: dict = Depends(get_lawyer)):
    prop = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(404, "Not found")
    images = prop.get("images", [])
    if idx < 0 or idx >= len(images):
        raise HTTPException(404, "Image not found")
    images.pop(idx)
    await db.properties.update_one(
        {"property_id": property_id},
        {"$set": {"images": images, "updated_at": now_iso()}},
    )
    doc = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    doc["image_urls"] = _property_public_image_url(doc)
    return doc


# ============= ARTICLES / LEGAL LIBRARY =============
class ArticleCreate(BaseModel):
    article_type: Literal["article", "image", "video", "document"]
    title: str
    content: Optional[str] = ""
    external_url: Optional[str] = None  # e.g. YouTube embed
    tags: Optional[List[str]] = []
    is_published: Optional[bool] = True


class ArticlePatch(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    external_url: Optional[str] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None


def _article_public(doc: dict) -> dict:
    out = dict(doc)
    out.pop("media_path", None)
    out["media_url"] = (
        f"/api/public/articles/{doc['article_id']}/media"
        if doc.get("media_path") else None
    )
    return out


# ----- Public -----
@api_router.get("/public/articles")
async def public_list_articles(article_type: Optional[str] = None, limit: int = 60):
    q = {"is_published": True}
    if article_type:
        q["article_type"] = article_type
    docs = await db.articles.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [_article_public(d) for d in docs]


@api_router.get("/public/articles/{article_id}")
async def public_get_article(article_id: str):
    doc = await db.articles.find_one({"article_id": article_id, "is_published": True}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.articles.update_one({"article_id": article_id}, {"$inc": {"views_count": 1}})
    doc["views_count"] = (doc.get("views_count") or 0) + 1
    return _article_public(doc)


@api_router.get("/public/articles/{article_id}/media")
async def public_article_media(article_id: str, request: Request):
    doc = await db.articles.find_one({"article_id": article_id, "is_published": True}, {"_id": 0})
    if not doc or not doc.get("media_path"):
        raise HTTPException(404, "No media")
    try:
        data, content_type = get_object(doc["media_path"])
    except Exception:
        raise HTTPException(404, "Media missing")
    return StarletteResponse(
        content=data,
        media_type=doc.get("media_mimetype") or content_type or "application/octet-stream",
        headers={"Cache-Control": "public, max-age=3600"},
    )


# ----- Admin (both owner & partner can manage) -----
@api_router.get("/articles")
async def list_articles_admin(lw: dict = Depends(get_lawyer)):
    docs = await db.articles.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [_article_public(d) for d in docs]


@api_router.post("/articles")
async def create_article(
    article_type: str = Form(...),
    title: str = Form(...),
    content: Optional[str] = Form(""),
    external_url: Optional[str] = Form(None),
    tags: Optional[str] = Form(""),  # comma-separated
    is_published: bool = Form(True),
    file: Optional[UploadFile] = File(None),
    lw: dict = Depends(get_lawyer),
):
    if article_type not in ("article", "image", "video", "document"):
        raise HTTPException(400, "Invalid type")

    media_path = None
    media_mimetype = None
    media_size = 0
    media_filename = None
    if file and file.filename:
        article_id_prefix = uuid.uuid4().hex[:8]
        ext = Path(file.filename).suffix.lstrip(".") or "bin"
        storage_path = f"{APP_NAME}/articles/{article_id_prefix}.{ext}"
        content_bytes = await file.read()
        ctype = file.content_type or "application/octet-stream"
        try:
            result = put_object(storage_path, content_bytes, ctype)
            media_path = result.get("path", storage_path)
            media_mimetype = ctype
            media_size = result.get("size", len(content_bytes))
            media_filename = file.filename
        except Exception as e:
            logger.error(f"Article media upload failed: {e}")
            raise HTTPException(500, "فشل رفع الملف")

    if article_type in ("image", "video", "document") and not media_path and not external_url:
        raise HTTPException(400, "Media file or external URL required for this type")

    tags_list = [t.strip() for t in (tags or "").split(",") if t.strip()]
    doc = {
        "article_id": new_id("ar"),
        "article_type": article_type,
        "title": title,
        "content": content or "",
        "external_url": external_url or None,
        "tags": tags_list,
        "is_published": bool(is_published),
        "views_count": 0,
        "media_path": media_path,
        "media_mimetype": media_mimetype,
        "media_size": media_size,
        "media_filename": media_filename,
        "author_id": lw["lawyer_id"],
        "author_name": lw["name"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.articles.insert_one(doc)
    doc.pop("_id", None)
    return _article_public(doc)


@api_router.patch("/articles/{article_id}")
async def patch_article(article_id: str, body: ArticlePatch, lw: dict = Depends(get_lawyer)):
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    updates["updated_at"] = now_iso()
    await db.articles.update_one({"article_id": article_id}, {"$set": updates})
    doc = await db.articles.find_one({"article_id": article_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return _article_public(doc)


@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, lw: dict = Depends(get_lawyer)):
    await db.articles.delete_one({"article_id": article_id})
    return {"ok": True}


# ============= FINALIZE APP =============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
