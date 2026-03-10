"""Report view model: transformed data for HTML rendering (not raw request/DB)."""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class ReportMetric:
    name: str
    value: str


@dataclass
class ReportViewModel:
    """Structured view model for the briefing report template."""

    report_title: str
    company_name: str
    ticker: str
    sector: str
    analyst_name: str
    summary: str
    key_points: list[str]
    risks: list[str]
    recommendation: str
    metrics: list[ReportMetric]
    generated_at_iso: str
    generated_at_display: str
