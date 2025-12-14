import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Upload, Loader2, X, Globe, Check, ChevronRight, ArrowLeft, Briefcase, User, Settings, Sparkles, MapPin, Plus, Star } from 'lucide-react';
import { parseResume, suggestRoles } from '../services/geminiService';

interface ProfileProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// --- CONSTANTS & MOCK DATA ---

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance"];
const SENIORITY_LEVELS = ["Entry Level", "Associate", "Mid-Senior Level", "Director", "Executive"];

// Expanded Region List including new requests
const REGIONS = [
  { name: "Major Tech Hubs", countries: ["United States", "United Kingdom", "Germany", "Canada", "Australia"] },
  { name: "Europe (West)", countries: ["Belgium", "Netherlands", "Luxembourg", "France", "Austria", "Switzerland"] },
  { name: "Asia & Pacific", countries: ["Taiwan", "Singapore", "Japan", "India", "New Zealand"] },
  { name: "Emerging", countries: ["Brazil", "Poland", "United Arab Emirates", "Estonia"] }
];

// --- SUB-COMPONENTS ---

const StepIndicator = ({ step, title, current }: { step: number, title: string, current: number }) => (
  <div className={`flex items-center gap-2 ${step === current ? 'text-white' : step < current ? 'text-blue-400' : 'text-slate-600'}`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors
      ${step === current ? 'bg-blue-600 border-blue-500' : step < current ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-900 border-slate-800'}`}>
      {step < current ? <Check size={14} /> : step}
    </div>
    <span className="hidden md:inline text-sm font-medium">{title}</span>
  </div>
);

const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 cursor-pointer hover:border-slate-600 transition-all" onClick={() => onChange(!checked)}>
    <span className="text-sm font-medium text-slate-200">{label}</span>
    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}>
      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </div>
  </div>
);

