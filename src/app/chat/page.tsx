"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Context = {
  userRole?: string;
  primaryGap?: string;
  roadmap?: Array<{ phase: string; focus: string; outcome: string }>;
  nextSkills?: string[];
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi there! Ask me anything about skill gaps, career roadmaps, or interview prep."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<Context>({});

  useEffect(() => {
    const role = searchParams.get("role");
    const primaryGap = searchParams.get("primaryGap");
    const roadmapParam = searchParams.get("roadmap");
    const nextSkillsParam = searchParams.get("nextSkills");

    const parsedContext: Context = {};
    if (role) parsedContext.userRole = role;
    if (primaryGap) parsedContext.primaryGap = primaryGap;
    if (roadmapParam) {
      try {
        parsedContext.roadmap = JSON.parse(decodeURIComponent(roadmapParam));
      } catch {}
    }
    if (nextSkillsParam) {
      try {
        parsedContext.nextSkills = JSON.parse(decodeURIComponent(nextSkillsParam));
      } catch {}
    }

    setContext(parsedContext);
  }, [searchParams]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setError(null);

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, context })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to get a response.");
      }

      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 text-foreground">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-surface border border-border rounded-3xl p-8">
          <h1 className="text-3xl font-bold mb-2">Chat with Gemini</h1>
          <p className="text-muted">Ask for career coaching, skill-gap advice, or interview prep help.</p>
          {context.userRole && (
            <p className="text-sm text-accent mt-2">
              Context: {context.userRole} • Primary gap: {context.primaryGap || "None"}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`rounded-3xl p-5 shadow-sm border ${
                message.role === "user"
                  ? "bg-surface border-border text-foreground self-end"
                  : "bg-surface-2 border-border text-foreground"
              }`}
            >
              <p className="text-sm text-muted mb-2 uppercase tracking-wide">
                {message.role === "user" ? "You" : "Gemini"}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6">
          <label htmlFor="chatInput" className="block text-sm font-semibold mb-2">
            Your question
          </label>
          <textarea
            id="chatInput"
            rows={4}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Ask the AI career coach a question..."
            disabled={loading}
          />
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <button
            type="button"
            onClick={sendMessage}
            disabled={loading}
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Thinking…" : "Send to Gemini"}
          </button>
        </div>
      </div>
    </div>
  );
}
