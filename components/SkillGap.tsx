import React, { useState } from 'react';
import { UserProfile, SkillGapAnalysis } from '../types';
import { analyzeSkillGap } from '../services/geminiService';
import { Brain, Rocket, BookOpen, Loader2, Target, CheckCircle } from 'lucide-react';

interface SkillGapProps {
  profile: UserProfile;
}

const SkillGap: React.FC<SkillGapProps> = ({ profile }) => {
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!profile.resumeText || profile.targetRoles.length === 0) {
      alert("Please update your profile with a resume and target roles first.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeSkillGap(profile);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
      alert("Failed to analyze skills. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto h-full pb-20 md:pb-6">
      <div className="mb-8 border-b border-slate-700 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Rocket className="text-orange-500" /> Career Accelerator
          </h1>
          <p className="text-slate-400">
            Identify critical missing skills and get a personalized learning path to land your dream role.
          </p>
        </div>
        <button 
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-900/30"
        >
          {isAnalyzing ? <Loader2 className="animate-spin" /> : <Brain size={20} />}
          {analysis ? 'Re-Analyze Profile' : 'Analyze Skill Gaps'}
        </button>
      </div>

      {!analysis && !isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
          <Target size={64} className="text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-300">Ready to level up?</h3>
          <p className="text-slate-500 max-w-md mt-2">
            Our AI will compare your profile against industry standards for 
            <span className="text-blue-400 mx-1">{profile.targetRoles.join(' / ') || 'your target roles'}</span>
            and pinpoint exactly what you need to learn.
          </p>
        </div>
      )}

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={64} className="text-orange-500 animate-spin mb-6" />
          <p className="text-lg text-slate-300 animate-pulse">Comparing your skills with market data...</p>
        </div>
      )}

      {analysis && !isAnalyzing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-6">
          
          {/* Missing Skills Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               <Target className="text-red-400" /> Missing Critical Skills
             </h3>
             <div className="flex flex-wrap gap-2">
               {analysis.missingSkills.map((skill, i) => (
                 <span key={i} className="bg-red-500/10 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg text-sm font-medium">
                   {skill}
                 </span>
               ))}
             </div>
             <p className="text-xs text-slate-500 mt-4">
               *Based on typical requirements for {profile.targetRoles[0]}.
             </p>
          </div>

          {/* Project Idea Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               <Rocket className="text-blue-400" /> Recommended Capstone Project
             </h3>
             <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-900/50">
               <p className="text-slate-200 text-sm leading-relaxed">
                 {analysis.projectIdea}
               </p>
             </div>
          </div>

          {/* Learning Path - Full Width */}
          <div className="md:col-span-2 bg-slate-900 rounded-xl p-6 border border-slate-800">
             <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
               <BookOpen className="text-green-400" /> Personalized Learning Roadmap
             </h3>
             
             <div className="space-y-4">
               {analysis.learningPath.map((item, idx) => (
                 <div key={idx} className="flex gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-all">
                   <div className="shrink-0 flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm">
                        {idx + 1}
                      </div>
                      <div className="w-0.5 h-full bg-slate-700/50 my-1"></div>
                   </div>
                   <div>
                     <h4 className="font-bold text-white text-lg">{item.skill}</h4>
                     <p className="text-sm text-slate-400 mb-3 flex items-center gap-2">
                       <span className="bg-slate-700 px-2 py-0.5 rounded text-xs text-slate-300">Resource</span>
                       {item.resource}
                     </p>
                     <div className="bg-green-900/10 border border-green-900/30 p-3 rounded-md">
                       <p className="text-green-300 text-sm flex items-start gap-2">
                         <CheckCircle size={16} className="mt-0.5 shrink-0" /> 
                         Action: {item.actionItem}
                       </p>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillGap;
