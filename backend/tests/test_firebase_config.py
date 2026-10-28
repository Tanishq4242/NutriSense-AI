from app.core import firebase


def test_dotenv_sdk_values_are_forwarded_to_firebase_libraries(monkeypatch) -> None:
    monkeypatch.setattr(firebase.settings, "google_application_credentials", "C:/keys/nutrisense.json")
    monkeypatch.setattr(firebase.settings, "firestore_emulator_host", "127.0.0.1:8080")
    monkeypatch.setattr(firebase.settings, "firebase_auth_emulator_host", "127.0.0.1:9099")
    for name in ("GOOGLE_APPLICATION_CREDENTIALS", "FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"):
        monkeypatch.delenv(name, raising=False)

    firebase._apply_sdk_environment()

    assert firebase.os.environ["GOOGLE_APPLICATION_CREDENTIALS"] == "C:/keys/nutrisense.json"
    assert firebase.os.environ["FIRESTORE_EMULATOR_HOST"] == "127.0.0.1:8080"
    assert firebase.os.environ["FIREBASE_AUTH_EMULATOR_HOST"] == "127.0.0.1:9099"
