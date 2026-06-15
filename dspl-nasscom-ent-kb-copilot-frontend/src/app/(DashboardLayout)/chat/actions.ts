export interface Source {
  source: string;
  page: number;
  section: string;
  doc_type: string;
  rerank_score: number;
  url: string;
  row: number;
  line: number;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
  confidence: number;
  escalated: boolean;
  ticket_id: string | null;
  tool_used: string | null;
  session_id: string | null;
}

export async function queryAssistant(question: string, sessionId: string = "123", userEmail: string): Promise<ChatResponse> {
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: question,
      users_email: userEmail,
      session_id: sessionId
    }),
    // Ensure no caching for chat queries
    cache: 'no-store'
  });

  if (!response.ok) {
    return {
      answer: "I'm unable to provide answer to your query. Please try again later.",
      sources: [],
      confidence: 0,
      escalated: false,
      ticket_id: null,
      tool_used: null,
      session_id: null
    }
  }
  return response.json();
}
