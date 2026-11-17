import unittest

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.auth import login, router as auth_router
from app.core.bootstrap import ensure_superuser
from app.core.security import get_password_hash, verify_password
from app.models.database import Base, get_db
from app.models.models import User
from app.schemas.schemas import UserLogin


class RegistrationApprovalTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.session = sessionmaker(bind=self.engine)()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def create_client(self):
        app = FastAPI()
        app.include_router(auth_router)
        app.dependency_overrides[get_db] = lambda: self.session
        return TestClient(app)

    def get_auth_headers(self, client, email, password):
        response = client.post(
            "/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_registration_creates_pending_account_without_token(self):
        with self.create_client() as client:
            response = client.post(
                "/auth/register",
                json={
                    "email": "student@example.com",
                    "password": "a-strong-password",
                    "full_name": "Test Student",
                },
            )

        user = self.session.query(User).filter_by(email="student@example.com").one()
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["status"], "pending")
        self.assertNotIn("access_token", response.json())
        self.assertFalse(user.is_approved)
        self.assertNotEqual(user.hashed_password, "a-strong-password")

    def test_pending_account_cannot_log_in(self):
        user = User(
            email="pending@example.com",
            hashed_password=get_password_hash("a-strong-password"),
            full_name="Pending Student",
            role="student",
            is_approved=False,
        )
        self.session.add(user)
        self.session.commit()

        with self.assertRaises(HTTPException) as raised:
            login(
                UserLogin(
                    email="pending@example.com",
                    password="a-strong-password",
                ),
                self.session,
            )

        self.assertEqual(raised.exception.status_code, 403)

    def test_admin_can_approve_pending_account(self):
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("another-strong-password"),
            full_name="Administrator",
            role="admin",
            is_approved=True,
        )
        pending = User(
            email="student@example.com",
            hashed_password=get_password_hash("a-strong-password"),
            full_name="Test Student",
            role="student",
            is_approved=False,
        )
        self.session.add_all([admin, pending])
        self.session.commit()

        with self.create_client() as client:
            headers = self.get_auth_headers(
                client,
                "admin@example.com",
                "another-strong-password",
            )
            response = client.post(
                f"/auth/admin/pending-registrations/{pending.id}/approve",
                headers=headers,
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.session.get(User, pending.id).is_approved)

    def test_admin_can_reject_pending_account(self):
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("another-strong-password"),
            full_name="Administrator",
            role="admin",
            is_approved=True,
        )
        pending = User(
            email="pending@example.com",
            hashed_password=get_password_hash("a-strong-password"),
            full_name="Pending Student",
            role="student",
            is_approved=False,
        )
        self.session.add_all([admin, pending])
        self.session.commit()

        with self.create_client() as client:
            headers = self.get_auth_headers(
                client,
                "admin@example.com",
                "another-strong-password",
            )
            response = client.delete(
                f"/auth/admin/pending-registrations/{pending.id}",
                headers=headers,
            )

        self.assertEqual(response.status_code, 204)
        self.assertIsNone(self.session.get(User, pending.id))

    def test_non_admin_cannot_list_pending_registrations(self):
        student = User(
            email="student@example.com",
            hashed_password=get_password_hash("a-strong-password"),
            full_name="Approved Student",
            role="student",
            is_approved=True,
        )
        self.session.add(student)
        self.session.commit()

        with self.create_client() as client:
            login_response = client.post(
                "/auth/login",
                json={
                    "email": "student@example.com",
                    "password": "a-strong-password",
                },
            )
            token = login_response.json()["access_token"]
            response = client.get(
                "/auth/admin/pending-registrations",
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 403)

    def test_superuser_bootstrap_is_idempotent_and_password_is_hashed(self):
        ensure_superuser(
            self.session,
            "owner@example.com",
            "a-strong-owner-password",
            "Site Owner",
            "production",
        )
        ensure_superuser(
            self.session,
            "owner@example.com",
            "",
            "Site Owner",
            "production",
        )

        owner = self.session.query(User).filter_by(email="owner@example.com").one()
        self.assertEqual(owner.role, "admin")
        self.assertTrue(owner.is_approved)
        self.assertTrue(verify_password("a-strong-owner-password", owner.hashed_password))

    def test_production_requires_first_superuser_credentials(self):
        with self.assertRaisesRegex(RuntimeError, "SUPERUSER_EMAIL"):
            ensure_superuser(self.session, "", "", "", "production")


if __name__ == "__main__":
    unittest.main()
