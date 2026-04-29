export type Tab = 'about' | 'experience' | 'projects';

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

export interface Experience {
  id: number;
  img: string;
  role: string;
  company: string;
  date: string;
  desc: string;
  skills: string[];
}

export interface Education {
  id: number;
  img: string;
  school: string;
  date: string;
  grade: string;
  desc: string;
  degree: string;
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
}
