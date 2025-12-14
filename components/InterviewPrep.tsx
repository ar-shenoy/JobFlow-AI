import React, { useState, useEffect } from 'react';
import { JobListing, UserProfile, InterviewQuestion } from '../types';
import { generateInterviewQuestions } from '../services/geminiService';
import { BrainCircuit, ChevronRight, Loader2, MessageSquare, BookOpen, Volume2 } from 'lucide-react';

interface InterviewPrepProps {
  jobs: JobListing[];
  setJobs: React.Dispatch<React.SetStateAction<JobListing[]>>;
  profile: UserProfile;
}

const InterviewPrep: React.FC<InterviewPrepProps> = ({ jobs, setJobs, profile }) => {
  // Initialize from local storage if available
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jobflow_interview_selected_job_id') || null;
    }
    return null;
  });
  
  const [isGenerating, setIsGenerating] = useState(false);

  // Persist selection changes
  useEffect(() => {
    if (selectedJobId) {
      localStorage.setItem('jobflow_interview_selected_job_id', selectedJobId);
    }
  }, [selectedJobId]);

  const appliedJobs = jobs.filter(j => j.status === 'applied');
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // If the persisted job ID is no longer valid (e.g. deleted or status changed), clear it
  useEffect(() => {
    if (selectedJobId && !jobs.find(j => j.id === selectedJobId && j.status === 'applied')) {
       // We don't auto-clear immediately to prevent flickering during loads, 
       // but the UI handles the 'undefined' selectedJob gracefully below.
    }
  }, [jobs, selectedJobId]);

  const handleGenerate = async (job: JobListing) => {
    setIsGenerating(true);
    try {
      const questions = await generateInterviewQuestions(job, profile);
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, interviewPrep: questions } : j));
    } catch (e) {
      console.error(e);
      alert("Failed to generate questions. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      // Try to select a decent English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-Speech is not supported in this browser.");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-full flex flex-col md:flex-row gap-6 pb-20 md:pb-6">
      
      {/* Sidebar: Job List */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <BrainCircuit className="text-purple-400" /> Interview Prep
          </h2>
          <p className="text-sm text-slate-400">Select an applied job to generate tailored interview questions.</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 max-h-[60vh] md:max-h-full">
          {appliedJobs.length === 0 && (
             <p className="text-slate-500 text-center py-10">No applications yet. Apply to jobs first!</p>
          )}
          {appliedJobs.map(job => (
            <button
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className={`w-full text-left p-4 rounded-lg border transition-all group ${
                selectedJobId === job.id 
                  ? 'bg-purple-900/20 border-purple-500/50' 
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex justify-between items-center">
                 <div>
                   <h3 className={`font-semibold ${selectedJobId === job.id ? 'text-purple-200' : 'text-white'}`}>{job.company}</h3>
                   <p className="text-xs text-slate-400">{job.title}</p>
                 </div>
                 {job.interviewPrep ? (
                   <BookOpen size={16} className="text-green-400" />
                 ) : (
                   <ChevronRight size={16} className="text-slate-500 group-hover:text-white" />
                 )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Questions */}
      <div className="w-full md:w-2/3 bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col">
        {!selectedJob ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>Select a job from the left to start preparing.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedJob.title}</h2>
                <p className="text-purple-400">{selectedJob.company}</p>
              </div>
              {!selectedJob.interviewPrep && (
                <button
                  onClick={() => handleGenerate(selectedJob)}
                  disabled={isGenerating}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/30"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : <BrainCircuit size={18} />}
                  Generate AI Prep
                </button>
              )}
            </div>

            {isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                 <Loader2 size={48} className="text-purple-500 animate-spin" />
                 <p className="text-slate-400 animate-pulse">Analyzing job description & resume...</p>
              </div>
            )}

            {!isGenerating && selectedJob.interviewPrep && (
              <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2">
                {selectedJob.interviewPrep.map((q, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
                    <div className="flex justify-between items-start mb-3 gap-3">
                       <h4 className="text-lg font-semibold text-white flex-1">
                        <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded inline-block mr-2 align-middle">Q{idx + 1}</span>
                        {q.question}
                       </h4>
                       <button 
                         onClick={() => handleSpeak(q.question)}
                         className="p-2 bg-slate-700 hover:bg-blue-600 rounded-full text-slate-300 hover:text-white transition-colors"
                         title="Read Aloud"
                       >
                         <Volume2 size={16} />
                       </button>
                    </div>
                    
                    <div className="space-y-4 pl-0 md:pl-2">
                       <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Suggested Answer Approach</p>
                          <p className="text-slate-300 text-sm leading-relaxed">{q.suggestedAnswer}</p>
                       </div>
                       
                       <div>
                         <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Key Talking Points</p>
                         <div className="flex flex-wrap gap-2">
                            {q.keyPoints.map((point, k) => (
                              <span key={k} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-md border border-slate-600">
                                {point}
                              </span>
                            ))}
                         </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewPrep;
