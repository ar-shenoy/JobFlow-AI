import React, { useState, useEffect } from 'react';
import { AppState, View, UserProfile, JobListing, AutomationLog } from './types';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import JobSearch from './components/JobSearch';
import AutoPilot from './components/AutoPilot';
import InterviewPrep from './components/InterviewPrep';
import NetworkingHub from './components/NetworkingHub';
import SkillGap from './components/SkillGap';
import { LayoutDashboard, User, Search, PlayCircle, Bot, Menu, X, BrainCircuit, Share2, Rocket, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // App State
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    experienceLevel: 'Entry',
    targetRoles: [],
    locations: [],
    resumeText: '',
    skills: []
  });

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [isAutoPilotRunning, setIsAutoPilotRunning] = useState(false);
  const [stats, setStats] = useState({ totalFound: 0, applied: 0, skipped: 0 });

  // API Key Check
  const apiKey = process.env.API_KEY;
  const isKeyMissing = !apiKey || apiKey === "undefined" || apiKey.includes("your_key");

  // Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jobflow_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.jobs) setJobs(parsed.jobs);
        if (parsed.logs) setLogs(parsed.logs.map((l: any) => ({...l, timestamp: new Date(l.timestamp)})));
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('jobflow_state', JSON.stringify({ profile, jobs, logs: logs.slice(-50) })); // Keep last 50 logs only to save space
    }, 1000);
    return () => clearTimeout(timeout);
  }, [profile, jobs, logs]);

  // Update stats whenever job list changes
  useEffect(() => {
    setStats({
      totalFound: jobs.length,
      applied: jobs.filter(j => j.status === 'applied').length,
      skipped: jobs.filter(j => j.status === 'skipped').length
    });
  }, [jobs]);

  const addLog = (message: string, type: AutomationLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36),
      timestamp: new Date(),
      message,
      type
    }]);
  };

  const addJobsToQueue = (newJobs: JobListing[]) => {
    setJobs(prev => {
      // Dedup based on URL or title+company
      const existingIds = new Set(prev.map(j => j.url));
      const filtered = newJobs.filter(j => !existingIds.has(j.url));
      return [...prev, ...filtered];
    });
    addLog(`Added ${newJobs.length} new jobs to the automation queue.`, 'info');
  };

  const updateStats = (key: 'applied' | 'skipped') => {
    // handled by effect
  };

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard profile={profile} stats={stats} recentJobs={[...jobs].reverse()} />;
      case View.PROFILE:
        return <Profile profile={profile} setProfile={setProfile} />;
      case View.SEARCH:
        return <JobSearch profile={profile} addJobsToQueue={addJobsToQueue} />;
      case View.AUTOPILOT:
        return (
          <AutoPilot 
            jobs={jobs} 
            setJobs={setJobs} 
            profile={profile}
            isRunning={isAutoPilotRunning}
            setIsRunning={setIsAutoPilotRunning}
            logs={logs}
            addLog={addLog}
            stats={stats}
            updateStats={updateStats}
          />
        );
      case View.INTERVIEW:
        return <InterviewPrep jobs={jobs} setJobs={setJobs} profile={profile} />;
      case View.NETWORKING:
        return <NetworkingHub profile={profile} jobs={jobs} />;
      case View.SKILLS:
        return <SkillGap profile={profile} />;
      default:
        return <Dashboard profile={profile} stats={stats} recentJobs={jobs} />;
    }
  };

  // Block rendering if API Key is missing
  if (isKeyMissing) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl text-center space-y-6">
           <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
             <AlertTriangle className="text-red-500" size={32} />
           </div>
           <div>
             <h1 className="text-2xl font-bold mb-2">Configuration Missing</h1>
             <p className="text-slate-400">The application cannot start because the <code className="text-blue-400 font-mono">API_KEY</code> is missing.</p>
           </div>
           
           <div className="text-left bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm space-y-3 font-mono">
              <p className="text-slate-500">How to fix:</p>
              <div>
                <strong className="text-slate-300 block">Option 1: Local Development</strong>
                <span className="text-slate-500">Create a </span><span className="text-yellow-400">.env</span><span className="text-slate-500"> file in the root folder:</span>
                <div className="bg-black/50 p-2 mt-1 rounded text-green-400">API_KEY=your_key_here</div>
              </div>
              <div>
                <strong className="text-slate-300 block">Option 2: Vercel / Cloud</strong>
                <span className="text-slate-500">Go to Settings &gt; Environment Variables and add </span>
                <span className="text-blue-400">API_KEY</span>.
              </div>
           </div>
           
           <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors w-full">
             Refresh App
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:z-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Bot className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-tight">JobFlow AI</h1>
              <span className="text-xs text-blue-400 font-mono">v2.0.0</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavButton 
            active={currentView === View.DASHBOARD} 
            onClick={() => { setCurrentView(View.DASHBOARD); setIsSidebarOpen(false); }} 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
          />
          <NavButton 
            active={currentView === View.PROFILE} 
            onClick={() => { setCurrentView(View.PROFILE); setIsSidebarOpen(false); }} 
            icon={<User size={20} />} 
            label="Profile & CV" 
          />
          <NavButton 
            active={currentView === View.SEARCH} 
            onClick={() => { setCurrentView(View.SEARCH); setIsSidebarOpen(false); }} 
            icon={<Search size={20} />} 
            label="Job Discovery" 
          />
          <NavButton 
            active={currentView === View.AUTOPILOT} 
            onClick={() => { setCurrentView(View.AUTOPILOT); setIsSidebarOpen(false); }} 
            icon={<PlayCircle size={20} />} 
            label="AutoPilot" 
            badge={isAutoPilotRunning ? 'ON' : undefined}
          />
          <NavButton 
            active={currentView === View.INTERVIEW} 
            onClick={() => { setCurrentView(View.INTERVIEW); setIsSidebarOpen(false); }} 
            icon={<BrainCircuit size={20} />} 
            label="Interview Prep" 
          />
          <NavButton 
            active={currentView === View.NETWORKING} 
            onClick={() => { setCurrentView(View.NETWORKING); setIsSidebarOpen(false); }} 
            icon={<Share2 size={20} />} 
            label="Networking Hub" 
          />
          <NavButton 
            active={currentView === View.SKILLS} 
            onClick={() => { setCurrentView(View.SKILLS); setIsSidebarOpen(false); }} 
            icon={<Rocket size={20} />} 
            label="Skills & Learning" 
            badge="NEW"
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400">
            <p className="font-semibold text-white mb-1">Status: Online</p>
            <p>System Optimized</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full w-full relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b border-slate-800 bg-slate-900">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-200 mr-4">
            <Menu size={24} />
          </button>
          <span className="font-bold text-white">JobFlow AI</span>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #3b82f6 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>

        <div className="relative z-10 flex-1 overflow-auto">
           {renderView()}
        </div>
      </main>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    {badge && (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge === 'NEW' ? 'bg-purple-500 text-white' : 'bg-green-500 text-white animate-pulse'}`}>
        {badge}
      </span>
    )}
  </button>
);

export default App;