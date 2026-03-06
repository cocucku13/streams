import os

import pytest
from sqlalchemy import create_engine, text


def test_postgres_engine_creation_and_simple_query() -> None:
    postgres_url = os.getenv("TEST_POSTGRES_DATABASE_URL")
    if not postgres_url:
        pytest.skip("TEST_POSTGRES_DATABASE_URL is not set")

    engine = create_engine(
        postgres_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
    try:
        with engine.connect() as connection:
            value = connection.execute(text("SELECT 1")).scalar_one()
        assert value == 1
    finally:
        engine.dispose()
