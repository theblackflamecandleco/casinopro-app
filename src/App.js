import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Star, ExternalLink, Plus, Trash2, Edit3, Lock, 
  LogOut, CheckCircle2, MessageSquare, User, ArrowLeft, Image as ImageIcon,
  Bold, Italic, List, Heading1, Heading2, Eye
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signOut, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword 
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
        const MAX_WIDTH = 400;
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

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('public');
  const [adminTab, setAdminTab] = useState('casinos');
  const [selectedCasino, setSelectedCasino] = useState(null);
  const [casinos, setCasinos] = useState(() => {
    const saved = localStorage.getItem('cp_cache_vFinal');
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
  
  const editorRef = useRef(null);
  const isAdmin = user && user.email === ADMIN_EMAIL;

  // Sync auth
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) signInAnonymously(auth);
    });
  }, []);

  // Sync main casino list
  useEffect(() => {
    const q = collection(db, 'casinos');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = data.sort((a, b) => b.rating - a.rating);
      setCasinos(sorted);
      localStorage.setItem('cp_cache_vFinal', JSON.stringify(sorted));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  // Sync reviews for details page
  useEffect(() => {
    if (!selectedCasino || view !== 'details') return;
    const q = query(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(all.filter(r => r.isApproved === true));
    });
  }, [selectedCasino, view]);

  // Sync pending reviews for admin
  useEffect(() => {
    if (!isAdmin || view !== 'admin' || adminTab !== 'moderation') return;
    const unsubs = casinos.map(c => onSnapshot(collection(db, 'casinos', c.id, 'user_reviews'), (snapshot) => {
      const revs = snapshot.docs.map(doc => ({ id: doc.id, casinoId: c.id, casinoName: c.name, ...doc.data() })).filter(r => !r.isApproved);
      setPendingReviews(prev => [...prev.filter(p => p.casinoId !== c.id), ...revs].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }));
    return () => unsubs.forEach(u => u());
  }, [view, adminTab, casinos, isAdmin]);

  // Rich Text Command
  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      setFormData(prev => ({ ...prev, description: editorRef.current.innerHTML }));
    }
  };

  const handleSaveCasino = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const payload = { ...formData, updatedAt: Date.now() };
    if (isEditing) await setDoc(doc(db, 'casinos', isEditing), payload);
    else await addDoc(collection(db, 'casinos'), payload);
    setFormData({ name: '', rating: '5', bonus: '', link: '', description: '', logo: '' });
    setIsEditing(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setShowNotification("Directory Updated!");
    setTimeout(() => setShowNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans pb-10">
      <nav className="sticky top-0 z-[100] bg-[#050608]/95 backdrop-blur-md border-b border-slate-800/50 h-16 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div onClick={() => { setView('public'); setSelectedCasino(null); }} className="flex items-center gap-3 cursor-pointer">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white font-black"><ShieldCheck size={20} /></div>
            <span className="font-black text-xl tracking-tighter uppercase italic text-white">CASINOPRO</span>
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
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* PUBLIC LIST VIEW */}
            {view === 'public' && (
              <div className="max-w-5xl mx-auto space-y-6 p-4 pt-10 animate-in fade-in">
                <div className="text-center py-10">
                  <h1 className="text-5xl font-black mb-4 text-white italic tracking-tighter uppercase italic">ELITE <span className="text-indigo-500">RANKINGS</span></h1>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Verified Affiliate Portal</p>
                </div>
                <div className="grid gap-4">
                  {casinos.map((c) => (
                    <div key={c.id} onClick={() => { setSelectedCasino(c); setView('details'); window.scrollTo(0,0); }} className="group cursor-pointer bg-slate-900/40 border border-slate-800 rounded-[2rem] p-5 flex items-center gap-5 hover:border-indigo-500/50 transition-all hover:bg-slate-900/80 active:scale-[0.98]">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700 shadow-xl">
                        {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black bg-indigo-600 text-white">{c.name.charAt(0)}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white truncate">{c.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-black text-slate-500 uppercase">{c.rating} Expert Rating</span>
                        </div>
                      </div>
                      <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20">Review</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DETAILS VIEW */}
            {view === 'details' && selectedCasino && (
              <div className="max-w-4xl mx-auto p-4 pt-10 space-y-10 animate-in fade-in">
                <button onClick={() => setView('public')} className="text-indigo-400 font-bold mb-6 flex items-center gap-2 uppercase text-[10px] tracking-widest"><ArrowLeft size={16}/> Back to Directory</button>
                <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                   <div className="h-40 w-full bg-slate-800 relative overflow-hidden">
                     {selectedCasino.logo && <img src={selectedCasino.logo} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110" alt="" />}
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                   </div>
                   <div className="px-10 pb-10 -mt-16 relative z-10">
                     <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                       <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-800 border-4 border-slate-900 shadow-2xl">
                         {selectedCasino.logo ? <img src={selectedCasino.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-4xl font-black text-white">{selectedCasino.name.charAt(0)}</div>}
                       </div>
                       <div className="flex-1 pb-1">
                         <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">{selectedCasino.name}</h1>
                         <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1 flex items-center gap-2 italic"><CheckCircle2 size={14}/> Verified Expert Review</p>
                       </div>
                       <a href={selectedCasino.link} target="_blank" rel="noreferrer" className="w-full md:w-auto bg-indigo-600 px-10 py-4 rounded-2xl font-black text-white text-center shadow-lg hover:bg-indigo-500 transition-all uppercase tracking-widest text-xs">Play Now</a>
                     </div>
                     <div className="border-t border-slate-800 pt-10">
                        <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm md:text-base space-y-4" dangerouslySetInnerHTML={{ __html: selectedCasino.description }} />
                     </div>
                   </div>
                </div>
                {/* Community Reviews Section */}
                <div className="space-y-6 pb-20">
                  <h2 className="text-2xl font-black text-white uppercase flex items-center gap-2 italic"><MessageSquare className="text-indigo-500" /> Community Feedback</h2>
                  {(!user || user.isAnonymous) ? (
                    <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[3rem] text-center">
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Authenticated session required to share feedback</p>
                      <button onClick={() => setView('auth')} className="bg-white text-black px-10 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Sign In to Review</button>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        await addDoc(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), { uid: user.uid, email: user.email, rating: Number(newReview.rating), text: newReview.text, isApproved: false, createdAt: serverTimestamp() });
                        setNewReview({ rating: 5, text: '' });
                        setShowNotification("Submitted for Moderation");
                        setTimeout(() => setShowNotification(null), 3000);
                      }} className="space-y-4">
                        <div className="flex gap-2 mb-2">
                          {[1,2,3,4,5].map(num => (
                            <button key={num} type="button" onClick={() => setNewReview({...newReview, rating: num})} className={`p-1 ${newReview.rating >= num ? 'text-amber-400' : 'text-slate-700'}`}>
                              <Star size={24} fill={newReview.rating >= num ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
                        <textarea required placeholder="How was your experience?" className="w-full bg-slate-800 border-none rounded-xl p-4 text-white h-24 outline-none focus:ring-2 focus:ring-indigo-500 text-sm italic" value={newReview.text} onChange={(e) => setNewReview({...newReview, text: e.target.value})} />
                        <button type="submit" className="bg-indigo-600 px-8 py-3 rounded-xl font-black text-[10px] text-white uppercase tracking-widest shadow-lg shadow-indigo-600/20">Submit Review</button>
                      </form>
                    </div>
                  )}
                  <div className="space-y-4">
                    {reviews.map(r => (
                      <div key={r.id} className="bg-slate-900/30 border border-slate-800 p-6 rounded-[2rem] shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">{r.email?.charAt(0).toUpperCase()}</div>
                             <div>
                               <p className="text-[10px] font-black text-white">{r.email?.split('@')[0]}</p>
                               <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={8} className={i < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-700"} />)}</div>
                             </div>
                           </div>
                        </div>
                        <p className="text-slate-400 text-xs italic leading-relaxed">"{r.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN VIEW - FULL INTERFACE */}
            {view === 'admin' && isAdmin && (
              <div className="max-w-6xl mx-auto space-y-8 p-4 pt-10 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] shadow-xl">
                  <div className="flex gap-3">
                    <button onClick={() => setAdminTab('casinos')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${adminTab === 'casinos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 bg-slate-800'}`}>Directory</button>
                    <button onClick={() => setAdminTab('moderation')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${adminTab === 'moderation' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 bg-slate-800'}`}>Reviews ({pendingReviews.length})</button>
                  </div>
                  <button onClick={() => setView('public')} className="text-xs font-black text-indigo-400 hover:text-white flex items-center gap-2 uppercase tracking-widest"><Eye size={16}/> View Site</button>
                </div>

                {adminTab === 'casinos' ? (
                  <div className="grid lg:grid-cols-3 gap-8 pb-40">
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl">
                      <h2 className="text-xl font-black text-white mb-8 italic uppercase tracking-tighter flex items-center gap-2">
                        {isEditing ? <Edit3 className="text-indigo-400" /> : <Plus className="text-emerald-500" />}
                        {isEditing ? 'Modify Review' : 'Create Listing'}
                      </h2>
                      <form onSubmit={handleSaveCasino} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <input className="w-full bg-slate-800 rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Casino Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                          <div className="relative">
                            <input type="file" id="logo-up" hidden onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const base64 = await optimizeImage(file);
                                setFormData(prev => ({ ...prev, logo: base64 }));
                              }
                            }} accept="image/*" />
                            <label htmlFor="logo-up" className="flex items-center justify-center gap-2 w-full bg-slate-800 p-5 rounded-2xl text-slate-400 cursor-pointer hover:bg-slate-700 border border-dashed border-slate-700">
                              {formData.logo ? <CheckCircle2 size={18} className="text-emerald-500" /> : <ImageIcon size={18} />}
                              <span className="font-bold text-[10px] uppercase">{formData.logo ? 'Logo Uploaded' : 'Upload Casino Logo'}</span>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Expert Verdict (Format text below)</label>
                          <div className="border border-slate-800 rounded-3xl overflow-hidden bg-black/40">
                            <div className="bg-slate-800 p-2 flex gap-1 border-b border-slate-700 overflow-x-auto">
                              <button type="button" onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-700 rounded text-white font-black">B</button>
                              <button type="button" onClick={() => execCmd('italic')} className="p-2 hover:bg-slate-700 rounded text-white italic font-serif">I</button>
                              <button type="button" onClick={() => execCmd('formatBlock', 'H2')} className="p-2 hover:bg-slate-700 rounded text-white font-black text-xs uppercase">H2</button>
                              <button type="button" onClick=
