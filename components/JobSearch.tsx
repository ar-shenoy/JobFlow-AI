import React, { useState } from 'react';
import { UserProfile, JobListing } from '../types';
import { searchJobsWithGemini } from '../services/geminiService';
import { Search, Loader2, Plus, Globe, CheckSquare, Square, PenTool, Wifi, WifiOff } from 'lucide-react';

interface JobSearchProps {
  profile: UserProfile;
  addJobsToQueue: (jobs: JobListing[]) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const JobSearch: React.FC<JobSearchProps> = ({ profile, addJobsToQueue, showToast }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<JobListing[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ title: '', company: '', url: '' });

  const handleSearch = async () => {
    if (profile.targetRoles.length === 0) return showToast("Set target roles in Profile first", "error");
    
    setIsSearching(true);
    setSearchResults([]);
    setSelectedIds(new Set()); 
    
    try {
      // searchJobsWithGemini now aggregates AI results AND Public API results (filtered by level)
      const jobs = await searchJobsWithGemini(profile);
      
      if (jobs.length === 0) {
        showToast("No jobs found via APIs. Try Manual Mode.", "error");
      } else {
        setSearchResults(jobs);
        const source = jobs[0].source;
        showToast(`Found ${jobs.length} jobs via ${source.includes('AI') ? 'AI & Public Boards' : 'Public Boards'}`, "success");
      }
    } catch (error) {
      showToast("Search failed.", "error");
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const handleManualAdd = () => {
    if(!manual.title || !manual.company) return;
    const newJob: JobListing = {
      id: Math.random().toString(36),
      title: manual.title,
      company: manual.company,
      url: manual.url || `https://google.com/search?q=${manual.company}+${manual.title}`,
      location: 'Remote',
      description: 'Manual Entry',
      source: 'Manual',
      status: 'new',
      postedDate: new Date().toISOString()
    };
    addJobsToQueue([newJob]);
    setManual({title: '', company: '', url: ''});
    setShowManual(false);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === searchResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(searchResults.map(j => j.id)));
    }
  };

  const addSelectedToQueue = () => {
    const toAdd = searchResults.filter(j => selectedIds.has(j.id));
    if (toAdd.length === 0) return showToast("No jobs selected", "error");
    addJobsToQueue(toAdd);
    setSearchResults(prev => prev.filter(j => !selectedIds.has(j.id))); 
    setSelectedIds(new Set());
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Job Discovery</h2>
          <p className="text-slate-400">Strategy: <span className="text-blue-400 font-mono">Hybrid (AI + Aggregators)</span> • Level: <span className="text-green-400">{profile.experienceLevel}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(!showManual)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 border border-slate-700">
            <PenTool size={18} /> Manual
          </button>
          <button onClick={handleSearch} disabled={isSearching} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20">
            {isSearching ? <Loader2 className="animate-spin" /> : <Globe size={20} />}
            {isSearching ? 'Scanning Boards...' : 'Find Jobs'}
          </button>
        </div>
      </div>

      {showManual && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-in slide-in-from-top-4">
           <h3 className="font-bold text-white mb-4">Add Manual Job</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             <input className="bg-slate-900 border border-slate-700 p-3 rounded text-white" placeholder="Job Title" value={manual.title} onChange={e => setManual({...manual, title: e.target.value})} />
             <input className="bg-slate-900 border border-slate-700 p-3 rounded text-white" placeholder="Company" value={manual.company} onChange={e => setManual({...manual, company: e.target.value})} />
             <input className="bg-slate-900 border border-slate-700 p-3 rounded text-white" placeholder="URL (Optional)" value={manual.url} onChange={e => setManual({...manual, url: e.target.value})} />
           </div>
           <button onClick={handleManualAdd} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded font-bold text-white">Add to Queue</button>
        </div>
      )}

      {isSearching && (
        <div className="py-20 text-center">
          <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-blue-300 font-mono">Aggregating & Filtering Jobs...</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <>
          <div className="bg-blue-900/20 border border-blue-900/50 p-3 rounded-lg flex items-center gap-2 text-sm text-blue-200">
             <Globe size={16} />
             Found {searchResults.length} relevant roles.
          </div>

          <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
             <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white">
                {selectedIds.size === searchResults.length ? <CheckSquare size={18} className="text-blue-400"/> : <Square size={18}/>}
                Select All
             </button>
             <span className="text-sm text-slate-500">{selectedIds.size} Selected</span>
             <button 
               onClick={addSelectedToQueue}
               disabled={selectedIds.size === 0}
               className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"
             >
               <Plus size={16}/> Add to AutoPilot
             </button>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {searchResults.map((job) => (
          <div 
            key={job.id} 
            className={`
              relative p-5 rounded-xl border transition-all cursor-pointer group
              ${selectedIds.has(job.id) ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}
            `}
            onClick={() => toggleSelection(job.id)}
          >
            <div className="absolute top-5 right-5 text-blue-400">
               {selectedIds.has(job.id) ? <CheckSquare /> : <Square className="text-slate-600 group-hover:text-slate-400" />}
            </div>
            <h4 className="font-bold text-lg text-white mb-1 pr-8">{job.title}</h4>
            <p className="text-slate-400 mb-3">{job.company} • {job.location}</p>
            <div className="text-sm text-slate-500 line-clamp-2 mb-3 bg-slate-900/50 p-2 rounded">
              {job.description}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1"><Globe size={12}/> {job.source}</span>
              <span>{new Date(job.postedDate || "").toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobSearch;