import React, { useState, useEffect, memo, useRef } from 'react';
import { 
  ShieldCheck, Star, ExternalLink, Plus, Trash2, Edit3, Lock, 
  LayoutDashboard, Eye, LogOut, TrendingUp, CheckCircle2, 
  AlertCircle, Zap, Crown, MessageSquare, User, ArrowLeft, Send,
  ShieldAlert, ThumbsUp, XCircle, Clock, Image as ImageIcon,
  Bold, Italic, List, Heading1, Heading2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signOut, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, addDoc, deleteDoc, 
  onSnapshot, query, orderBy, serverTimestamp, updateDoc, enableIndexedDbPersistence 
} from 'firebase/firestore';

// --- MASTER CONFIGURATION ---
const ADMIN_EMAIL = "chasepoore@icloud.com"; 

// !!! IMPORTANT: Replace these with your actual keys from the Firebase Console !!!
const firebaseConfig = {
  apiKey: "AIzaSyCwkztsGABPEjWOkNoNHr8XZ7GmlrGCf60",
  authDomain: "casinopro-directory.firebaseapp.com",
  projectId: "casinopro-directory",
  storageBucket: "casinopro-directory.appspot.com",
  messagingSenderId: "500565041910",
  appId: "1:500565041910:web:323f83d280efe36da442d7"
};

// Initialize Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable Offline Speed Boost
try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch (e) {}

// --- IMAGE HELPER ---
const optimizeImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

// --- STABLE SUB-COMPONENTS ---

