import { GoogleGenAI, Type } from "@google/genai";
import { JobListing, UserProfile, InterviewQuestion, SkillGapAnalysis } from "../types";

// Helper to get AI instance using the API key from environment variables
const getAI = () => {
  // Check both process.env (injected via vite define) and import.meta.env (native vite)
  const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error(
      "Gemini API Key is missing. Please check your environment variables."
    );
  }

  return new GoogleGenAI({ apiKey });
};

// Bulletproof JSON extractor
const extractJSON = (text: string): any => {
  if (!text) return null;

  // 1. Remove Markdown code blocks
  let cleanText = text.replace(/```json\s*|\s*```/g, ''); 
  cleanText = cleanText.replace(/```/g, '');

  // 2. Find the outer-most array or object
  const firstBracket = cleanText.indexOf('[');
  const lastBracket = cleanText.lastIndexOf(']');
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');

  // Determine if it looks like an array or object and extract substring
  if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
     cleanText = cleanText.substring(firstBracket, lastBracket + 1);
  } else if (firstBrace !== -1 && lastBrace !== -1) {
     cleanText = cleanText.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn("JSON Parse Warning, attempting manual cleanup:", e);
    // 3. Last ditch effort: remove trailing commas (common AI error)
    try {
      cleanText = cleanText.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(cleanText);
    } catch (e2) {
      console.error("Failed to parse JSON response:", text);
      return null;
    }
  }
};

/**
 * Extracts structured data from a Resume (PDF/Image base64 or Text)
 */
export const parseResume = async (base64Data: string, mimeType: string): Promise<Partial<UserProfile>> => {
  const ai = getAI();
  
  const prompt = `
    Analyze this resume. Extract the candidate's name, email, phone, list of top 10 key skills, 
    and a summary of their professional experience text.
    Return the response in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            resumeText: { type: Type.STRING, description: "A detailed summary of experience suitable for matching against job descriptions." }
          }
        }
      }
    });

    return extractJSON(response.text || '{}') || {};
  } catch (error) {
    console.error("Resume parsing failed:", error);
    throw new Error("Failed to parse resume. Please ensure the file is clear and try again.");
  }
};

/**
 * Suggests job titles based on resume text
 */
export const suggestRoles = async (resumeText: string): Promise<string[]> => {
  const ai = getAI();
  const prompt = `Based on the following professional experience, suggest 5 relevant and specific job titles this candidate should apply for. Return only a JSON array of strings.\n\nExperience:\n${resumeText.slice(0, 2000)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return extractJSON(response.text || '[]') || [];
  } catch (error) {
    console.error("Role suggestion failed:", error);
    return [];
  }
};

/**
 * Generates interview preparation questions
 */
export const generateInterviewQuestions = async (job: JobListing, profile: UserProfile): Promise<InterviewQuestion[]> => {
  const ai = getAI();
  const prompt = `
    Generate 5 technical and behavioral interview questions for a ${job.title} role at ${job.company}.
    Based on the candidate's skills: ${profile.skills.join(', ')}.
    Provide suggested answers and key talking points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              suggestedAnswer: { type: Type.STRING },
              keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });
    return extractJSON(response.text || '[]') || [];
  } catch (error) {
    console.error("Interview prep failed:", error);
    throw new Error("Failed to generate interview questions.");
  }
};

/**
 * Searches for jobs using Google Search Grounding
 */
