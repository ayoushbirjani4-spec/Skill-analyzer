import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request) {
  try {
    const { role, selectedSkills, allSkills } = await request.json();
    
    console.log("=== API ANALYZE ===");
    console.log("Role:", role);
    console.log("Selected Skills:", selectedSkills);
    console.log("All Skills Count:", allSkills.length);
    
    // Validate inputs
    if (!role || !selectedSkills || !allSkills) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" }, 
        { status: 400 }
      );
    }

    let aiInsight;
    let chartData;

    // Try AI analysis first
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    
    if (apiKey) {
      try {
        console.log("Attempting Gemini AI analysis...");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are a career advisor. Analyze skill gaps for a ${role} position.

Current Skills: ${selectedSkills.join(", ")}
All Required Skills: ${allSkills.join(", ")}

Return ONLY valid JSON (no markdown, no code blocks, no backticks) in this exact format:
{
  "primaryGap": "Most critical missing skill name",
  "whyCritical": "2-3 sentence explanation of why this skill is essential for ${role} in 2026",
  "projectIdea": "Specific, actionable project idea to learn this skill (2-3 sentences)",
  "nextSkills": ["skill1", "skill2", "skill3"]
}

IMPORTANT: Return ONLY the JSON object, nothing else. No markdown, no code blocks, no explanations.`;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        
        // Remove markdown code blocks if present (handle various formats)
        text = text.replace(/```json\n?/gi, '')
                   .replace(/```\n?/g, '')
                   .replace(/^json\s*/i, '')
                   .trim();
        
        // Try to extract JSON from the text
        let jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            aiInsight = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Text that failed to parse:', jsonMatch[0].substring(0, 200));
            throw new Error('Failed to parse AI response as JSON: ' + parseError.message);
          }
        } else {
          console.error('No JSON found in response. Full text:', text.substring(0, 500));
          throw new Error('No valid JSON found in AI response');
        }
        
        console.log("✅ AI analysis successful");
        
        // Validate AI response
        if (!aiInsight.primaryGap || !Array.isArray(aiInsight.nextSkills)) {
          throw new Error("Invalid AI response structure");
        }
        
      } catch (aiError) {
        console.error("AI failed, using fallback:", aiError.message);
        aiInsight = null; // Will trigger fallback below
      }
    }

    // Fallback logic if AI fails or no API key
    if (!aiInsight) {
      console.log("Using fallback logic...");
      const missingSkills = allSkills.filter(s => !selectedSkills.includes(s));
      
      if (missingSkills.length === 0) {
        // User has all skills!
        aiInsight = {
          primaryGap: "Advanced Specialization",
          whyCritical: `Congratulations! You have all the core ${role} skills. Consider specializing in emerging technologies or leadership to advance your career further.`,
          projectIdea: `Build an advanced portfolio project that combines multiple skills you've mastered, or mentor others in the ${role} field.`,
          nextSkills: ["Leadership & Mentoring", "Advanced Architecture", "Emerging Technologies"]
        };
      } else {
        const primarySkill = missingSkills[0];
        const nextSkills = missingSkills.slice(1, 4);
        
        // Ensure we have 3 skills
        while (nextSkills.length < 3 && nextSkills.length < missingSkills.length) {
          nextSkills.push(missingSkills[nextSkills.length]);
        }
        
        aiInsight = {
          primaryGap: primarySkill,
          whyCritical: `${primarySkill} is a critical skill for competitive ${role} positions in 2026. It's frequently listed in job requirements and directly impacts your ability to deliver professional-quality work.`,
          projectIdea: `Build a real-world portfolio project that showcases your ${primarySkill} abilities. Focus on solving an actual problem or creating something you can demo to potential employers.`,
          nextSkills: nextSkills.length > 0 ? nextSkills : ["Industry Certification", "Advanced Projects", "Open Source Contributions"]
        };
      }
    }

    // Build chart data (avoid duplicates)
    const chartSkills = new Set(selectedSkills);
    chartData = selectedSkills.map(s => ({ subject: s, value: 100 }));
    
    // Add primary gap
    if (!chartSkills.has(aiInsight.primaryGap)) {
      chartData.push({ subject: aiInsight.primaryGap, value: 15 });
      chartSkills.add(aiInsight.primaryGap);
    }
    
    // Add next skills
    aiInsight.nextSkills?.forEach(s => {
      if (!chartSkills.has(s)) {
        chartData.push({ subject: s, value: 35 });
        chartSkills.add(s);
      }
    });

    // Attach learning resources
    aiInsight.courses = [
      { 
        title: `Master ${aiInsight.primaryGap}`, 
        channel: "FreeCodeCamp", 
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(aiInsight.primaryGap + " tutorial 2026")}` 
      },
      { 
        title: `${role} Career Roadmap 2026`, 
        channel: "Roadmap.sh", 
        url: `https://roadmap.sh/${encodeURIComponent(role.toLowerCase().replace(/\s+/g, '-'))}` 
      }
    ];

    console.log("✅ Analysis complete");
    return NextResponse.json({ success: true, insight: aiInsight, chartData });

  } catch (error) {
    console.error("❌ API Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}