const PillSelect = ({ options, selected, onToggle }: { options: string[], selected: string[], onToggle: (val: string) => void }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => {
      const isSelected = (selected || []).includes(opt);
      return (
        <button
          key={opt}
          onClick={() => onToggle(opt)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all flex items-center gap-2
            ${isSelected 
              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30' 
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}`}
        >
          {opt}
          {isSelected && <Check size={14} />}
        </button>
      );
    })}
  </div>
);

// --- MAIN COMPONENT ---

const Profile: React.FC<ProfileProps> = ({ profile, setProfile, showToast }) => {
  const [step, setStep] = useState(1);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [roleInput, setRoleInput] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // --- HANDLERS ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        // Parse Resume FIRST
        const extracted = await parseResume(base64Data, file.type || 'application/pdf');
        
        // Auto-Generate Roles based on the new resume text
        let initialRoles: string[] = [];
        if (extracted.skills || extracted.resumeText) {
             const suggested = await suggestRoles(extracted.resumeText || '');
             initialRoles = suggested.slice(0, 3);
        }

        setProfile({
          ...profile,
          ...extracted,
          resumeBase64: base64Data,
          targetRoles: [...new Set([...(profile.targetRoles || []), ...initialRoles])],
          profileStrength: 85 // Mock strength after successful parse
        });
        showToast("Resume parsed & Profile Auto-filled!", "success");
      } catch (err) { showToast("Parsing failed.", "error"); } finally { setIsUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleSuggestRoles = async () => {
    if (!profile.resumeText && !profile.skills.length) {
      return showToast("Upload resume in Step 1 first!", "error");
    }
    setIsSuggesting(true);
    try {
      const context = profile.resumeText || profile.skills.join(', ');
      const roles = await suggestRoles(context);
      
      const newRoles = roles.filter(r => !(profile.targetRoles || []).includes(r));
      if (newRoles.length === 0) {
        showToast("No new unique roles found.", "info");
      } else {
        setProfile({ ...profile, targetRoles: [...(profile.targetRoles || []), ...newRoles] });
        showToast(`Added ${newRoles.length} role suggestions!`, "success");
      }
    } catch (e) {
      showToast("Could not fetch suggestions", "error");
    } finally {
      setIsSuggesting(false);
    }
  };

  const toggleList = (list: string[] | undefined, item: string) => {
    const safeList = list || [];
    return safeList.includes(item) ? safeList.filter(i => i !== item) : [...safeList, item];
  };

  const addRole = () => {
    if (roleInput && !(profile.targetRoles || []).includes(roleInput)) {
      setProfile({ ...profile, targetRoles: [...(profile.targetRoles || []), roleInput] });
      setRoleInput('');
    }
  };

  const handleRegionSelect = (country: string) => {
    setProfile({ ...profile, preferredRegions: toggleList(profile.preferredRegions, country) });
  };

  const addCustomCountry = () => {
    if(customCountry && !profile.preferredRegions.includes(customCountry)) {
        setProfile({ ...profile, preferredRegions: [...profile.preferredRegions, customCountry] });
        setCustomCountry('');
    }
  };

  // --- RENDER STEPS ---

  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-12">
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
           <User className="text-blue-400" /> Identity & Resume
        </h3>
        
        <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center border-dashed mb-8 relative group hover:bg-slate-800/50 transition-colors">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileUpload} accept=".pdf,image/*" />
            {isUploading ? <Loader2 className="animate-spin text-blue-500 mb-4" size={48}/> : <Upload className="text-slate-500 group-hover:text-blue-400 mb-4 transition-colors" size={48} />}
            <h4 className="text-lg font-bold text-white">
              {profile.resumeText ? "Resume Connected" : "Import Resume / CV"}
            </h4>
            <p className="text-sm text-slate-400 mt-2 max-w-sm">
              {profile.resumeText ? "We've extracted your details. Click to update." : "Upload your PDF. We'll auto-fill your skills, roles, and experience instantly."}
            </p>
        </div>

        {/* Premium Feature: AI Persona */}
        {profile.aiPersona && (
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-4 rounded-xl border border-blue-500/30 mb-8 flex items-start gap-4 shadow-lg">
                <div className="bg-blue-500 p-2 rounded-lg text-white mt-1 shadow-lg shadow-blue-500/50">
                    <Star size={20} fill="currentColor" />
                </div>
                <div>
                    <h4 className="text-blue-200 font-bold text-sm uppercase tracking-wider mb-1">AI Career Persona</h4>
                    <p className="text-white font-medium text-lg leading-snug">"{profile.aiPersona}"</p>
                    <p className="text-slate-400 text-xs mt-2">Profile Strength: <span className="text-green-400 font-bold">{profile.profileStrength || 50}%</span></p>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Input label="Full Name" value={profile.name} onChange={v => setProfile({...profile, name: v})} />
           <Input label="Email" value={profile.email} onChange={v => setProfile({...profile, email: v})} />
           <Input label="Phone" value={profile.phone} onChange={v => setProfile({...profile, phone: v})} />
           <Input label="Linkedin URL" value={profile.linkedinUrl} onChange={v => setProfile({...profile, linkedinUrl: v})} />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-24">
      {/* Job Titles */}
      <div>
        <div className="flex justify-between items-end mb-3">
            <div>
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2"><Briefcase className="text-green-400" size={20} /> Target Roles</h3>
                <p className="text-slate-400 text-sm">Specific job titles you want to apply for.</p>
            </div>
            <button 
              onClick={handleSuggestRoles}
              disabled={isSuggesting}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
            >
               {isSuggesting ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
               AI Suggest
            </button>
        </div>
        
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-wrap gap-2 focus-within:border-blue-500 transition-colors min-h-[60px]">
          {(profile.targetRoles || []).map(r => (
            <span key={r} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 animate-in zoom-in">
              {r} <button onClick={() => setProfile({...profile, targetRoles: profile.targetRoles.filter(t => t!==r)})}><X size={12}/></button>
            </span>
          ))}
          <input 
            className="bg-transparent outline-none text-sm text-white flex-1 min-w-[150px] py-2 px-1" 
            placeholder="Type & Press Enter..."
            value={roleInput}
            onChange={e => setRoleInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRole()}
          />
        </div>
      </div>

      {/* Preferences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-bold text-white mb-3 text-sm uppercase text-slate-400">Experience Level</h4>
            <div className="flex flex-col gap-2">
                {SENIORITY_LEVELS.map(level => (
                    <label key={level} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${profile.experienceLevel === level ? 'bg-purple-900/30 border-purple-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${profile.experienceLevel === level ? 'border-purple-500' : 'border-slate-600'}`}>
                            {profile.experienceLevel === level && <div className="w-2 h-2 bg-purple-500 rounded-full"></div>}
                        </div>
                        <input type="radio" className="hidden" name="seniority" checked={profile.experienceLevel === level} onChange={() => setProfile({...profile, experienceLevel: level as any})} />
                        <span className="text-sm font-medium">{level}</span>
                    </label>
                ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3 text-sm uppercase text-slate-400">Contract Type</h4>
             <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map(type => {
                    const active = (profile.jobTypes || []).includes(type);
                    return (
                        <button key={type} onClick={() => setProfile({...profile, jobTypes: toggleList(profile.jobTypes, type)})} 
                        className={`px-4 py-2 rounded-lg text-sm border transition-all ${active ? 'bg-green-900/30 border-green-500 text-green-300' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                            {type}
                        </button>
                    )
                })}
             </div>
             
             <div className="mt-6">
                <h4 className="font-bold text-white mb-3 text-sm uppercase text-slate-400">Visa Status</h4>
                <Toggle 
                    label="I require Visa Sponsorship" 
                    checked={profile.visaSponsorship || false} 
                    onChange={(v) => setProfile({...profile, visaSponsorship: v})} 
                />
             </div>
          </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-32">
       {/* Location Section */}
       <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="text-blue-400" size={20} /> Location & Match
        </h3>
        
        <div className="space-y-4">
          <Toggle 
            label="Remote Jobs Only" 
            checked={profile.remoteOnly || false} 
            onChange={(v) => setProfile({...profile, remoteOnly: v})} 
          />
          
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-300">Preferred Countries / Cities</label>
                <button 
                  onClick={() => setShowLocationModal(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
                >
                  <Plus size={12} /> Add Regions
                </button>
            </div>
            
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {(profile.preferredRegions || []).length === 0 && !profile.remoteOnly && <span className="text-slate-500 text-sm italic">Worldwide / No preference</span>}
              {(profile.preferredRegions || []).map(r => (
                <span key={r} className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {r} <button onClick={() => handleRegionSelect(r)}><X size={12}/></button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

       {/* Logistics */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
               <label className="text-xs text-slate-500 uppercase font-bold">Min Salary (Annual)</label>
               <input 
                 className="w-full bg-transparent text-white outline-none mt-2 font-mono" 
                 placeholder="$80,000"
                 value={profile.salaryExpectation}
                 onChange={(e) => setProfile({...profile, salaryExpectation: e.target.value})}
               />
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
               <label className="text-xs text-slate-500 uppercase font-bold">Notice Period</label>
               <input 
                 className="w-full bg-transparent text-white outline-none mt-2 font-mono" 
                 placeholder="e.g. 2 Weeks, Immediate"
                 value={profile.noticePeriod}
                 onChange={(e) => setProfile({...profile, noticePeriod: e.target.value})}
               />
            </div>
       </div>

       {/* AI Settings */}
       <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                <Settings size={16} className="text-slate-400"/> Match Sensitivity
            </h4>
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm text-slate-300">Minimum Match Score: <span className="text-blue-400 font-bold">{profile.matchThreshold || 60}%</span></label>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={profile.matchThreshold || 60} 
              onChange={(e) => setProfile({...profile, matchThreshold: parseInt(e.target.value)})}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-slate-500 mt-2">
              Higher score = Fewer but better matches. Lower score = More volume.
            </p>
       </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pb-40">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Setup Your Copilot</h1>
          <p className="text-slate-400">Step {step} of 3: {step === 1 ? 'Resume & Identity' : step === 2 ? 'Role & Preferences' : 'Location & Match'}</p>
        </div>
        <div className="flex gap-4">
           <StepIndicator step={1} current={step} title="Identity" />
           <div className="w-8 h-px bg-slate-800"></div>
           <StepIndicator step={2} current={step} title="Roles" />
           <div className="w-8 h-px bg-slate-800"></div>
           <StepIndicator step={3} current={step} title="Logistics" />
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Footer Nav - Fixed */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 p-6 flex justify-between z-40 shadow-2xl">
         <button 
           onClick={() => setStep(prev => Math.max(1, prev - 1))}
           disabled={step === 1}
           className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white disabled:opacity-30 flex items-center gap-2 transition-colors"
         >
           <ArrowLeft size={18} /> Back
         </button>

         <button 
           onClick={() => {
             if (step < 3) setStep(prev => prev + 1);
             else showToast("Profile Configuration Saved!", "success");
           }}
           className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all hover:scale-105"
         >
           {step === 3 ? 'Finish Setup' : 'Next Step'} <ChevronRight size={18} />
         </button>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
           <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-white">Add Locations</h3>
                 <button onClick={() => setShowLocationModal(false)} className="text-slate-400 hover:text-white"><X /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                 {/* Custom Country Input */}
                 <div className="p-4 border-b border-slate-800">
                    <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Custom Location</label>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500" 
                            placeholder="Type a country or city..."
                            value={customCountry}
                            onChange={(e) => setCustomCountry(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCustomCountry()}
                        />
                        <button onClick={addCustomCountry} className="bg-blue-600 text-white px-4 rounded font-bold text-sm">Add</button>
                    </div>
                 </div>

                 {REGIONS.map(region => (
                   <div key={region.name} className="border-b border-slate-800 last:border-0">
                      <div className="p-4 bg-slate-900 flex justify-between items-center">
                         <span className="font-bold text-white text-sm uppercase tracking-wider">{region.name}</span>
                      </div>
                      <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                         {region.countries.map(country => (
                           <label key={country} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors border ${
                               (profile.preferredRegions || []).includes(country) ? 'bg-blue-900/20 border-blue-500/50' : 'border-transparent hover:bg-slate-800'
                           }`}>
                              <input 
                                type="checkbox" 
                                className="hidden"
                                checked={(profile.preferredRegions || []).includes(country)}
                                onChange={() => handleRegionSelect(country)}
                              />
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${(profile.preferredRegions || []).includes(country) ? 'bg-blue-600 border-blue-500' : 'border-slate-600'}`}>
                                 {(profile.preferredRegions || []).includes(country) && <Check size={10} className="text-white" />}
                              </div>
                              <span className="text-sm text-slate-300 select-none">{country}</span>
                           </label>
                         ))}
                      </div>
                   </div>
                 ))}
              </div>

              <div className="p-4 border-t border-slate-800 flex justify-end">
                 <button onClick={() => setShowLocationModal(false)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Done</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const Input = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 focus-within:border-blue-500 transition-colors">
    <label className="text-xs text-slate-500 uppercase font-bold">{label}</label>
    <input className="w-full bg-transparent text-white outline-none mt-1" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default Profile;