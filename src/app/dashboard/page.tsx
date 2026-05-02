"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";

type SkillLevels = Record<string, number>;

type RoadmapStep = {
  phase: string;
  focus: string;
  outcome: string;
};

type CourseResource = {
  title: string;
  url: string;
  platform: string;
  type: string;
};

type Insight = {
  primaryGap: string;
  whyCritical: string;
  projectIdea: string;
  nextSkills?: string[];
  roadmap?: RoadmapStep[];
  courses?: CourseResource[];
};

type ChartPoint = {
  subject: string;
  target: number;
  value: number;
};

type HistoryItem = {
  id: string;
  timestamp: string;
  role: string;
  coveragePercent: number;
  primaryGap: string;
};

type RoadmapProgress = Record<number, boolean>;

function parseSkillLevels(rawValue: string | null): SkillLevels {
  if (!rawValue) return {};
  try {
    return JSON.parse(rawValue) as SkillLevels;
  } catch {
    return {};
  }
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reportRef = useRef<HTMLDivElement | null>(null);

  const [insight, setInsight] = useState<Insight | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [compareRole, setCompareRole] = useState(searchParams.get("compareRole") || "");
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rolesByName, setRolesByName] = useState<Record<string, string[]>>({});
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [shareImageLoading, setShareImageLoading] = useState(false);
  const [roadmapProgress, setRoadmapProgress] = useState<RoadmapProgress>({});
  const shareCardRef = useRef<HTMLDivElement | null>(null);

  const role = searchParams.get("role") || "";
  const skillsParam = searchParams.get("skills") || "";
  const levelsParam = searchParams.get("levels");
  const selectedSkills = skillsParam ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const allSkills = useMemo(() => (role ? (rolesByName[role] || []) : []), [role, rolesByName]);
  const skillLevels = parseSkillLevels(levelsParam);

  const selectedCount = useMemo(
    () => allSkills.filter((skill) => (skillLevels[skill] || 0) > 0).length,
    [allSkills, skillLevels]
  );
  const coveragePercent = allSkills.length ? Math.round((selectedCount / allSkills.length) * 100) : 0;
  const roleOptions = useMemo(() => Object.keys(rolesByName).filter((name) => name !== role), [role, rolesByName]);
  const compareSkills = useMemo(() => (compareRole ? (rolesByName[compareRole] || []) : []), [compareRole, rolesByName]);
  const compareCoveragePercent = compareSkills.length
    ? Math.round((compareSkills.filter((skill) => (skillLevels[skill] || 0) > 0).length / compareSkills.length) * 100)
    : 0;
  const compareChartData: ChartPoint[] = compareSkills.map((skill) => ({
    subject: skill,
    target: 100,
    value: typeof skillLevels[skill] === "number" ? skillLevels[skill] : 0
  }));
  const roadmapSteps = insight?.roadmap || [];
  const completedRoadmapSteps = roadmapSteps.filter((_, index) => roadmapProgress[index]).length;
  const roadmapCompletionPercent = roadmapSteps.length
    ? Math.round((completedRoadmapSteps / roadmapSteps.length) * 100)
    : 0;

  useEffect(() => {
    const existingHistory = localStorage.getItem("skillAnalyzer_history");
    if (existingHistory) {
      try {
        setHistory(JSON.parse(existingHistory) as HistoryItem[]);
      } catch {
        setHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!insight?.roadmap?.length) {
      setRoadmapProgress({});
      return;
    }

    const roadmapKey = `skillAnalyzer_roadmap_${role}_${insight.primaryGap}`;
    const stored = localStorage.getItem(roadmapKey);
    if (!stored) {
      setRoadmapProgress({});
      return;
    }

    try {
      setRoadmapProgress(JSON.parse(stored) as RoadmapProgress);
    } catch {
      setRoadmapProgress({});
    }
  }, [insight, role]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch("/api/roles");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!data.success || typeof data.skillsByRole !== "object") {
          throw new Error("Failed to load role data");
        }
        setRolesByName(data.skillsByRole);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load roles.";
        setServerError(message);
      } finally {
        setRolesLoaded(true);
      }
    };

    void fetchRoles();
  }, []);

  useEffect(() => {
    if (!rolesLoaded) return;

    if (!role || !rolesByName[role]) {
      setLoading(false);
      setError("No valid role found. Please start analysis from the home page.");
      return;
    }

    if (selectedSkills.length === 0) {
      setLoading(false);
      setError("No rated skills found in URL. Please complete onboarding first.");
      return;
    }

    void analyzeSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, skillsParam, levelsParam, rolesLoaded, rolesByName]);

  const analyzeSkills = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          skillLevels
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as { success: boolean; insight?: Insight; chartData?: ChartPoint[]; error?: string };
      if (!data.success || !data.insight) {
        throw new Error(data.error || "Failed to analyze skills");
      }

      setInsight(data.insight);
      setChartData(data.chartData || []);

      const report: HistoryItem = {
        id: `${Date.now()}`,
        timestamp: new Date().toISOString(),
        role,
        coveragePercent,
        primaryGap: data.insight.primaryGap
      };
      const previousHistoryRaw = localStorage.getItem("skillAnalyzer_history");
      const previousHistory = previousHistoryRaw ? (JSON.parse(previousHistoryRaw) as HistoryItem[]) : [];
      const updatedHistory = [report, ...previousHistory].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem("skillAnalyzer_history", JSON.stringify(updatedHistory));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to analyze: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const captureReportCanvas = async () => {
    if (!reportRef.current) return null;
    return html2canvas(reportRef.current, { scale: 2, backgroundColor: "#0a1220" });
  };

  const handleDownloadPNG = async () => {
    setIsExporting(true);
    try {
      const canvas = await captureReportCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `skill-report-${role || "role"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const canvas = await captureReportCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`skill-report-${role || "role"}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchInterviewQuestions = useCallback(async (primaryGap: string) => {
    setQuestionsLoading(true);
    setQuestionsError(null);

    try {
      const response = await fetch("/api/interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, primaryGap })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.questions)) {
        throw new Error(data.error || "Could not generate interview questions.");
      }

      setInterviewQuestions(data.questions.slice(0, 5));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setQuestionsError(message);
    } finally {
      setQuestionsLoading(false);
    }
  }, [role]);

  const handleFollowUpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!insight || !followUpQuestion.trim()) return;

    setFollowUpLoading(true);
    setFollowUpError(null);

    try {
      const response = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, primaryGap: insight.primaryGap, roadmap: insight.roadmap, question: followUpQuestion.trim() })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "No answer returned.");
      }

      setFollowUpAnswer(data.answer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFollowUpError(message);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleDownloadShareImage = async () => {
    if (!shareCardRef.current) return;
    setShareImageLoading(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, { scale: 2, backgroundColor: "#020617" });
      const link = document.createElement("a");
      link.download = `skill-share-card-${role || "report"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setShareImageLoading(false);
    }
  };

  const handleShareOnLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
  };

  const handleApplyComparison = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (compareRole) {
      params.set("compareRole", compareRole);
    } else {
      params.delete("compareRole");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleChatWithAnalysis = () => {
    const params = new URLSearchParams();
    params.set("role", role);
    if (insight?.primaryGap) params.set("primaryGap", insight.primaryGap);
    if (insight?.roadmap) params.set("roadmap", encodeURIComponent(JSON.stringify(insight.roadmap)));
    if (insight?.nextSkills) params.set("nextSkills", encodeURIComponent(JSON.stringify(insight.nextSkills)));
    router.push(`/chat?${params.toString()}`);
  };

  const handleRoadmapToggle = (index: number, checked: boolean) => {
    if (!insight) return;
    const updated: RoadmapProgress = { ...roadmapProgress, [index]: checked };
    setRoadmapProgress(updated);
    const roadmapKey = `skillAnalyzer_roadmap_${role}_${insight.primaryGap}`;
    localStorage.setItem(roadmapKey, JSON.stringify(updated));
  };

  const handleResetRoadmapProgress = () => {
    if (!insight) return;
    const roadmapKey = `skillAnalyzer_roadmap_${role}_${insight.primaryGap}`;
    setRoadmapProgress({});
    localStorage.removeItem(roadmapKey);
  };

  const handleCompleteAllRoadmapProgress = () => {
    if (!insight?.roadmap?.length) return;
    const completed: RoadmapProgress = {};
    insight.roadmap.forEach((_, idx) => {
      completed[idx] = true;
    });
    const roadmapKey = `skillAnalyzer_roadmap_${role}_${insight.primaryGap}`;
    setRoadmapProgress(completed);
    localStorage.setItem(roadmapKey, JSON.stringify(completed));
  };

  if (loading || !rolesLoaded) return <DashboardSkeleton />;

  if (serverError) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto bg-surface border border-border rounded-2xl p-8 text-foreground">
          <h2 className="text-2xl font-bold text-red-400 mb-3">Server Error</h2>
          <p className="text-muted mb-6">{serverError}</p>
          <Link href="/" className="inline-block bg-accent text-accent-foreground px-5 py-3 rounded-lg font-semibold">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto bg-surface border border-border rounded-2xl p-8 text-foreground">
          <h2 className="text-2xl font-bold text-red-400 mb-3">Analysis Error</h2>
          <p className="text-muted mb-6">{error}</p>
          <Link href="/" className="inline-block bg-accent text-accent-foreground px-5 py-3 rounded-lg font-semibold">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 text-foreground">
      <div className="max-w-5xl mx-auto" ref={reportRef}>
        <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <p className="text-accent text-sm font-semibold mb-2">Skill Report • {new Date().toLocaleDateString()}</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{role}</h1>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="bg-surface-2 px-3 py-1 rounded-full">{selectedCount}/{allSkills.length} rated</span>
            <span className="bg-accent text-accent-foreground px-3 py-1 rounded-full font-bold">{coveragePercent}% coverage</span>
          </div>
        </div>

        {insight ? (
          <>
            <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-2xl font-bold">Skill Radar</h2>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <button onClick={handleCopyLink} className="btn-secondary">Copy Link</button>
                    {copied ? (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-accent text-accent-foreground text-xs px-2 py-1">
                        Copied!
                      </span>
                    ) : null}
                  </div>
                  <button onClick={handleDownloadPNG} className="btn-secondary" disabled={isExporting}>
                    {isExporting ? "Exporting..." : "Download PNG"}
                  </button>
                  <button onClick={handleDownloadPDF} className="btn-secondary" disabled={isExporting}>
                    {isExporting ? "Exporting..." : "Download PDF"}
                  </button>
                  <button onClick={handleDownloadShareImage} className="btn-secondary" disabled={shareImageLoading}>
                    {shareImageLoading ? "Generating..." : "Generate Share Card"}
                  </button>
                  <button onClick={handleShareOnLinkedIn} className="btn-primary">
                    Share on LinkedIn
                  </button>
                  <button onClick={handleChatWithAnalysis} className="btn-secondary">
                    Chat about this
                  </button>
                </div>
              </div>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip formatter={(value: number | string) => `${value}%`} />
                    <Legend />
                    <Radar name="Target" dataKey="target" stroke="#94a3b8" fill="#64748b" fillOpacity={0.18} isAnimationActive />
                    <Radar name="Your Level" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} isAnimationActive />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-muted mt-3 text-sm">Coverage: {selectedCount}/{allSkills.length} skills rated above zero.</p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
              <h2 className="text-2xl font-bold mb-2">Primary Skill Gap</h2>
              <p className="text-3xl font-bold text-accent mb-3">{insight.primaryGap}</p>
              <p className="text-muted mb-4">{insight.whyCritical}</p>
              <div className="bg-surface-2 border border-border p-4 rounded-lg mb-4">
                <p className="text-sm uppercase tracking-wide text-muted mb-2">Project Idea</p>
                <p>{insight.projectIdea}</p>
              </div>
              <div className="bg-surface-2 border border-border p-4 rounded-lg">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-muted">Ask about your roadmap</p>
                    <p className="font-semibold">Ask AI for follow-up project advice, time estimates, or next steps.</p>
                  </div>
                  <span className="text-xs text-muted">One API call per question</span>
                </div>
                <form onSubmit={handleFollowUpSubmit} className="grid gap-3">
                  <input
                    value={followUpQuestion}
                    onChange={(event) => setFollowUpQuestion(event.target.value)}
                    placeholder="What projects can I build for TypeScript?"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-primary" disabled={followUpLoading || !followUpQuestion.trim()}>
                      {followUpLoading ? "Thinking..." : "Ask AI"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setFollowUpQuestion("");
                        setFollowUpAnswer("");
                        setFollowUpError(null);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </form>
                {followUpError ? (
                  <p className="text-red-400 mt-3">{followUpError}</p>
                ) : followUpAnswer ? (
                  <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                    <p className="text-sm uppercase tracking-wide text-muted mb-2">AI Follow-Up Answer</p>
                    <p>{followUpAnswer}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-2xl font-bold mb-4">Multi-Role Comparison</h3>
              <p className="text-muted mb-4">Compare your current strengths in {role} against another role using the same skill profile.</p>
              <div className="flex flex-col md:flex-row gap-3 md:items-center mb-5">
                <select
                  value={compareRole}
                  onChange={(event) => setCompareRole(event.target.value)}
                  className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-foreground"
                >
                  <option value="">Select comparison role</option>
                  {roleOptions.map((roleName) => (
                    <option key={roleName} value={roleName}>{roleName}</option>
                  ))}
                </select>
                <button onClick={handleApplyComparison} className="btn-primary">Compare</button>
              </div>

              {compareRole && compareSkills.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-surface-2 border border-border rounded-lg p-4">
                    <p className="font-semibold mb-2">{role}</p>
                    <p className="text-sm text-accent mb-3">{coveragePercent}% coverage</p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={chartData} outerRadius="70%">
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} />
                          <Radar dataKey="target" stroke="#94a3b8" fill="#64748b" fillOpacity={0.18} />
                          <Radar dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-surface-2 border border-border rounded-lg p-4">
                    <p className="font-semibold mb-2">{compareRole}</p>
                    <p className="text-sm text-accent mb-3">{compareCoveragePercent}% coverage</p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={compareChartData} outerRadius="70%">
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} />
                          <Radar dataKey="target" stroke="#94a3b8" fill="#64748b" fillOpacity={0.18} />
                          <Radar dataKey="value" stroke="#34d399" fill="#34d399" fillOpacity={0.35} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {insight.roadmap?.length ? (
              <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-2xl font-bold">AI Learning Roadmap</h3>
                  <span className="text-sm bg-surface-2 border border-border px-3 py-1 rounded-full">
                    {completedRoadmapSteps}/{roadmapSteps.length} complete
                  </span>
                </div>
                <div className="mb-5">
                  <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${roadmapCompletionPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">{roadmapCompletionPercent}% roadmap complete</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCompleteAllRoadmapProgress}
                        className="btn-secondary text-xs px-3 py-1"
                        disabled={!roadmapSteps.length || roadmapCompletionPercent === 100}
                      >
                        Mark All Complete
                      </button>
                      <button
                        onClick={handleResetRoadmapProgress}
                        className="btn-secondary text-xs px-3 py-1"
                        disabled={!roadmapSteps.length || roadmapCompletionPercent === 0}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {insight.roadmap.map((step, idx) => (
                    <div key={idx} className="border-l-2 border-accent pl-4 py-1">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(roadmapProgress[idx])}
                          onChange={(event) => handleRoadmapToggle(idx, event.target.checked)}
                          className="mt-1 h-4 w-4 accent-[var(--accent)]"
                        />
                        <div>
                          <p className="text-accent font-semibold">{step.phase}</p>
                          <p>{step.focus}</p>
                          <p className="text-muted text-sm">{step.outcome}</p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h3 className="text-2xl font-bold">Practice Questions for your gaps</h3>
                  <p className="text-muted">Gemini generates interview-ready questions for {insight.primaryGap}.</p>
                </div>
                {questionsLoading ? <span className="text-sm text-accent">Generating fresh questions…</span> : null}
              </div>
              {questionsError ? (
                <p className="text-red-400 mb-3">{questionsError}</p>
              ) : null}
              {interviewQuestions.length ? (
                <ol className="list-decimal list-inside space-y-3">
                  {interviewQuestions.map((question, idx) => (
                    <li key={idx} className="text-sm text-foreground">{question}</li>
                  ))}
                </ol>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted">
                    {questionsLoading
                      ? "Preparing your questions…"
                      : "Generate interview questions for this gap when you're ready."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void fetchInterviewQuestions(insight.primaryGap)}
                    className="btn-primary"
                    disabled={questionsLoading}
                  >
                    {questionsLoading ? "Generating questions…" : "Generate Practice Questions"}
                  </button>
                </div>
              )}
            </div>

            {insight.courses?.length ? (
              <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
                <h3 className="text-2xl font-bold mb-4">Curated Learning Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insight.courses.map((course, idx) => (
                    <a
                      key={idx}
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-border bg-surface-2 p-4 hover:border-accent transition-colors"
                    >
                      <p className="font-semibold">{course.title}</p>
                      <p className="text-sm text-muted">{course.platform} • {course.type}</p>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="text-2xl font-bold mb-4">Progress History</h3>
              {history.length === 0 ? (
                <p className="text-muted">No history yet.</p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 6).map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-surface-2 rounded-lg p-3 text-sm">
                      <span>{item.role} • {item.primaryGap}</span>
                      <span className="text-accent">{item.coveragePercent}% • {new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <p className="text-xl text-muted mb-4">No analysis data available</p>
            <Link href="/" className="inline-block bg-accent text-accent-foreground px-8 py-3 rounded-lg text-lg font-semibold">
              Start New Analysis
            </Link>
          </div>
        )}
      </div>
      <div
        ref={shareCardRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          opacity: 0,
          pointerEvents: "none",
          width: 1200,
          minHeight: 630,
          padding: 32,
          backgroundColor: "#020617",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          zIndex: -1
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <div>
            <p style={{ color: "#38bdf8", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 14, marginBottom: 20 }}>
              SkillAnalyzer Report
            </p>
            <h2 style={{ fontSize: 72, lineHeight: 1.05, margin: 0, maxWidth: 980 }}>{role}</h2>
          </div>
          <div>
            <p style={{ fontSize: 32, margin: "24px 0 8px", color: "#f8fafc" }}>Coverage {coveragePercent}%</p>
            <p style={{ fontSize: 26, margin: 0, color: "#cbd5e1" }}>Primary gap: {insight?.primaryGap || "N/A"}</p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40 }}>
            <span style={{ fontSize: 18, color: "#94a3b8" }}>Generated {new Date().toLocaleDateString()}</span>
            <span style={{ fontSize: 18, color: "#a855f7", fontWeight: 700 }}>#SkillRoadmap</span>
          </div>
        </div>
      </div>
    </div>
  );
}
