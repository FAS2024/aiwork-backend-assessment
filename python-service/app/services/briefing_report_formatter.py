"""Transforms stored briefing data into a report view model for template rendering."""

from datetime import datetime, timezone

from app.models.briefing import Briefing
from app.schemas.report import ReportMetric, ReportViewModel


def briefing_to_report_view_model(briefing: Briefing) -> ReportViewModel:
    """Transform a Briefing ORM instance into a report-friendly view model."""
    key_points = [p.content for p in briefing.points if p.kind == "key_point"]
    risks = [p.content for p in briefing.points if p.kind == "risk"]
    metrics = [ReportMetric(name=m.name, value=m.value) for m in briefing.metrics]

    now = datetime.now(timezone.utc)
    generated_at_iso = now.isoformat()
    generated_at_display = now.strftime("%Y-%m-%d %H:%M UTC")

    report_title = f"Briefing Report: {briefing.company_name} ({briefing.ticker})"

    return ReportViewModel(
        report_title=report_title,
        company_name=briefing.company_name,
        ticker=briefing.ticker,
        sector=briefing.sector,
        analyst_name=briefing.analyst_name,
        summary=briefing.summary,
        key_points=key_points,
        risks=risks,
        recommendation=briefing.recommendation,
        metrics=metrics,
        generated_at_iso=generated_at_iso,
        generated_at_display=generated_at_display,
    )
