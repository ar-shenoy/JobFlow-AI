import React, { useState } from 'react';
import { UserProfile, JobListing, ResumeOptimization } from '../types';
import { analyzeResumeForJob } from '../services/geminiService';
import { FileText, CheckCircle, AlertTriangle, Wand2, Loader2, ArrowRight, Zap } from 'lucide-react';

interface ResumeOptimizerProps {
  profile: UserProfile;
  jobs: JobListing[];
}

const ResumeOptimizer: React.FC<ResumeOptimizerProps> = ({ profile, jobs }) => {
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [analysis, setAnalysis] = useState<ResumeOptimization | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleOptimize = async () => {
    const job = jobs.find(j => j.id === selectedJobId);
    if (!job || !profile.resumeText) {
        alert("Please upload a resume in Profile and select a job.");
        return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeResumeForJob(job, profile);
      setAnalysis(result);
    } catch (e) {
      alert("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const relevantJobs = jobs.filter(j => j.status !== 'skipped' && j.status !== 'failed');

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 h-full">
      <div className="mb-8 border-b border-slate-700 pb-6">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <FileText className="text-pink-500" /> Resume Optimizer
        </h1>
        <p className="text-slate-400">Tailor your resume for a specific job to pass ATS filters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
             <label className="text-sm font-medium text-slate-300 block mb-3">Select Target Job</label>
             <select 
               className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white outline-none mb-4"
               value={selectedJobId}
               onChange={(e) => setSelectedJobId(e.target.value)}
             >
               <option value="">-- Choose Job --</option>
               {relevantJobs.map(j => (
                 <option key={j.id} value={j.id}>{j.company} - {j.title}</option>
               ))}
             </select>
             
             <button
               onClick={handleOptimize}
               disabled={!selectedJobId || isAnalyzing}
               className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-pink-900/20"
             >
               {isAnalyzing ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
               Analyze Resume Fit
             </button>
          </div>

          {analysis && (
             <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center animate-in fade-in zoom-in">
                <div className="relative inline-flex items-center justify-center mb-4">
                   <svg className="transform -rotate-90 w-32 h-32">
                      <circle cx="64" cy="64" r="60" stroke="#334155" strokeWidth="8" fill="transparent" />
                      <circle cx="64" cy="64" r="60" stroke={analysis.score > 70 ? "#10b981" : "#eab308"} strokeWidth="8" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * analysis.score) / 100} className="transition-all duration-1000 ease-out" />
                   </svg>
                   <span className="absolute text-3xl font-bold text-white">{analysis.score}</span>
                </div>
                <p className="text-slate-400 font-medium">ATS Compatibility</p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-900/50 py-2 rounded">
                    <Zap size={12} className={analysis.missingKeywords.length > 5 ? 'text-yellow-500' : 'text-green-500'} />
                    {analysis.missingKeywords.length > 5 ? 'High Optimization Needed' : 'Strong Match'}
                </div>
             </div>
          )}
        </div>

        <div className="lg:col-span-2">
           {!analysis ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed min-h-[400px]">
               <FileText size={48} className="mb-4 opacity-20" />
               <p>Select a job to see optimization insights.</p>
             </div>
           ) : (
             <div className="space-y-6 animate-in slide-in-from-bottom-4">
                {/* Missing Keywords */}
                <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-white flex items-center gap-2">
                         <AlertTriangle size={18} className="text-yellow-500" /> Missing Keywords
                       </h3>
                       <span className="text-xs text-slate-500">Based on Job Description</span>
                   </div>
                   
                   <div className="flex flex-wrap gap-2">
                      {analysis.missingKeywords.length > 0 ? analysis.missingKeywords.map((kw, i) => (
                        <span key={i} className="bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 px-3 py-1.5 rounded-full text-sm font-mono">
                          {kw}
                        </span>
                      )) : <span className="text-green-400 text-sm flex items-center gap-2"><CheckCircle size={14}/> Great job! No major keywords missing.</span>}
                   </div>
                   {analysis.missingKeywords.length > 0 && (
                       <p className="text-xs text-slate-500 mt-4 italic">
                           Tip: Include these exact terms in your skills or experience section.
                       </p>
                   )}
                </div>

                {/* Improvements */}
                <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl">
                   <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                     <CheckCircle size={18} className="text-blue-500" /> Actionable Improvements
                   </h3>
                   <ul className="space-y-3">
                      {analysis.suggestedImprovements.map((imp, i) => (
                        <li key={i} className="flex gap-3 text-slate-300 text-sm bg-slate-800 p-3 rounded-lg border border-slate-700/50">
                           <ArrowRight size={16} className="shrink-0 text-blue-400 mt-0.5" />
                           {imp}
                        </li>
                      ))}
                   </ul>
                </div>

                {/* Optimized Summary */}
                <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <Wand2 size={18} className="text-purple-500" /> Tailored Professional Summary
                      </h3>
                      <button 
                        onClick={() => navigator.clipboard.writeText(analysis.optimizedSummary)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded border border-slate-700 transition-colors"
                      >
                        Copy
                      </button>
                   </div>
                   <div className="bg-slate-800 p-4 rounded-lg text-sm text-slate-300 italic leading-relaxed border-l-4 border-purple-500">
                      "{analysis.optimizedSummary}"
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ResumeOptimizer;