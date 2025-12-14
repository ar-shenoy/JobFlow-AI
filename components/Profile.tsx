import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Upload, Save, FileText, Loader2, CheckCircle, X, Sparkles, MapPin, Plus } from 'lucide-react';
import { parseResume, suggestRoles } from '../services/geminiService';

interface ProfileProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
}

// Comprehensive List including Taiwan
const COUNTRIES = [
  "Remote", "Taiwan", "United States", "United Kingdom", "Canada", "Germany", "France", 
  "Australia", "India", "Singapore", "Japan", "Brazil", "Netherlands", 
  "Sweden", "Spain", "Italy", "Switzerland", "United Arab Emirates",
  "Ireland", "Poland", "China", "Hong Kong", "South Korea", "Mexico",
  "South Africa", "Portugal", "Belgium", "Denmark", "Norway", "Finland",
  "New Zealand", "Austria", "Czech Republic", "Malaysia", "Thailand",
  "Vietnam", "Philippines", "Indonesia", "Argentina", "Chile", "Colombia",
  "Saudi Arabia", "Qatar", "Israel", "Turkey", "Estonia", "Romania",
  "Ukraine", "Greece", "Hungary", "Egypt", "Nigeria", "Kenya"
].sort();

const Profile: React.FC<ProfileProps> = ({ profile, setProfile }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [roleInput, setRoleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1]; 
        
        try {
          const extracted = await parseResume(base64Data, file.type);
          
          setProfile({
            ...profile,
            ...extracted,
            resumeBase64: base64Data,
            targetRoles: profile.targetRoles.length ? profile.targetRoles : [],
            locations: profile.locations.length ? profile.locations : []
          });
          setUploadSuccess(true);
        } catch (err) {
          alert('Failed to parse resume with AI. Please fill details manually.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsUploading(false);
    }
  };

  const handleSuggestRoles = async () => {
    if (!profile.resumeText) {
      alert("Please upload a resume or fill in the experience summary first.");
      return;
    }
    setIsSuggesting(true);
    try {
      const roles = await suggestRoles(profile.resumeText);
      const newSuggestions = roles.filter(r => !profile.targetRoles.includes(r));
      setSuggestions(newSuggestions);
    } catch (e) {
      console.error(e);
      alert("Could not fetch suggestions.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const addRole = (role: string) => {
    const trimmed = role.trim();
    if (trimmed && !profile.targetRoles.includes(trimmed)) {
      setProfile({ ...profile, targetRoles: [...profile.targetRoles, trimmed] });
      setSuggestions(prev => prev.filter(s => s !== role));
    }
  };

  const removeRole = (role: string) => {
    setProfile({ ...profile, targetRoles: profile.targetRoles.filter(r => r !== role) });
  };

  const handleRoleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRole(roleInput);
      setRoleInput('');
    }
  };

  const addLocation = (loc: string) => {
    if (loc && !profile.locations.includes(loc)) {
      setProfile({ ...profile, locations: [...profile.locations, loc] });
      setLocationInput('');
    }
  };

  const removeLocation = (location: string) => {
    setProfile({ ...profile, locations: profile.locations.filter(l => l !== location) });
  };

  const handleSave = () => {
    localStorage.setItem('jobflow_state_profile', JSON.stringify(profile));
    alert("Profile saved locally!");
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-700 pb-4 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Candidate Profile</h2>
          <p className="text-sm md:text-base text-slate-400">Configure your digital twin for automation.</p>
        </div>
        <button onClick={handleSave} className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20">
          <Save size={18} /> Save Profile
        </button>
      </div>

      {/* Resume Upload Section */}
      <div className="bg-slate-800/50 rounded-xl p-4 md:p-6 border border-slate-700">
        <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="text-blue-400" /> Source Resume
        </h3>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative group w-full md:max-w-md">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-750 hover:border-blue-500 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <Loader2 className="animate-spin text-blue-400 mb-2" size={32} />
                ) : uploadSuccess ? (
                   <CheckCircle className="text-green-400 mb-2" size={32} />
                ) : (
                  <Upload className="text-slate-400 mb-2 group-hover:text-blue-400" size={32} />
                )}
                <p className="mb-2 text-sm text-slate-400">
                  <span className="font-semibold">Tap to upload CV</span> (PDF/Img)
                </p>
                <p className="text-xs text-slate-500">AI will auto-extract details</p>
              </div>
              <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
            </label>
          </div>
          
          <div className="flex-1 text-sm text-slate-300 text-center md:text-left">
            {uploadSuccess ? (
              <div className="text-green-400">
                Analysis complete! We've extracted your skills and experience. Please review the fields below.
              </div>
            ) : (
              "Upload your resume to let JobFlow AI understand your background. This data is used to match jobs and generate cover letters."
            )}
          </div>
        </div>
      </div>

      {/* Manual Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Full Name</label>
          <input 
            type="text" 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all"
            value={profile.name}
            onChange={(e) => setProfile({...profile, name: e.target.value})}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Email Address</label>
          <input 
            type="email" 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all"
            value={profile.email}
            onChange={(e) => setProfile({...profile, email: e.target.value})}
            placeholder="john@example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Experience Level</label>
          <select 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all"
            value={profile.experienceLevel}
            onChange={(e) => setProfile({...profile, experienceLevel: e.target.value as any})}
          >
            <option value="Entry">Entry Level</option>
            <option value="Mid">Mid Level</option>
            <option value="Senior">Senior Level</option>
            <option value="Executive">Executive</option>
          </select>
        </div>
         <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Phone</label>
          <input 
            type="text" 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white transition-all"
            value={profile.phone}
            onChange={(e) => setProfile({...profile, phone: e.target.value})}
            placeholder="+1 234 567 890"
          />
        </div>
      </div>

      {/* Target Roles */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
           <label className="text-sm font-medium text-slate-300">Target Job Titles</label>
           <button 
             onClick={handleSuggestRoles}
             disabled={isSuggesting}
             className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
           >
             {isSuggesting ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
             Auto-Suggest
           </button>
        </div>
        
        {/* Suggestion Chips */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg animate-in slide-in-from-top-2">
             <span className="text-xs text-blue-300 w-full mb-1 font-semibold">AI Suggestions (Click to add):</span>
             {suggestions.map((s, i) => (
               <button 
                key={i} 
                onClick={() => addRole(s)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full transition-all border border-blue-400 shadow-sm"
               >
                 + {s}
               </button>
             ))}
          </div>
        )}

        <div className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all flex flex-wrap gap-2 min-h-[46px]">
          {profile.targetRoles.map((role, idx) => (
            <span key={idx} className="bg-slate-700 text-slate-200 text-sm px-2 py-1 rounded-md flex items-center gap-1">
              {role}
              <button onClick={() => removeRole(role)} className="hover:text-red-400"><X size={14}/></button>
            </span>
          ))}
          <input 
            type="text" 
            className="bg-transparent outline-none text-white flex-1 min-w-[150px] text-sm"
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            onKeyDown={handleRoleKeyDown}
            placeholder="Type & press Enter..."
          />
        </div>
        <p className="text-xs text-slate-500">Press Enter or Comma to add a tag.</p>
      </div>

      {/* Preferred Locations (Custom Input Supported) */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
           <MapPin size={16} /> Preferred Locations
        </label>
        
        <div className="relative flex gap-2">
           <input
             list="country-list"
             type="text"
             className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
             placeholder="Type or select a country (e.g., Taiwan, remote)..."
             value={locationInput}
             onChange={(e) => setLocationInput(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter') {
                 e.preventDefault();
                 addLocation(locationInput);
               }
             }}
           />
           <datalist id="country-list">
             {COUNTRIES.map(c => <option key={c} value={c} />)}
           </datalist>
           <button 
             onClick={() => addLocation(locationInput)}
             className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 transition-colors"
           >
             <Plus size={20} />
           </button>
        </div>

        {/* Selected Locations Tags */}
        <div className="flex flex-wrap gap-2 bg-slate-800/30 p-3 rounded-lg border border-slate-800 min-h-[50px]">
          {profile.locations.length === 0 ? (
            <span className="text-slate-500 text-sm italic self-center">No locations selected.</span>
          ) : (
            profile.locations.map((loc, idx) => (
              <span key={idx} className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-md animate-in zoom-in-50 duration-200">
                {loc}
                <button onClick={() => removeLocation(loc)} className="bg-blue-700 hover:bg-blue-800 rounded-full p-0.5 transition-colors">
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Extracted Experience Summary (Editable)</label>
        <textarea 
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-white h-32 transition-all"
          value={profile.resumeText}
          onChange={(e) => setProfile({...profile, resumeText: e.target.value})}
          placeholder="Paste your resume text here or upload file above..."
        />
      </div>
    </div>
  );
};

export default Profile;
