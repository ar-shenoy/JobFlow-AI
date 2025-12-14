import React, { useEffect, useRef, memo } from 'react';
import { JobListing, UserProfile, AutomationLog } from '../types';
import { analyzeAndApply } from '../services/geminiService';
import { Play, Pause, Square, Terminal, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';

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
}

const AutoPilot: React.FC<AutoPilotProps> = memo(({ 
  jobs, setJobs, profile, isRunning, setIsRunning, logs, addLog, stats, updateStats
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Main Automation Loop
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const processNextJob = async () => {
      if (!isRunning) return;

      const jobIndex = jobs.findIndex(j => j.status === 'new');
      
      if (jobIndex === -1) {
        setIsRunning(false);
        addLog("Queue empty. Automation paused.", 'info');
        return;
      }

      const job = jobs[jobIndex];
      
      // Update status to analyzing
      setJobs(prev => {
        const newJobs = [...prev];
        newJobs[jobIndex] = { ...job, status: 'analyzing' };
        return newJobs;
      });
      addLog(`Analyzing fit for ${job.title} at ${job.company}...`, 'info');

      try {
        // Artificial delay for realism/rate-limiting simulation
        await new Promise(r => setTimeout(r, 1500));

        const analysis = await analyzeAndApply(job, profile);

        if (analysis.matchScore < 60) {
           setJobs(prev => {
            const newJobs = [...prev];
            newJobs[jobIndex] = { 
              ...job, 
              status: 'skipped', 
              matchScore: analysis.matchScore,
              applicationNotes: `Skipped: Low match score (${analysis.matchScore}%). ${analysis.notes}`
            };
            return newJobs;
          });
          updateStats('skipped');
          addLog(`Skipped ${job.company}: Low match (${analysis.matchScore}%)`, 'info');
        } else {
           setJobs(prev => {
            const newJobs = [...prev];
            newJobs[jobIndex] = { 
              ...job, 
              status: 'applied', 
              matchScore: analysis.matchScore,
              generatedCoverLetter: analysis.coverLetter,
              applicationNotes: `Ready: ${analysis.notes}`
            };
            return newJobs;
          });
          updateStats('applied');
          addLog(`SUCCESS: Generated application for ${job.company} (${analysis.matchScore}% Match)`, 'success');
        }

      } catch (error) {
        setJobs(prev => {
            const newJobs = [...prev];
            newJobs[jobIndex] = { ...job, status: 'failed', applicationNotes: 'AI Service Error' };
            return newJobs;
          });
        addLog(`Error processing ${job.company}`, 'error');
      }

      // Schedule next iteration
      timeout = setTimeout(processNextJob, 2000);
    };

    if (isRunning) {
      processNextJob();
    }

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, jobs]); // Dependencies managed carefully to avoid loops, processing logic relies on state

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full p-4 md:p-6 animate-in fade-in zoom-in duration-300 pb-20 md:pb-6 overflow-y-auto lg:overflow-hidden">
      
      {/* Left Panel: Control & Stats */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Terminal size={20} className="text-purple-400"/> Control Center
          </h2>
          
          <div className="flex gap-4 mb-8">
             {!isRunning ? (
              <button 
                onClick={() => setIsRunning(true)}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"
              >
                <Play size={20} fill="currentColor" /> Start AutoPilot
              </button>
             ) : (
              <button 
                onClick={() => setIsRunning(false)}
                className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-900/20"
              >
                <Pause size={20} fill="currentColor" /> Pause
              </button>
             )}
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900/50 p-4 rounded-lg flex justify-between items-center border border-slate-700">
              <span className="text-slate-400 text-sm">Total in Queue</span>
              <span className="text-xl font-mono text-white">{jobs.length}</span>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg flex justify-between items-center border border-slate-700">
              <span className="text-slate-400 text-sm">Processed</span>
              <span className="text-xl font-mono text-blue-400">{stats.applied + stats.skipped}</span>
            </div>
             <div className="bg-slate-900/50 p-4 rounded-lg flex justify-between items-center border border-slate-700">
              <span className="text-slate-400 text-sm">Success Rate</span>
              <span className="text-xl font-mono text-green-400">
                {stats.applied + stats.skipped > 0 
                  ? Math.round((stats.applied / (stats.applied + stats.skipped)) * 100) 
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* System Logs */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 flex flex-col h-[300px] lg:h-[400px] overflow-hidden shadow-2xl font-mono text-sm">
          <div className="bg-slate-900 p-3 border-b border-slate-800 flex items-center gap-2 text-xs text-slate-500 uppercase tracking-widest">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            System Output
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex gap-3">
                <span className="text-slate-600 shrink-0">[{log.timestamp.toLocaleTimeString()}]</span>
                <span className={`break-words flex-1
                  ${log.type === 'error' ? 'text-red-400' : ''}
                  ${log.type === 'success' ? 'text-green-400' : ''}
                  ${log.type === 'info' ? 'text-blue-300' : ''}
                  ${log.type === 'action' ? 'text-yellow-300' : ''}
                `}>
                  {log.type === 'success' && '✓ '}
                  {log.type === 'error' && '✕ '}
                  {log.message}
                </span>
              </div>
            ))}
            {logs.length === 0 && <span className="text-slate-600 italic">Ready to initialize...</span>}
            {isRunning && <div className="animate-pulse text-blue-500">_</div>}
          </div>
        </div>
      </div>

      {/* Right Panel: Job Queue visualization */}
      <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col h-[500px] lg:h-full overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur sticky top-0 z-10">
          <h3 className="font-semibold text-white">Application Queue</h3>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {jobs.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <Square className="mx-auto mb-4 opacity-20" size={48} />
              No jobs in queue. Go to Search to find jobs.
            </div>
          )}
          {jobs.map(job => (
            <div key={job.id} className={`
              group relative p-4 rounded-lg border transition-all duration-300
              ${job.status === 'analyzing' ? 'bg-blue-900/20 border-blue-500/50 scale-[1.02] shadow-lg' : ''}
              ${job.status === 'applied' ? 'bg-green-900/10 border-green-500/30 opacity-75' : ''}
              ${job.status === 'skipped' ? 'bg-slate-800 border-slate-700 opacity-50' : ''}
              ${job.status === 'new' ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : ''}
            `}>
              <div className="flex flex-col md:flex-row justify-between items-start gap-2">
                <div>
                  <h4 className="font-semibold text-white">{job.title}</h4>
                  <p className="text-sm text-slate-400">{job.company} • {job.location}</p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                  {job.status === 'analyzing' && <Loader2Spinner />}
                  {job.status === 'applied' && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Ready</span>}
                  {job.status === 'skipped' && <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">Skipped</span>}
                  {job.status === 'new' && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Queued</span>}
                </div>
              </div>
              
              {job.matchScore !== undefined && (
                <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs">
                  <span className={`font-mono ${job.matchScore > 75 ? 'text-green-400' : 'text-yellow-400'}`}>
                    Match: {job.matchScore}%
                  </span>
                  <span className="text-slate-500 truncate max-w-full md:max-w-md">{job.applicationNotes}</span>
                </div>
              )}

              {/* Collapsible details for applied jobs */}
              {job.status === 'applied' && job.generatedCoverLetter && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                   <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">AI Generated Output</p>
                   <div className="flex flex-wrap gap-2">
                     <button 
                       onClick={() => navigator.clipboard.writeText(job.generatedCoverLetter!)}
                       className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors"
                     >
                       Copy Cover Letter
                     </button>
                     <a 
                       href={job.url} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                     >
                       Finalize Application <ExternalLink size={12} />
                     </a>
                   </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const Loader2Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default AutoPilot;
