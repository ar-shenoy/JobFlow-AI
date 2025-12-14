import { GoogleGenAI } from "@google/genai";
import { pipeline } from "@xenova/transformers";
import { JobListing, UserProfile, InterviewQuestion, SkillGapAnalysis, ResumeOptimization } from "../types";
import { getAggregatedJobs } from "./jobSources";

// --- CONFIG ---
const MODEL_NAME = 'gemini-2.5-flash';

// --- UTILITIES ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      if (err.message?.includes('429') || err.message?.includes('quota') || err.status === 429) {
        throw err; // Fail fast on quota to trigger local fallback
      } else {
        await delay(1000 * Math.pow(2, i));
      }
    }
  }
  throw new Error("Max retries exceeded");
}

const getAI = () => {
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey.includes("your_key")) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const extractJSON = (text: string): any => {
  if (!text) return null;
  try {
    let cleanText = text.replace(/```json\s*|\s*```/g, '').replace(/```/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    if (firstBrace === -1 && firstBracket === -1) return null;
    const start = (firstBrace > -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
    const end = (start === firstBrace) ? cleanText.lastIndexOf('}') : cleanText.lastIndexOf(']');
    if (start === -1 || end === -1) return null;
    cleanText = cleanText.substring(start, end + 1);
    return JSON.parse(cleanText);
  } catch (e) { return null; }
};

// --- LOCAL INTELLIGENCE ENGINES ---

const COMMON_SKILLS = [
  "python", "javascript", "typescript", "react", "node", "java", "c++", "c#", "go", "rust", 
  "aws", "azure", "gcp", "docker", "kubernetes", "sql", "nosql", "mongodb", "postgresql", 
  "git", "ci/cd", "agile", "scrum", "machine learning", "ai", "pandas", "numpy", "pytorch", 
  "tensorflow", "html", "css", "redux", "graphql", "next.js", "vue", "angular"
];

const STOP_WORDS = new Set(["the", "and", "a", "to", "of", "in", "for", "with", "on", "at", "from", "by", "an", "is", "it", "that", "this", "are", "be", "or", "as", "will", "can", "if", "not", "we", "you", "our", "your", "role", "experience", "work", "team", "skills", "years", "knowledge", "working", "using", "development", "design", "support", "business", "application", "systems", "solutions", "software", "engineer", "developer"]);

// 1. Local Keyword Extractor (TF-IDF Simulation)
const extractKeywordsLocally = (text: string): string[] => {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  const frequency: Record<string, number> = {};
  
  words.forEach(w => {
    if (!STOP_WORDS.has(w) && w.length > 2 && !/^\d+$/.test(w)) {
      frequency[w] = (frequency[w] || 0) + 1;
    }
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, 15) // Top 15 keywords
    .map(e => e[0]);
};

// 2. Local Role Suggester based on Skill Detection
const suggestRolesLocally = (text: string): string[] => {
  const t = text.toLowerCase();
  const roles = new Set<string>();

  if (t.includes('react') || t.includes('vue') || t.includes('css') || t.includes('frontend')) roles.add("Frontend Engineer");
  if (t.includes('node') || t.includes('python') || t.includes('java') || t.includes('backend')) roles.add("Backend Engineer");
  if ((t.includes('react') && t.includes('node')) || t.includes('full stack')) roles.add("Full Stack Developer");
  if (t.includes('design') || t.includes('figma')) roles.add("Product Designer");
  if (t.includes('product') && t.includes('manager')) roles.add("Product Manager");
  if (t.includes('data') || t.includes('sql') || t.includes('python')) roles.add("Data Engineer");
  
  // Default fallbacks
  if (roles.size === 0) return ["Software Engineer", "Remote Developer", "Tech Specialist"];
  return Array.from(roles);
};

// 3. Local Resume Optimizer
const optimizeResumeLocally = (jobDesc: string, resumeText: string): ResumeOptimization => {
  const jobKeywords = extractKeywordsLocally(jobDesc);
  const resumeLower = resumeText.toLowerCase();
  
  const missingKeywords = jobKeywords.filter(k => !resumeLower.includes(k));
  const foundKeywords = jobKeywords.filter(k => resumeLower.includes(k));
  
  const score = Math.round((foundKeywords.length / jobKeywords.length) * 100);
  
  // Normalize score to be realistic (hard to get 100%)
  const adjustedScore = Math.min(98, Math.max(30, score + 20));

  return {
    score: adjustedScore,
    missingKeywords: missingKeywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)), // Capitalize
    suggestedImprovements: [
      `Add specific experience with "${missingKeywords.slice(0,2).join('" and "')}" to your summary.`,
      `Quantify your impact using numbers (e.g., "Improved ${foundKeywords[0] || 'performance'} by 20%").`,
      "Ensure your skills section explicitly lists the missing technologies found above."
    ],
    optimizedSummary: `Passionate professional with strong expertise in ${foundKeywords.slice(0,3).join(', ')}. Eager to leverage skills in ${missingKeywords.slice(0,2).join(' and ')} to drive success at the company. Proven track record of delivering high-quality solutions.`
  };
};

// --- AGENT RUNNER ---

async function runSmartAgent<T>(apiCall: () => Promise<T>, fallbackLogic: () => T | Promise<T>): Promise<T> {
  const ai = getAI();
  if (!ai) return fallbackLogic();
  try {
    return await retryOperation(apiCall);
  } catch (error: any) {
    // Check for 429 or generic fetch errors to trigger fallback
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('quota')) {
       console.warn("Gemini Rate Limit (429). Switching to Local Intelligence Engine.");
       return fallbackLogic();
    }
    console.error("Gemini Error:", error.message);
    return fallbackLogic();
  }
}

// --- EXPORTED FUNCTIONS ---

export const parseResume = async (base64Data: string, mimeType: string): Promise<Partial<UserProfile>> => {
  const decodedText = atob(base64Data);
  const fallback = {
    name: "Candidate",
    email: decodedText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/)?.[0] || "",
    skills: COMMON_SKILLS.filter(s => decodedText.toLowerCase().includes(s)),
    resumeText: decodedText.substring(0, 2000), 
    aiPersona: "Tech Professional (Local)"
  };

  return runSmartAgent(async () => {
    const ai = getAI();
    if(!ai) throw new Error("No Key");
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Extract JSON: name, email, phone, location, linkedinUrl, portfolioUrl, education, skills[], resumeText, aiPersona." }
        ]
      },
      config: { responseMimeType: 'application/json' }
    });
    return extractJSON(response.text || '{}') || fallback;
  }, () => fallback);
};

export const suggestRoles = async (resumeText: string): Promise<string[]> => {
  return runSmartAgent(async () => {
    const ai = getAI();
    if(!ai) throw new Error("No Key");
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Suggest 5 specific job titles based on this resume text: ${resumeText.slice(0, 1000)}. Return JSON array of strings.`,
      config: { responseMimeType: 'application/json' }
    });
    return extractJSON(response.text || '[]') || suggestRolesLocally(resumeText);
  }, () => suggestRolesLocally(resumeText)); 
};