export const searchJobsWithGemini = async (profile: UserProfile): Promise<JobListing[]> => {
  const ai = getAI();
  
  const query = `
    Find 5 real, recently posted job listings (last 7 days) for "${profile.targetRoles.join('" or "')}" in "${profile.locations.join('" or "')}".
    
    CRITICAL: You MUST return a VALID JSON ARRAY. Do not add any conversational text.
    
    Structure:
    [
      {
        "title": "Job Title",
        "company": "Company Name",
        "location": "City, Country",
        "description": "Brief summary",
        "url": "Application URL or Career Page URL" 
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || '';
    console.log("Raw Search Response:", text); // Debugging

    let rawJobs = extractJSON(text);
    
    // Handle case where it's wrapped in { jobs: [...] }
    if (rawJobs && !Array.isArray(rawJobs) && Array.isArray(rawJobs.jobs)) {
        rawJobs = rawJobs.jobs;
    }
    
    if (!Array.isArray(rawJobs)) {
        console.warn("Could not extract JSON array from search response.");
        return [];
    }

    return rawJobs.map((job: any) => ({
      title: job.title || 'Unknown Role',
      company: job.company || 'Unknown Company',
      location: job.location || 'Remote',
      description: job.description || 'No description available',
      url: job.url || '#',
      id: Math.random().toString(36).substr(2, 9),
      source: 'Gemini Search',
      status: 'new',
      postedDate: new Date().toISOString()
    }));
  } catch (error) {
    console.error("Job search failed:", error);
    return [];
  }
};

/**
 * Analyzes a job for fit and generates a cover letter
 */
export const analyzeAndApply = async (job: JobListing, profile: UserProfile): Promise<{ matchScore: number, coverLetter: string, notes: string }> => {
  const ai = getAI();

  const prompt = `
    You are an expert career automation agent.
    
    Candidate Profile:
    Name: ${profile.name}
    Skills: ${profile.skills.join(', ')}
    Experience Summary: ${profile.resumeText ? profile.resumeText.slice(0, 800) : "Not provided"}

    Target Job:
    Title: ${job.title}
    Company: ${job.company}
    Description: ${job.description}

    Task:
    1. Calculate a Match Score (0-100) based on skills overlap.
    2. Write a professional, concise Cover Letter (max 200 words).
    3. Write a one-sentence analysis note.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchScore: { type: Type.NUMBER },
            coverLetter: { type: Type.STRING },
            notes: { type: Type.STRING }
          }
        }
      }
    });

    const result = extractJSON(response.text || '{}');
    
    return {
      matchScore: typeof result?.matchScore === 'number' ? result.matchScore : 50,
      coverLetter: result?.coverLetter || "Could not generate cover letter.",
      notes: result?.notes || "Analysis incomplete."
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateNetworkingMessage = async (
    type: 'linkedin' | 'email',
    targetName: string,
    company: string,
    role: string,
    profile: UserProfile
): Promise<string> => {
    const ai = getAI();
    const prompt = `
      Write a ${type === 'linkedin' ? 'short LinkedIn connection request (max 300 chars)' : 'cold email'} 
      to ${targetName} at ${company} regarding the ${role} position.
      My name is ${profile.name}.
      My key strength is: ${profile.skills.slice(0,3).join(', ')}.
      Tone: Professional, concise, and persuasive.
      Return only the message text.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "Failed to generate message.";
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const analyzeSkillGap = async (profile: UserProfile): Promise<SkillGapAnalysis> => {
    const ai = getAI();
    const prompt = `
      Analyze the skill gap for a candidate targeting: ${profile.targetRoles.join(', ')}.
      Candidate Skills: ${profile.skills.join(', ')}.
      
      Return JSON with:
      - missingSkills: list of 3-5 critical skills missing.
      - learningPath: array of { skill, resource (name of book/course/doc), actionItem }.
      - projectIdea: A specific project idea to build to demonstrate these skills.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                        learningPath: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT, 
                                properties: {
                                    skill: { type: Type.STRING },
                                    resource: { type: Type.STRING },
                                    actionItem: { type: Type.STRING }
                                } 
                            } 
                        },
                        projectIdea: { type: Type.STRING }
                    }
                }
            }
        });
        
        return extractJSON(response.text || '{}') || { missingSkills: [], learningPath: [], projectIdea: "Analysis failed" };
    } catch (e) {
        console.error(e);
        throw e;
    }
};