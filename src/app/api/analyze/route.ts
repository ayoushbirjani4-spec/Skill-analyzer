import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { defaultResources, skillResources } from "@/config/resources";
import { getRoleSkillMap } from "@/server/skills";

type SkillLevels = Record<string, number>;

type AnalyzeRequest = {
  role: string;
  skillLevels?: SkillLevels;
};

type RoadmapStep = {
  phase: string;
  focus: string;
  outcome: string;
};

type Insight = {
  primaryGap: string;
  whyCritical: string;
  projectIdea: string;
  nextSkills: string[];
  roadmap: RoadmapStep[];
  courses?: Array<{ title: string; url: string; platform: string; type: string; skill?: string }>;
};

function normalizeRoadmap(roadmap: unknown): RoadmapStep[] {
  if (!Array.isArray(roadmap)) return [];
  return roadmap
    .filter((item): item is { phase?: string; focus?: string; outcome?: string } => Boolean(item))
    .filter((item) => item.phase && item.focus)
    .map((item) => ({
      phase: item.phase as string,
      focus: item.focus as string,
      outcome: item.outcome || "Practice and build a small project milestone."
    }));
}

function buildResourceList(primaryGap: string, nextSkills: string[] = []) {
  const lookupSkills = [primaryGap, ...nextSkills].filter(Boolean);
  const merged: Array<{ title: string; url: string; platform: string; type: string; skill?: string }> = [];
  const seenUrls = new Set<string>();

  for (const skill of lookupSkills) {
    const resources = skillResources[skill] || [];
    for (const resource of resources) {
      if (!seenUrls.has(resource.url)) {
        merged.push({ ...resource, skill });
        seenUrls.add(resource.url);
      }
    }
  }

  for (const fallback of defaultResources) {
    if (!seenUrls.has(fallback.url)) {
      merged.push(fallback);
      seenUrls.add(fallback.url);
    }
  }

  return merged.slice(0, 6);
}

export async function POST(request: NextRequest) {
  try {
    const { role, skillLevels = {} } = (await request.json()) as AnalyzeRequest;
    const allSkills = role ? (getRoleSkillMap()[role] || []) : [];
    const selectedSkills = allSkills.filter((skill) => (skillLevels[skill] || 0) > 0);

    if (!role || allSkills.length === 0) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    let aiInsight: Insight | null = null;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const missingSkills = allSkills.filter((s) => !selectedSkills.includes(s));

        const prompt = `You are a career advisor. Analyze skill gaps for a ${role} position.

Current Skills: ${selectedSkills.join(", ")}
Current Skill Proficiency (0-100): ${JSON.stringify(skillLevels)}
All Required Skills: ${allSkills.join(", ")}
Missing Skills: ${missingSkills.join(", ")}

Return ONLY valid JSON (no markdown, no code blocks, no backticks) in this exact format:
{
  "primaryGap": "Most critical missing skill name",
  "whyCritical": "2-3 sentence explanation of why this skill is essential for ${role} in 2026",
  "projectIdea": "Specific, actionable project idea to learn this skill (2-3 sentences)",
  "nextSkills": ["skill1", "skill2", "skill3"],
  "roadmap": [
    { "phase": "Week 1-2", "focus": "Concept and fundamentals to learn", "outcome": "Concrete milestone" },
    { "phase": "Week 3-4", "focus": "Hands-on implementation", "outcome": "Concrete milestone" },
    { "phase": "Week 5-6", "focus": "Portfolio refinement", "outcome": "Concrete milestone" }
  ]
}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").replace(/^json\s*/i, "").trim();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No valid JSON found in AI response");
        }

        aiInsight = JSON.parse(jsonMatch[0]) as Insight;
        if (!aiInsight.primaryGap || !Array.isArray(aiInsight.nextSkills)) {
          throw new Error("Invalid AI response structure");
        }
        aiInsight.roadmap = normalizeRoadmap(aiInsight.roadmap);
      } catch (err) {
        console.error("Gemini failed:", err);
        aiInsight = null;
      }
    }

    if (!aiInsight) {
      const missingSkills = allSkills.filter((s) => !selectedSkills.includes(s));
      if (missingSkills.length === 0) {
        aiInsight = {
          primaryGap: "Advanced Specialization",
          whyCritical: `You have all core ${role} skills. Specialization and leadership will create your next growth edge.`,
          projectIdea: `Build a capstone project combining your strongest skills and publish a detailed technical case study.`,
          nextSkills: ["Leadership & Mentoring", "Advanced Architecture", "Emerging Technologies"],
          roadmap: [
            { phase: "Week 1-2", focus: "Choose a specialization track", outcome: "Define measurable outcomes" },
            { phase: "Week 3-4", focus: "Build an advanced module", outcome: "Ship one demonstrable feature" },
            { phase: "Week 5-6", focus: "Publish and present your work", outcome: "Portfolio story and presentation" }
          ]
        };
      } else {
        const primarySkill = missingSkills[0];
        const nextSkills = missingSkills.slice(1, 4);
        aiInsight = {
          primaryGap: primarySkill,
          whyCritical: `${primarySkill} is a high-impact capability for competitive ${role} positions and directly affects practical delivery quality.`,
          projectIdea: `Build a portfolio project centered on ${primarySkill} with real-world constraints and measurable outcomes.`,
          nextSkills: nextSkills.length ? nextSkills : ["Industry Certification", "Advanced Projects", "Open Source Contributions"],
          roadmap: [
            { phase: "Week 1-2", focus: `Learn ${primarySkill} fundamentals`, outcome: "Complete guided practice tasks" },
            { phase: "Week 3-4", focus: `Build with ${primarySkill}`, outcome: "Deliver a demo-ready mini project" },
            { phase: "Week 5-6", focus: "Portfolio refinement", outcome: "Publish case study with outcomes" }
          ]
        };
      }
    }

    aiInsight.roadmap = normalizeRoadmap(aiInsight.roadmap);
    aiInsight.courses = buildResourceList(aiInsight.primaryGap, aiInsight.nextSkills);

    const chartData = allSkills.map((skill) => ({
      subject: skill,
      target: 100,
      value: typeof skillLevels[skill] === "number" ? skillLevels[skill] : 0
    }));

    return NextResponse.json({ success: true, insight: aiInsight, chartData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
