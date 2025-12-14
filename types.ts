export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  experienceLevel: 'Entry' | 'Mid' | 'Senior' | 'Executive';
  targetRoles: string[];
  locations: string[];
  resumeText: string; // Extracted text
  resumeBase64?: string; // Original file for analysis
  skills: string[];
}

export interface InterviewQuestion {
  question: string;
  suggestedAnswer: string;
  keyPoints: string[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string; // Summary or full
  source: string;
  postedDate?: string;
  matchScore?: number;
  status: 'new' | 'analyzing' | 'applying' | 'applied' | 'failed' | 'skipped';
  generatedCoverLetter?: string;
  applicationNotes?: string;
  interviewPrep?: InterviewQuestion[];
}

export interface SkillGapAnalysis {
  missingSkills: string[];
  learningPath: {
    skill: string;
    resource: string;
    actionItem: string;
  }[];
  projectIdea: string;
}

export interface AutomationLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'action';
}

export interface AppState {
  profile: UserProfile;
  jobs: JobListing[];
  logs: AutomationLog[];
  isSearching: boolean;
  isAutoPilotRunning: boolean;
  stats: {
    totalFound: number;
    applied: number;
    skipped: number;
  };
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  PROFILE = 'PROFILE',
  SEARCH = 'SEARCH',
  AUTOPILOT = 'AUTOPILOT',
  INTERVIEW = 'INTERVIEW',
  NETWORKING = 'NETWORKING',
  SKILLS = 'SKILLS',
  REPORTS = 'REPORTS'
}
