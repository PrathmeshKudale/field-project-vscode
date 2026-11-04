import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  ExternalLink,
  GraduationCap,
  Heart,
  Lightbulb,
  Menu,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import {
  exchangeGoogleCode,
  getCourses,
  getCurrentUser,
  getGoogleAuthConfig,
  getMySkills,
  replaceMySkills,
  sendCounsellorMessage,
  searchLiveResearch,
  signOut,
  type AuthUser,
  type Course,
  type LiveResearchResult,
  type ResearchTopic,
  type SkillRecord,
} from "./api";

type View = "Overview" | "Explore courses" | "Career pathways" | "Scholarships" | "Skill builder" | "Evidence passport";
type SkillStorageStatus = "loading" | "guest" | "synced" | "saving" | "error";

function isSkillRecord(value: unknown): value is SkillRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.name === "string"
    && Number.isInteger(record.level)
    && Number(record.level) >= 1
    && Number(record.level) <= 5
    && typeof record.evidence === "string";
}

function readGuestSkills(): SkillRecord[] {
  const saved = window.localStorage.getItem("kaushalsetu.skills.v1");
  if (!saved) return [];
  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isSkillRecord)) {
    throw new Error("Saved skill data has an unexpected format.");
  }
  return parsed;
}

const navigation: { name: View; icon: typeof Compass }[] = [
  { name: "Overview", icon: Compass },
  { name: "Explore courses", icon: BookOpen },
  { name: "Career pathways", icon: TrendingUp },
  { name: "Scholarships", icon: WalletCards },
  { name: "Skill builder", icon: Target },
  { name: "Evidence passport", icon: ShieldCheck },
];

const starterQuestions = [
  "What can I do after 12th commerce?",
  "Find technology courses for me",
  "How do I verify a college?",
];

