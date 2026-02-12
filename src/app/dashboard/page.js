'use client'
// src/app/dashboard/page.jsx
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { roleSkills } from '@/config/skills';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const role = searchParams.get('role') || 'Frontend';
  const skillsParam = searchParams.get('skills') || '';
  const selectedSkills = skillsParam ? skillsParam.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  // Get skills for the role, with fallback to Frontend if role not found
  const allSkills = roleSkills[role] || roleSkills['Frontend'] || [];

  // Debug logging
  useEffect(() => {
    console.log("=== DASHBOARD DEBUG ===");
    console.log("URL role:", role);
    console.log("URL skillsParam:", skillsParam);
    console.log("Parsed selectedSkills:", selectedSkills);
    console.log("All available roles:", Object.keys(roleSkills));
    console.log("All skills for role:", allSkills);
    console.log("selectedSkills.length:", selectedSkills.length);
    console.log("allSkills.length:", allSkills.length);
  }, [role, skillsParam, selectedSkills, allSkills]);

  useEffect(() => {
    // Check if we have skills for this role (should always have fallback)
    if (allSkills.length === 0) {
      setLoading(false);
      setError("Unable to load skills for this role. Please try again.");
      return;
    }

    // Check if we have selected skills
    if (selectedSkills.length === 0) {
      setLoading(false);
      setError("No skills found in URL. Please select skills from the onboard page.");
      return;
    }

    // All valid - run analysis
    analyzeSkills();
  }, [role, skillsParam, allSkills.length, selectedSkills.length]);

  const analyzeSkills = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("=== STARTING ANALYSIS ===");
      console.log("Role:", role);
      console.log("Selected Skills:", selectedSkills);
      console.log("All Skills:", allSkills);
      
      const requestBody = { 
        role, 
        selectedSkills, 
        allSkills 
      };
      
      console.log("Request body:", JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      console.log("=== API RESPONSE ===");
      console.log("Success:", data.success);
      console.log("Insight:", data.insight);
      console.log("Error:", data.error);
      
      if (data.success && data.insight) {
        console.log("✅ Setting insight state");
        setInsight(data.insight);
      } else {
        console.error("❌ API returned failure:", data.error);
        setError(data.error || "Failed to analyze skills");
      }
    } catch (error) {
      console.error("❌ Analysis Error:", error);
      setError(`Failed to analyze: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Analyzing your skills...</p>
          <p className="text-sm text-gray-500 mt-2">
            {role} • {selectedSkills.length} skills selected
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-6">
              <span className="text-6xl mb-4 block">⚠️</span>
              <h2 className="text-2xl font-bold text-red-600 mb-4">Analysis Error</h2>
              <p className="text-lg text-gray-600 mb-6">{error}</p>
              {error.includes("Redirecting") && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>Redirecting in 2 seconds...</span>
                </div>
              )}
            </div>

            {/* Debug info */}
            <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left">
              <p className="font-bold mb-2">Debug Information:</p>
              <p className="text-sm text-gray-700">Role from URL: <span className="font-mono">{role}</span></p>
              <p className="text-sm text-gray-700">Skills param: <span className="font-mono">{skillsParam || '(empty)'}</span></p>
              <p className="text-sm text-gray-700">Selected skills count: {selectedSkills.length}</p>
              <p className="text-sm text-gray-700">All skills count: {allSkills.length}</p>
              <p className="text-sm text-gray-700">Available roles: {Object.keys(roleSkills).join(', ')}</p>
            </div>

            <div className="text-center">
              <a
                href="/onboard"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to Onboard Page
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">
            Career Skill Gap Analysis
          </h1>
          <p className="text-gray-600 text-lg">
            {role} • {selectedSkills.length}/{allSkills.length} skills
          </p>
        </div>

        {insight ? (
          <>
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🎯</span>
                <h2 className="text-3xl font-bold">Primary Skill Gap</h2>
              </div>
              <p className="text-4xl font-bold text-blue-600 mb-4">
                {insight.primaryGap}
              </p>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                {insight.whyCritical}
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">💡</span>
                  <div>
                    <h3 className="font-bold text-xl mb-2">Project Idea:</h3>
                    <p className="text-gray-700 text-lg">{insight.projectIdea}</p>
                  </div>
                </div>
              </div>
            </div>

            {insight.nextSkills && insight.nextSkills.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                <h3 className="text-2xl font-bold mb-6">📈 Skills to Learn Next:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {insight.nextSkills.map((skill, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-blue-100 to-indigo-100 p-6 rounded-lg text-center shadow-md">
                      <p className="font-bold text-blue-700 text-lg">{skill}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insight.courses && insight.courses.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-2xl font-bold mb-6">📚 Learning Resources:</h3>
                <div className="space-y-4">
                  {insight.courses.map((course, idx) => (
                    <a
                      key={idx}
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-400"
                    >
                      <p className="font-bold text-blue-600 text-lg mb-1">{course.title}</p>
                      <p className="text-gray-600">{course.channel}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <a
                href="/onboard"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                ← Analyze Another Role
              </a>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-xl text-gray-600 mb-4">No analysis data available</p>
            <a
              href="/onboard"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start New Analysis
            </a>
          </div>
        )}
      </div>
    </div>
  );
}