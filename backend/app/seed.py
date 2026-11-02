from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Course


COURSES = [
    {
        "title": "Bachelor of Computer Applications",
        "category": "Degree",
        "qualification": "Class 12 (eligibility varies)",
        "duration": "3–4 years",
        "mode": "Campus / blended",
        "description": "Explore computing, software fundamentals, and the many ways technology meets everyday life.",
        "skills": ["Programming", "Problem solving", "Digital literacy"],
        "source_title": "University Grants Commission",
        "source_url": "https://www.ugc.gov.in/",
        "featured": True,
    },
    {
        "title": "Diploma in Engineering",
        "category": "Diploma",
        "qualification": "Class 10 or equivalent (varies)",
        "duration": "3 years",
        "mode": "Campus",
        "description": "A practical introduction to engineering foundations, with routes to further study in some cases.",
        "skills": ["Technical drawing", "Applied mathematics", "Workshop practice"],
        "source_title": "All India Council for Technical Education",
        "source_url": "https://www.aicte-india.org/",
        "featured": True,
    },
    {
        "title": "Industrial Training Institute (ITI)",
        "category": "Vocational",
        "qualification": "Class 8 or 10 (trade dependent)",
        "duration": "6 months–2 years",
        "mode": "Practical training",
        "description": "Hands-on trade training that can lead towards apprenticeship, employment, or further learning.",
        "skills": ["Trade skills", "Safety practices", "Hands-on learning"],
        "source_title": "Directorate General of Training",
        "source_url": "https://dgt.gov.in/",
        "featured": True,
    },
    {
        "title": "Bachelor of Business Administration",
        "category": "Degree",
        "qualification": "Class 12 or equivalent (varies)",
        "duration": "3–4 years",
        "mode": "Campus / blended",
        "description": "Build a foundation in business, people, and organisations while exploring your interests.",
        "skills": ["Communication", "Business foundations", "Teamwork"],
        "source_title": "University Grants Commission",
        "source_url": "https://www.ugc.gov.in/",
        "featured": True,
    },
    {
        "title": "Data Analytics Foundations",
        "category": "Professional",
        "qualification": "Open to learners; prerequisites vary",
        "duration": "3–12 months",
        "mode": "Online / blended",
        "description": "Start exploring data, spreadsheets, and visualisation through a flexible learning route.",
        "skills": ["Spreadsheets", "Data literacy", "Visualisation"],
        "source_title": "Bharat Skills",
        "source_url": "https://bharatskills.gov.in/",
        "featured": True,
    },
    {
        "title": "Apprenticeship Training",
        "category": "Vocational",
        "qualification": "Depends on trade and opportunity",
        "duration": "As notified by employer",
        "mode": "Work-based learning",
        "description": "Learn practical skills in a workplace setting; openings and eligibility depend on each opportunity.",
        "skills": ["Workplace learning", "Trade practice", "Professional habits"],
        "source_title": "Directorate General of Training",
        "source_url": "https://dgt.gov.in/",
        "featured": False,
    },
    {
        "title": "Bachelor of Science",
        "category": "Degree",
        "qualification": "Class 12; subject requirements vary",
        "duration": "3–4 years",
        "mode": "Campus",
        "description": "Study a science subject in depth and discover options across research and applied fields.",
        "skills": ["Scientific thinking", "Research methods", "Analysis"],
        "source_title": "University Grants Commission",
        "source_url": "https://www.ugc.gov.in/",
        "featured": False,
    },
    {
        "title": "ITI Electrician Trade",
        "category": "Vocational",
        "qualification": "Class 10; check current trade rules",
        "duration": "2 years",
        "mode": "Practical training",
        "description": "A trade-focused route to learn electrical fundamentals and safe practical work.",
        "skills": ["Electrical basics", "Safety", "Installation practice"],
        "source_title": "Directorate General of Training",
        "source_url": "https://dgt.gov.in/",
        "featured": False,
    },
]


def seed_courses(session: Session) -> None:
    if session.scalar(select(Course.id).limit(1)) is not None:
        return
    session.add_all(Course(**course) for course in COURSES)
    session.commit()
