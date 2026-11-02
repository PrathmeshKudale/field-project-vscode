export interface Course {
  id: number;
  title: string;
  category: string;
  qualification: string;
  duration: string;
  mode: string;
  description: string;
  skills: string[];
  source_title: string;
  source_url: string;
  featured: boolean;
}

export interface ChatResponse {
  conversation_id: number;
  answer: string;
  recommendations: Course[];
  sources: { title: string; url: string }[];
  demo_mode: boolean;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  picture: string | null;
  email_verified: boolean;
}

interface GoogleAuthConfig {
  enabled: boolean;
  client_id: string | null;
  redirect_uri: string | null;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

function apiUrl(path: string): string {
  if (import.meta.env.PROD && !API_BASE) {
    throw new Error(
      "Backend URL is not configured. Set VITE_API_BASE_URL in Vercel to your deployed FastAPI URL, then redeploy.",
    );
  }
  return `${API_BASE}${path}`;
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Could not reach the backend. Check that it is deployed, VITE_API_BASE_URL is correct, and its CORS_ORIGINS includes this website.",
      );
    }
    throw error;
  }
}

async function ensureOk(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  const body: unknown = await response.json().catch(() => null);
  if (
    typeof body === "object" &&
    body !== null &&
    "detail" in body &&
    typeof body.detail === "string"
  ) {
    throw new Error(body.detail);
  }
  throw new Error(`${action} (${response.status})`);
}

export async function getCourses(search = "", category = ""): Promise<Course[]> {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (category && category !== "All courses") params.set("category", category);
  const response = await request(apiUrl(`/api/courses?${params.toString()}`));
  await ensureOk(response, "Course catalogue unavailable");
  return response.json() as Promise<Course[]>;
}

export async function sendCounsellorMessage(message: string): Promise<ChatResponse> {
  const response = await request(apiUrl("/api/counsellor/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  await ensureOk(response, "Counsellor request failed");
  return response.json() as Promise<ChatResponse>;
}

export async function getGoogleAuthConfig(): Promise<GoogleAuthConfig> {
  const response = await request(apiUrl("/api/auth/google/config"));
  await ensureOk(response, "Google sign-in configuration unavailable");
  return response.json() as Promise<GoogleAuthConfig>;
}

export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
  nonce: string,
  redirectUri: string,
): Promise<AuthUser> {
  const response = await request(apiUrl("/api/auth/google/exchange"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: codeVerifier, nonce, redirect_uri: redirectUri }),
  });
  await ensureOk(response, "Google sign-in failed");
  return response.json() as Promise<AuthUser>;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await request(apiUrl("/api/auth/me"), { credentials: "include" });
  if (response.status === 401) return null;
  await ensureOk(response, "Could not restore your sign-in");
  return response.json() as Promise<AuthUser>;
}

export async function signOut(): Promise<void> {
  const response = await request(apiUrl("/api/auth/logout"), {
    method: "POST",
    credentials: "include",
  });
  await ensureOk(response, "Could not sign out");
}
