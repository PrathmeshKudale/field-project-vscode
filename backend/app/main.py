from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Conversation, Course, Message
from .schemas import ChatRequest, ChatResponse, CourseResponse, SourceReference
from .seed import seed_courses


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_courses(session)
    yield


app = FastAPI(
    title="KaushalSetu AI API",
    description="Evidence-aware education and career exploration API. Counsellor responses are a transparent demo.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    with SessionLocal() as session:
        yield session


DbSession = Annotated[Session, Depends(get_db)]


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "kaushalsetu-api"}


@app.get("/api/courses", response_model=list[CourseResponse])
def list_courses(
    db: DbSession,
    search: Annotated[str | None, Query(max_length=100)] = None,
    category: Annotated[str | None, Query(max_length=40)] = None,
):
    statement = select(Course).order_by(Course.featured.desc(), Course.title)
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(Course.title.ilike(term), Course.description.ilike(term), Course.category.ilike(term))
        )
    if category and category.lower() != "all courses":
        statement = statement.where(Course.category.ilike(category.strip()))
    return db.scalars(statement).all()


@app.post("/api/counsellor/chat", response_model=ChatResponse)
def counsellor_chat(payload: ChatRequest, db: DbSession):
    message_text = payload.message.strip()
    if not message_text:
        raise HTTPException(status_code=422, detail="Message must not be blank.")

    normalized = message_text.lower()
    if any(term in normalized for term in ("commerce", "business", "bba", "account")):
        categories = ("Degree", "Professional")
        answer = (
            "With a commerce background and an interest in business or technology, you could compare "
            "business degrees such as BBA with introductory digital or data-learning options. Start by "
            "checking each institution’s current subject and admission requirements; they can differ. "
            "If you share your location, interests, and preferred study style, this can be narrowed down. "
            "These are exploration ideas, not a personalised eligibility decision."
        )
    elif any(term in normalized for term in ("10th", "class 10", "iti", "vocational", "trade")):
        categories = ("Vocational", "Diploma")
        answer = (
            "After Class 10, vocational training and diploma routes are both worth exploring. They differ "
            "in focus and progression options, and requirements depend on the trade, institution, and current "
            "rules. Compare the practical learning, duration, and next-step possibilities before deciding. "
            "These are starting points, not a confirmation of eligibility."
        )
    elif any(term in normalized for term in ("scholarship", "financial", "fee", "funding")):
        categories = ("Degree", "Vocational")
        answer = (
            "A good first step is the National Scholarship Portal. Schemes, deadlines, and eligibility can "
            "change, so check the current official notice and apply only through the named official channel. "
            "The course suggestions here are examples; this demo does not match your profile to live schemes."
        )
    elif any(term in normalized for term in ("college", "institution", "verify", "recognition", "approved")):
        categories = ("Degree", "Diploma")
        answer = (
            "To check an institution, first identify the exact course, campus, and academic year. Then verify "
            "them with the authority relevant to that type of institution and programme. A missing result "
            "isn't proof that a course is unrecognised. This demo links to official starting points but does "
            "not perform a live recognition check."
        )
    else:
        categories = ("Degree", "Vocational", "Professional")
        answer = (
            "There are several directions you could explore, and the best fit depends on your current "
            "qualification, interests, location, and how you prefer to learn. I’d start by comparing one "
            "academic route, one practical route, and one flexible learning option. Share a little more "
            "about your situation and we can make that comparison more useful. This guided demo does not "
            "confirm eligibility or provide professional counselling."
        )

    statement = select(Course).where(Course.category.in_(categories)).order_by(
        Course.featured.desc(), Course.title
    ).limit(3)
    recommendations = db.scalars(statement).all()
    conversation = Conversation()
    conversation.messages = [
        Message(role="user", content=message_text),
        Message(role="assistant", content=answer),
    ]
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    source_by_url: dict[str, SourceReference] = {}
    for course in recommendations:
        source_by_url.setdefault(
            course.source_url,
            SourceReference(title=course.source_title, url=course.source_url),
        )
    if any(term in normalized for term in ("scholarship", "financial", "fee", "funding")):
        source_by_url["https://scholarships.gov.in/"] = SourceReference(
            title="National Scholarship Portal", url="https://scholarships.gov.in/"
        )
    return ChatResponse(
        conversation_id=conversation.id,
        answer=answer,
        recommendations=recommendations,
        sources=list(source_by_url.values()),
        demo_mode=True,
    )
