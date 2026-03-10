from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Briefing, SampleItem  # noqa: F401


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(
        bind=engine, autoflush=False, autocommit=False, future=True
    )

    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_create_and_get_briefing(client: TestClient) -> None:
    payload = {
        "companyName": "Acme Holdings",
        "ticker": "acme",
        "sector": "Industrial Technology",
        "analystName": "Jane Doe",
        "summary": "Acme is benefiting from strong enterprise demand.",
        "recommendation": "Monitor for margin expansion.",
        "keyPoints": [
            "Revenue grew 18% year-over-year.",
            "Management raised full-year guidance.",
        ],
        "risks": ["Top two customers account for 41% of revenue."],
        "metrics": [
            {"name": "Revenue Growth", "value": "18%"},
            {"name": "Operating Margin", "value": "22.4%"},
        ],
    }
    create_resp = client.post("/briefings", json=payload)
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert data["company_name"] == "Acme Holdings"
    assert data["ticker"] == "ACME"
    assert len(data["key_points"]) == 2
    assert len(data["risks"]) == 1
    assert len(data["metrics"]) == 2

    get_resp = client.get(f"/briefings/{data['id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == data["id"]


def test_generate_and_fetch_html(client: TestClient) -> None:
    payload = {
        "companyName": "Test Co",
        "ticker": "TST",
        "sector": "Tech",
        "analystName": "Analyst",
        "summary": "Summary.",
        "recommendation": "Hold.",
        "keyPoints": ["Point one.", "Point two."],
        "risks": ["Risk one."],
    }
    create_resp = client.post("/briefings", json=payload)
    assert create_resp.status_code == 201
    bid = create_resp.json()["id"]

    gen_resp = client.post(f"/briefings/{bid}/generate")
    assert gen_resp.status_code == 200

    html_resp = client.get(f"/briefings/{bid}/html")
    assert html_resp.status_code == 200
    assert "text/html" in html_resp.headers["content-type"]
    assert "Test Co" in html_resp.text
    assert "Briefing Report" in html_resp.text


def test_validation_ticker_uppercase(client: TestClient) -> None:
    payload = {
        "companyName": "X",
        "ticker": "xyz",
        "sector": "S",
        "analystName": "A",
        "summary": "S",
        "recommendation": "R",
        "keyPoints": ["A", "B"],
        "risks": ["C"],
    }
    resp = client.post("/briefings", json=payload)
    assert resp.status_code == 201
    assert resp.json()["ticker"] == "XYZ"


def test_validation_requires_two_key_points(client: TestClient) -> None:
    payload = {
        "companyName": "X",
        "ticker": "X",
        "sector": "S",
        "analystName": "A",
        "summary": "S",
        "recommendation": "R",
        "keyPoints": ["Only one"],
        "risks": ["R"],
    }
    resp = client.post("/briefings", json=payload)
    assert resp.status_code == 422


def test_validation_metric_names_unique(client: TestClient) -> None:
    payload = {
        "companyName": "X",
        "ticker": "X",
        "sector": "S",
        "analystName": "A",
        "summary": "S",
        "recommendation": "R",
        "keyPoints": ["A", "B"],
        "risks": ["R"],
        "metrics": [
            {"name": "Same", "value": "1"},
            {"name": "Same", "value": "2"},
        ],
    }
    resp = client.post("/briefings", json=payload)
    assert resp.status_code == 422


def test_validation_non_empty_key_points(client: TestClient) -> None:
    """At least 2 non-empty key points after stripping."""
    payload = {
        "companyName": "X",
        "ticker": "X",
        "sector": "S",
        "analystName": "A",
        "summary": "S",
        "recommendation": "R",
        "keyPoints": ["  ", "only one real"],
        "risks": ["R"],
    }
    resp = client.post("/briefings", json=payload)
    assert resp.status_code == 422
