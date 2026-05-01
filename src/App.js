import React, { useState, useEffect, memo, useRef } from 'react';
import { 
  ShieldCheck, Star, ExternalLink, Plus, Trash2, Edit3, Lock, 
  LogOut, CheckCircle2, MessageSquare, User, ArrowLeft, Image as ImageIcon,
  Bold, Italic, List, Heading1, Heading2, Eye, ShieldAlert
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signOut, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, addDoc, deleteDoc, 
  onSnapshot, query, orderBy, serverTimestamp, updateDoc 
} from 'firebase/firestore';

// --- CONFIGURATION ---
const ADMIN_EMAIL = "chasepoore@icloud.com"; 
const firebaseConfig = {
  apiKey: "AIzaSyCwkztsGABPEjWOkNoNHr8XZ7GmlrGCf60",
  authDomain: "casinopro-directory.firebaseapp.com",
  projectId: "casinopro-directory",
  storageBucket: "casinopro-directory.appspot.com",
  messagingSenderId: "500565041910",
  appId: "1:500565041910:web:323f83d280efe36da442d7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- IMAGE OPTIMIZER ---
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

// --- STABLE SUB-COMPONENTS (Fixed focus & speed) ---

const ListView = memo(({ casinos, onOpen }) => (
  <div className="max-w-5xl mx-auto space-y-6 p-4 pt-4 animate-in fade-in duration-300">
    <div className="text-center py-10">
      <h1 className="text-5xl font-black mb-2 text-white italic tracking-tighter uppercase">
        Casino<span className="text-indigo-500">Pro</span>
      </h1>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Verified Affiliate Rankings</p>
    </div>
    <div className="grid gap-4">
      {casinos.length === 0 ? (
        <div className="text-center py-20 text-slate-700 italic border border-slate-900 rounded-[2rem]">
          Initializing Directory...
        </div>
      ) : (
        casinos.map((c) => (
          <div 
            key={c.id} 
            onClick={() => onOpen(c)} 
            className="group cursor-pointer bg-slate-900/60 border border-slate-800 rounded-[1.5rem] p-4 flex items-center gap-4 hover:border-indigo-500/50 transition-all active:scale-95 shadow-xl"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
              {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black bg-indigo-600 text-white">{c.name.charAt(0)}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{c.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Star size={10} className="text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{c.rating} Rating</span>
              </div>
            </div>
            <button className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all">View</button>
          </div>
        ))
      )}
    </div>
  </div>
));

const AdminDashboard = ({ 
  adminTab, setAdminTab, formData, setFormData, isEditing, setIsEditing, 
  handleSaveCasino, casinos, pendingReviews, setView, approveReview, deleteReview 
}) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && isEditing) {
      editorRef.current.innerHTML = formData.description || "";
    }
  }, [isEditing]);

  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      setFormData(prev => ({ ...prev, description: editorRef.current.innerHTML }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 pt-10 space-y-8 animate-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-5 rounded-[2rem]">
        <div className="flex gap-2">
          <button onClick={() => setAdminTab('casinos')} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${adminTab === 'casinos' ? 'bg-indigo-600 text-white' : 'text-slate-500 bg-slate-800'}`}>Directory</button>
          <button onClick={() => setAdminTab('moderation')} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${adminTab === 'moderation' ? 'bg-indigo-600 text-white' : 'text-slate-500 bg-slate-800'}`}>Moderation ({pendingReviews.length})</button>
        </div>
        <button onClick={() => { setView('public'); setIsEditing(null); }} className="text-xs font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-2"><Eye size={16}/> Back to Site</button>
      </div>

      {adminTab === 'casinos' ? (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl">
            <h2 className="text-xl font-black text-white mb-8 uppercase tracking-tighter italic border-l-4 border-indigo-600 pl-4">
              {isEditing ? 'Edit Existing Listing' : 'Create New Partner Listing'}
            </h2>
            <form onSubmit={handleSaveCasino} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Casino Name</label>
                  <input className="w-full bg-slate-800 border-none rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Brand Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Brand Identity (Logo)</label>
                  <input type="file" id="logo-up" hidden onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const base64 = await optimizeImage(file);
                      setFormData(prev => ({ ...prev, logo: base64 }));
                    }
                  }} accept="image/*" />
                  <label htmlFor="logo-up" className="flex items-center justify-center gap-2 w-full bg-slate-800 p-4 rounded-2xl text-slate-400 cursor-pointer hover:bg-slate-700 border border-dashed border-slate-700">
                    {formData.logo ? <CheckCircle2 size={18} className="text-emerald-500" /> : <ImageIcon size={18} />}
                    <span className="font-bold text-[10px] uppercase">{formData.logo ? 'Logo Uploaded' : 'Select Photo'}</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Expert Review Description</label>
                <div className="border border-slate-800 rounded-3xl overflow-hidden bg-black/40">
                  <div className="bg-slate-800 p-2 flex gap-1 border-b border-slate-700">
                    <button type="button" onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-700 rounded text-white font-black">B</button>
                    <button type="button" onClick={() => execCmd('italic')} className="p-2 hover:bg-slate-700 rounded text-white italic font-serif">I</button>
                    <button type="button" onClick={() => execCmd('formatBlock', 'H2')} className="p-2 hover:bg-slate-700 rounded text-white font-black text-xs uppercase">H2</button>
                    <button type="button" onClick={() => execCmd('formatBlock', 'H3')} className="p-2 hover:bg-slate-700 rounded text-white font-black text-xs uppercase">H3</button>
                    <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-2 hover:bg-slate-700 rounded text-white font-black">List</button>
                  </div>
                  <div 
                    ref={editorRef}
                    contentEditable
                    className="p-6 min-h-[300px] text-white outline-none bg-slate-900/50 prose prose-invert max-w-none text-sm leading-relaxed"
                    onBlur={(e) => setFormData(prev => ({ ...prev, description: e.target.innerHTML }))}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <input className="bg-slate-800 rounded-2xl p-4 text-white outline-none font-bold" placeholder="Bonus Header" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} required />
                <input className="bg-slate-800 rounded-2xl p-4 text-indigo-400 font-mono text-xs outline-none" placeholder="Affiliate Link" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} required />
              </div>

              <button className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-white uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-500 transition-all">
                {isEditing ? 'Commit Updates' : 'Publish to Live Site'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl h-fit">
             <div className="p-5 border-b border-slate-800 font-black text-[10px] text-slate-500 uppercase tracking-widest bg-slate-800/20 italic">Inventory</div>
             <div className="divide-y divide-slate-800/50 max-h-[500px] overflow-y-auto">
               {casinos.map(c => (
                 <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-all">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                       {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-700" />}
                     </div>
                     <span className="font-bold text-sm text-white truncate max-w-[120px]">{c.name}</span>
                   </div>
                   <div className="flex gap-1">
                     <button onClick={() => { setIsEditing(c.id); setFormData(c); if(editorRef.current) editorRef.current.innerHTML = c.description; window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-2 text-slate-500 hover:text-indigo-400"><Edit3 size={18}/></button>
                     <button onClick={async () => { if(window.confirm('Delete?')) await deleteDoc(doc(db, 'casinos', c.id)); }} className="p-2 text-slate-500 hover:text-rose-400"><Trash2 size={18}/></button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest italic border-l-4 border-indigo-600 pl-4">Community Moderation</h2>
          {pendingReviews.map(r => (
            <div key={r.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between gap-6 shadow-xl">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded-lg uppercase tracking-widest border border-indigo-500/20">{r.casinoName}</div>
                </div>
                <p className="text-white font-medium italic leading-relaxed text-lg">"{r.text}"</p>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">— {r.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => approveReview(r)} className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-2xl font-black text-xs text-white uppercase tracking-widest shadow-lg transition-all">Approve</button>
                <button onClick={() => deleteReview(r)} className="bg-slate-800 hover:bg-rose-900/50 px-4 py-4 rounded-2xl font-black text-xs text-white border border-slate-700 uppercase tracking-widest transition-all">Delete</button>
              </div>
            </div>
          ))}
          {pendingReviews.length === 0 && <p className="text-center p-20 text-slate-600 italic uppercase font-black text-xs">No pending items</p>}
        </div>
      )}
    </div>
  );
};

// --- MAIN APPLICATION ENGINE ---

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('public');
  const [adminTab, setAdminTab] = useState('casinos');
  const [selectedCasino, setSelectedCasino] = useState(null);
  const [casinos, setCasinos] = useState(() => {
    const saved = localStorage.getItem('cp_v_final_cache');
    return saved ? JSON.parse(saved) : [];
  });
  const [reviews, setReviews] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(casinos.length === 0);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', rating: '5', bonus: '', link: '', description: '', logo: '' });
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [showNotification, setShowNotification] = useState(null);

  const isAdmin = user && user.email === ADMIN_EMAIL;

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) signInAnonymously(auth);
    });
  }, []);

  useEffect(() => {
    const q = collection(db, 'casinos');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = data.sort((a, b) => b.rating - a.rating);
      setCasinos(sorted);
      localStorage.setItem('cp_v_final_cache', JSON.stringify(sorted));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCasino || view !== 'details') return;
    const q = query(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(all.filter(r => r.isApproved === true));
    });
  }, [selectedCasino, view]);

  useEffect(() => {
    if (!isAdmin || view !== 'admin' || adminTab !== 'moderation') return;
    const unsubs = casinos.map(c => onSnapshot(collection(db, 'casinos', c.id, 'user_reviews'), (snapshot) => {
      const revs = snapshot.docs.map(doc => ({ id: doc.id, casinoId: c.id, casinoName: c.name, ...doc.data() })).filter(r => !r.isApproved);
      setPendingReviews(prev => [...prev.filter(p => p.casinoId !== c.id), ...revs].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }));
    return () => unsubs.forEach(u => u());
  }, [view, adminTab, casinos, isAdmin]);

  const handleSaveCasino = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const payload = { ...formData, updatedAt: Date.now() };
    if (isEditing) await setDoc(doc(db, 'casinos', isEditing), payload);
    else await addDoc(collection(db, 'casinos'), payload);
    setFormData({ name: '', rating: '5', bonus: '', link: '', description: '', logo: '' });
    setIsEditing(null);
    setShowNotification("Changes Published Successfully!");
    setTimeout(() => setShowNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans pb-20 selection:bg-indigo-500/30">
      <nav className="sticky top-0 z-[100] bg-[#050608]/95 backdrop-blur-md border-b border-slate-800/60 h-16 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div onClick={() => { setView('public'); setSelectedCasino(null); }} className="flex items-center gap-3 cursor-pointer group">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white group-hover:scale-110 transition-transform"><ShieldCheck size={20} /></div>
            <span className="font-black text-xl tracking-tighter uppercase italic text-white tracking-widest">CASINOPRO</span>
          </div>
          <div className="flex gap-4 items-center">
            {isAdmin && <button onClick={() => setView('admin')} className="text-[10px] font-black text-indigo-400 border border-indigo-500/30 px-5 py-2 rounded-xl bg-indigo-500/5 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest">Admin</button>}
            <button onClick={() => (user && !user.isAnonymous) ? signOut(auth).then(()=>window.location.reload()) : setView('auth')} className="text-slate-500 hover:text-white transition-colors">
              {(user && !user.isAnonymous) ? <LogOut size={20} /> : <User size={20} />}
            </button>
          </div>
        </div>
      </nav>

      <main>
        {loading && casinos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-4">
             <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Syncing Cloud Database...</p>
          </div>
        ) : (
          <>
            {view === 'public' && <ListView casinos={casinos} onOpen={(c) => { setSelectedCasino(c); setView('details'); window.scrollTo(0,0); }} />}
            
            {view === 'details' && selectedCasino && (
              <div className="max-w-4xl mx-auto p-4 pt-10 space-y-10 animate-in fade-in duration-300">
                <button onClick={() => setView('public')} className="text-indigo-400 font-bold mb-6 flex items-center gap-2 uppercase text-[10px] tracking-widest"><ArrowLeft size={16}/> Back</button>
                <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                   <div className="h-40 w-full bg-slate-800 relative overflow-hidden">
                     {selectedCasino.logo && <img src={selectedCasino.logo} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110" alt="" />}
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                   </div>
                   <div className="px-10 pb-10 -mt-16 relative z-10">
                     <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                       <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-800 border-4 border-sl
