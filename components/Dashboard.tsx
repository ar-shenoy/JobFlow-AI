import React, { memo } from 'react';
import { UserProfile, JobListing } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity, Target, Briefcase, Zap, Download } from 'lucide-react';

interface DashboardProps {
  profile: UserProfile;
  stats: { totalFound: number; applied: number; skipped: number };
  recentJobs: JobListing[];
}

const Dashboard: React.FC<DashboardProps> = memo(({ profile, stats, recentJobs }) => {
  
  const data = [
    { name: 'Applied', value: stats.applied, color: '#4ade80' },
    { name: 'Skipped', value: stats.skipped, color: '#64748b' },
    { name: 'Pending', value: stats.totalFound - stats.applied - stats.skipped, color: '#3b82f6' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-2 rounded shadow-lg">
          <p className="text-white">{`${payload[0].name}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  const exportToCSV = () => {
    const headers = ['Company', 'Title', 'Location', 'Status', 'Match Score', 'Date'];
    const rows = recentJobs.map(job => [
      job.company.replace(/,/g, ''),
      job.title.replace(/,/g, ''),
      job.location.replace(/,/g, ''),
      job.status,
      job.matchScore || 0,
      new Date(job.postedDate || Date.now()).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "jobflow_applications.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Welcome back, {profile.name || 'Candidate'}</h1>
          <p className="text-slate-400 text-sm md:text-base">Your automated job application system is online and ready.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <Download size={16} /> Export Report
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-xs md:text-sm">Total Jobs Found</p>
              <h3 className="text-2xl md:text-3xl font-bold text-white">{stats.totalFound}</h3>
            </div>
            <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
              <Briefcase size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-xs md:text-sm">Applications Ready</p>
              <h3 className="text-2xl md:text-3xl font-bold text-green-400">{stats.applied}</h3>
            </div>
            <div className="bg-green-500/20 p-2 rounded-lg text-green-400">
              <Target size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-xs md:text-sm">Efficiency Rate</p>
              <h3 className="text-2xl md:text-3xl font-bold text-purple-400">
                {stats.totalFound > 0 ? Math.round((stats.applied / stats.totalFound) * 100) : 0}%
              </h3>
            </div>
            <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
              <Zap size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-xs md:text-sm">System Status</p>
              <h3 className="text-2xl md:text-3xl font-bold text-blue-300">Active</h3>
            </div>
            <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
              <Activity size={20} className="md:w-6 md:h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700 min-h-[300px]">
          <h3 className="text-lg font-semibold text-white mb-6">Application Metrics</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700 min-h-[300px] overflow-hidden">
          <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentJobs.slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    job.status === 'applied' ? 'bg-green-500' : 
                    job.status === 'skipped' ? 'bg-slate-500' : 'bg-blue-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{job.title}</p>
                    <p className="text-xs text-slate-400 truncate">{job.company}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500 capitalize shrink-0 ml-2">{job.status}</span>
              </div>
            ))}
            {recentJobs.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-10">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;
