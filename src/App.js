import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  ShieldCheck, Star, ExternalLink, Plus, Trash2, Edit3, Lock, 
  LogOut, CheckCircle2, MessageSquare, User, ArrowLeft, Image as ImageIcon,
  Bold, Italic, List, ListOrdered, Eye, ShieldAlert, 
  Underline, Eraser, Minus, Check
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

export default function App() {
  // 1. INSTANT STATE: Load from phone memory first
  const [casinos, setCasinos] = useState(() => {
    try {
      const saved = localStorage.getItem('cp_ultra_v1');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [user, setUser] = useState(null);
  const [view, setView] = useState('public');
  const [adminTab, setAdminTab] = useState('casinos');
  const [selectedCasino, setSelectedCasino] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(casinos.length === 0);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', rating: '5', bonus: '', link: '', description: '', logo: '' });
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [notif, setNotif] = useState(null);
  
  const editorRef = useRef(null);
  const isAdmin = user && user.email === ADMIN_EMAIL;

  // 2. PARALLEL SYNC: Don't let Auth block the Data
  useEffect(() => {
    // Auth Handshake (Background)
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) signInAnonymously(auth);
    });

    // Data Sync (Instant)
    const q = query(collection(db, 'casinos'), orderBy('rating', 'desc'));
    const unsubData = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCasinos(data);
      localStorage.setItem('cp_ultra_v1', JSON.stringify(data));
      setLoading(false);
    }, () => setLoading(false));

    return () => { unsubAuth(); unsubData(); };
  }, []);

  // Sync Details & Moderation
  useEffect(() => {
    if (view === 'details' && selectedCasino) {
      return onSnapshot(query(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), orderBy('createdAt', 'desc')), (snap) => {
        setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.isApproved));
      });
    }
    if (view === 'admin' && isAdmin && adminTab === 'moderation') {
      const unsubs = casinos.map(c => onSnapshot(collection(db, 'casinos', c.id, 'user_reviews'), (snap) => {
        const revs = snap.docs.map(d => ({ id: d.id, casinoId: c.id, casinoName: c.name, ...d.data() })).filter(r => !r.isApproved);
        setPendingReviews(prev => [...prev.filter(p => p.casinoId !== c.id), ...revs]);
      }));
      return () => unsubs.forEach(u => u());
    }
  }, [view, selectedCasino, adminTab, isAdmin, casinos]);

  const exec = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) setFormData(p => ({ ...p, description: editorRef.current.innerHTML }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const p = { ...formData, updatedAt: Date.now() };
    if (isEditing) await setDoc(doc(db, 'casinos', isEditing), p);
    else await addDoc(collection(db, 'casinos'), p);
    setFormData({ name: '', rating: '5', bonus: '', link: '', description: '', logo: '' });
    setIsEditing(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setNotif("Update Live!");
    setTimeout(() => setNotif(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans pb-10">
      
      {/* HEADER - ALWAYS ON */}
      <nav className="sticky top-0 z-[100] bg-[#050608] border-b border-slate-800/60 h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div onClick={() => { setView('public'); setSelectedCasino(null); }} className="flex items-center gap-3 cursor-pointer">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30"><ShieldCheck size={24} /></div>
            <span className="font-black text-2xl tracking-tighter uppercase italic">CASINOPRO</span>
          </div>
          <div className="flex gap-3">
            {isAdmin && <button onClick={() => setView('admin')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Admin</button>}
            <button onClick={() => (user && !user.isAnonymous) ? signOut(auth).then(()=>window.location.reload()) : setView('auth')} className="bg-white text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-xl">
              {(user && !user.isAnonymous) ? 'Logout' : 'Login'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4">
        {loading && casinos.length === 0 ? (
          <div className="flex justify-center py-40"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <>
            {/* VIEW: DIRECTORY */}
            {view === 'public' && (
              <div className="animate-in fade-in duration-300 pt-10">
                <div className="text-center py-10">
                  <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">RANKINGS</h1>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">2026 Verified Directory</p>
                </div>
                <div className="grid gap-4">
                  {casinos.map(c => (
                    <div key={c.id} onClick={() => { setSelectedCasino(c); setView('details'); window.scrollTo(0,0); }} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] flex items-center gap-5 hover:border-indigo-500 transition-all active:scale-95 cursor-pointer shadow-xl">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                        {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black bg-indigo-600">CP</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-black text-white truncate italic uppercase tracking-tight">{c.name}</h3>
                        <div className="flex items-center gap-1 mt-1"><Star size={10} className="text-amber-400 fill-amber-400" /><span className="text-[10px] text-slate-500 uppercase font-black">{c.rating} Expert Rating</span></div>
                      </div>
                      <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase">Review</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW: DETAILS */}
            {view === 'details' && selectedCasino && (
              <div className="pt-10 space-y-10 animate-in fade-in">
                <button onClick={() => setView('public')} className="text-indigo-400 font-bold mb-6 flex items-center gap-2 uppercase text-[10px] tracking-widest"><ArrowLeft size={16}/> Back</button>
                <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                  <div className="h-48 w-full bg-slate-800 relative overflow-hidden">
                    {selectedCasino.logo && <img src={selectedCasino.logo} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110" alt="" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  </div>
                  <div className="px-10 pb-10 -mt-20 relative z-10">
                    <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                      <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-800 border-4 border-slate-900">
                        {selectedCasino.logo ? <img src={selectedCasino.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-4xl font-black text-white">CP</div>}
                      </div>
                      <div className="flex-1 pb-1"><h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">{selectedCasino.name}</h1></div>
                      <a href={selectedCasino.link} target="_blank" rel="noreferrer" className="bg-indigo-600 px-12 py-5 rounded-3xl font-black text-white text-center shadow-lg hover:bg-indigo-500 transition-all uppercase tracking-widest text-xs">Play Now</a>
                    </div>
                    <div className="border-t border-slate-800 pt-8 prose prose-invert max-w-none text-slate-300 text-sm md:text-base italic leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedCasino.description }} />
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: ADMIN PANEL */}
            {view === 'admin' && isAdmin && (
              <div className="pt-10 space-y-10 animate-in zoom-in-95">
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
                  <div className="flex gap-3">
                    <button onClick={() => setAdminTab('casinos')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase ${adminTab === 'casinos' ? 'bg-indigo-600 text-white' : 'text-slate-500 bg-slate-800'}`}>Directory</button>
                    <button onClick={() => setAdminTab('moderation')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase ${adminTab === 'moderation' ? 'bg-indigo-600 text-white' : 'text-slate-500 bg-slate-800'}`}>Reviews ({pendingReviews.length})</button>
                  </div>
                  <button onClick={() => setView('public')} className="text-xs font-black text-indigo-400 uppercase flex items-center gap-2"><Eye size={16}/> Site</button>
                </div>
                {adminTab === 'casinos' ? (
                  <div className="grid lg:grid-cols-3 gap-8 pb-40">
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl">
                      <h2 className="text-2xl font-black text-white mb-8 italic uppercase tracking-tighter">Modify Listing</h2>
                      <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <input className="w-full bg-slate-800 rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Brand Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                          <div className="relative">
                            <input type="file" id="logo-up" hidden onChange={async e => { if (e.target.files[0]) { 
                              const reader = new FileReader();
                              reader.readAsDataURL(e.target.files[0]);
                              reader.onload = (ev) => {
                                const img = new Image();
                                img.src = ev.target.result;
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const ctx = canvas.getContext('2d');
                                  canvas.width = 300; canvas.height = 300;
                                  ctx.drawImage(img, 0, 0, 300, 300);
                                  setFormData(p => ({ ...p, logo: canvas.toDataURL('image/jpeg', 0.6) }));
                                };
                              };
                            }}} accept="image/*" />
                            <label htmlFor="logo-up" className="flex items-center justify-center gap-2 w-full bg-slate-800 p-5 rounded-2xl text-slate-400 cursor-pointer border-2 border-dashed border-slate-700">
                              {formData.logo ? <CheckCircle2 size={18} className="text-emerald-500" /> : <ImageIcon size={18} />}
                              <span className="font-bold text-[10px] uppercase">{formData.logo ? 'Logo Set' : 'Upload Logo'}</span>
                            </label>
                          </div>
                        </div>

                        {/* ADVANCED EDITOR */}
                        <div className="space-y-2">
                          <div className="border border-slate-800 rounded-3xl overflow-hidden bg-black/40">
                            <div className="bg-slate-800 p-2 flex gap-1 border-b border-slate-700 overflow-x-auto no-scrollbar">
                              <button type="button" onClick={() => exec('bold')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white font-bold">B</button>
                              <button type="button" onClick={() => exec('italic')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white italic">I</button>
                              <button type="button" onClick={() => exec('underline')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white underline">U</button>
                              <div className="w-[1px] bg-slate-700 mx-1"></div>
                              <button type="button" onClick={() => exec('formatBlock', 'H2')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white font-black text-xs">H2</button>
                              <button type="button" onClick={() => exec('formatBlock', 'H3')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white font-black text-xs">H3</button>
                              <button type="button" onClick={() => exec('insertUnorderedList')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white"><List size={16}/></button>
                              <button type="button" onClick={() => exec('insertOrderedList')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white"><ListOrdered size={16}/></button>
                              <div className="w-[1px] bg-slate-700 mx-1"></div>
                              <button type="button" onClick={() => exec('foreColor', '#10b981')} className="p-2.5 hover:bg-emerald-600 rounded-lg text-emerald-400 font-bold text-xs">Green</button>
                              <button type="button" onClick={() => exec('foreColor', '#f43f5e')} className="p-2.5 hover:bg-rose-600 rounded-lg text-rose-400 font-bold text-xs">Red</button>
                              <button type="button" onClick={() => exec('insertHorizontalRule')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white"><Minus size={16}/></button>
                              <button type="button" onClick={() => exec('removeFormat')} className="p-2.5 hover:bg-rose-900 rounded-lg text-white"><Eraser size={16}/></button>
                            </div>
                            <div ref={editorRef} contentEditable className="p-8 min-h-[400px] text-white outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-900/50 prose prose-invert max-w-none text-base italic leading-relaxed" onBlur={e => setFormData(p => ({ ...p, description: e.target.innerHTML }))} />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <input className="bg-slate-800 rounded-2xl p-5 text-white outline-none font-bold italic" placeholder="Bonus Header" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} required />
                          <input className="bg-slate-800 rounded-2xl p-5 text-indigo-400 font-mono text-xs outline-none" placeholder="Affiliate URL" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} required />
                        </div>
                        <button className="w-full bg-indigo-600 py-6 rounded-3xl font-black text-white uppercase tracking-widest shadow-xl hover:bg-indigo-500">Publish Listing</button>
                      </form>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl h-fit">
                      <div className="p-6 border-b border-slate-800 font-black text-[10px] text-slate-500 uppercase tracking-widest italic text-center">Active Feed</div>
                      <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto no-scrollbar">
                        {casinos.map(c => (
                          <div key={c.id} className="p-5 flex items-center justify-between hover:bg-slate-800/30">
                            <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700 shadow-xl">{c.logo && <img src={c.logo} className="w-full h-full object-cover" />}</div><span className="font-bold text-sm text-white italic truncate max-w-[100px]">{c.name}</span></div>
                            <div className="flex gap-1 shrink-0"><button onClick={() => { setIsEditing(c.id); setFormData(c); if(editorRef.current) editorRef.current.innerHTML = c.description; window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"><Edit3 size={18}/></button><button onClick={async () => { if(window.confirm('Delete?')) await deleteDoc(doc(db, 'casinos', c.id)); }} className="p-2 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 size={18}/></button></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 max-w-4xl mx-auto pb-40">
                    {pendingReviews.map(r => (
                      <div key={r.id} className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] flex flex-col md:flex-row justify-between gap-10 shadow-2xl animate-in zoom-in-95">
                        <div className="flex-1 space-y-4"><p className="text-white text-lg font-medium italic leading-relaxed">"{r.text}"</p><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">— {r.email} ({r.casinoName})</p></div>
                        <div className="flex items-center gap-4 shrink-0"><button onClick={async () => await updateDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id), { isApproved: true })} className="bg-emerald-600 px-8 py-4 rounded-2xl font-black text-xs text-white uppercase shadow-lg shadow-emerald-600/20 transition-all">Approve</button><button onClick
