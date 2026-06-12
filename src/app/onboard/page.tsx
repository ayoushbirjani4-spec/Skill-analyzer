"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type SkillLevels = Record<string, number>;
type SkillsByRole = Record<string, string[]>;

const proficiencyOptions = [
  { label: "Not Started", value: 0, badge: "NS" },
  { label: "Beginner", value: 40, badge: "B" },
  { label: "Intermediate", value: 70, badge: "I" },
  { label: "Expert", value: 100, badge: "E" }
];

function OnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get("role") || "";
  const [skillLevels, setSkillLevels] = useState<SkillLevels>({});
  const [skillsByRole, setSkillsByRole] = useState<SkillsByRole>({});
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const skills = useMemo(() => (role ? (skillsByRole[role] || []) : []), [role, skillsByRole]);
  const isValidRole = Boolean(role && skillsByRole[role]);
  const selectedSkills = skills.filter((skill) => (skillLevels[skill] || 0) > 0);

  useEffect(() => {
    const loadRoles = async () => {
      const response = await fetch("/api/roles");
      const data = (await response.json()) as { success: boolean; skillsByRole?: SkillsByRole };
      if (data.success && data.skillsByRole) {
        setSkillsByRole(data.skillsByRole);
      }
      setRolesLoaded(true);
    };
    void loadRoles();
  }, []);

  useEffect(() => {
    if (!role) return;
    const storageKey = `skillAnalyzer_${role}_skillLevels`;
    const savedLevels = localStorage.getItem(storageKey);
    if (savedLevels) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSkillLevels(JSON.parse(savedLevels) as SkillLevels);
      } catch {
        setSkillLevels({});
      }
    } else {
      const initialLevels: SkillLevels = {};
      skills.forEach((skill) => {
        initialLevels[skill] = 0;
      });
      setSkillLevels(initialLevels);
    }
  }, [role, skills]);

  useEffect(() => {
    if (!role) return;
    const storageKey = `skillAnalyzer_${role}_skillLevels`;
    localStorage.setItem(storageKey, JSON.stringify(skillLevels));
  }, [skillLevels, role]);

  const setSkillLevel = (skill: string, level: number) => {
    setSkillLevels((prev) => ({ ...prev, [skill]: level }));
    setFormError(null);
  };

  const handleAnalyzeGaps = () => {
    if (!isValidRole) {
      setFormError("Please choose a valid role first.");
      return;
    }
    if (selectedSkills.length === 0) {
      setFormError("Please rate at least one skill to analyze.");
      return;
    }

    setFormError(null);
    setIsProcessing(true);
    const skillsParam = selectedSkills.join(",");
    const levelsParam = encodeURIComponent(JSON.stringify(skillLevels));
    router.push(`/dashboard?role=${encodeURIComponent(role)}&skills=${encodeURIComponent(skillsParam)}&levels=${levelsParam}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-foreground relative">
      {rolesLoaded && !isValidRole && (
        <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow p-8 mb-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Select a Role First</h2>
          <p className="text-muted mb-6">We could not find a valid role in the URL. Please choose one from home page.</p>
          <Link href="/" className="inline-block btn-primary">Go to Role Selection</Link>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-3xl p-10 flex flex-col items-center shadow-2xl max-w-md mx-4 border border-border">
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 border-4 border-slate-700 rounded-full" />
              <div className="absolute inset-0 border-4 border-amber-400 rounded-full border-t-transparent animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Preparing report...</h2>
            <p className="text-muted text-center">Analyzing your levels and generating insights.</p>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-4">Rate your {role || "Career"} skills</h1>
      <p className="mb-4 text-muted text-center max-w-2xl">
        Rate each skill to generate a realistic report and stronger roadmap.
      </p>
      <div className="sticky top-20 z-10 mb-8 bg-surface border border-border px-4 py-2 rounded-full shadow-lg">
        {selectedSkills.length} / {skills.length} skills rated
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill) => (
          <div
            key={skill}
            className={`bg-surface border rounded-2xl p-4 shadow-sm transition-transform duration-150 ${
              (skillLevels[skill] || 0) > 0 ? "border-accent scale-[1.01]" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">{skill}</p>
              <span className="text-xs px-2 py-1 rounded-full bg-surface-2 text-muted">
                {proficiencyOptions.find((option) => option.value === (skillLevels[skill] || 0))?.label || "Not Started"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {proficiencyOptions.map((option) => {
                const isActive = (skillLevels[skill] || 0) === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSkillLevel(skill, option.value)}
                    disabled={isProcessing || !isValidRole}
                    className={`rounded-lg py-2 text-sm font-semibold border transition-all ${
                      isActive
                        ? "bg-accent text-accent-foreground border-accent shadow-md"
                        : "bg-surface border-border text-muted hover:border-accent/60"
                    } ${isProcessing || !isValidRole ? "opacity-60 cursor-not-allowed" : ""}`}
                    title={option.label}
                  >
                    {option.badge}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {formError ? (
        <p className="mt-6 text-sm text-red-400">{formError}</p>
      ) : null}
      <button
        onClick={handleAnalyzeGaps}
        disabled={isProcessing || !isValidRole}
        className={`mt-6 px-10 py-4 rounded-2xl font-bold transition-colors ${
          isProcessing || !isValidRole ? "bg-slate-500 text-white cursor-not-allowed" : "btn-primary"
        }`}
      >
        {isProcessing ? "Processing..." : "Analyze Skill Gaps"}
      </button>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>}>
      <OnboardContent />
    </Suspense>
  );
}
