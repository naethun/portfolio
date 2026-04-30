export type Folder = 'work' | 'moodboard' | 'contact';

export interface Bio {
  name: string;
  roles: string[];
  github: string;
  resume: string;
  linkedin: string;
}

export interface Skill {
  name: string;
  image: string;
}

export interface SkillCategory {
  title: string;
  skills: Skill[];
}

export type CaseStudySection =
  | { type: 'heading'; content: string }
  | { type: 'text'; content: string }
  | { type: 'image'; content: string; alt?: string };

export interface CaseStudy {
  hero?: string;
  subtitle?: string;
  sections: CaseStudySection[];
}

export interface Experience {
  id: number;
  img: string;
  role: string;
  company: string;
  date: string;
  desc: string;
  skills: string[];
  caseStudy?: CaseStudy;
}

export interface Project {
  id: number;
  title: string;
  date: string;
  description: string;
  image: string;
  tags: string[];
  category: string;
  github: string;
  caseStudy?: CaseStudy;
}

export type WorkKind = 'role' | 'project';

export type WorkItem =
  | { kind: 'role'; data: Experience }
  | { kind: 'project'; data: Project };
