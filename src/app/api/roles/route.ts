import { NextResponse } from "next/server";
import { getRoleSkillMap } from "@/server/skills";

export async function GET() {
  const skillsByRole = getRoleSkillMap();
  return NextResponse.json({
    success: true,
    roles: Object.keys(skillsByRole),
    skillsByRole
  });
}
