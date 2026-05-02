import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatBody = {
  messages?: ChatMessage[];
  context?: {
    userRole?: string;
    primaryGap?: string;
    roadmap?: Array<{ phase: string; focus: string; outcome: string }>;
    nextSkills?: string[];
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatBody;
    const messages = body.messages || [];
    const context = body.context || {};
    if (messages.length === 0) {
      return NextResponse.json({ success: false, error: "No chat messages provided." }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Gemini API key is not configured." }, { status: 500 });
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-2.5-flash" });
    const contextStr = context.userRole || context.primaryGap || context.roadmap || context.nextSkills
      ? `\n\nContext from your skill analysis:
- Role: ${context.userRole || "Not specified"}
- Primary Gap: ${context.primaryGap || "Not specified"}
- Next Skills: ${context.nextSkills?.join(", ") || "Not specified"}
- Roadmap: ${context.roadmap ? context.roadmap.map(step => `${step.phase}: ${step.focus} (${step.outcome})`).join("; ") : "Not specified"}`
      : "";

    const prompt = `You are SkillAnalyzer's AI coach. Answer the user's question clearly and help them with skill gaps, career progress, study roadmaps, or interview prep.${contextStr}

${messages
      .map((message) =>
        message.role === "user"
          ? `User: ${message.content}`
          : `Assistant: ${message.content}`
      )
      .join("\n")}

Assistant:`;

    const response = await model.generateContent(prompt);
    const answer = response.response.text().trim();
    return NextResponse.json({ success: true, answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
