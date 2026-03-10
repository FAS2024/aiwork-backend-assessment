from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class MetricItem(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    value: str = Field(min_length=1, max_length=80)


class BriefingCreate(BaseModel):
    companyName: str = Field(min_length=1, max_length=200)
    ticker: str = Field(min_length=1, max_length=20)
    sector: str = Field(min_length=1, max_length=120)
    analystName: str = Field(min_length=1, max_length=160)
    summary: str = Field(min_length=1)
    recommendation: str = Field(min_length=1)
    keyPoints: list[str] = Field(min_length=2)
    risks: list[str] = Field(min_length=1)
    metrics: list[MetricItem] | None = Field(default=None)

    @field_validator("ticker", mode="before")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().upper()
        return v

    @field_validator("keyPoints", "risks", mode="before")
    @classmethod
    def strip_string_items(cls, v: list[str]) -> list[str]:
        if not isinstance(v, list):
            return v
        return [x.strip() if isinstance(x, str) else x for x in v]

    @model_validator(mode="after")
    def require_non_empty_points_and_risks(self) -> "BriefingCreate":
        key_points = [s for s in self.keyPoints if s]
        risks = [s for s in self.risks if s]
        if len(key_points) < 2:
            raise ValueError("at least 2 non-empty key points are required")
        if len(risks) < 1:
            raise ValueError("at least 1 non-empty risk is required")
        return self

    @field_validator("metrics")
    @classmethod
    def unique_metric_names(cls, v: list[MetricItem] | None) -> list[MetricItem] | None:
        if not v:
            return v
        names = [m.name for m in v]
        if len(names) != len(set(names)):
            raise ValueError("metric names must be unique within the same briefing")
        return v


class BriefingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    ticker: str
    sector: str
    analyst_name: str
    summary: str
    recommendation: str
    key_points: list[str]
    risks: list[str]
    metrics: list[dict[str, str]]
    generated_at: datetime | None
    created_at: datetime
    updated_at: datetime