export const searchJobsWithGemini = async (profile: UserProfile): Promise<JobListing[]> => {
  const aiResult = await runSmartAgent<JobListing[]>(async () => {
    const ai = getAI();
    if(!ai) throw new Error("No Key");
    const loc = profile.remoteOnly ? 'Remote' : (profile.preferredRegions.join(', ') || 'Remote');
    const query = `Find 5 ${profile.experienceLevel} ${profile.targetRoles[0]} jobs in ${loc}. JSON: title, company, location, url, description.`;
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: query,
      config: { tools: [{ googleSearch: {} }] }
    });
    const jobs = extractJSON(response.text || '');
    if (Array.isArray(jobs) && jobs.length > 0) {
       return jobs.map((j: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: j.title || 'Job',
        company: j.company || 'Unknown',
        location: j.location || 'Remote',
        url: j.url || '#',
        description: j.description || '',
        source: 'Gemini Search',
        status: 'new',
        postedDate: new Date().toISOString()
      }));
    }
    return [];
  }, async () => []);

  // Use the aggregator with the FIRST target role
  const publicJobs = await getAggregatedJobs(profile.targetRoles[0] || 'software developer', profile.experienceLevel);
  
  const combined = [...aiResult, ...publicJobs];
  
  // Local Post-Filtering for Seniority
  const EXCLUDE_SENIOR = ['senior', 'lead', 'principal', 'staff', 'manager', 'head', 'director', 'vp'];
  if (profile.experienceLevel === 'Entry Level' || profile.experienceLevel === 'Internship') {
     return combined.filter(j => !EXCLUDE_SENIOR.some(ex => j.title.toLowerCase().includes(ex)));
  }

  return combined;
};

