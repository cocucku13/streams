from app.auth import create_access_token, decode_token, hash_password, verify_password


def test_password_hash_and_verify_roundtrip() -> None:
    password = "wave2-password"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)


def test_create_and_decode_token_roundtrip() -> None:
    subject = "wave2-user"
    token = create_access_token(subject)

    assert isinstance(token, str)
    assert decode_token(token) == subject
