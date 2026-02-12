"use client";
import Link from 'next/link';

export default function Home() {
  // These role names MUST match your roleSkills config exactly
  const roles = [
    { id: 'frontend', title: 'Frontend', desc: 'React & UI', icon: '🌐' },
    { id: 'backend', title: 'Backend', desc: 'Node & APIs', icon: '⚙️' },
    { id: 'data', title: 'Data Science', desc: 'Python & ML', icon: '📊' },
    { id: 'mobile', title: 'Mobile', desc: 'App Dev', icon: '📱' },
    { id: 'design', title: 'UI/UX', desc: 'Figma & Design', icon: '🎨' },
    { id: 'cyber', title: 'Cybersecurity', desc: 'Security', icon: '🔒' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-blue-600 mb-4">
            Career Skill Gap Analyzer
          </h1>
          <p className="text-xl text-gray-600">
            Choose your career path and discover what skills you need to level up
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Link 
              key={role.id} 
              href={`/onboard?role=${encodeURIComponent(role.title)}`}
              className="group p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="text-5xl mb-4">{role.icon}</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                {role.title}
              </h2>
              <p className="text-gray-500">{role.desc}</p>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link 
            href="/onboard"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Or Browse All Roles →
          </Link>
        </div>
      </div>
    </div>
  );
}