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
  | { type: 'image'; content: string; alt?: string }
  | { type: 'embed'; content: string; title?: string; ratio?: string };

export interface CaseStudy {
  hero?: string;
  subtitle?: string;
  sections: CaseStudySection[];
}

/** A headline number shown at the top of a case study, e.g. "100k+" users. */
export interface CaseStudyFigure {
  value: string;
  label: string;
}

export interface Experience {
  id: number;
  img: string;
  role: string;
  company: string;
  date: string;
  /** Short line after the role on work cards, e.g. "AI shopping platform". */
  summary?: string;
  figures?: CaseStudyFigure[];
  desc: string;
  skills: string[];
  caseStudy?: CaseStudy;
}

export interface Project {
  id: number;
  title: string;
  date: string;
  /** Short line after the category on work cards. */
  summary?: string;
  figures?: CaseStudyFigure[];
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
