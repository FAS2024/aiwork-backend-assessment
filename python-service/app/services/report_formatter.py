from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.schemas.report import ReportViewModel

_TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "templates"


class ReportFormatter:
    """Renders report HTML from view models using Jinja2."""

    def __init__(self) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(_TEMPLATE_DIR)),
            autoescape=select_autoescape(enabled_extensions=("html", "xml"), default_for_string=True),
        )

    def render_base(self, title: str, body: str) -> str:
        template = self._env.get_template("base.html")
        return template.render(title=title, body=body, generated_at=self.generated_timestamp())

    def render_briefing_report(self, view_model: ReportViewModel) -> str:
        template = self._env.get_template("briefing_report.html")
        return template.render(
            report_title=view_model.report_title,
            company_name=view_model.company_name,
            ticker=view_model.ticker,
            sector=view_model.sector,
            analyst_name=view_model.analyst_name,
            summary=view_model.summary,
            key_points=view_model.key_points,
            risks=view_model.risks,
            recommendation=view_model.recommendation,
            metrics=view_model.metrics,
            generated_at_iso=view_model.generated_at_iso,
            generated_at_display=view_model.generated_at_display,
        )

    @staticmethod
    def generated_timestamp() -> str:
        return datetime.now(timezone.utc).isoformat()
