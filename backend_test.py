"""
Backend API tests for Abdullah Obaidi Law Office.
Covers: public info, lawyer auth, clients/cases/invoices/documents/messages/
notifications/appointments CRUD, and client-portal cookie session flow.
"""
import os
import io
import time
import uuid
import requests
import pytest
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://law-office-manager-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

LAWYER_EMAIL = "aabbbd12341234@gmail.com"
LAWYER_PASSWORD = "Lawyer@123"


@pytest.fixture(scope="session")
def lawyer_token():
    r = requests.post(f"{API}/lawyer/login", json={"email": LAWYER_EMAIL, "password": LAWYER_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Lawyer login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def lw_headers(lawyer_token):
    return {"Authorization": f"Bearer {lawyer_token}"}


@pytest.fixture(scope="session")
def mongo_db():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


# ---------- PUBLIC ----------
class TestPublic:
    def test_public_info(self):
        r = requests.get(f"{API}/public/info", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["phone"] == "07726317519"
        assert d["email"] == LAWYER_EMAIL
        assert "عبدالله" in d["name"]


# ---------- LAWYER AUTH ----------
class TestLawyerAuth:
    def test_login_success(self, lawyer_token):
        assert isinstance(lawyer_token, str) and len(lawyer_token) > 20

    def test_login_wrong_pw(self):
        r = requests.post(f"{API}/lawyer/login", json={"email": LAWYER_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, lw_headers):
        r = requests.get(f"{API}/lawyer/me", headers=lw_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == LAWYER_EMAIL

    def test_me_no_token(self):
        r = requests.get(f"{API}/lawyer/me", timeout=15)
        assert r.status_code == 401

    def test_summary(self, lw_headers):
        r = requests.get(f"{API}/lawyer/summary", headers=lw_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["clients", "cases", "open_cases", "pending_appointments", "outstanding"]:
            assert k in d


# ---------- CLIENTS + CASCADED RESOURCES ----------
@pytest.fixture(scope="session")
def created_client(lw_headers):
    email = f"TEST_client_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/clients", headers=lw_headers, json={
        "name": "TEST_Client", "email": email, "phone": "0770", "address": "Baghdad"
    }, timeout=15)
    assert r.status_code == 200, r.text
    c = r.json()
    yield c
    # cleanup
    requests.delete(f"{API}/clients/{c['client_id']}", headers=lw_headers, timeout=15)


class TestClients:
    def test_list(self, lw_headers, created_client):
        r = requests.get(f"{API}/clients", headers=lw_headers, timeout=15)
        assert r.status_code == 200
        ids = [c["client_id"] for c in r.json()]
        assert created_client["client_id"] in ids

    def test_get(self, lw_headers, created_client):
        r = requests.get(f"{API}/clients/{created_client['client_id']}", headers=lw_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == created_client["email"]

    def test_update(self, lw_headers, created_client):
        r = requests.patch(f"{API}/clients/{created_client['client_id']}", headers=lw_headers,
                           json={"phone": "9999"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["phone"] == "9999"

    def test_duplicate_email(self, lw_headers, created_client):
        r = requests.post(f"{API}/clients", headers=lw_headers,
                          json={"name": "dup", "email": created_client["email"]}, timeout=15)
        assert r.status_code == 400


# ---------- CASES ----------
class TestCases:
    def test_case_crud_and_updates(self, lw_headers, created_client):
        cid = created_client["client_id"]
        r = requests.post(f"{API}/cases", headers=lw_headers, json={
            "client_id": cid, "title": "TEST_Case", "case_type": "civil",
            "court": "Baghdad", "status": "open"
        }, timeout=15)
        assert r.status_code == 200, r.text
        case = r.json()
        case_id = case["case_id"]
        assert case["updates"] == []

        r = requests.patch(f"{API}/cases/{case_id}", headers=lw_headers, json={"status": "in_progress"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"

        r = requests.post(f"{API}/cases/{case_id}/updates", headers=lw_headers,
                          json={"note": "hearing scheduled"}, timeout=15)
        assert r.status_code == 200
        assert len(r.json()["updates"]) == 1

        # verify notification created for client
        r = requests.get(f"{API}/notifications?client_id={cid}", headers=lw_headers, timeout=15)
        assert r.status_code == 200
        assert any("hearing scheduled" in n["body"] for n in r.json())

        r = requests.delete(f"{API}/cases/{case_id}", headers=lw_headers, timeout=15)
        assert r.status_code == 200


# ---------- INVOICES ----------
class TestInvoices:
    def test_invoice_status_transitions(self, lw_headers, created_client):
        cid = created_client["client_id"]
        r = requests.post(f"{API}/invoices", headers=lw_headers, json={
            "client_id": cid, "description": "TEST_fee", "amount": 500, "paid_amount": 200
        }, timeout=15)
        assert r.status_code == 200
        inv = r.json()
        assert inv["status"] == "partial"

        r = requests.patch(f"{API}/invoices/{inv['invoice_id']}", headers=lw_headers,
                           json={"paid_amount": 500}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "paid"

        r = requests.delete(f"{API}/invoices/{inv['invoice_id']}", headers=lw_headers, timeout=15)
        assert r.status_code == 200


# ---------- DOCUMENTS ----------
class TestDocuments:
    def test_upload_download_delete(self, lw_headers, created_client):
        cid = created_client["client_id"]
        files = {"file": ("hello.txt", io.BytesIO(b"hello world"), "text/plain")}
        data = {"client_id": cid, "title": "TEST_doc"}
        r = requests.post(f"{API}/documents", headers=lw_headers, files=files, data=data, timeout=30)
        assert r.status_code == 200, r.text
        doc = r.json()

        r = requests.get(f"{API}/documents?client_id={cid}", headers=lw_headers, timeout=15)
        assert any(d["document_id"] == doc["document_id"] for d in r.json())

        r = requests.get(f"{API}/documents/{doc['document_id']}/download", headers=lw_headers, timeout=15)
        assert r.status_code == 200
        assert r.content == b"hello world"

        r = requests.delete(f"{API}/documents/{doc['document_id']}", headers=lw_headers, timeout=15)
        assert r.status_code == 200


# ---------- MESSAGES + NOTIFICATIONS ----------
class TestMessagesNotifications:
    def test_lawyer_send_and_list_messages(self, lw_headers, created_client):
        cid = created_client["client_id"]
        r = requests.post(f"{API}/messages", headers=lw_headers,
                          json={"client_id": cid, "content": "TEST hello"}, timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{API}/messages?client_id={cid}", headers=lw_headers, timeout=15)
        assert r.status_code == 200
        assert any(m["content"] == "TEST hello" for m in r.json())

    def test_notification_broadcast_single(self, lw_headers, created_client):
        r = requests.post(f"{API}/notifications", headers=lw_headers, json={
            "client_id": created_client["client_id"], "title": "TEST_N", "body": "b"
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()["count"] == 1


# ---------- APPOINTMENTS (lawyer PATCH) ----------
class TestAppointments:
    def test_list_appointments(self, lw_headers):
        r = requests.get(f"{API}/appointments", headers=lw_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- CLIENT PORTAL (cookie session) ----------
@pytest.fixture(scope="session")
def client_session(mongo_db, lw_headers):
    email = f"test_portal_{uuid.uuid4().hex[:8]}@example.com"
    # create client via API (lawyer)
    r = requests.post(f"{API}/clients", headers=lw_headers,
                      json={"name": "TEST_Portal", "email": email, "phone": "1"}, timeout=15)
    assert r.status_code == 200
    client_rec = r.json()

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    session_token = f"test_session_{uuid.uuid4().hex}"
    mongo_db.users.insert_one({
        "user_id": user_id, "email": email, "name": "TEST_Portal",
        "picture": "", "created_at": datetime.now(timezone.utc).isoformat()
    })
    mongo_db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    yield {"email": email, "session_token": session_token, "client_id": client_rec["client_id"], "user_id": user_id}
    # cleanup
    requests.delete(f"{API}/clients/{client_rec['client_id']}", headers=lw_headers, timeout=15)
    mongo_db.users.delete_one({"user_id": user_id})
    mongo_db.user_sessions.delete_one({"session_token": session_token})


class TestClientPortal:
    def _cookies(self, s):
        return {"session_token": s["session_token"]}

    def test_client_summary(self, client_session):
        r = requests.get(f"{API}/client/summary", cookies=self._cookies(client_session), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["cases_total", "open_cases", "remaining_fees", "unread_messages"]:
            assert k in d

    def test_client_lists(self, client_session):
        for endpoint in ["cases", "invoices", "documents", "messages", "notifications", "appointments"]:
            r = requests.get(f"{API}/client/{endpoint}", cookies=self._cookies(client_session), timeout=15)
            assert r.status_code == 200, f"{endpoint}: {r.status_code} {r.text}"
            assert isinstance(r.json(), list)

    def test_client_send_message(self, client_session, lw_headers):
        r = requests.post(f"{API}/client/messages",
                          cookies=self._cookies(client_session),
                          json={"content": "TEST from client"}, timeout=15)
        assert r.status_code == 200
        # lawyer sees the message
        r2 = requests.get(f"{API}/messages?client_id={client_session['client_id']}", headers=lw_headers, timeout=15)
        assert any(m["content"] == "TEST from client" and m["sender"] == "client" for m in r2.json())

    def test_client_book_appointment(self, client_session, lw_headers):
        r = requests.post(f"{API}/client/appointments",
                          cookies=self._cookies(client_session),
                          json={"date": "2026-02-01T10:00", "purpose": "Consultation"}, timeout=15)
        assert r.status_code == 200
        appt = r.json()
        assert appt["status"] == "pending"
        # lawyer confirms
        r2 = requests.patch(f"{API}/appointments/{appt['appointment_id']}", headers=lw_headers,
                            json={"status": "confirmed"}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["status"] == "confirmed"

    def test_bad_session_rejected(self):
        r = requests.get(f"{API}/client/summary", cookies={"session_token": "invalid_xxx"}, timeout=15)
        assert r.status_code == 401
