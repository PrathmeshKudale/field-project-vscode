from pydantic import BaseModel, ConfigDict, Field


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
