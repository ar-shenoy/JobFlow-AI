import React, { useState, useEffect } from 'react';
import { UserProfile, JobListing } from '../types';
import { generateNetworkingMessage } from '../services/geminiService';
import { Share2, Mail, Linkedin, Copy, Loader2, Send, Sparkles } from 'lucide-react';

interface NetworkingHubProps {
  profile: UserProfile;
  jobs: JobListing[];
}

const NetworkingHub: React.FC<NetworkingHubProps> = ({ profile, jobs }) => {
  // Initialize state with localStorage values if available
  const [selectedJobId, setSelectedJobId] = useState<string>(() => {
    return localStorage.getItem('jobflow_networking_selected_job_id') || '';
  });
  
  const [targetName, setTargetName] = useState(() => {
    return localStorage.getItem('jobflow_networking_target_name') || '';
  });
  
  const [activeTab, setActiveTab] = useState<'linkedin' | 'email'>(() => {
    const saved = localStorage.getItem('jobflow_networking_active_tab');
    return (saved === 'linkedin' || saved === 'email') ? saved : 'linkedin';
  });

  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('jobflow_networking_selected_job_id', selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    localStorage.setItem('jobflow_networking_target_name', targetName);
  }, [targetName]);

  useEffect(() => {
    localStorage.setItem('jobflow_networking_active_tab', activeTab);
  }, [activeTab]);

  // Filter only jobs that are interested/applied
  const relevantJobs = jobs.filter(j => j.status !== 'skipped' && j.status !== 'failed');

  const handleGenerate = async () => {
    const job = jobs.find(j => j.id === selectedJobId);
    if (!job && !targetName) {
      alert("Please select a job or enter a target name.");
      return;
    }

    setIsGenerating(true);
    try {
      const msg = await generateNetworkingMessage(
        activeTab,
        targetName,
        job?.company || 'Target Company',
        job?.title || 'Target Role',
        profile
      );
      setGeneratedMessage(msg);
    } catch (e) {
      console.error(e);
      alert("Failed to generate message");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto h-full flex flex-col md:flex-row gap-6 pb-20 md:pb-6">
      
      {/* Configuration Panel */}
      <div className="w-full md:w-1/3 space-y-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Share2 className="text-blue-400" /> Networking Hub
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Generate high-conversion cold emails and connection requests to boost your interview chances.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Target Job</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                <option value="">-- General Networking --</option>
                {relevantJobs.map(job => (
                  <option key={job.id} value={job.id}>{job.company} - {job.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Hiring Manager / Recruiter Name</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Sarah Jenkins"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
              />
            </div>

            <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
               <button 
                 onClick={() => setActiveTab('linkedin')}
                 className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'linkedin' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
               >
                 <Linkedin size={16} /> LinkedIn
               </button>
               <button 
                 onClick={() => setActiveTab('email')}
                 className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'email' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
               >
                 <Mail size={16} /> Cold Email
               </button>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              Generate Draft
            </button>
          </div>
        </div>
      </div>

      {/* Output Panel */}
      <div className="w-full md:w-2/3 bg-slate-900 rounded-xl border border-slate-800 p-6 relative">
        {!generatedMessage ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
            <Send size={64} className="mb-4" />
            <p className="text-lg">Ready to draft your message.</p>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
              <h3 className="font-semibold text-white">Generated Draft</h3>
              <button 
                onClick={() => navigator.clipboard.writeText(generatedMessage)}
                className="text-xs flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition-colors"
              >
                <Copy size={14} /> Copy to Clipboard
              </button>
            </div>
            <textarea 
              className="flex-1 bg-transparent text-slate-300 resize-none outline-none font-mono text-sm leading-relaxed"
              value={generatedMessage}
              onChange={(e) => setGeneratedMessage(e.target.value)}
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default NetworkingHub;
