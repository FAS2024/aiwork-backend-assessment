"""Unit tests for the briefing report formatter (view model transformation)."""

from datetime import datetime, timezone

import pytest

from app.models.briefing import Briefing, BriefingMetric, BriefingPoint
from app.services.briefing_report_formatter import briefing_to_report_view_model


def _make_briefing(
    company_name: str = "Acme Corp",
    ticker: str = "ACME",
    sector: str = "Technology",
    analyst_name: str = "Jane Doe",
    summary: str = "Strong quarter.",
    recommendation: str = "Hold.",
    key_points: list[str] | None = None,
    risks: list[str] | None = None,
    metrics: list[tuple[str, str]] | None = None,
) -> Briefing:
    """Build a Briefing with points and metrics (no DB)."""
    key_points = key_points or ["Point A", "Point B"]
    risks = risks or ["Risk 1"]
    b = Briefing(
        id=1,
        company_name=company_name,
        ticker=ticker,
        sector=sector,
        analyst_name=analyst_name,
        summary=summary,
        recommendation=recommendation,
        generated_at=None,
        generated_html=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    b.points = [
        BriefingPoint(id=i, briefing_id=1, kind="key_point", content=s, display_order=i, created_at=b.created_at)
        for i, s in enumerate(key_points)
    ] + [
        BriefingPoint(id=100 + i, briefing_id=1, kind="risk", content=s, display_order=i, created_at=b.created_at)
        for i, s in enumerate(risks)
    ]
    b.metrics = [
        BriefingMetric(id=i, briefing_id=1, name=name, value=val, display_order=i, created_at=b.created_at)
        for i, (name, val) in enumerate(metrics or [])
    ]
    return b


def test_view_model_has_report_title_and_company() -> None:
    b = _make_briefing(company_name="Test Co", ticker="TST")
    vm = briefing_to_report_view_model(b)
    assert vm.report_title == "Briefing Report: Test Co (TST)"
    assert vm.company_name == "Test Co"
    assert vm.ticker == "TST"
    assert vm.sector == "Technology"
    assert vm.analyst_name == "Jane Doe"


def test_view_model_splits_key_points_and_risks() -> None:
    b = _make_briefing(
        key_points=["K1", "K2"],
        risks=["R1", "R2"],
    )
    vm = briefing_to_report_view_model(b)
    assert vm.key_points == ["K1", "K2"]
    assert vm.risks == ["R1", "R2"]


def test_view_model_includes_metrics() -> None:
    b = _make_briefing(metrics=[("Revenue", "18%"), ("Margin", "22%")])
    vm = briefing_to_report_view_model(b)
    assert len(vm.metrics) == 2
    assert vm.metrics[0].name == "Revenue" and vm.metrics[0].value == "18%"
    assert vm.metrics[1].name == "Margin" and vm.metrics[1].value == "22%"


def test_view_model_has_generated_timestamps() -> None:
    b = _make_briefing()
    vm = briefing_to_report_view_model(b)
    assert "T" in vm.generated_at_iso or "Z" in vm.generated_at_iso
    assert "UTC" in vm.generated_at_display
