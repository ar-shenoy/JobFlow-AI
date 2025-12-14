import React, { useState, useEffect } from 'react';
import { AppState, View, UserProfile, JobListing, AutomationLog } from './types';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import JobSearch from './components/JobSearch';
import AutoPilot from './components/AutoPilot';
import InterviewPrep from './components/InterviewPrep';
import NetworkingHub from './components/NetworkingHub';
import SkillGap from './components/SkillGap';
import KanbanBoard from './components/KanbanBoard';
import ResumeOptimizer from './components/ResumeOptimizer';
import { LayoutDashboard, User, Search, PlayCircle, Bot, Menu, X, BrainCircuit, Share2, Rocket, AlertTriangle, LogOut, Kanban, FileText } from 'lucide-react';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-blue-600 border-blue-500'
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right`}>
      <span>{message}</span>
      <button onClick={onClose} className="hover:opacity-75"><X size={14}/></button>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  // Initialize with all fields to prevent crashes in Profile component
  const [profile, setProfile] = useState<UserProfile>({
    name: '', 
    email: '', 
    phone: '', 
    location: '', 
    experienceLevel: 'Entry Level', 
    targetRoles: [], 
    preferredRegions: [], 
    jobTypes: [], 
    remoteOnly: false, 
    workStyle: 'Remote', 
    salaryExpectation: '',
    matchThreshold: 60,
    visaSponsorship: false,
    noticePeriod: '', 
    linkedinUrl: '', 
    portfolioUrl: '', 
    education: '',
    resumeText: '', 
    skills: []
  });

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [isAutoPilotRunning, setIsAutoPilotRunning] = useState(false);
  const [stats, setStats] = useState({ totalFound: 0, applied: 0, skipped: 0 });

  // Load state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jobflow_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) {
          // Merge saved profile with default structure to ensure new fields exist
          setProfile(prev => ({ 
            ...prev, 
            ...parsed.profile,
            // Explicitly ensure arrays are not undefined if loading old data
            preferredRegions: parsed.profile.preferredRegions || [],
            jobTypes: parsed.profile.jobTypes || [],
            targetRoles: parsed.profile.targetRoles || [],
            skills: parsed.profile.skills || []
          }));
        }
        if (parsed.jobs) setJobs(parsed.jobs);
        if (parsed.logs) setLogs(parsed.logs.map((l: any) => ({...l, timestamp: new Date(l.timestamp)})));
      }
    } catch (e) { console.error("Load error", e); }
  }, []);

  // Save state
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('jobflow_state', JSON.stringify({ profile, jobs, logs: logs.slice(-50) }));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [profile, jobs, logs]);

  useEffect(() => {
    setStats({
      totalFound: jobs.length,
      applied: jobs.filter(j => j.status === 'applied').length,
      skipped: jobs.filter(j => j.status === 'skipped').length
    });
  }, [jobs]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ msg, type });
  const addLog = (message: string, type: AutomationLog['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Math.random().toString(36), timestamp: new Date(), message, type }]);
  };
  const addJobsToQueue = (newJobs: JobListing[]) => {
    setJobs(prev => {
      const existingIds = new Set(prev.map(j => j.url));
      const filtered = newJobs.filter(j => !existingIds.has(j.url));
      return [...prev, ...filtered];
    });
    addLog(`Added ${newJobs.length} new jobs to queue.`, 'info');
    showToast(`Added ${newJobs.length} jobs to AutoPilot`, 'success');
  };
  const updateStats = () => {};

  const handleReset = () => {
    if(confirm("Clear all data?")) {
      localStorage.removeItem('jobflow_state');
      window.location.reload();
    }
  };

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD: return <Dashboard profile={profile} stats={stats} recentJobs={[...jobs].reverse()} />;
      case View.PROFILE: return <Profile profile={profile} setProfile={setProfile} showToast={showToast} />;
      case View.SEARCH: return <JobSearch profile={profile} addJobsToQueue={addJobsToQueue} showToast={showToast} />;
      case View.AUTOPILOT: return <AutoPilot jobs={jobs} setJobs={setJobs} profile={profile} isRunning={isAutoPilotRunning} setIsRunning={setIsAutoPilotRunning} logs={logs} addLog={addLog} stats={stats} updateStats={updateStats} showToast={showToast} />;
      case View.KANBAN: return <KanbanBoard jobs={jobs} setJobs={setJobs} />;
      case View.OPTIMIZER: return <ResumeOptimizer profile={profile} jobs={jobs} />;
      case View.INTERVIEW: return <InterviewPrep jobs={jobs} setJobs={setJobs} profile={profile} />;
      case View.NETWORKING: return <NetworkingHub profile={profile} jobs={jobs} />;
      case View.SKILLS: return <SkillGap profile={profile} />;
      default: return <Dashboard profile={profile} stats={stats} recentJobs={jobs} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
              <Bot className="text-white" size={20} />
            </div>
            <span className="font-bold text-white text-lg">JobFlow</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><X size={20}/></button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: View.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
            { id: View.PROFILE, icon: User, label: 'Profile' },
            { id: View.SEARCH, icon: Search, label: 'Discovery' },
            { id: View.AUTOPILOT, icon: PlayCircle, label: 'AutoPilot', active: isAutoPilotRunning },
            { id: View.KANBAN, icon: Kanban, label: 'Pipeline', badge: 'NEW' },
            { id: View.OPTIMIZER, icon: FileText, label: 'Optimizer', badge: 'AI' },
            { id: View.INTERVIEW, icon: BrainCircuit, label: 'Interview Prep' },
            { id: View.NETWORKING, icon: Share2, label: 'Networking' },
            { id: View.SKILLS, icon: Rocket, label: 'Skill Gap' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                currentView === item.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={18} className={item.active ? "animate-pulse text-green-400" : ""} />
              <span className="font-medium">{item.label}</span>
              {item.badge && <span className="ml-auto text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button onClick={handleReset} className="w-full flex items-center gap-2 text-slate-500 hover:text-red-400 text-xs px-2 py-2 transition-colors">
              <LogOut size={14} /> Reset Data
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative">
        <div className="md:hidden flex items-center p-4 border-b border-slate-800 bg-slate-900">
          <button onClick={() => setIsSidebarOpen(true)} className="mr-4"><Menu size={24}/></button>
          <span className="font-bold text-white">JobFlow AI</span>
        </div>
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <div className="relative z-10 flex-1 overflow-auto scroll-smooth">
           {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;