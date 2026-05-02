import "server-only";

export const roleSkills = {
  "Frontend Developer": ["React", "JavaScript", "TypeScript", "CSS", "Tailwind", "Next.js", "Vue.js", "Angular", "HTML5", "SASS"],
  Frontend: ["React", "JavaScript", "TypeScript", "CSS", "Tailwind", "Next.js", "Vue.js", "Angular", "HTML5", "SASS"],
  "Backend Developer": ["Node.js", "Python", "Java", "Express", "Django", "PostgreSQL", "MongoDB", "REST APIs", "GraphQL", "Docker"],
  Backend: ["Node.js", "Python", "Java", "Express", "Django", "PostgreSQL", "MongoDB", "REST APIs", "GraphQL", "Docker"],
  "Data Scientist": ["Python", "R", "SQL", "Pandas", "NumPy", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn", "NLP", "Data Visualization", "Statistics", "A/B Testing"],
  "Data Science": ["Python", "R", "SQL", "Pandas", "NumPy", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn", "NLP", "Data Visualization", "Statistics", "A/B Testing"],
  "Machine Learning Engineer": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "MLOps", "Feature Engineering", "Model Deployment", "Docker", "Kubernetes", "FastAPI", "MLflow"],
  "Mobile Developer": ["React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android", "Xcode", "Android Studio", "Firebase", "App Store"],
  Mobile: ["React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android", "Xcode", "Android Studio", "Firebase", "App Store"],
  "UI/UX Designer": ["Figma", "Adobe XD", "Sketch", "User Research", "Wireframing", "Prototyping", "Design Systems", "Accessibility", "User Testing", "Illustration"],
  "UI/UX": ["Figma", "Adobe XD", "Sketch", "User Research", "Wireframing", "Prototyping", "Design Systems", "Accessibility", "User Testing", "Illustration"],
  Cybersecurity: ["Network Security", "Penetration Testing", "Ethical Hacking", "SIEM", "Firewall", "Encryption", "OWASP", "Kali Linux", "Vulnerability Assessment", "Incident Response"],
  "Cybersecurity Specialist": ["Network Security", "Penetration Testing", "Ethical Hacking", "SIEM", "Firewall", "Encryption", "OWASP", "Kali Linux", "Vulnerability Assessment", "Incident Response"],
  "DevOps Engineer": ["Linux", "Shell Scripting", "CI/CD", "GitHub Actions", "Docker", "Kubernetes", "Terraform", "AWS", "Monitoring", "Prometheus", "Grafana", "Ansible"],
  "Cloud Engineer": ["AWS", "Azure", "GCP", "Networking", "Terraform", "Cloud Security", "Serverless", "Kubernetes", "Docker", "IAM", "Cost Optimization", "Cloud Monitoring"],
  "QA Engineer": ["Manual Testing", "Automation Testing", "Selenium", "Cypress", "Playwright", "API Testing", "Postman", "Test Cases", "Bug Tracking", "Performance Testing"],
  Developer: ["React", "JavaScript", "TypeScript", "CSS", "Tailwind", "Next.js", "Vue.js", "Angular", "HTML5", "SASS"]
} as const;

export type RoleSkillMap = Record<string, string[]>;

export function getRoleSkillMap(): RoleSkillMap {
  return roleSkills as unknown as RoleSkillMap;
}
