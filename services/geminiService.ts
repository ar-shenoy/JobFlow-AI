import { GoogleGenAI, Type } from "@google/genai";
import { JobListing, UserProfile, InterviewQuestion, SkillGapAnalysis } from "../types";

// Helper to get AI instance using the API key from environment variables
const getAI = () => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey.includes("your_actual_gemini")) {
    throw new Error(
      "Gemini API Key is missing. Please create a .env file in the root directory with 'API_KEY=your_key_here' and restart the server."
    );
  }

  return new GoogleGenAI({ apiKey });
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

    return JSON.parse(response.text || '{}');
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
    return JSON.parse(response.text || '[]');
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
    return JSON.parse(response.text || '[]');
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
    Find recent (posted in last 5 days) job openings for ${profile.targetRoles.join(' or ')} in ${profile.locations.join(' or ')}. 
    
    CRITICAL SEARCH CRITERIA:
    - Return REAL job listings found via Google Search.
    - Prioritize listings from company career pages, LinkedIn, Indeed, or Glassdoor.
    
    Output Format:
    Return a strictly formatted JSON array of objects.
    Example: [{"title": "Software Engineer", "company": "Tech Corp", "location": "New York", "description": "React developer needed...", "url": "https://..."}]
    
    Do not include markdown formatting like \`\`\`json. Just return the raw JSON string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let text = response.text || '[]';
    // Aggressive cleanup
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let rawJobs;
    try {
        // Try direct parse
        rawJobs = JSON.parse(text);
    } catch (e) {
        // Fallback: Try to find array bracket content
        const match = text.match(/\[.*\]/s);
        if (match) {
            try {
                rawJobs = JSON.parse(match[0]);
            } catch (e2) {
                console.error("Failed to parse regex match", e2);
                throw new Error("Invalid format");
            }
        } else {
             console.error("No JSON array found in response", text);
             throw new Error("Invalid response format from AI.");
        }
    }
    
    if (!Array.isArray(rawJobs)) return [];

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
    throw error;
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
    Experience Summary: ${profile.resumeText}

    Target Job:
    Title: ${job.title}
    Company: ${job.company}
    Description: ${job.description}

    Task:
    1. Calculate a match score (0-100) based on skills and experience overlap.
    2. Write a professional, persuasive, and concise cover letter tailored specifically to this job description.
    3. Provide a brief one-sentence reason for the score.
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

    return JSON.parse(response.text || '{"matchScore": 0, "coverLetter": "", "notes": "Error"}');
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

/**
 * Generates cold outreach messages
 */
export const generateNetworkingMessage = async (
    type: 'linkedin' | 'email', 
    targetName: string, 
    company: string, 
    role: string, 
    profile: UserProfile
): Promise<string> => {
    const ai = getAI();
    const prompt = `
      Write a ${type === 'linkedin' ? 'short connection request (max 300 chars)' : 'cold email'} 
      to ${targetName || 'a Hiring Manager'} at ${company} regarding the ${role} position.
      
      My Name: ${profile.name}
      My Key Skills: ${profile.skills.slice(0, 3).join(', ')}
      My Experience: ${profile.resumeText.slice(0, 300)}...
      
      Tone: Professional, concise, and high-value. Focus on how I can help them.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
  
      return response.text || '';
    } catch (error) {
      console.error("Networking generation failed:", error);
      return "Error generating message.";
    }
  };

/**
 * Analyzes Skills Gap
 */
export const analyzeSkillGap = async (profile: UserProfile): Promise<SkillGapAnalysis> => {
  const ai = getAI();
  const prompt = `
    Analyze the skill gap for this candidate.
    
    Candidate Skills: ${profile.skills.join(', ')}
    Target Roles: ${profile.targetRoles.join(', ')}
    Experience: ${profile.resumeText.slice(0, 1000)}

    Task:
    1. Identify top 3 critical missing skills required for the target roles that the candidate seems to lack.
    2. For each missing skill, suggest a concrete learning resource (generic name of course/book) and an action item.
    3. Suggest one capstone project idea that would demonstrate these new skills.

    Return JSON.
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

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Skill gap analysis failed:", error);
    throw new Error("Failed to analyze skill gap.");
  }
};
