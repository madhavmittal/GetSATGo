import unittest
from unittest.mock import patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.auth import login, router as auth_router
from app.api.settings import init_default_settings, router as settings_router
from app.core.bootstrap import ensure_superuser
from app.core.security import get_password_hash, verify_password
from app.models.database import Base, get_db
from app.models.models import SystemSetting, User
from app.schemas.schemas import UserLogin


class RegistrationApprovalTests(unittest.TestCase):
    def setUp(self):
        self.google_auth_enabled_patcher = patch(
            "app.api.auth.settings.GOOGLE_AUTH_ENABLED", True
        )
        self.google_auth_enabled_patcher.start()
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.session = sessionmaker(bind=self.engine)()
        init_default_settings(self.session)
        self.set_google_auth_setting(True)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()
        self.google_auth_enabled_patcher.stop()

    def create_client(self):
        app = FastAPI()
        app.include_router(auth_router)
        app.include_router(settings_router)
        app.dependency_overrides[get_db] = lambda: self.session
        return TestClient(app)

    def set_google_auth_setting(self, enabled):
        setting = (
            self.session.query(SystemSetting)
            .filter_by(key="google_auth_enabled")
            .one()
        )
        setting.value_json = "true" if enabled else "false"
        self.session.commit()

    def get_auth_headers(self, client, email, password):
        response = client.post(
            "/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_password_registration_is_disabled(self):
        with self.create_client() as client:
            response = client.post(
                "/auth/register",
                json={
                    "email": "student@example.com",
                    "password": "a-strong-password",
                    "full_name": "Test Student",
                },
            )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.session.query(User).count(), 0)

    def test_google_registration_creates_pending_account(self):
        claims = {
            "email": " Student@Example.com ",
            "email_verified": True,
            "sub": "google-user-1",
            "name": "Test Student",
        }
        with (
            patch("app.api.auth.settings.GOOGLE_CLIENT_ID", "test-client-id"),
            patch("app.api.auth.verify_oauth2_token", return_value=claims),
            self.create_client() as client,
        ):
            response = client.post(
                "/auth/google",
                json={"credential": "test-credential", "mode": "register"},
            )

        user = self.session.query(User).filter_by(email="student@example.com").one()
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["status"], "pending")
        self.assertNotIn("access_token", response.json())
        self.assertFalse(user.is_approved)
        self.assertEqual(user.role, "student")
        self.assertNotEqual(user.hashed_password, "test-credential")

    def test_google_login_requires_verified_email(self):
        claims = {
            "email": "student@example.com",
            "email_verified": False,
            "sub": "google-user-1",
        }
        with (
            patch("app.api.auth.settings.GOOGLE_CLIENT_ID", "test-client-id"),
            patch("app.api.auth.verify_oauth2_token", return_value=claims),
            self.create_client() as client,
        ):
            response = client.post(
                "/auth/google",
                json={"credential": "test-credential", "mode": "register"},
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.session.query(User).count(), 0)

    def test_google_auth_requires_client_configuration(self):
        with (
            patch("app.api.auth.settings.GOOGLE_CLIENT_ID", ""),
            self.create_client() as client,
        ):
            response = client.post(
                "/auth/google",
                json={"credential": "test-credential", "mode": "register"},
            )

        self.assertEqual(response.status_code, 503)

    def test_google_auth_is_disabled_when_flag_is_false(self):
        with (
            patch("app.api.auth.settings.GOOGLE_AUTH_ENABLED", False),
            patch("app.api.auth.verify_oauth2_token") as verify_token,
            self.create_client() as client,
        ):
            response = client.post(
                "/auth/google",
                json={"credential": "test-credential", "mode": "register"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "Google sign-in is currently disabled.")
        verify_token.assert_not_called()
        self.assertEqual(self.session.query(User).count(), 0)

    def test_google_auth_requires_admin_setting(self):
        self.set_google_auth_setting(False)
        with (
            patch("app.api.auth.settings.GOOGLE_CLIENT_ID", "test-client-id"),
            patch("app.api.auth.verify_oauth2_token") as verify_token,
            self.create_client() as client,
        ):
            response = client.post(
                "/auth/google",
                json={"credential": "test-credential", "mode": "register"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json()["detail"],
            "Google sign-in is currently disabled by an administrator.",
        )
        verify_token.assert_not_called()

    def test_only_admin_can_change_google_auth_setting(self):
        self.set_google_auth_setting(False)
        teacher = User(
            email="teacher@example.com",
            hashed_password=get_password_hash("teacher-password"),
            full_name="Teacher",
            role="teacher",
            is_approved=True,
        )
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("admin-password"),
            full_name="Administrator",
            role="admin",
            is_approved=True,
        )
        self.session.add_all([teacher, admin])
        self.session.commit()

        with (
            patch("app.api.auth.settings.GOOGLE_CLIENT_ID", "test-client-id"),
            self.create_client() as client,
        ):
            teacher_headers = self.get_auth_headers(
                client, "teacher@example.com", "teacher-password"
            )
            teacher_response = client.put(
                "/settings",
                json={"settings": {"google_auth_enabled": True}},
                headers=teacher_headers,
            )
            admin_headers = self.get_auth_headers(
                client, "admin@example.com", "admin-password"
            )
            admin_response = client.put(
                "/settings",
                json={"settings": {"google_auth_enabled": True}},
                headers=admin_headers,
            )
            teacher_reset_response = client.post(
                "/settings/reset",
                headers=teacher_headers,
            )
            setting_after_teacher_reset = (
                self.session.query(SystemSetting)
                .filter_by(key="google_auth_enabled")
                .one()
                .value
            )
            disable_response = client.put(
                "/settings",
                json={"settings": {"google_auth_enabled": False}},
                headers=admin_headers,
            )

        self.assertEqual(teacher_response.status_code, 403)
        self.assertEqual(admin_response.status_code, 200)
        self.assertEqual(teacher_reset_response.status_code, 200)
        self.assertTrue(setting_after_teacher_reset)
        self.assertEqual(disable_response.status_code, 200)
        self.assertFalse(
            self.session.query(SystemSetting)
            .filter_by(key="google_auth_enabled")
            .one()
            .value
        )

    def test_admin_cannot_enable_google_auth_when_deployment_gate_is_off(self):
        self.set_google_auth_setting(False)
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("admin-password"),
            full_name="Administrator",
            role="admin",
            is_approved=True,
        )
        self.session.add(admin)
        self.session.commit()

        with (
            patch("app.api.auth.settings.GOOGLE_AUTH_ENABLED", False),
            self.create_client() as client,
        ):
            headers = self.get_auth_headers(
                client, "admin@example.com", "admin-password"
            )
            response = client.put(
                "/settings",
                json={"settings": {"google_auth_enabled": True}},
                headers=headers,
            )

        self.assertEqual(response.status_code, 503)
        self.assertFalse(
            self.session.query(SystemSetting)
            .filter_by(key="google_auth_enabled")
            .one()
            .value
        )

    def test_teacher_google_registration_requires_invitation_code(self):
        claims = {
            "email": "teacher@example.com",
            "email_verified": True,
            "sub": "google-teacher-1",
        }
        with (
            patch("app.api.auth.settings.GOOGLE_CLIENT_ID", "test-client-id"),
            patch("app.api.auth.settings.TEACHER_SIGNUP_CODE", "valid-code"),
            patch("app.api.auth.verify_oauth2_token", return_value=claims),
            self.create_client() as client,
        ):
            response = client.post(
                "/auth/google",
                json={
                    "credential": "test-credential",
                    "mode": "register",
                    "role": "teacher",
                    "teacher_invite_code": "invalid-code",
                },
            )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.session.query(User).count(), 0)

    def test_google_login_authenticates_existing_approved_user(self):
        user = User(
            email="student@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Approved Student",
            role="student",
            is_approved=True,
        )
        self.session.add(user)
        self.session.commit()
        claims = {
            "email": "STUDENT@example.com",
            "email_verified": True,
            "sub": "google-user-1",
        }

        with (
            patch("app.api.auth.settings.GOOGLE_CLIENT_ID", "test-client-id"),
            patch("app.api.auth.verify_oauth2_token", return_value=claims),
            self.create_client() as client,
        ):
            response = client.post(
                "/auth/google",
                json={"credential": "test-credential", "mode": "login"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["access_token"])
        self.assertEqual(response.json()["user"]["email"], user.email)

    def test_google_login_does_not_create_unknown_account(self):
        claims = {
            "email": "student@example.com",
            "email_verified": True,
            "sub": "google-user-1",
        }
        with (
            patch("app.api.auth.settings.GOOGLE_CLIENT_ID", "test-client-id"),
            patch("app.api.auth.verify_oauth2_token", return_value=claims),
            self.create_client() as client,
        ):
            response = client.post(
                "/auth/google",
                json={"credential": "test-credential", "mode": "login"},
            )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.session.query(User).count(), 0)

    def test_pending_google_account_cannot_log_in(self):
        user = User(
            email="student@example.com",
            hashed_password=get_password_hash("password"),
            full_name="Pending Student",
            role="student",
            is_approved=False,
        )
        self.session.add(user)
        self.session.commit()
        claims = {
            "email": "student@example.com",
            "email_verified": True,
            "sub": "google-user-1",
        }

        with (
            patch("app.api.auth.settings.GOOGLE_CLIENT_ID", "test-client-id"),
            patch("app.api.auth.verify_oauth2_token", return_value=claims),
            self.create_client() as client,
        ):
            response = client.post(
                "/auth/google",
                json={"credential": "test-credential", "mode": "login"},
            )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Your account is awaiting administrator approval.")

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
