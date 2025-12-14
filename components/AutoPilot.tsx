import React, { useEffect, useRef, memo } from 'react';
import { JobListing, UserProfile, AutomationLog } from '../types';
import { analyzeAndApply } from '../services/geminiService';
import { Play, Pause, Square, Terminal, ExternalLink, Loader2 } from 'lucide-react';

interface AutoPilotProps {
  jobs: JobListing[];
  setJobs: React.Dispatch<React.SetStateAction<JobListing[]>>;
  profile: UserProfile;
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
  logs: AutomationLog[];
  addLog: (msg: string, type?: AutomationLog['type']) => void;
  stats: { totalFound: number; applied: number; skipped: number };
  updateStats: (key: 'applied' | 'skipped') => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const AutoPilot: React.FC<AutoPilotProps> = memo(({ 
  jobs, setJobs, profile, isRunning, setIsRunning, logs, addLog, stats, updateStats, showToast
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Robust Effect-based Queue Processor
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const step = async () => {
       if (!isRunning) return;

       // Find first 'new' job
       const jobIndex = jobs.findIndex(j => j.status === 'new');
       
       if (jobIndex === -1) {
         // Check if any are analyzing (in flight)
         const analyzing = jobs.some(j => j.status === 'analyzing');
         if (!analyzing) {
            setIsRunning(false);
            addLog("Queue completed. Pausing AutoPilot.", 'success');
            showToast("AutoPilot Completed!", "success");
         }
         return;
       }

       const job = jobs[jobIndex];

       // 1. Mark as analyzing
       setJobs(prev => {
         const cp = [...prev];
         cp[jobIndex] = { ...job, status: 'analyzing' };
         return cp;
       });

       addLog(`Analyzing ${job.title} @ ${job.company}...`, 'info');

       try {
         // Rate limiting delay (10 seconds for Free Tier safety to avoid 429)
         await new Promise(r => setTimeout(r, 10000));

         // 2. Perform Analysis
         const analysis = await analyzeAndApply(job, profile);

         // 3. Finalize State
         setJobs(prev => {
            const cp = [...prev];
            // Find index again in case list changed (unlikely but safe)
            const idx = cp.findIndex(j => j.id === job.id);
            if (idx === -1) return prev;

            if (analysis.matchScore >= 60) {
                cp[idx] = {
                    ...cp[idx],
                    status: 'applied',
                    matchScore: analysis.matchScore,
                    generatedCoverLetter: analysis.coverLetter,
                    applicationNotes: analysis.notes
                };
            } else {
                cp[idx] = {
                    ...cp[idx],
                    status: 'skipped',
                    matchScore: analysis.matchScore,
                    applicationNotes: `Low Match: ${analysis.matchScore}%. ${analysis.notes}`
                };
            }
            return cp;
         });

         if (analysis.matchScore >= 60) {
             addLog(`✓ Matched ${job.company} (${analysis.matchScore}%)`, 'success');
             updateStats('applied');
         } else {
             addLog(`✕ Skipped ${job.company} (${analysis.matchScore}%)`, 'info');
             updateStats('skipped');
         }

       } catch (error) {
         console.error(error);
         setJobs(prev => {
            const cp = [...prev];
            const idx = cp.findIndex(j => j.id === job.id);
            if (idx !== -1) cp[idx] = { ...cp[idx], status: 'failed', applicationNotes: 'AI Error' };
            return cp;
         });
         addLog(`Error processing ${job.company}`, 'error');
       }
    };

    if (isRunning) {
        // Run loop
        timeoutId = setTimeout(step, 500);
    }

    return () => clearTimeout(timeoutId);
  }, [jobs, isRunning]); 

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto lg:overflow-hidden">
      
      {/* Control Panel */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Terminal size={20} className="text-purple-400"/> Control Center
          </h2>
          
          <div className="flex gap-4 mb-8">
             {!isRunning ? (
              <button 
                onClick={() => setIsRunning(true)}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
              >
                <Play size={20} fill="currentColor" /> Start AutoPilot
              </button>
             ) : (
              <button 
                onClick={() => setIsRunning(false)}
                className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-yellow-900/20"
              >
                <Pause size={20} fill="currentColor" /> Pause
              </button>
             )}
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900/50 p-4 rounded-lg flex justify-between">
              <span className="text-slate-400 text-sm">In Queue</span>
              <span className="text-xl font-mono text-white">{jobs.filter(j => j.status === 'new').length}</span>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg flex justify-between">
              <span className="text-slate-400 text-sm">Processed</span>
              <span className="text-xl font-mono text-blue-400">{stats.applied + stats.skipped}</span>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 flex flex-col h-[300px] lg:h-[400px] shadow-2xl font-mono text-sm">
          <div className="bg-slate-900 p-3 border-b border-slate-800 text-xs text-slate-500 uppercase tracking-widest">
            System Output
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex gap-3">
                <span className="text-slate-600 shrink-0">[{log.timestamp.toLocaleTimeString()}]</span>
                <span className={`break-words flex-1 ${
                  log.type === 'error' ? 'text-red-400' : 
                  log.type === 'success' ? 'text-green-400' : 
                  log.type === 'info' ? 'text-blue-300' : 'text-slate-300'
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
            {isRunning && <div className="animate-pulse text-blue-500">_</div>}
          </div>
        </div>
      </div>

      {/* Job Queue */}
      <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col h-[500px] lg:h-full overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur">
          <h3 className="font-semibold text-white">Application Queue</h3>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {jobs.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <Square className="mx-auto mb-4 opacity-20" size={48} />
              Queue empty.
            </div>
          )}
          {jobs.map(job => (
            <div key={job.id} className={`
              p-4 rounded-lg border transition-all duration-300
              ${job.status === 'analyzing' ? 'bg-blue-900/20 border-blue-500/50 scale-[1.01] shadow-lg ring-1 ring-blue-500/30' : ''}
              ${job.status === 'applied' ? 'bg-green-900/10 border-green-500/30' : ''}
              ${job.status === 'skipped' ? 'bg-slate-800/50 border-slate-700 opacity-60' : ''}
              ${job.status === 'new' ? 'bg-slate-800 border-slate-700' : ''}
              ${job.status === 'failed' ? 'bg-red-900/10 border-red-500/30' : ''}
            `}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-white">{job.title}</h4>
                  <p className="text-sm text-slate-400">{job.company}</p>
                </div>
                <div className="flex items-center gap-2">
                  {job.status === 'analyzing' && <Loader2 className="animate-spin text-blue-400" size={16}/>}
                  <span className={`text-xs px-2 py-1 rounded capitalize
                    ${job.status === 'analyzing' ? 'text-blue-300 bg-blue-900/40' : 
                      job.status === 'applied' ? 'text-green-300 bg-green-900/40' : 
                      'text-slate-400 bg-slate-700/50'}`
                  }>
                    {job.status}
                  </span>
                </div>
              </div>

              {job.matchScore !== undefined && (
                <div className="mt-2 text-xs flex gap-3 text-slate-300">
                   <span className={job.matchScore > 75 ? 'text-green-400' : 'text-yellow-400'}>
                     Match: {job.matchScore}%
                   </span>
                   <span>{job.applicationNotes}</span>
                </div>
              )}

              {job.status === 'applied' && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-2">
                   <button 
                     onClick={() => {
                        navigator.clipboard.writeText(job.generatedCoverLetter || '');
                        showToast("Cover Letter Copied!", "success");
                     }}
                     className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded"
                   >
                     Copy Cover Letter
                   </button>
                   <a 
                     href={job.url} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded flex items-center gap-1"
                   >
                     Finalize Application <ExternalLink size={12} />
                   </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default AutoPilot;