from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.briefing import Briefing, BriefingMetric, BriefingPoint
from app.schemas.briefing import BriefingCreate, BriefingRead
from app.services.briefing_report_formatter import briefing_to_report_view_model
from app.services.report_formatter import ReportFormatter


def create_briefing(db: Session, payload: BriefingCreate) -> Briefing:
    """Store a new briefing with points and metrics."""
    briefing = Briefing(
        company_name=payload.companyName.strip(),
        ticker=payload.ticker,
        sector=payload.sector.strip(),
        analyst_name=payload.analystName.strip(),
        summary=payload.summary.strip(),
        recommendation=payload.recommendation.strip(),
    )
    db.add(briefing)
    db.flush()

    for i, content in enumerate(payload.keyPoints):
        if content:
            db.add(
                BriefingPoint(
                    briefing_id=briefing.id,
                    kind="key_point",
                    content=content,
                    display_order=i,
                )
            )
    for i, content in enumerate(payload.risks):
        if content:
            db.add(
                BriefingPoint(
                    briefing_id=briefing.id,
                    kind="risk",
                    content=content,
                    display_order=i,
                )
            )
    if payload.metrics:
        for i, m in enumerate(payload.metrics):
            db.add(
                BriefingMetric(
                    briefing_id=briefing.id,
                    name=m.name.strip(),
                    value=m.value.strip(),
                    display_order=i,
                )
            )

    db.commit()
    db.refresh(briefing)
    return briefing


def get_briefing(db: Session, briefing_id: int) -> Briefing | None:
    """Load a briefing by id with points and metrics."""
    stmt = (
        select(Briefing)
        .where(Briefing.id == briefing_id)
        .options(
            selectinload(Briefing.points),
            selectinload(Briefing.metrics),
        )
    )
    return db.scalars(stmt).unique().one_or_none()


def briefing_to_read(briefing: Briefing) -> BriefingRead:
    """Map ORM Briefing to BriefingRead schema."""
    key_points = [p.content for p in briefing.points if p.kind == "key_point"]
    risks = [p.content for p in briefing.points if p.kind == "risk"]
    metrics = [{"name": m.name, "value": m.value} for m in briefing.metrics]
    return BriefingRead(
        id=briefing.id,
        company_name=briefing.company_name,
        ticker=briefing.ticker,
        sector=briefing.sector,
        analyst_name=briefing.analyst_name,
        summary=briefing.summary,
        recommendation=briefing.recommendation,
        key_points=key_points,
        risks=risks,
        metrics=metrics,
        generated_at=briefing.generated_at,
        created_at=briefing.created_at,
        updated_at=briefing.updated_at,
    )


def generate_report(db: Session, briefing_id: int) -> str | None:
    """
    Generate HTML report for a briefing, store it, mark as generated.
    Returns generated HTML, or None if briefing not found.
    """
    briefing = get_briefing(db, briefing_id)
    if not briefing:
        return None

    view_model = briefing_to_report_view_model(briefing)
    formatter = ReportFormatter()
    html = formatter.render_briefing_report(view_model)

    briefing.generated_html = html
    briefing.generated_at = datetime.fromisoformat(
        view_model.generated_at_iso.replace("Z", "+00:00")
    )
    db.commit()
    return html


def get_generated_html(db: Session, briefing_id: int) -> str | None:
    """Return stored generated HTML for a briefing, or None if not found or not generated."""
    briefing = get_briefing(db, briefing_id)
    if not briefing or not briefing.generated_html:
        return None
    return briefing.generated_html
