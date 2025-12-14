import React, { useState, useEffect } from 'react';
import { UserProfile, JobListing } from '../types';
import { generateNetworkingMessage } from '../services/geminiService';
import { Share2, Mail, Linkedin, Copy, Loader2, Send, Sparkles, Lightbulb, Users, Target } from 'lucide-react';

interface NetworkingHubProps {
  profile: UserProfile;
  jobs: JobListing[];
}

const STRATEGIES = [
  { id: 'direct', label: 'Direct Value Add', desc: 'Highlight a specific problem you can solve for them immediately.' },
  { id: 'alumni', label: 'Alumni / Shared Connection', desc: 'Leverage a shared school, past company, or mutual friend.' },
  { id: 'curiosity', label: 'Genuine Curiosity', desc: 'Ask a thoughtful question about their recent team projects.' },
  { id: 'culture', label: 'Culture Fit', desc: 'Focus on shared values and mission alignment.' },
];

const PRO_TIPS = [
  "Send requests between 8 AM - 10 AM on Tue/Wed/Thu.",
  "Never ask for a job directly in the first message.",
  "Keep the message under 75 words (mobile friendly).",
  "Follow up exactly once after 3 business days."
];

const NetworkingHub: React.FC<NetworkingHubProps> = ({ profile, jobs }) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(() => localStorage.getItem('jobflow_networking_selected_job_id') || '');
  const [targetName, setTargetName] = useState(() => localStorage.getItem('jobflow_networking_target_name') || '');
  const [activeTab, setActiveTab] = useState<'linkedin' | 'email'>(() => {
    const saved = localStorage.getItem('jobflow_networking_active_tab');
    return (saved === 'linkedin' || saved === 'email') ? saved : 'linkedin';
  });
  const [strategy, setStrategy] = useState('direct');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => { localStorage.setItem('jobflow_networking_selected_job_id', selectedJobId); }, [selectedJobId]);
  useEffect(() => { localStorage.setItem('jobflow_networking_target_name', targetName); }, [targetName]);
  useEffect(() => { localStorage.setItem('jobflow_networking_active_tab', activeTab); }, [activeTab]);

  const relevantJobs = jobs.filter(j => j.status !== 'skipped' && j.status !== 'failed');

  const handleGenerate = async () => {
    const job = jobs.find(j => j.id === selectedJobId);
    if (!job && !targetName) {
      alert("Please select a job or enter a target name.");
      return;
    }

    setIsGenerating(true);
    try {
      // We pass the strategy as part of the "type" parameter to the service prompt
      const msg = await generateNetworkingMessage(
        `${activeTab} message using the '${STRATEGIES.find(s => s.id === strategy)?.label}' strategy`,
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-full flex flex-col lg:flex-row gap-6 pb-20 md:pb-6">
      
      {/* Configuration Panel */}
      <div className="w-full lg:w-1/3 space-y-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Share2 className="text-blue-400" /> Outreach Generator
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Craft high-conversion connection requests.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Target Job</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                <option value="">-- General / No Specific Job --</option>
                {relevantJobs.map(job => (
                  <option key={job.id} value={job.id}>{job.company} - {job.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Recipient Name</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Hiring Manager"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Platform</label>
              <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button 
                  onClick={() => setActiveTab('linkedin')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'linkedin' ? 'bg-[#0077b5] text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  <Linkedin size={16} /> LinkedIn
                </button>
                <button 
                  onClick={() => setActiveTab('email')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === 'email' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  <Mail size={16} /> Email
                </button>
              </div>
            </div>

            <div>
               <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Strategy</label>
               <div className="space-y-2">
                 {STRATEGIES.map(s => (
                   <div 
                     key={s.id}
                     onClick={() => setStrategy(s.id)}
                     className={`p-3 rounded-lg border cursor-pointer transition-all ${strategy === s.id ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                   >
                     <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-bold ${strategy === s.id ? 'text-blue-300' : 'text-slate-300'}`}>{s.label}</span>
                        {strategy === s.id && <Target size={14} className="text-blue-400"/>}
                     </div>
                     <p className="text-xs text-slate-500">{s.desc}</p>
                   </div>
                 ))}
               </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 mt-4"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              Generate Draft
            </button>
          </div>
        </div>
      </div>

      {/* Output & Tips */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        {/* Output */}
        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-6 relative min-h-[300px]">
          {!generatedMessage ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
              <Send size={64} className="mb-4" />
              <p className="text-lg">Select a strategy to draft your message.</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
                <h3 className="font-semibold text-white">Draft Message</h3>
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedMessage)}
                  className="text-xs flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-300 transition-colors border border-slate-700"
                >
                  <Copy size={14} /> Copy
                </button>
              </div>
              <textarea 
                className="flex-1 bg-transparent text-slate-300 resize-none outline-none font-mono text-sm leading-relaxed p-2"
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Pro Tips Panel */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-5">
           <h3 className="font-bold text-white mb-3 flex items-center gap-2">
             <Lightbulb className="text-yellow-500" size={18} /> Networking Pro Tips
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             {PRO_TIPS.map((tip, i) => (
               <div key={i} className="flex gap-2 items-start text-sm text-slate-400">
                 <div className="min-w-[4px] h-[4px] rounded-full bg-blue-500 mt-2"></div>
                 {tip}
               </div>
             ))}
           </div>
        </div>
      </div>

    </div>
  );
};

export default NetworkingHub;