export const analyzeAndApply = async (job: JobListing, profile: UserProfile): Promise<{ matchScore: number, coverLetter: string, notes: string }> => {
  return runSmartAgent(async () => {
    const ai = getAI();
    if(!ai) throw new Error("No Key");
    const res = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Match ${profile.resumeText.slice(0,1000)} to ${job.description.slice(0,1000)}. JSON: matchScore, coverLetter, notes.`,
      config: { responseMimeType: 'application/json' }
    });
    return extractJSON(res.text || '{}');
  }, async () => {
    // FALLBACK: Use Local Keyword Matching
    const optimization = optimizeResumeLocally(job.description, profile.resumeText || profile.skills.join(' '));
    return {
      matchScore: optimization.score,
      coverLetter: `Dear Hiring Manager,\n\nI am writing to express my enthusiasm for the ${job.title} position at ${job.company}. With my background in ${profile.skills.slice(0,3).join(', ')}, I am confident I can contribute effectively.\n\nBest regards,\n${profile.name}`,
      notes: `Local Analysis: Matches keywords like ${optimization.missingKeywords.length === 0 ? 'perfectly' : 'partially'}.`
    };
  });
};

export const generateInterviewQuestions = async (job: JobListing, profile: UserProfile): Promise<InterviewQuestion[]> => {
  return runSmartAgent(async () => {
    const ai = getAI();
    if(!ai) throw new Error("No Key");
    const res = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `3 interview questions for ${job.title} at ${job.company}. JSON array.`,
        config: { responseMimeType: 'application/json' }
    });
    return extractJSON(res.text || '[]') || [];
  }, () => [
    { question: `How does your experience align with the ${job.title} role?`, suggestedAnswer: "Discuss specific projects.", keyPoints: ["Relevance", "Skills"] },
    { question: "What is your greatest technical challenge?", suggestedAnswer: "STAR Method.", keyPoints: ["Problem Solving"] },
    { question: "Why do you want to work here?", suggestedAnswer: "Mention company mission.", keyPoints: ["Culture"] }
  ]);
};

export const analyzeResumeForJob = async (job: JobListing, profile: UserProfile): Promise<ResumeOptimization> => {
  // Try AI first, then failover to robust local analysis
  return runSmartAgent(async () => {
    const ai = getAI();
    if(!ai) throw new Error("No Key");
    const res = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Compare Resume vs ${job.title}. JSON: score, missingKeywords[], suggestedImprovements[], optimizedSummary.`,
      config: { responseMimeType: 'application/json' }
    });
    return extractJSON(res.text || '{}');
  }, async () => optimizeResumeLocally(job.description, profile.resumeText || ''));
};

export const generateNetworkingMessage = async (type: string, targetName: string, company: string, role: string, profile: UserProfile): Promise<string> => {
    return runSmartAgent(async () => {
      const ai = getAI();
      if(!ai) throw new Error("No Key");
      const res = await ai.models.generateContent({ 
        model: MODEL_NAME, 
        contents: `Write a ${type} to ${targetName} at ${company} for ${role}. My name: ${profile.name}. Text only.` 
      });
      return res.text || "";
    }, () => `Hi ${targetName},\n\nI noticed you work at ${company}. I'm a ${role} with experience in ${profile.skills[0] || 'tech'} and would love to connect.\n\nBest,\n${profile.name}`);
};

export const analyzeSkillGap = async (profile: UserProfile): Promise<SkillGapAnalysis> => {
    const fallback = {
      missingSkills: ["Cloud Platforms", "System Design"],
      learningPath: [{ skill: "Advanced Patterns", resource: "Docs", actionItem: "Build a project" }],
      projectIdea: "Build a full-stack dashboard."
    };
    return runSmartAgent(async () => {
        const ai = getAI();
        if(!ai) throw new Error("No Key");
        const res = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Skill gap for ${profile.targetRoles[0]}. JSON: missingSkills[], learningPath[], projectIdea`,
            config: { responseMimeType: 'application/json' }
        });
        return extractJSON(res.text || '{}') || fallback;
    }, () => fallback);
};