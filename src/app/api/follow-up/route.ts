import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type FollowUpBody = {
  role: string;
  primaryGap: string;
  roadmap: Array<{ phase: string; focus: string; outcome: string }>;
  question: string;
};

export async function POST(request: NextRequest) {
  try {
    const { role, primaryGap, roadmap, question } = (await request.json()) as FollowUpBody;
    if (!role || !question) {
      return NextResponse.json({ success: false, error: "Missing role or question." }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        answer: `Focus your next step on ${primaryGap || "your priority gap"} and complete one practical milestone this week. Then ask again with a specific technology for a deeper plan.`
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a concise career coach for software learners.
Role: ${role}
Primary Gap: ${primaryGap}
Roadmap: ${JSON.stringify(roadmap || [])}
User question: ${question}

Return only a direct plain-text answer in 4-7 lines with practical next steps.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();
    return NextResponse.json({ success: true, answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
