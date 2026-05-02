"use client";
import Link from 'next/link';

export default function Home() {
  // These role names MUST match your roleSkills config exactly
  const roles = [
    { id: 'frontend', title: 'Frontend', desc: 'React & UI', icon: '🌐' },
    { id: 'backend', title: 'Backend', desc: 'Node & APIs', icon: '⚙️' },
    { id: 'data', title: 'Data Science', desc: 'Python & ML', icon: '📊' },
    { id: 'ml', title: 'Machine Learning Engineer', desc: 'ML, DL & MLOps', icon: '🤖' },
    { id: 'mobile', title: 'Mobile', desc: 'App Dev', icon: '📱' },
    { id: 'design', title: 'UI/UX', desc: 'Figma & Design', icon: '🎨' },
    { id: 'cyber', title: 'Cybersecurity', desc: 'Security', icon: '🔒' },
    { id: 'devops', title: 'DevOps Engineer', desc: 'CI/CD & Cloud', icon: '🛠️' },
    { id: 'cloud', title: 'Cloud Engineer', desc: 'AWS, Azure, GCP', icon: '☁️' },
    { id: 'qa', title: 'QA Engineer', desc: 'Testing & Quality', icon: '✅' }
  ];

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-heading font-bold text-accent mb-4">
            Career Skill Gap Analyzer
          </h1>
          <p className="text-xl text-muted">
            Choose your career path and discover what skills you need to level up
          </p>
        </div>

        <div id="roles" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Link 
              key={role.id} 
              href={`/onboard?role=${encodeURIComponent(role.title)}`}
              className="group p-8 bg-surface rounded-2xl border border-border hover:border-accent hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="text-5xl mb-4">{role.icon}</div>
              <h2 className="text-2xl font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                {role.title}
              </h2>
              <p className="text-muted">{role.desc}</p>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link 
            href="/#roles"
            className="inline-block btn-primary px-8 py-3 text-lg shadow-lg"
          >
            Browse All Roles Above ↑
          </Link>
        </div>
      </div>
    </div>
  );
}