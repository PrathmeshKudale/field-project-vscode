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

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function getCourses(search = "", category = ""): Promise<Course[]> {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (category && category !== "All courses") params.set("category", category);
  const response = await fetch(`${API_BASE}/api/courses?${params.toString()}`);
  if (!response.ok) throw new Error(`Course catalogue unavailable (${response.status})`);
  return response.json() as Promise<Course[]>;
}

export async function sendCounsellorMessage(message: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/counsellor/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error(`Counsellor request failed (${response.status})`);
  return response.json() as Promise<ChatResponse>;
}
