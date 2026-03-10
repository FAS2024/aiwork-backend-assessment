from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.briefing import BriefingCreate, BriefingRead
from app.services.briefing_service import (
    create_briefing,
    generate_report,
    get_briefing,
    get_generated_html,
    briefing_to_read,
)

router = APIRouter(prefix="/briefings", tags=["briefings"])


@router.post("", response_model=BriefingRead, status_code=status.HTTP_201_CREATED)
def post_briefing(
    payload: BriefingCreate,
    db: Annotated[Session, Depends(get_db)],
) -> BriefingRead:
    """Create a new briefing from structured JSON."""
    briefing = create_briefing(db, payload)
    return briefing_to_read(briefing)


@router.get("/{id}", response_model=BriefingRead)
def get_briefing_by_id(
    id: int,
    db: Annotated[Session, Depends(get_db)],
) -> BriefingRead:
    """Retrieve stored structured data for a single briefing."""
    briefing = get_briefing(db, id)
    if not briefing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Briefing not found",
        )
    return briefing_to_read(briefing)


@router.post("/{id}/generate")
def post_generate(id: int, db: Annotated[Session, Depends(get_db)]) -> dict:
    """Generate and store the HTML report for an existing briefing."""
    html = generate_report(db, id)
    if html is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Briefing not found",
        )
    return {"status": "generated", "id": id}


@router.get("/{id}/html", response_class=HTMLResponse)
def get_briefing_html(
    id: int,
    db: Annotated[Session, Depends(get_db)],
) -> HTMLResponse:
    """Return the generated HTML report for a briefing (actual HTML, not JSON)."""
    html = get_generated_html(db, id)
    if html is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Briefing not found or report not yet generated",
        )
    return HTMLResponse(content=html)
