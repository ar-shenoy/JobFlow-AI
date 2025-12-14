export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  location: string; // Current physical location
  
  // New granular preferences
  experienceLevel: 'Internship' | 'Entry Level' | 'Associate' | 'Mid-Senior Level' | 'Director' | 'Executive';
  jobTypes: string[]; // e.g. ['Full-time', 'Contract']
  remoteOnly: boolean;
  targetRoles: string[];
  preferredRegions: string[]; // e.g. ['Europe', 'United States']
  workStyle: 'Remote' | 'Hybrid' | 'On-site' | 'Any';
  
  // Sliders & Advanced
  matchThreshold: number; // 0-100
  salaryExpectation: string;
  noticePeriod: string;
  visaSponsorship: boolean;
  
  linkedinUrl: string;
  portfolioUrl: string;
  education: string;
  resumeText: string;
  resumeBase64?: string;
  skills: string[];
  
  // Premium Features
  aiPersona?: string; // e.g. "Senior Full Stack Architect"
  profileStrength?: number; // 0-100
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
  description: string;
  source: string;
  postedDate?: string;
  matchScore?: number;
  status: 'new' | 'analyzing' | 'skipped' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'failed';
  generatedCoverLetter?: string;
  applicationNotes?: string;
  interviewPrep?: InterviewQuestion[];
}

export interface ResumeOptimization {
  score: number;
  missingKeywords: string[];
  suggestedImprovements: string[];
  optimizedSummary: string;
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
  KANBAN = 'KANBAN',
  OPTIMIZER = 'OPTIMIZER',
  INTERVIEW = 'INTERVIEW',
  NETWORKING = 'NETWORKING',
  SKILLS = 'SKILLS'
}