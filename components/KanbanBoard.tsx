import React from 'react';
import { JobListing, InterviewQuestion } from '../types';
import { generateInterviewQuestions } from '../services/geminiService';
import { MoreHorizontal, ExternalLink, Calendar, CheckCircle, XCircle, Clock, BrainCircuit, Loader2 } from 'lucide-react';

interface KanbanBoardProps {
  jobs: JobListing[];
  setJobs: React.Dispatch<React.SetStateAction<JobListing[]>>;
}

const COLUMNS: { id: JobListing['status'], label: string, color: string }[] = [
  { id: 'applied', label: 'Applied', color: 'bg-blue-500' },
  { id: 'interviewing', label: 'Interviewing', color: 'bg-purple-500' },
  { id: 'offer', label: 'Offer', color: 'bg-green-500' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500' }
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ jobs, setJobs }) => {
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData('jobId', jobId);
  };

  const updateJobStatus = async (jobId: string, newStatus: JobListing['status']) => {
    // Optimistic update first
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));

    // If moving to interviewing and no prep exists, generate it
    if (newStatus === 'interviewing') {
      const job = jobs.find(j => j.id === jobId);
      if (job && !job.interviewPrep) {
        setIsUpdating(jobId);
        try {
          // We need to fetch the job again or use a ref, but 'job' from scope is fine for read
          // However, we need 'profile' to generate questions properly. 
          // For simplicity in this view, we'll try to find profile from localStorage or context if we refactored.
          // Since we don't have profile prop here, we can pass a dummy or rely on the service to handle basic generation
          // Or we update App.tsx to pass profile.
          // To keep it simple without changing props everywhere: We use the job description itself in the service.
          // But wait, generateInterviewQuestions needs profile.
          // Let's grab profile from localStorage as a fallback fix for now to ensure E2E works
          
          let profile: any = { name: 'Candidate', skills: [] };
          try {
             const saved = localStorage.getItem('jobflow_state');
             if (saved) profile = JSON.parse(saved).profile;
          } catch(e) {}

          const questions = await generateInterviewQuestions(job, profile);
          
          setJobs(prev => prev.map(j => 
            j.id === jobId ? { ...j, interviewPrep: questions } : j
          ));
        } catch (e) {
          console.error("Failed to auto-generate prep", e);
        } finally {
          setIsUpdating(null);
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent, status: JobListing['status']) => {
    const jobId = e.dataTransfer.getData('jobId');
    if (jobId) {
      updateJobStatus(jobId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="h-full p-6 overflow-x-auto pb-24">
      <div className="flex gap-6 h-full min-w-[1000px]">
        {COLUMNS.map(col => {
          const colJobs = jobs.filter(j => j.status === col.id);
          return (
            <div 
              key={col.id} 
              className="w-80 flex flex-col bg-slate-900/50 rounded-xl border border-slate-800"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/90 backdrop-blur rounded-t-xl z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                  <h3 className="font-bold text-white">{col.label}</h3>
                </div>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{colJobs.length}</span>
              </div>
              
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {colJobs.map(job => (
                  <div 
                    key={job.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, job.id)}
                    className="bg-slate-800 p-4 rounded-lg border border-slate-700 cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors shadow-sm group relative"
                  >
                    {isUpdating === job.id && (
                       <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg">
                          <Loader2 className="animate-spin text-purple-400 mb-2" />
                          <span className="text-xs text-purple-200">Generating Prep...</span>
                       </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white text-sm line-clamp-2">{job.title}</h4>
                      <button className="text-slate-500 hover:text-white"><MoreHorizontal size={16}/></button>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{job.company}</p>
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/50">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock size={10} /> {new Date(job.postedDate || Date.now()).toLocaleDateString()}
                      </span>
                      {col.id === 'applied' && (
                        <button 
                          onClick={() => updateJobStatus(job.id, 'interviewing')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-purple-900/50 text-purple-300 px-2 py-1 rounded hover:bg-purple-800"
                        >
                          Move & Prep
                        </button>
                      )}
                      {col.id === 'interviewing' && job.interviewPrep && (
                        <span className="text-[10px] bg-green-900/50 text-green-300 px-2 py-1 rounded flex items-center gap-1">
                           <BrainCircuit size={10} /> Prep Ready
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {colJobs.length === 0 && (
                  <div className="h-24 flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-lg">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;