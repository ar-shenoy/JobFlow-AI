import { JobListing, UserProfile } from "../types";

// Free Public API: Remotive (Remote Jobs)
const REMOTIVE_API_URL = 'https://remotive.com/api/remote-jobs';
// Free Public API: Jobicy
const JOBICY_API_URL = 'https://jobicy.com/api/v2/remote-jobs';

// --- FILTERING LOGIC ---

const EXCLUSION_KEYWORDS = {
  'Entry Level': ['senior', 'snr', 'principal', 'lead', 'staff', 'manager', 'head of', 'director', 'vp', 'architect', 'expert', 'founding', 'chief', 'sr.'],
  'Associate': ['principal', 'director', 'vp', 'head of', 'chief', 'architect'],
  'Mid-Senior Level': ['intern', 'junior', 'entry level', 'graduate'],
  'Director': ['intern', 'junior', 'associate', 'entry level', 'mid-level'],
  'Executive': ['intern', 'junior', 'associate', 'mid-level', 'senior', 'lead'],
  'Internship': ['senior', 'lead', 'principal', 'staff', 'manager', 'architect', 'head of']
};

const doesJobMatchLevel = (title: string, level: UserProfile['experienceLevel']): boolean => {
  const lowerTitle = title.toLowerCase();
  const exclusions = EXCLUSION_KEYWORDS[level] || [];
  
  for (const keyword of exclusions) {
    if (lowerTitle.includes(keyword)) return false;
  }
  return true;
};

// Map complex roles to simple tags that Jobicy accepts
const mapRoleToTag = (role: string): string => {
  const r = role.toLowerCase();
  if (r.includes('devops')) return 'devops';
  if (r.includes('design')) return 'design';
  if (r.includes('product')) return 'product';
  if (r.includes('data')) return 'data';
  if (r.includes('qa') || r.includes('test')) return 'qa';
  if (r.includes('marketing')) return 'marketing';
  if (r.includes('sales')) return 'sales';
  return 'dev'; // Default to dev for everything else (react, node, software, etc)
};

// --- FETCHERS ---

export const fetchRemotiveJobs = async (limit: number = 50, role?: string): Promise<JobListing[]> => {
  try {
    const res = await fetch(`${REMOTIVE_API_URL}?category=software-dev&limit=100`);
    if (!res.ok) throw new Error('Failed to fetch from Remotive');
    
    const data = await res.json();
    let jobs = data.jobs || [];

    if (role) {
      const lowerRole = role.toLowerCase().replace('developer', '').replace('engineer', '').trim();
      // Broad filter first
      jobs = jobs.filter((j: any) => {
        const title = j.title.toLowerCase();
        return title.includes(lowerRole);
      });
    }

    return jobs.map((j: any) => ({
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || 'Remote',
      url: j.url,
      description: j.description ? j.description.replace(/<[^>]*>?/gm, ' ') : "Check link for details.",
      source: 'Remotive',
      status: 'new',
      postedDate: j.publication_date,
      matchScore: 0
    }));
  } catch (error) {
    console.error("Remotive API Error:", error);
    return [];
  }
};

export const fetchJobicyJobs = async (limit: number = 50, role?: string): Promise<JobListing[]> => {
  try {
    // Jobicy requires specific tags. We normalize the user's detailed role to a simple tag.
    const tag = role ? mapRoleToTag(role) : '';
    const query = tag ? `?tag=${tag}&count=50` : '?count=50';
    
    const res = await fetch(`${JOBICY_API_URL}${query}`);
    if (!res.ok) throw new Error('Failed to fetch from Jobicy');

    const data = await res.json();
    let jobs = data.jobs || [];

    // Client-side strict filtering to ensure "Good Results"
    // Since we queried with a broad tag (e.g. 'dev'), we must filter by the specific role now
    if (role) {
       const keyTerms = role.toLowerCase().split(' ').filter(w => w.length > 2 && w !== 'developer' && w !== 'engineer');
       if (keyTerms.length > 0) {
           jobs = jobs.filter((j: any) => {
               const t = j.jobTitle.toLowerCase();
               // At least one key term must match (e.g. "React" or "Frontend")
               return keyTerms.some(term => t.includes(term));
           });
       }
    }

    return jobs.map((j: any) => ({
      id: `jobicy-${j.id}`,
      title: j.jobTitle,
      company: j.companyName,
      location: j.jobGeo || 'Remote',
      url: j.url,
      description: j.jobDescription ? j.jobDescription.replace(/<[^>]*>?/gm, ' ') : "Remote Opportunity",
      source: 'Jobicy',
      status: 'new',
      postedDate: j.pubDate,
      matchScore: 0
    }));
  } catch (error) {
    console.warn("Jobicy API Error:", error);
    return [];
  }
};

// Fisher-Yates Shuffle
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export const getAggregatedJobs = async (profileRole: string, experienceLevel?: UserProfile['experienceLevel']): Promise<JobListing[]> => {
  // Parallel Fetch
  const [remotive, jobicy] = await Promise.all([
    fetchRemotiveJobs(50, profileRole),
    fetchJobicyJobs(50, profileRole)
  ]);
  
  let combined = [...remotive, ...jobicy];
  
  // Apply Strict Experience Level Filter
  if (experienceLevel) {
    combined = combined.filter(job => doesJobMatchLevel(job.title, experienceLevel));
  }
  
  // Clean up descriptions (simple deduplication of spaces)
  combined = combined.map(j => ({
    ...j,
    description: j.description.replace(/\s+/g, ' ').slice(0, 500) + '...'
  }));

  if (combined.length > 0) {
    return shuffleArray(combined).slice(0, 50); 
  }
  
  return getHardcodedJobs();
};

export const getHardcodedJobs = (): JobListing[] => [
  { 
    id: 'mock-1', 
    title: "Frontend Developer (Offline Mode)", 
    company: "System Fallback", 
    location: "Remote", 
    url: "#", 
    description: "External APIs are currently unreachable. Please check your internet connection or try again later.", 
    source: 'System', 
    status: 'new',
    postedDate: new Date().toISOString() 
  }
];