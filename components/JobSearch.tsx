import React, { useState } from 'react';
import { UserProfile, JobListing } from '../types';
import { searchJobsWithGemini } from '../services/geminiService';
import { Search, Loader2, Plus, Globe, AlertTriangle, PenTool } from 'lucide-react';

interface JobSearchProps {
  profile: UserProfile;
  addJobsToQueue: (jobs: JobListing[]) => void;
}

const JobSearch: React.FC<JobSearchProps> = ({ profile, addJobsToQueue }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<JobListing[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual Add State
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualJob, setManualJob] = useState({ title: '', company: '', url: '' });

  const handleSearch = async () => {
    if (profile.targetRoles.length === 0) {
      alert("Please define target roles in your profile first.");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setErrorMsg(null);
    setShowManualAdd(false);
    
    try {
      const jobs = await searchJobsWithGemini(profile);
      if (jobs.length === 0) {
        setErrorMsg("No jobs returned from AI Search. Try adding one manually to test the pipeline.");
      }
      setSearchResults(jobs);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Search failed: ${error.message}. Please use Manual Add.`);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const handleAddToQueue = (jobs: JobListing[]) => {
    addJobsToQueue(jobs);
    setSearchResults([]); // Clear results after adding
    setHasSearched(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualJob.title || !manualJob.company) return;

    const newJob: JobListing = {
      id: Math.random().toString(36).substr(2, 9),
      title: manualJob.title,
      company: manualJob.company,
      location: profile.locations[0] || 'Remote',
      url: manualJob.url || '#',
      description: 'Manually added job. Auto-pilot will attempt to infer details.',
      source: 'Manual Entry',
      status: 'new',
      postedDate: new Date().toISOString()
    };

    addJobsToQueue([newJob]);
    setManualJob({ title: '', company: '', url: '' });
    setShowManualAdd(false);
    alert("Job added to queue! Go to AutoPilot to process it.");
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-700 pb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Job Discovery Agent</h2>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl">
            Searching for <span className="text-blue-400">{profile.targetRoles.join(', ') || 'roles'}</span> 
            in <span className="text-blue-400">{profile.locations.join(', ') || 'your area'}</span>.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button 
            onClick={() => setShowManualAdd(!showManualAdd)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-600 transition-all"
          >
            <PenTool size={18} /> Manual Add
          </button>
          <button 
            onClick={handleSearch}
            disabled={isSearching}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            {isSearching ? <Loader2 className="animate-spin" /> : <Globe size={20} />}
            {isSearching ? 'Scanning...' : 'Scan Web'}
          </button>
        </div>
      </div>

      {showManualAdd && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-in slide-in-from-top-4">
           <h3 className="text-lg font-bold text-white mb-4">Manually Add Job</h3>
           <form onSubmit={handleManualSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input 
                 className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="Job Title (e.g. Senior React Dev)"
                 value={manualJob.title}
                 onChange={e => setManualJob({...manualJob, title: e.target.value})}
                 required
               />
               <input 
                 className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="Company Name"
                 value={manualJob.company}
                 onChange={e => setManualJob({...manualJob, company: e.target.value})}
                 required
               />
             </div>
             <input 
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="Job URL (Optional)"
                 value={manualJob.url}
                 onChange={e => setManualJob({...manualJob, url: e.target.value})}
               />
             <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors">
               Add to Pipeline
             </button>
           </form>
        </div>
      )}

      {isSearching && (
        <div className="py-20 text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto">
             <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping"></div>
             <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-lg text-blue-300 font-mono">Accessing Google Search Index...</p>
        </div>
      )}

      {errorMsg && !isSearching && (
        <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-red-400 shrink-0" />
          <p className="text-red-200 text-sm">{errorMsg}</p>
        </div>
      )}

      {!isSearching && hasSearched && searchResults.length === 0 && !errorMsg && (
        <div className="text-center py-10 text-slate-500">
          No jobs found. Try broadening your location or role preferences in the Profile tab.
        </div>
      )}

      {!isSearching && searchResults.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
            <h3 className="text-xl font-semibold text-white">Found {searchResults.length} Opportunities</h3>
            <button 
              onClick={() => handleAddToQueue(searchResults)}
              className="w-full md:w-auto bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add All to AutoPilot Queue
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.map((job) => (
              <div key={job.id} className="bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-base md:text-lg text-white group-hover:text-blue-400 transition-colors line-clamp-1">{job.title}</h4>
                  <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded shrink-0 ml-2">{job.source}</span>
                </div>
                <p className="text-slate-300 font-medium mb-2">{job.company}</p>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <span>📍 {job.location}</span>
                </div>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{job.description}</p>
                
                <div className="flex gap-2 mt-auto">
                   <button 
                    onClick={() => handleAddToQueue([job])}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                   >
                     Add to Queue
                   </button>
                   <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                   >
                     <Globe size={20} />
                   </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobSearch;
