
export enum Difficulty {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced'
}

export type AIPersona = 'Tutor' | 'PairProgrammer' | 'Reviewer' | 'TechLead' | 'ProductManager' | 'SecurityLead';

export interface VirtualFile {
  id: string;
  name: string;
  content: string;
  language: string;
  isOpen?: boolean;
  isLocked?: boolean;
}

export interface ValidationRule {
  type: 'contains' | 'regex' | 'output_matches' | 'function_called';
  target: string;
  errorMessage: string;
}

export interface LessonTask {
  instruction: string;
  hint: string;
  validationRules: ValidationRule[];
}

export interface LessonSection {
  type: 'text' | 'concept' | 'interactive' | 'challenge' | 'summary' | 'huddle';
  title?: string;
  content: string;
  codeSnippet?: string;
  revealText?: string;
  options?: string[];
  correctIndex?: number;
  persona?: AIPersona;
  task?: LessonTask;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'code' | 'project' | 'dynamic';
  overview: string;
  whyItMatters: string;
  sections: LessonSection[];
  starterCode?: string;
  files?: VirtualFile[];
  duration: string;
  completed?: boolean;
}

export interface CourseLevel {
  level: Difficulty;
  unlocked: boolean;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  language: string;
  category: string;
  thumbnail: string;
  estimatedTime: string;
  xpValue: number;
  skillsGained: string[];
  prerequisites: string[];
  level: Difficulty;
  levels: CourseLevel[];
}

export interface ProjectStep {
  id: string;
  title: string;
  description: string;
  task: string;
  files: VirtualFile[];
  validationRules: ValidationRule[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  techStack: string[];
  difficulty: Difficulty;
  category: string;
  steps: ProjectStep[];
}

// Added SkillNode interface
export interface SkillNode {
  id: string;
  label: string;
  icon: string;
  status: 'completed' | 'unlocked' | 'locked';
  mastery: number;
}

// Added EngineeringTicket interface
export interface EngineeringTicket {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'task' | 'refactor' | 'security';
}

// Added CompanyProject interface
export interface CompanyProject {
  id: string;
  companyName: string;
  projectName: string;
  description: string;
  techStack: string[];
  backlog: EngineeringTicket[];
  baseCodebase: VirtualFile[];
}

// Added SimulatedTask interface
export interface SimulatedTask {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  language: string;
  starterCode: string;
  requirements: string[];
}

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  badges: string[];
  accuracy: number;
  readinessScore: number; 
  skillPoints: number;
  cognitiveLoad: 'Low' | 'Medium' | 'High' | 'DeepFlow';
  sentiment: 'Frustrated' | 'Neutral' | 'Confident' | 'Struggling';
}

export interface UserProfile {
  account: {
    id: string;
    username: string;
    isGuest: boolean;
  };
  stats: UserStats;
  skillGraph: SkillNode[]; // Updated to use SkillNode[]
  completedLessonIds: string[];
  completedProjectIds: string[];
}