function App() {
  const [activeView, setActiveView] = useState<View>("Overview");
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseError, setCourseError] = useState("");
  const [courseLoading, setCourseLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All courses");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");
  const [chatSources, setChatSources] = useState<{ title: string; url: string }[]>([]);
  const [chatDemoMode, setChatDemoMode] = useState<boolean | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [language, setLanguage] = useState("EN");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const authRestoreStarted = useRef(false);

  useEffect(() => {
    if (authRestoreStarted.current) return;
    authRestoreStarted.current = true;
    const isCallback = window.location.pathname === "/auth/callback";

    async function restoreAuthentication() {
      try {
        if (isCallback) {
          setAuthLoading(true);
          const params = new URLSearchParams(window.location.search);
          const providerError = params.get("error");
          const code = params.get("code");
          const returnedState = params.get("state");
          const expectedState = sessionStorage.getItem("google_oauth_state");
          const codeVerifier = sessionStorage.getItem("google_oauth_verifier");
          const nonce = sessionStorage.getItem("google_oauth_nonce");
          sessionStorage.removeItem("google_oauth_state");
          sessionStorage.removeItem("google_oauth_verifier");
          sessionStorage.removeItem("google_oauth_nonce");
          window.history.replaceState({}, "", "/");

          if (providerError) throw new Error("Google sign-in was cancelled or denied.");
          if (!code || !returnedState || !expectedState || returnedState !== expectedState || !codeVerifier || !nonce) {
            throw new Error("Google sign-in could not be verified. Please try again.");
          }
          const config = await getGoogleAuthConfig();
          if (!config.enabled || !config.redirect_uri) {
            throw new Error("Google sign-in isn’t configured on the backend yet.");
          }
          const signedInUser = await exchangeGoogleCode(code, codeVerifier, nonce, config.redirect_uri);
          setUser(signedInUser);
        } else {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        if (isCallback) {
          setAuthError(error instanceof Error ? error.message : "Google sign-in failed. Please try again.");
        }
      } finally {
        if (isCallback) setAuthLoading(false);
      }
    }

    void restoreAuthentication();
  }, []);

  useEffect(() => {
    let active = true;
    setCourseLoading(true);
    getCourses(search, category)
      .then((data) => {
        if (active) {
          setCourses(data);
          setCourseError("");
        }
      })
      .catch((error: unknown) => {
        if (active) setCourseError(error instanceof Error ? error.message : "Could not load courses.");
      })
      .finally(() => {
        if (active) setCourseLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, category]);

  const featuredCourses = useMemo(() => courses.slice(0, 3), [courses]);

  function navigate(view: View) {
    setActiveView(view);
    setMobileNavOpen(false);
  }

  async function beginGoogleSignIn() {
    setAuthLoading(true);
    setAuthError("");
    try {
      const config = await getGoogleAuthConfig();
      if (!config.enabled || !config.client_id || !config.redirect_uri) {
        throw new Error("Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to the backend environment.");
      }
      const stateBytes = crypto.getRandomValues(new Uint8Array(32));
      const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
      const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
      const state = base64Url(stateBytes);
      const verifier = base64Url(verifierBytes);
      const nonce = base64Url(nonceBytes);
      const challengeDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
      const challenge = base64Url(new Uint8Array(challengeDigest));
      sessionStorage.setItem("google_oauth_state", state);
      sessionStorage.setItem("google_oauth_verifier", verifier);
      sessionStorage.setItem("google_oauth_nonce", nonce);
      const params = new URLSearchParams({
        client_id: config.client_id,
        redirect_uri: config.redirect_uri,
        response_type: "code",
        scope: "openid email profile",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        nonce,
        prompt: "select_account",
      });
      window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    } catch (error) {
      setAuthLoading(false);
      setAuthError(error instanceof Error ? error.message : "Could not start Google sign-in.");
    }
  }

  async function handleSignOut() {
    setAuthError("");
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  async function submitChat(event?: FormEvent<HTMLFormElement>, prompt = chatInput) {
    event?.preventDefault();
    const message = prompt.trim();
    if (!message || chatLoading) return;
    setChatInput(message);
    setChatLoading(true);
    setChatError("");
    setChatAnswer("");
    try {
      const result = await sendCounsellorMessage(message);
      setChatAnswer(result.answer);
      setChatSources(result.sources);
      setChatDemoMode(result.demo_mode);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <span>kaushal<span className="brand-light">setu</span><sup>AI</sup></span>
        </div>
        <div className="workspace-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button key={name} className={`nav-item ${activeView === name ? "nav-active" : ""}`} onClick={() => navigate(name)}>
              <Icon size={18} strokeWidth={1.8} /><span>{name}</span>
              {name === "Evidence passport" && <span className="nav-count">4</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-spark"><Sparkles size={16} /></div>
            <p>Big decisions feel smaller with a little guidance.</p>
            <button onClick={() => setChatOpen(true)}>Talk to your guide <ArrowRight size={14} /></button>
            <div className="help-decoration">✳</div>
          </div>
          <div className="profile-button">
            {user?.picture ? <img className="avatar user-picture" src={user.picture} alt="" referrerPolicy="no-referrer" /> : <div className="avatar">{user ? user.name.slice(0, 1).toUpperCase() : "G"}</div>}
            <span className="profile-copy"><strong>{user?.name ?? "Your learning space"}</strong><small>{user ? user.email : "Guest profile"}</small></span>
            {user && <BadgeCheck size={16} className="profile-verified" />}
          </div>
          <div className="sidebar-footnote"><span className="online-dot" /> A more thoughtful way forward</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>My learning space</span><ChevronRight size={15} /><strong>{activeView}</strong></div>
          <div className="topbar-actions">
            <button className="language-button" onClick={() => setLanguage(language === "EN" ? "हिं" : "EN")} aria-label="Change language">
              <span className="language-globe">अ</span>{language}<ChevronDown size={13} />
            </button>
            <button className="icon-button notification-button" aria-label="Notifications"><span className="notification-dot" /><CircleHelp size={19} /></button>
            {user ? (
              <>
                <span className="signed-in-name">{user.name.split(" ")[0]}</span>
                <button className="signout-button" onClick={handleSignOut}>Sign out</button>
                {user.picture ? <img className="top-avatar user-picture" src={user.picture} alt="" referrerPolicy="no-referrer" /> : <div className="top-avatar">{user.name.slice(0, 1).toUpperCase()}</div>}
              </>
            ) : (
              <button className="google-signin" onClick={beginGoogleSignIn} disabled={authLoading}>
                <span className="google-g">G</span><span className="google-signin-label">{authLoading ? "Connecting…" : "Continue with Google"}</span><span className="google-signin-mobile">{authLoading ? "…" : "Sign in"}</span>
              </button>
            )}
          </div>
        </header>

        {authError && <div className="auth-alert" role="alert"><CircleHelp size={15} /><span>{authError}</span><button aria-label="Dismiss" onClick={() => setAuthError("")}><X size={15} /></button></div>}
        {authLoading && window.location.pathname === "/auth/callback" && <div className="auth-progress">Completing your secure Google sign-in…</div>}

        <div className="page-content">
          {activeView === "Overview" && (
            <Dashboard courses={featuredCourses} courseLoading={courseLoading} courseError={courseError} onNavigate={navigate} onCourseSelect={setSelectedCourse} onChat={() => setChatOpen(true)} />
          )}
          {activeView === "Explore courses" && (
            <CourseExplorer courses={courses} loading={courseLoading} error={courseError} search={search} category={category} onSearch={setSearch} onCategory={setCategory} onCourseSelect={setSelectedCourse} />
          )}
          {activeView === "Career pathways" && <Pathways onChat={() => setChatOpen(true)} />}
          {activeView === "Scholarships" && <Scholarships />}
          {activeView === "Skill builder" && <SkillBuilder user={user} />}
          {activeView === "Evidence passport" && <EvidencePassport />}
        </div>
        <footer className="page-footer"><span>Made for clearer choices, not louder promises.</span><span>Information is a starting point. Always confirm details with the official source.</span></footer>
      </main>

      {chatOpen && (
        <Counsellor
          input={chatInput}
          answer={chatAnswer}
          sources={chatSources}
          demoMode={chatDemoMode}
          loading={chatLoading}
          error={chatError}
          onInput={setChatInput}
          onClose={() => setChatOpen(false)}
          onSubmit={submitChat}
        />
      )}
      {selectedCourse && <CourseDetails course={selectedCourse} onClose={() => setSelectedCourse(null)} />}
    </div>
  );
}

function Dashboard({ courses, courseLoading, courseError, onNavigate, onCourseSelect, onChat }: {
  courses: Course[];
  courseLoading: boolean;
  courseError: string;
  onNavigate: (view: View) => void;
  onCourseSelect: (course: Course) => void;
  onChat: () => void;
}) {
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date()).toUpperCase();

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> {today}</div>
          <h1>Find your next step.<br /><span>We’ll explore it together.</span></h1>
          <p className="welcome-copy">Your next chapter doesn’t have to be a guessing game.</p>
        </div>
        <div className="streak-card"><div className="streak-icon"><Sparkles size={18} /></div><div><strong>Small steps count</strong><span>You’re building a clearer picture.</span></div><ArrowUpRight size={17} /></div>
      </div>

      <section className="hero-card">
        <div className="hero-content">
          <div className="hero-kicker"><Sparkles size={14} /> YOUR PERSONAL CAREER COMPASS</div>
          <h2>Clarity looks<br />good on you.</h2>
          <p>Tell us what you’re curious about. We’ll help you explore the possibilities, one thoughtful step at a time.</p>
          <button className="hero-button" onClick={onChat}>Start a conversation <ArrowRight size={16} /></button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="orbit-center"><Compass size={39} strokeWidth={1.2} /></div>
          <div className="orbit-node node-top"><GraduationCap size={17} /></div>
          <div className="orbit-node node-right"><Lightbulb size={17} /></div>
          <div className="orbit-node node-bottom"><BriefcaseBusiness size={16} /></div>
          <div className="orbit-node node-left"><Heart size={16} /></div>
          <span className="art-star star-one">✳</span><span className="art-star star-two">✦</span>
        </div>
        <div className="hero-note"><span className="hero-note-dot" /> Grounded in evidence. Made for you.</div>
      </section>

      <div className="section-heading">
        <div><div className="section-kicker">A LITTLE DIRECTION</div><h2>Your journey, at a glance</h2></div>
        <button className="text-button" onClick={() => onNavigate("Career pathways")}>View your plan <ArrowRight size={15} /></button>
      </div>
      <section className="journey-grid">
        <div className="journey-card">
          <div className="journey-top"><div className="journey-icon green-icon"><Compass size={19} /></div><span className="soft-pill">JUST GETTING STARTED</span></div>
          <h3>Every path starts somewhere.</h3>
          <p>Tell us a little about your interests and we’ll help you see what could come next.</p>
          <div className="journey-bottom"><span>Build your skill profile</span><button aria-label="Build your skill profile" onClick={() => onNavigate("Skill builder")}><ArrowRight size={17} /></button></div>
        </div>
        <div className="mini-stat-card">
          <div className="stat-icon lavender-icon"><BookOpen size={18} /></div>
          <div className="stat-number">Explore <span>at your pace</span></div>
          <p>Thoughtful options, not endless lists.</p>
          <button className="mini-link" onClick={() => onNavigate("Explore courses")}>Browse courses <ArrowRight size={14} /></button>
          <div className="stat-decoration">✳</div>
        </div>
        <div className="mini-stat-card peach-card">
          <div className="stat-icon peach-icon"><ShieldCheck size={18} /></div>
          <div className="stat-number">Know <span>what’s verified</span></div>
          <p>Every source has a place in your story.</p>
          <button className="mini-link" onClick={() => onNavigate("Evidence passport")}>Visit your passport <ArrowRight size={14} /></button>
          <div className="stat-decoration">✳</div>
        </div>
      </section>

      <div className="section-heading featured-heading">
        <div><div className="section-kicker">A PLACE TO BEGIN</div><h2>Paths worth exploring</h2></div>
        <button className="text-button" onClick={() => onNavigate("Explore courses")}>All courses <ArrowRight size={15} /></button>
      </div>
      {courseError && <p className="inline-error">{courseError}</p>}
      {courseLoading ? <div className="loading-row">Finding a few good places to start…</div> : (
        <div className="course-preview-grid">
          {courses.map((course, index) => <CourseCard key={course.id} course={course} index={index} onClick={onCourseSelect} />)}
        </div>
      )}
      <div className="bottom-nudge"><div className="nudge-icon"><MessageCircle size={17} /></div><span>Not sure where to begin? That’s a perfectly good place to start.</span><button onClick={onChat}>Let’s talk <ArrowRight size={14} /></button></div>
    </>
  );
}

function CourseCard({ course, index, onClick }: { course: Course; index: number; onClick: (course: Course) => void }) {
  const icons = [GraduationCap, Lightbulb, BriefcaseBusiness];
  const Icon = icons[index % icons.length];
  return (
    <button className="course-card" onClick={() => onClick(course)} aria-label={`View details for ${course.title}`}>
      <div className={`course-art course-art-${index % 3}`}><span className="course-art-icon"><Icon size={20} /></span><span className="course-arrow"><ArrowUpRight size={15} /></span><span className="course-art-shape" /></div>
      <div className="course-card-body">
        <div className="course-meta"><span>{course.category}</span><span>{course.duration}</span></div>
        <h3>{course.title}</h3>
        <p>{course.description}</p>
        <div className="course-card-foot"><span className="course-mode"><span className="tiny-dot" />{course.mode}</span><span className="course-card-link">Explore <ArrowRight size={13} /></span></div>
      </div>
    </button>
  );
}

function CourseExplorer({ courses, loading, error, search, category, onSearch, onCategory, onCourseSelect }: {
  courses: Course[];
  loading: boolean;
  error: string;
  search: string;
  category: string;
  onSearch: (value: string) => void;
  onCategory: (value: string) => void;
  onCourseSelect: (course: Course) => void;
}) {
  const categories = ["All courses", "Degree", "Diploma", "Vocational", "Professional"];
  return (
    <>
      <PageIntro eyebrow="YOUR OPTIONS, IN ONE PLACE" title={<>Explore a world<br />of <span>possibilities.</span></>} copy="A growing catalogue to help you compare your next steps. Take your time; there’s no one-size-fits-all path." />
      <div className="explorer-toolbar">
        <label className="explorer-search"><Search size={18} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search courses, skills, or interests…" /></label>
      </div>
      <div className="filter-row">{categories.map((item) => <button key={item} className={`filter-chip ${category === item ? "filter-selected" : ""}`} onClick={() => onCategory(item)}>{item}{item === "All courses" && category === item && <span>{courses.length}</span>}</button>)}</div>
      <div className="result-label">{loading ? "Finding courses…" : `${courses.length} thoughtful places to start`}<span>•</span> Showing options with room to grow</div>
      {error && <div className="error-card">{error} — make sure the API server is running.</div>}
      {!loading && courses.length === 0 && <div className="empty-state"><Search size={24} /><h3>No matches just yet</h3><p>Try a different search or browse all courses.</p><button className="text-button" onClick={() => { onSearch(""); onCategory("All courses"); }}>Clear filters <ArrowRight size={14} /></button></div>}
      <div className="explorer-grid">{courses.map((course, index) => <CourseCard key={course.id} course={course} index={index} onClick={onCourseSelect} />)}</div>
      <LiveResearchPanel
        topic="courses"
        title="Check current course information"
        description="Search the web for current course and admission details. Results include the pages used; confirm requirements with the institution."
        initialQuery={search ? `Current official course and admission information in India for ${search}` : ""}
        placeholder="Course, institution, location, or qualification"
        buttonLabel="Search current sources"
      />
      <div className="source-note"><ShieldCheck size={18} /><div><strong>Thoughtful, not definitive.</strong><span>Course availability and eligibility can vary. Always confirm requirements with the relevant institution or official authority.</span></div></div>
    </>
  );
}

function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: ReactNode; copy: string }) {
  return <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div><h1>{title}</h1><p>{copy}</p></div>;
}

function CourseDetails({ course, onClose }: { course: Course; onClose: () => void }) {
  return (
    <div className="details-overlay" role="dialog" aria-modal="true" aria-labelledby="course-details-title">
      <button className="details-scrim" aria-label="Close course details" onClick={onClose} />
      <section className="details-panel">
        <button className="icon-button details-close" aria-label="Close" onClick={onClose}><X size={19} /></button>
        <span className="pathway-label">{course.category} · Catalogue example</span>
        <h2 id="course-details-title">{course.title}</h2>
        <p>{course.description}</p>
        <dl className="course-detail-list">
          <div><dt>Typical entry point</dt><dd>{course.qualification}</dd></div>
          <div><dt>Typical duration</dt><dd>{course.duration}</dd></div>
          <div><dt>Study mode</dt><dd>{course.mode}</dd></div>
        </dl>
        <strong>Skills to explore</strong>
        <div className="course-skill-list">{course.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
        <p className="live-research-note">This is an illustrative catalogue entry, not a current admission listing or eligibility check.</p>
        <a className="primary-button" href={course.source_url} target="_blank" rel="noreferrer">
          Check {course.source_title} <ExternalLink size={14} />
        </a>
      </section>
    </div>
  );
}

function LiveResearchPanel({
  topic,
  title,
  description,
  initialQuery,
  placeholder,
  buttonLabel,
}: {
  topic: ResearchTopic;
  title: string;
  description: string;
  initialQuery: string;
  placeholder: string;
  buttonLabel: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<LiveResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  async function submitResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || query.trim().length < 3) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await searchLiveResearch(query.trim(), topic));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Live web research failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="live-research-card" aria-label={title}>
      <div className="live-research-heading"><div className="live-research-icon"><Search size={17} /></div><div><h2>{title}</h2><p>{description}</p></div></div>
      <form className="live-research-form" onSubmit={(event) => void submitResearch(event)}>
        <label className="sr-only" htmlFor={`research-${topic}`}>{title}</label>
        <input id={`research-${topic}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} minLength={3} maxLength={500} required />
        <button className="primary-button" type="submit" disabled={loading || query.trim().length < 3}>{loading ? "Searching…" : buttonLabel}<ArrowRight size={14} /></button>
      </form>
      <p className="live-research-privacy">Your query is sent to Gemini for public web research and is not saved in this app. Avoid entering sensitive personal information.</p>
      {error && <p className="live-research-error" role="alert">{error}</p>}
      {result && (
        <div className="live-research-result">
          <span className="live-research-timestamp">Web search · {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.generated_at))}</span>
          <p>{result.answer}</p>
          <strong>Pages found</strong>
          <ul>{result.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} <ExternalLink size={12} /></a></li>)}</ul>
          <small>Search summaries can be incomplete. Open the source and verify current details before acting.</small>
        </div>
      )}
    </section>
  );
}

function Pathways({ onChat }: { onChat: () => void }) {
  const [routeQuery, setRouteQuery] = useState("Current official vocational training and apprenticeship routes after Class 10 in India");
  return (
    <>
      <PageIntro eyebrow="YOUR NEXT CHAPTER" title={<>There’s more than<br /><span>one way forward.</span></>} copy="Education isn’t always a straight line. Explore example routes, then make them your own." />
      <div className="pathway-note"><Lightbulb size={18} /><span>These are illustrative pathways, not guarantees. Entry requirements and progression rules depend on the specific course and institution.</span></div>
      <section className="pathway-feature">
        <div className="pathway-feature-head"><div><span className="pathway-label">A ROUTE TO EXPLORE</span><h2>From school to skilled work</h2></div><button className="icon-button" aria-label="More pathway options"><ArrowUpRight size={18} /></button></div>
        <div className="pathway-steps">
          {[
            { num: "01", name: "Class 10", detail: "Your foundation", icon: GraduationCap },
            { num: "02", name: "ITI training", detail: "Build hands-on skills", icon: BookOpen },
            { num: "03", name: "Apprenticeship", detail: "Learn on the job", icon: BriefcaseBusiness },
            { num: "04", name: "Your next move", detail: "Work or study further", icon: ArrowUpRight },
          ].map(({ num, name, detail, icon: Icon }, index) => (
            <div className="pathway-step-wrap" key={num}><div className={`pathway-step ${index === 0 ? "step-first" : ""}`}><span className="step-number">{num}</span><div className="step-icon"><Icon size={19} /></div><strong>{name}</strong><span>{detail}</span></div>{index < 3 && <div className="step-connector"><ArrowRight size={15} /></div>}</div>
          ))}
        </div>
        <div className="pathway-source"><span><ShieldCheck size={15} /> Learn about vocational training</span><a href="https://dgt.gov.in/" target="_blank" rel="noreferrer">Directorate General of Training <ExternalLink size={13} /></a></div>
      </section>
      <div className="section-heading"><div><div className="section-kicker">OTHER DIRECTIONS</div><h2>Different starts, many futures</h2></div></div>
      <div className="pathway-options">
        <PathOption icon={<BookOpen size={19} />} title="Commerce to technology" desc="Explore business, data, and digital routes after Class 12." color="option-lavender" onClick={() => setRouteQuery("Current official commerce-to-technology courses and career routes in India after Class 12")} />
        <PathOption icon={<Lightbulb size={19} />} title="Science to discovery" desc="See how science can lead to research, health, or technology." color="option-mint" onClick={() => setRouteQuery("Current official science courses and career pathways in India")} />
        <PathOption icon={<BriefcaseBusiness size={19} />} title="Skills to opportunity" desc="Connect practical learning with work-based experience." color="option-peach" onClick={() => setRouteQuery("Current official skill training and apprenticeship opportunities in India")} />
      </div>
      <LiveResearchPanel
        key={routeQuery}
        topic="pathways"
        title="Research current routes"
        description="Choose one of the route ideas above, or edit the search to fit your interests and current qualification."
        initialQuery={routeQuery}
        placeholder="Interest, qualification, or career route"
        buttonLabel="Find current routes"
      />
      <div className="bottom-nudge"><div className="nudge-icon"><MessageCircle size={17} /></div><span>Your starting point matters. Let’s find a route that fits you.</span><button onClick={onChat}>Talk it through <ArrowRight size={14} /></button></div>
    </>
  );
}

function PathOption({ icon, title, desc, color, onClick }: { icon: ReactNode; title: string; desc: string; color: string; onClick: () => void }) {
  return <button className="path-option" onClick={onClick}><div className={`option-icon ${color}`}>{icon}</div><h3>{title}</h3><p>{desc}</p><span>Research this route <ArrowRight size={14} /></span></button>;
}

function Scholarships() {
  return (
    <>
      <PageIntro eyebrow="SUPPORT FOR YOUR JOURNEY" title={<>Make room for<br /><span>what’s possible.</span></>} copy="Financial support can open doors. Start with trusted places to look, and check eligibility directly with the scheme." />
      <div className="scholarship-callout"><div className="scholarship-badge"><WalletCards size={21} /></div><div><span className="pathway-label">A TRUSTED PLACE TO BEGIN</span><h2>National Scholarship Portal</h2><p>A Government of India platform for discovering and applying to participating scholarship schemes.</p><a href="https://scholarships.gov.in/" target="_blank" rel="noreferrer">Visit the official portal <ExternalLink size={14} /></a></div><div className="scholarship-stamp"><ShieldCheck size={25} /><span>OFFICIAL<br />SOURCE</span></div></div>
      <LiveResearchPanel
        topic="scholarships"
        title="Search current scholarship information"
        description="Search for current central or state schemes. Add your state, education level, or other relevant details to narrow the results."
        initialQuery="Current government scholarships in India for students; include official sources, eligibility, benefits, and application deadlines"
        placeholder="State, education level, and scholarship need"
        buttonLabel="Search live schemes"
      />
      <div className="section-heading"><div><div className="section-kicker">BEFORE YOU APPLY</div><h2>A few things to keep close</h2></div></div>
      <div className="scholarship-checklist">
        <ChecklistItem number="01" title="Check the scheme details" text="Eligibility, benefits, and application dates differ by scheme. Read the official notification carefully." />
        <ChecklistItem number="02" title="Keep documents handy" text="Common requirements may include income, identity, and academic records. Verify the exact list for your scheme." />
        <ChecklistItem number="03" title="Use the official application link" text="Apply only through the portal or institution named by the scheme. Never pay an unofficial agent." />
      </div>
      <div className="disclaimer"><ShieldCheck size={17} /><span>Search summaries are not eligibility decisions. Scheme dates and rules change; verify them on the official scholarship portal before applying.</span></div>
    </>
  );
}

function ChecklistItem({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="checklist-item"><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div><Check size={17} /></div>;
}

function SkillBuilder({ user }: { user: AuthUser | null }) {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [skillName, setSkillName] = useState("");
  const [skillEvidence, setSkillEvidence] = useState("");
  const [skillLevel, setSkillLevel] = useState(1);
  const [skillFormError, setSkillFormError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [storageStatus, setStorageStatus] = useState<SkillStorageStatus>("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const syncRevision = useRef(0);
  const readyUserId = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    readyUserId.current = undefined;
    setStorageReady(false);
    setStorageStatus("loading");
    setStorageError("");
    setSkills([]);

    async function loadSkills() {
      try {
        if (!user) {
          if (!active) return;
          setSkills(readGuestSkills());
          readyUserId.current = null;
          setStorageStatus("guest");
          setStorageReady(true);
          return;
        }

        const remoteSkills = await getMySkills();
        if (!active) return;
        let saved: SkillRecord[] = [];
        try {
          saved = readGuestSkills();
        } catch {
          setStorageError("Your account is available, but this browser’s guest skill data could not be read.");
        }
        const uniqueSkills = new Map<string, SkillRecord>();
        for (const skill of remoteSkills) uniqueSkills.set(skill.name.toLocaleLowerCase(), skill);
        for (const skill of saved) {
          const normalizedName = skill.name.toLocaleLowerCase();
          if (!uniqueSkills.has(normalizedName)) uniqueSkills.set(normalizedName, skill);
        }
        let accountSkills = remoteSkills;
        if (uniqueSkills.size !== remoteSkills.length) {
          accountSkills = await replaceMySkills(Array.from(uniqueSkills.values()));
          if (!active) return;
        }
        if (saved.length) {
          try {
            window.localStorage.removeItem("kaushalsetu.skills.v1");
          } catch {
            setStorageError("Your account is synced, but the guest copy could not be removed from this browser.");
          }
        }
        if (!active) return;
        setSkills(accountSkills);
        readyUserId.current = user.id;
        setStorageStatus("synced");
        setStorageReady(true);
      } catch (error) {
        if (!active) return;
        setStorageError(error instanceof Error ? error.message : "Could not load your skills.");
        setStorageStatus("error");
      }
    }

    void loadSkills();
    return () => {
      active = false;
    };
  }, [user?.id, loadAttempt]);

  useEffect(() => {
    if (!storageReady) return;
    if (readyUserId.current !== (user?.id ?? null)) return;
    if (!user) {
      try {
        window.localStorage.setItem("kaushalsetu.skills.v1", JSON.stringify(skills));
        setStorageStatus("guest");
      } catch {
        setStorageError("Could not save your skills in this browser. Check available browser storage.");
        setStorageStatus("error");
      }
      return;
    }

    const revision = ++syncRevision.current;
    let active = true;
    setStorageStatus("saving");
    setStorageError("");
    syncQueue.current = syncQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (!active || revision !== syncRevision.current) return;
        await replaceMySkills(skills);
        if (active && revision === syncRevision.current) setStorageStatus("synced");
      })
      .catch((error: unknown) => {
        if (active && revision === syncRevision.current) {
          setStorageError(error instanceof Error ? error.message : "Could not sync your skills.");
          setStorageStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [skills, storageReady, user?.id]);

  function addSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = skillName.trim();
    if (!name) return;
    if (skills.some((skill) => skill.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setSkillFormError("That skill is already in your passport.");
      return;
    }
    if (skills.length >= 100) {
      setSkillFormError("Your passport can contain up to 100 skills.");
      return;
    }
    setSkills((current) => [...current, {
      id: crypto.randomUUID(),
      name,
      level: skillLevel,
      evidence: skillEvidence.trim(),
    }]);
    setSkillName("");
    setSkillEvidence("");
    setSkillLevel(1);
    setSkillFormError("");
  }

  function retrySkillSync() {
    setStorageError("");
    if (!storageReady) {
      setLoadAttempt((attempt) => attempt + 1);
      return;
    }
    setSkills((current) => [...current]);
  }

  function updateSkillLevel(id: string, level: number) {
    setSkills((current) => current.map((skill) => skill.id === id ? { ...skill, level } : skill));
  }

  return (
    <>
      <PageIntro eyebrow="YOUR GROWING TOOLKIT" title={<>Skills make your<br /><span>next step possible.</span></>} copy="A skill passport can help you reflect on what you already bring, and what you’d like to learn next." />
      <div className="skill-profile-card">
        <div className="skill-profile-top"><div><span className="pathway-label">YOUR SKILL PASSPORT</span><h2>{skills.length ? `${skills.length} skill${skills.length === 1 ? "" : "s"} in your toolkit` : "Start with what you know"}</h2></div><span className="profile-progress">{storageStatus === "loading" ? "Loading…" : storageStatus === "saving" ? "Syncing…" : storageStatus === "error" ? "Sync issue" : user ? "Synced to your account" : "Saved in this browser"}</span></div>
        {skills.length > 0 && <div className="skill-bars">{skills.map((skill, index) => <div className="skill-row saved-skill-row" key={skill.id}>
          <div className="skill-label"><span>{skill.name}</span><label>Confidence <select aria-label={`Confidence for ${skill.name}`} value={skill.level} onChange={(event) => updateSkillLevel(skill.id, Number(event.target.value))}>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} / 5</option>)}</select></label></div>
          <div className="skill-track"><span className={["skill-green", "skill-lavender", "skill-peach"][index % 3]} style={{ width: `${skill.level * 20}%` }} /></div>
          {skill.evidence && <p className="skill-evidence">{skill.evidence}</p>}
          <button className="skill-remove" type="button" onClick={() => setSkills((current) => current.filter((entry) => entry.id !== skill.id))}>Remove</button>
        </div>)}</div>}
        {!skills.length && <p className="skill-empty">Add a skill and a real example of when you used it. Your confidence rating is for reflection only, not a formal assessment.</p>}
        <form className="skill-add-form" onSubmit={addSkill}>
          <label>Skill<input value={skillName} onChange={(event) => { setSkillName(event.target.value); setSkillFormError(""); }} placeholder="e.g. Spreadsheet basics" maxLength={80} required disabled={!storageReady} /></label>
          <label>Example or practice note<input value={skillEvidence} onChange={(event) => setSkillEvidence(event.target.value)} placeholder="Where have you used or practised it?" maxLength={300} disabled={!storageReady} /></label>
          <label>Confidence<select value={skillLevel} onChange={(event) => setSkillLevel(Number(event.target.value))} disabled={!storageReady}>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} / 5</option>)}</select></label>
          <button className="primary-button" type="submit" disabled={!storageReady}><Sparkles size={15} /> Add skill <ArrowRight size={15} /></button>
        </form>
        {skillFormError && <p className="live-research-error" role="alert">{skillFormError}</p>}
        {storageError && <p className="live-research-error" role="alert">{storageError}</p>}
        {storageStatus === "error" && <button className="skill-retry" type="button" onClick={retrySkillSync}>Retry sync</button>}
        <div className="skill-note"><Lightbulb size={16} /><span>Self-reflection is not a professional assessment. {user ? "When signed in, your skills sync to your account so you can access them on other devices." : "Guest skills stay in this browser; sign in to sync them across devices."}</span></div>
      </div>
      <div className="section-heading"><div><div className="section-kicker">GENTLE NEXT STEPS</div><h2>Learning can be practical</h2></div></div>
      <div className="learning-grid"><LearningCard icon={<BookOpen size={18} />} title="Explore digital basics" text="Build confidence with everyday digital tools." source="Bharat Skills" href="https://bharatskills.gov.in/" /><LearningCard icon={<MessageCircle size={18} />} title="Practice communication" text="Try small ways to share an idea clearly." source="Your own pace" href="" /><LearningCard icon={<Target size={18} />} title="Pick one thing to try" text="A project can be a great place to start." source="One step at a time" href="" /></div>
    </>
  );
}

function LearningCard({ icon, title, text, source, href }: { icon: ReactNode; title: string; text: string; source: string; href: string }) {
  return <div className="learning-card"><div className="learning-icon">{icon}</div><h3>{title}</h3><p>{text}</p>{href ? <a href={href} target="_blank" rel="noreferrer">{source} <ExternalLink size={12} /></a> : <span>{source}</span>}</div>;
}

function EvidencePassport() {
  const sources = [
    { authority: "National Scholarship Portal", name: "Scholarship information and application services", url: "https://scholarships.gov.in/", status: "Official source", color: "source-green" },
    { authority: "Directorate General of Training", name: "Vocational training and apprenticeship information", url: "https://dgt.gov.in/", status: "Official source", color: "source-lavender" },
    { authority: "University Grants Commission", name: "Higher education and university-related information", url: "https://www.ugc.gov.in/", status: "Official source", color: "source-peach" },
    { authority: "AICTE", name: "Technical education information and resources", url: "https://www.aicte-india.org/", status: "Official source", color: "source-blue" },
  ];
  return (
    <>
      <PageIntro eyebrow="WHERE INFORMATION COMES FROM" title={<>Good decisions<br />deserve <span>good sources.</span></>} copy="Your Evidence Passport keeps useful official starting points within reach. A source link is not a guarantee of course approval or eligibility." />
      <div className="passport-summary"><div className="passport-shield"><ShieldCheck size={22} /></div><div><strong>Trust, with context.</strong><span>Official sources to check as you explore — not automatic verification of a specific course or institution.</span></div><span className="passport-count">04 <small>SOURCES</small></span></div>
      <div className="evidence-list">{sources.map((source, i) => <div className="evidence-card" key={source.authority}><div className={`evidence-icon ${source.color}`}>{i === 0 ? <WalletCards size={19} /> : i === 1 ? <BriefcaseBusiness size={19} /> : i === 2 ? <GraduationCap size={19} /> : <BadgeCheck size={19} />}</div><div className="evidence-copy"><span className="evidence-authority">{source.authority}</span><h3>{source.name}</h3><span className="evidence-status"><span />{source.status} · Verify details on source</span></div><a className="evidence-open" href={source.url} target="_blank" rel="noreferrer" aria-label={`Open ${source.authority}`}><ExternalLink size={16} /></a></div>)}</div>
      <LiveResearchPanel
        topic="verification"
        title="Research a specific institution or course"
        description="Search for official recognition or regulator information. Provide the exact institution, campus, course, and academic year for a more useful search."
        initialQuery=""
        placeholder="Institution, campus, course, and academic year"
        buttonLabel="Search official sources"
      />
      <div className="disclaimer"><CircleHelp size={17} /><span>Missing information does not mean an institution is unrecognized. Confirm recognition with the relevant authority for the specific course, location, and year.</span></div>
    </>
  );
}

function Counsellor({ input, answer, sources, demoMode, loading, error, onInput, onClose, onSubmit }: {
  input: string;
  answer: string;
  sources: { title: string; url: string }[];
  demoMode: boolean | null;
  loading: boolean;
  error: string;
  onInput: (value: string) => void;
  onClose: () => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>, prompt?: string) => void;
}) {
  return (
    <div className="chat-overlay" role="dialog" aria-modal="true" aria-labelledby="chat-title">
      <button className="chat-scrim" aria-label="Close counsellor" onClick={onClose} />
      <section className="chat-panel">
        <div className="chat-header"><div className="chat-avatar"><Sparkles size={18} /></div><div><strong id="chat-title">Your career guide</strong><span><span className="online-dot" /> Here to help you explore</span></div><button className="icon-button chat-close" aria-label="Close" onClick={onClose}><X size={19} /></button></div>
        <div className="chat-body">
          <div className="chat-day">A CONVERSATION, NOT A TEST</div>
          <div className="assistant-message"><span className="chat-message-label">KAUSHALSETU GUIDE <span>JUST NOW</span></span><p>Hi there! There’s no wrong place to begin. Tell me what you’re curious about, or where you are in your learning journey, and we’ll explore some options together.</p></div>
          <div className="suggested-label">A few ways to get started</div>
          <div className="suggested-prompts">{starterQuestions.map((question) => <button key={question} onClick={() => onSubmit(undefined, question)}>{question}<ArrowUpRight size={14} /></button>)}</div>
          {loading && <div className="assistant-message chat-loading"><span className="chat-message-label">KAUSHALSETU GUIDE</span><p>Thinking through a few possibilities<span className="typing-dots"><i /><i /><i /></span></p></div>}
          {answer && <div className="assistant-message answer-message"><span className="chat-message-label">A PLACE TO START <span>{demoMode ? "GUIDED DEMO" : "GEMINI AI"}</span></span><p>{answer}</p>{sources.length > 0 && <div className="chat-sources"><strong>Useful official starting points</strong>{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} <ExternalLink size={12} /></a>)}</div>}</div>}
          {error && <div className="chat-error">{error}</div>}
          <div className="demo-disclaimer"><ShieldCheck size={14} /> {answer ? `${demoMode ? "Guided demo" : "Gemini AI"} guidance is a starting point, not verified eligibility advice. Confirm details with official sources.` : "Your message is answered by Gemini when configured; otherwise this is a guided demo. Verify eligibility with official sources."}</div>
        </div>
        <form className="chat-composer" onSubmit={(event) => onSubmit(event)}>
          <textarea value={input} onChange={(event) => onInput(event.target.value)} placeholder="Tell me what’s on your mind…" rows={2} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSubmit(); } }} />
          <div className="composer-bottom"><span><span className="composer-dot" /> Messages are saved in the demo database</span><button type="submit" disabled={loading || !input.trim()} aria-label="Send message"><Send size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}

export default App;

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
