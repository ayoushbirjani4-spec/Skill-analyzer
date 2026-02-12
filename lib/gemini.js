import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_KEY);

export const getSkillInsight = async (role, knownSkills, missingSkill) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      User wants to be a ${role}. 
      They already know: ${knownSkills.join(", ")}.
      The next skill they need is: ${missingSkill}.
      
      Explain in 2 short sentences:
      1. Why ${missingSkill} is critical for a ${role}.
      2. One specific project idea to practice ${missingSkill} given their current knowledge.
      Keep it professional and motivating.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Error:", error);
    return "Could not generate insight at this moment.";
  }
};