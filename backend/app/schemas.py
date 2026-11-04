from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    qualification: str
    duration: str
    mode: str
    description: str
    skills: list[str]
    source_title: str
    source_url: str
    featured: bool


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class SourceReference(BaseModel):
    title: str
    url: str


class ChatResponse(BaseModel):
    conversation_id: int
    answer: str
    recommendations: list[CourseResponse]
    sources: list[SourceReference]
    demo_mode: bool = True


class LiveResearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)
    topic: str = Field(pattern=r"^(courses|pathways|scholarships|verification)$")


class LiveResearchResponse(BaseModel):
    answer: str
    sources: list[SourceReference]
    generated_at: str


class GoogleAuthConfig(BaseModel):
    enabled: bool
    client_id: str | None = None
    redirect_uri: str | None = None


class GoogleCodeExchangeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=4096)
    code_verifier: str = Field(
        min_length=43,
        max_length=128,
        pattern=r"^[A-Za-z0-9._~-]+$",
    )
    nonce: str = Field(min_length=32, max_length=128, pattern=r"^[A-Za-z0-9._~-]+$")
    redirect_uri: str = Field(min_length=1, max_length=500)


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    picture: str | None
    email_verified: bool


class SkillRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str = Field(min_length=1, max_length=80)
    level: int = Field(ge=1, le=5)
    evidence: str = Field(default="", max_length=300)

    @field_validator("name")
    @classmethod
    def trim_skill_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Skill name must not be blank.")
        return normalized

    @field_validator("evidence")
    @classmethod
    def trim_evidence(cls, value: str) -> str:
        return value.strip()


class ReplaceSkillsRequest(BaseModel):
    skills: list[SkillRecord] = Field(max_length=100)