const ListView = memo(({ casinos, onOpen }) => (
  <div className="max-w-5xl mx-auto space-y-5 p-4 animate-in fade-in duration-300">
    <div className="text-center py-8">
      <h1 className="text-5xl font-black mb-3 text-white tracking-tight italic">ELITE <span className="text-indigo-500">RANKINGS</span></h1>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Verified Affiliate Directory</p>
    </div>
    <div className="grid gap-4">
      {casinos.length === 0 ? (
        <div className="text-center py-20 text-slate-700 italic">No rankings found.</div>
      ) : (
        casinos.map((c) => (
          <div 
            key={c.id} 
            onClick={() => onOpen(c)} 
            className="group cursor-pointer bg-slate-900/40 border border-slate-800/60 rounded-[1.5rem] p-4 flex items-center gap-4 hover:border-indigo-500/50 transition-all hover:bg-slate-900/80 active:scale-[0.98]"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/50 shadow-lg">
              {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black bg-indigo-600 text-white">{c.name.charAt(0)}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{c.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star size={10} className="text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase">{c.rating} Expert Rating</span>
              </div>
            </div>
            <button className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all">VIEW</button>
          </div>
        ))
      )}
    </div>
  </div>
));

const DetailsView = ({ selectedCasino, setView, user, reviews, submitReview, newReview, setNewReview }) => (
  <div className="max-w-4xl mx-auto space-y-10 p-4 animate-in fade-in duration-300">
    <button onClick={() => setView('public')} className="flex items-center gap-2 text-slate-500 hover:text-white font-bold text-sm transition-colors">
      <ArrowLeft size={18} /> BACK TO LIST
    </button>

    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
      <div className="h-40 w-full bg-slate-800 relative">
        {selectedCasino.logo && <img src={selectedCasino.logo} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110" alt="" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
      </div>
      <div className="px-10 pb-10 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
          <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-800 border-4 border-slate-900 shadow-2xl shrink-0">
            {selectedCasino.logo ? <img src={selectedCasino.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-black bg-indigo-600 text-white">{selectedCasino.name.charAt(0)}</div>}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-4xl font-black text-white">{selectedCasino.name}</h1>
            <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1 flex items-center gap-2"><ShieldCheck size={14}/> Verified Partner</p>
          </div>
          <a href={selectedCasino.link} target="_blank" rel="noreferrer" className="w-full md:w-auto bg-indigo-600 px-10 py-4 rounded-2xl font-black text-white text-center shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all">PLAY NOW</a>
        </div>
        
        <div className="border-t border-slate-800/50 pt-10">
          <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6">Expert Verdict</h4>
          <div 
            className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm md:text-base space-y-4"
            dangerouslySetInnerHTML={{ __html: selectedCasino.description }}
          />
        </div>
      </div>
    </div>

    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black flex items-center gap-3 text-white"><MessageSquare className="text-indigo-500" /> Community Feedback</h2>
        <div className="bg-slate-800 px-4 py-1.5 rounded-full text-[10px] font-black border border-slate-700 text-slate-400 uppercase tracking-widest">
          {reviews.length} Verified Reviews
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem]">
        <form onSubmit={submitReview} className="space-y-4">
          <div className="flex gap-2 mb-2">
            {[1,2,3,4,5].map(num => (
              <button key={num} type="button" onClick={() => setNewReview({...newReview, rating: num})} className={`p-1.5 rounded-lg transition-all ${newReview.rating >= num ? 'text-amber-400' : 'text-slate-700'}`}>
                <Star size={24} fill={newReview.rating >= num ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <textarea 
            required 
            placeholder={(!user || user.isAnonymous) ? "Sign in to leave a review..." : "Share your experience with this casino..."} 
            className="w-full bg-slate-800 border-none rounded-2xl p-4 text-white h-24 focus:ring-2 focus:ring-indigo-500 resize-none outline-none" 
            value={newReview.text} 
            disabled={(!user || user.isAnonymous)} 
            onChange={(e) => setNewReview({...newReview, text: e.target.value})} 
          />
          <button type="submit" disabled={(!user || user.isAnonymous)} className="bg-indigo-600 px-8 py-3 rounded-xl font-black text-sm text-white hover:bg-indigo-500 transition-colors uppercase tracking-widest">Post Review</button>
        </form>
      </div>

      <div className="space-y-4">
        {reviews.map(r => (
          <div key={r.id} className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-2xl">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400"><User size={14} /></div>
                <div>
                  <p className="text-sm font-bold text-white">{r.email?.split('@')[0]}</p>
                  <div className="flex gap-0.5 mt-0.5">
                    {[...Array(5)].map((_, i) => (<Star key={i} size={10} className={i < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-700"} />))}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-600 font-bold uppercase">{r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed italic">"{r.text}"</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AdminView = memo(({ isAdmin, adminTab, setAdminTab, setView, isEditing, setIsEditing, formData, setFormData, handleSaveCasino, casinos, pendingReviews, approveReview, deleteReview }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && isEditing) {
      editorRef.current.innerHTML = formData.description;
    }
  }, [isEditing]);

  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    setFormData(prev => ({ ...prev, description: editorRef.current.innerHTML }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const base64 = await optimizeImage(file);
      setFormData(prev => ({ ...prev, logo: base64 }));
    }
  };

  if (!isAdmin) return <div className="text-center p-20 text-slate-500">Access Denied</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 p-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-5 rounded-[2rem]">
        <div className="flex gap-2">
          <button onClick={() => setAdminTab('casinos')} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${adminTab === 'casinos' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>Casinos</button>
          <button onClick={() => setAdminTab('moderation')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${adminTab === 'moderation' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>Moderation {pendingReviews.length > 0 && <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px]">{pendingReviews.length}</span>}</button>
        </div>
        <button onClick={() => { setView('public'); setIsEditing(null); }} className="text-xs font-black text-slate-500 hover:text-white flex items-center gap-1 uppercase tracking-widest"><Eye size={14}/> View Site</button>
      </div>

      {adminTab === 'casinos' ? (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[3rem]">
            <h3 className="text-xl font-black mb-8 text-white uppercase tracking-tighter">{isEditing ? 'Modify Listing' : 'Create Listing'}</h3>
            <form onSubmit={handleSaveCasino} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Brand Name</label>
                  <input className="w-full bg-slate-800 border-none rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Stake" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identity Assets</label>
                  <div className="relative">
                    <input type="file" id="logo-up" hidden onChange={handleFileChange} accept="image/*" />
                    <label htmlFor="logo-up" className="flex items-center justify-center gap-2 w-full bg-slate-800 p-4 rounded-xl text-slate-400 cursor-pointer hover:bg-slate-700 transition-colors">
                      {formData.logo ? <CheckCircle2 size={18} className="text-emerald-500" /> : <ImageIcon size={18} />}
                      {formData.logo ? 'Logo Uploaded' : 'Upload Brand Logo'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Expert Review (Rich Text)</label>
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                  <div className="bg-slate-800 p-2 flex gap-1 border-b border-slate-700 overflow-x-auto">
                    <button type="button" onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-700 rounded text-white"><Bold size={16}/></button>
                    <button type="button" onClick={() => execCmd('italic')} className="p-2 hover:bg-slate-700 rounded text-white"><Italic size={16}/></button>
                    <button type="button" onClick={() => execCmd('formatBlock', 'H2')} className="p-2 hover:bg-slate-700 rounded text-white font-black">H2</button>
                    <button type="button" onClick={() => execCmd('formatBlock', 'H3')} className="p-2 hover:bg-slate-700 rounded text-white font-black">H3</button>
                    <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-2 hover:bg-slate-700 rounded text-white"><List size={16}/></button>
                  </div>
                  <div 
                    ref={editorRef}
                    contentEditable
                    className="p-6 min-h-[300px] text-white outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-900/50 prose prose-invert max-w-none"
                    onBlur={(e) => setFormData(prev => ({ ...prev, description: e.target.innerHTML }))}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bonus Header</label>
                  <input className="w-full bg-slate-800 border-none rounded-xl p-4 text-white" placeholder="e.g. 200% up to $5,000" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Affiliate Destination</label>
                  <input className="w-full bg-slate-800 border-none rounded-xl p-4 text-indigo-400 font-mono text-sm" placeholder="https://..." value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} required />
                </div>
              </div>

              <button className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all uppercase tracking-[0.2em]">
                {isEditing ? 'Save Changes' : 'Publish Review'}
              </button>
            </form>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden h-fit">
            <div className="p-6 border-b border-slate-800 font-black text-[10px] text-slate-500 uppercase tracking-[0.3em]">Directory</div>
            <div className="divide-y divide-slate-800/50">
              {casinos.map(c => (
                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-slate-800 overflow-hidden shrink-0">
                      {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-700" />}
                    </div>
                    <span className="font-bold text-sm text-white truncate">{c.name}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setIsEditing(c.id); setFormData(c); }} className="p-2 text-slate-500 hover:text-indigo-400"><Edit3 size={16}/></button>
                    <button onClick={async () => { if(window.confirm('Delete?')) await deleteDoc(doc(db, 'casinos', c.id)); }} className="p-2 text-slate-500 hover:text-rose-400"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2 mb-4"><ShieldAlert className="text-rose-500" /> Pending Approval</h2>
          {pendingReviews.length === 0 ? (
            <div className="bg-slate-900/50 p-20 text-center rounded-[3rem] border border-slate-800 italic text-slate-600">Queue is empty.</div>
          ) : (
            pendingReviews.map(r => (
              <div key={r.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded-lg uppercase">{r.casinoName}</div>
                    <div className="flex gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < r.rating ? 'currentColor' : 'none'} />)}
                    </div>
                  </div>
                  <p className="text-white font-medium leading-relaxed italic">"{r.text}"</p>
                  <p className="text-slate-500 text-xs font-bold">— {r.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => approveReview(r)} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl font-black text-xs text-white">APPROVE</button>
                  <button onClick={() => deleteReview(r)} className="bg-slate-800 hover:bg-rose-900/50 px-4 py-3 rounded-xl font-black text-xs text-white border border-slate-700">DELETE</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});

// --- MAIN ENGINE ---

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState('public');
  const [adminTab, setAdminTab] = useState('casinos');
  const [selectedCasino, setSelectedCasino] = useState(null);
  const [casinos, setCasinos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [pendingReviews, setPendingRevi
