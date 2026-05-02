import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type InterviewBody = {
  role: string;
  primaryGap: string;
};

export async function POST(request: NextRequest) {
  try {
    const { role, primaryGap } = (await request.json()) as InterviewBody;
    if (!role || !primaryGap) {
      return NextResponse.json({ success: false, error: "Missing role or primary gap." }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        questions: [
          `Explain the core concepts of ${primaryGap} and why they matter in ${role}.`,
          `Describe a project where you applied ${primaryGap} end-to-end.`,
          `What are common mistakes beginners make in ${primaryGap}, and how do you avoid them?`,
          `How would you measure success for a feature built with ${primaryGap}?`,
          `What would you learn next after mastering ${primaryGap}?`
        ]
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Generate 5 interview questions for a ${role} candidate focused on skill gap "${primaryGap}".
Return only valid JSON with this shape:
{"questions":["q1","q2","q3","q4","q5"]}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/gi, "").replace(/```/g, "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON in model response.");
    const parsed = JSON.parse(jsonMatch[0]) as { questions?: string[] };
    const questions = (parsed.questions || []).slice(0, 5);
    return NextResponse.json({ success: true, questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
