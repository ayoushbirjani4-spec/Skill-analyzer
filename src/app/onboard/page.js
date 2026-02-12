"use client";
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { roleSkills } from '@/config/skills';

export default function OnboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get('role') || 'Frontend';
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug: Log the role to verify it's being passed correctly
  useEffect(() => {
    console.log('Current role:', role);
  }, [role]);

  // Get skills for the current role, default to Frontend if role not found
  const skills = useMemo(() => {
    const roleSkillsList = roleSkills[role] || roleSkills['Frontend'] || [];
    console.log('Role:', role, 'Skills:', roleSkillsList);
    return roleSkillsList;
  }, [role]);

  // Load saved skills from localStorage on mount
  useEffect(() => {
    const storageKey = `skillAnalyzer_${role}_selectedSkills`;
    const savedSkills = localStorage.getItem(storageKey);
    if (savedSkills) {
      try {
        const parsedSkills = JSON.parse(savedSkills);
        setSelectedSkills(parsedSkills);
      } catch (error) {
        console.error('Error loading saved skills:', error);
      }
    }
  }, [role]);

  // Save skills to localStorage whenever selectedSkills or role changes
  useEffect(() => {
    const storageKey = `skillAnalyzer_${role}_selectedSkills`;
    if (selectedSkills.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(selectedSkills));
    } else {
      // Remove the key if no skills are selected
      localStorage.removeItem(storageKey);
    }
  }, [selectedSkills, role]);

  const toggleSkill = (skill) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleAnalyzeGaps = () => {
    if (selectedSkills.length === 0) {
      alert('Please select at least one skill to analyze!');
      return;
    }
    
    setIsProcessing(true);
    const skillsParam = selectedSkills.join(',');
    
    // Simulate processing time (2-3 seconds) before navigating
    setTimeout(() => {
      router.push(`/dashboard?role=${encodeURIComponent(role)}&skills=${encodeURIComponent(skillsParam)}`);
    }, 2500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 relative">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-12 flex flex-col items-center shadow-2xl max-w-md mx-4">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing...</h2>
            <p className="text-slate-600 text-center">
              Analyzing your skill gaps and generating personalized insights...
            </p>
            <div className="mt-6 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-4 text-slate-900">Customize your {role} Path</h1>
      <p className="mb-8 text-slate-500 text-center max-w-md">Select the skills you already possess to see your personalized growth map.</p>
      
      <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
        {skills.map(skill => (
          <button
            key={skill}
            onClick={() => toggleSkill(skill)}
            disabled={isProcessing}
            className={`px-6 py-2 rounded-full border-2 transition-all font-semibold ${
              selectedSkills.includes(skill) 
              ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-105" 
              : "bg-white border-slate-200 text-slate-600 hover:border-blue-400"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {skill}
          </button>
        ))}
      </div>

      <button 
        onClick={handleAnalyzeGaps}
        disabled={isProcessing}
        className={`mt-12 px-10 py-4 rounded-2xl font-bold transition-colors ${
          isProcessing 
            ? "bg-slate-400 text-white cursor-not-allowed" 
            : "bg-slate-900 text-white hover:bg-blue-600"
        }`}
      >
        {isProcessing ? "Processing..." : "Analyze Skill Gaps →"}
      </button>
    </div>
  );
}