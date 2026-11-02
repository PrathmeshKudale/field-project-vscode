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
