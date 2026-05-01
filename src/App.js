import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Star, ExternalLink, Plus, Trash2, Edit3, Lock, 
  LogOut, CheckCircle2, MessageSquare, User, ArrowLeft, Image as ImageIcon,
  Bold, Italic, List, ListOrdered, Heading1, Heading2, Eye, ShieldAlert, 
  Underline, Palette, Type, Eraser, Minus
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
const optimizeImg = (file) => {
  return new Promise((res) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 300;
        const scale = size / img.width;
        canvas.width = size;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, size, canvas.height);
        res(canvas.toDataURL('image/jpeg', 0.6));
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
    const saved = localStorage.getItem('cp_cache_v_mega');
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
  const [notif, setNotif] = useState(null);
  
  const editorRef = useRef(null);
  const isAdmin = user && user.email === ADMIN_EMAIL;

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) signInAnonymously(auth);
    });

    return onSnapshot(collection(db, 'casinos'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = data.sort((a, b) => b.rating - a.rating);
      setCasinos(sorted);
      localStorage.setItem('cp_cache_v_mega', JSON.stringify(sorted));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCasino || view !== 'details') return;
    const q = query(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReviews(all.filter(r => r.isApproved));
    });
  }, [selectedCasino, view]);

  useEffect(() => {
    if (!isAdmin || view !== 'admin' || adminTab !== 'moderation') return;
    const unsubs = casinos.map(c => onSnapshot(collection(db, 'casinos', c.id, 'user_reviews'), (snap) => {
      const revs = snap.docs.map(d => ({ id: d.id, casinoId: c.id, casinoName: c.name, ...d.data() })).filter(r => !r.isApproved);
      setPendingReviews(prev => [...prev.filter(p => p.casinoId !== c.id), ...revs]);
    }));
    return () => unsubs.forEach(u => u());
  }, [view, adminTab, casinos, isAdmin]);

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
    setNotif("Listing Published!");
    setTimeout(() => setNotif(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans pb-10">
      <nav className="sticky top-0 z-[100] bg-[#050608]/95 backdrop-blur-md border-b border-slate-800/50 h-16 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div onClick={() => { setView('public'); setSelectedCasino(null); }} className="flex items-center gap-2 cursor-pointer">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-lg shadow-indigo-600/20"><ShieldCheck size={20} /></div>
            <span className="font-black text-xl tracking-tighter uppercase italic text-white">CASINOPRO</span>
          </div>
          <div className="flex gap-4">
            {isAdmin && <button onClick={() => setView('admin')} className="text-[10px] font-black text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl bg-indigo-500/5 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest">Admin</button>}
            <button onClick={() => (user && !user.isAnonymous) ? signOut(auth).then(()=>window.location.reload()) : setView('auth')} className="text-slate-500 hover:text-white transition-colors">
              {(user && !user.isAnonymous) ? <LogOut size={20} /> : <User size={20} />}
            </button>
          </div>
        </div>
      </nav>

      <main>
        {loading && casinos.length === 0 ? (
          <div className="flex justify-center py-40"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <>
            {view === 'public' && (
              <div className="max-w-5xl mx-auto p-4 pt-10 space-y-6 animate-in fade-in">
                <div className="text-center py-10">
                  <h1 className="text-5xl font-black mb-2 tracking-tighter italic uppercase">RANKINGS</h1>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Official 2026 Directory</p>
                </div>
                <div className="grid gap-4">
                  {casinos.map(c => (
                    <div key={c.id} onClick={() => { setSelectedCasino(c); setView('details'); window.scrollTo(0,0); }} className="bg-slate-900 border border-slate-800 p-4 rounded-[1.5rem] flex items-center gap-4 hover:border-indigo-500/50 transition-all active:scale-95 cursor-pointer shadow-xl">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700 shadow-inner">
                        {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black bg-indigo-600 text-white">CP</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate uppercase italic">{c.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1"><Star size={10} className="text-amber-400 fill-amber-400" /><span className="text-[10px] text-slate-500 uppercase font-black">{c.rating} Score</span></div>
                      </div>
                      <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg">Review</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'details' && selectedCasino && (
              <div className="max-w-4xl mx-auto p-4 pt-10 space-y-10 animate-in fade-in">
                <button onClick={() => setView('public')} className="text-indigo-400 font-bold mb-6 flex items-center gap-2 uppercase text-[10px] tracking-widest"><ArrowLeft size={16}/> Back</button>
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <div className="h-40 w-full bg-slate-800 relative overflow-hidden">
                    {selectedCasino.logo && <img src={selectedCasino.logo} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110" alt="" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  </div>
                  <div className="px-10 pb-10 -mt-16 relative z-10">
                    <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                      <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-800 border-4 border-slate-900 shadow-2xl shrink-0">
                        {selectedCasino.logo ? <img src={selectedCasino.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-4xl font-black text-white italic">CP</div>}
                      </div>
                      <div className="flex-1 pb-1"><h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">{selectedCasino.name}</h1></div>
                      <a href={selectedCasino.link} target="_blank" rel="noreferrer" className="bg-indigo-600 px-10 py-4 rounded-xl font-black text-white text-center shadow-lg hover:bg-indigo-500 transition-all uppercase tracking-widest text-xs">Play Now</a>
                    </div>
                    <div className="border-t border-slate-800 pt-8"><div className="prose prose-invert max-w-none text-slate-300 text-sm italic leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedCasino.description }} /></div>
                  </div>
                </div>
                <div className="space-y-6 pb-20">
                  <h2 className="text-2xl font-black text-white uppercase italic flex items-center gap-2 tracking-tight"><MessageSquare size={20} className="text-indigo-500" /> Community Feedback</h2>
                  {reviews.map(r => (
                    <div key={r.id} className="bg-slate-900/30 border border-slate-800 p-6 rounded-[1.5rem]">
                      <p className="text-[10px] font-black text-white uppercase mb-2">{r.email?.split('@')[0]}</p>
                      <p className="text-slate-400 text-xs italic leading-relaxed">"{r.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'admin' && isAdmin && (
              <div className="max-w-6xl mx-auto p-4 pt-10 space-y-10 animate-in zoom-in-95">
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl">
                  <div className="flex gap-3">
                    <button onClick={() => setAdminTab('casinos')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${adminTab === 'casinos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 bg-slate-800'}`}>Directory</button>
                    <button onClick={() => setAdminTab('moderation')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${adminTab === 'moderation' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 bg-slate-800'}`}>Reviews ({pendingReviews.length})</button>
                  </div>
                  <button onClick={() => setView('public')} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Eye size={16}/> Live Site</button>
                </div>
                {adminTab === 'casinos' ? (
                  <div className="grid lg:grid-cols-3 gap-8 pb-40">
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl">
                      <h2 className="text-xl font-black text-white mb-8 italic uppercase tracking-tighter flex items-center gap-2">{isEditing ? 'Modify Review' : 'Create Listing'}</h2>
                      <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <input className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold italic" placeholder="Brand Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                          <div className="relative">
                            <input type="file" id="logo-up" hidden onChange={async e => { if (e.target.files[0]) { const b = await optimizeImg(e.target.files[0]); setFormData(p => ({ ...p, logo: b })); } }} accept="image/*" />
                            <label htmlFor="logo-up" className="flex items-center justify-center gap-2 w-full bg-slate-800 p-5 rounded-2xl text-slate-400 cursor-pointer border border-dashed border-slate-700 hover:bg-slate-700 transition-colors">
                              {formData.logo ? <CheckCircle2 size={18} className="text-emerald-500" /> : <ImageIcon size={18} />}
                              <span className="font-bold text-[10px] uppercase tracking-widest">{formData.logo ? 'Identity Set' : 'Upload Icon'}</span>
                            </label>
                          </div>
                        </div>

                        {/* MEGA TOOLBAR EDITOR */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Advanced Content Editor</label>
                          <div className="border border-slate-800 rounded-3xl overflow-hidden bg-black/40 shadow-inner">
                            <div className="bg-slate-800 p-2 flex gap-1 border-b border-slate-700 overflow-x-auto no-scrollbar">
                              <button type="button" onClick={() => exec('bold')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white"><Bold size={16}/></button>
                              <button type="button" onClick={() => exec('italic')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white"><Italic size={16}/></button>
                              <button type="button" onClick={() => exec('underline')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white"><Underline size={16}/></button>
                              <div className="w-[1px] bg-slate-700 mx-1"></div>
                              <button type="button" onClick={() => exec('formatBlock', 'H2')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white font-black text-[10px]">H2</button>
                              <button type="button" onClick={() => exec('formatBlock', 'H3')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white font-black text-[10px]">H3</button>
                              <div className="w-[1px] bg-slate-700 mx-1"></div>
                              <button type="button" onClick={() => exec('insertUnorderedList')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white"><List size={16}/></button>
                              <button type="button" onClick={() => exec('insertOrderedList')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white"><ListOrdered size={16}/></button>
                              <div className="w-[1px] bg-slate-700 mx-1"></div>
                              <button type="button" onClick={() => exec('foreColor', '#10b981')} className="p-2.5 hover:bg-emerald-600 rounded-lg text-emerald-400"><Check size={16}/></button>
                              <button type="button" onClick={() => exec('foreColor', '#f43f5e')} className="p-2.5 hover:bg-rose-600 rounded-lg text-rose-400"><ShieldAlert size={16}/></button>
                              <button type="button" onClick={() => exec('insertHorizontalRule')} className="p-2.5 hover:bg-indigo-600 rounded-lg text-white"><Minus size={16}/></button>
                              <button type="button" onClick={() => exec('removeFormat')} className="p-2.5 hover:bg-rose-900 rounded-lg text-white"><Eraser size={16}/></button>
                            </div>
                            <div ref={editorRef} contentEditable className="p-8 min-h-[400px] text-white outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-900/50 prose prose-invert max-w-none text-base italic leading-relaxed" onBlur={e => setFormData(p => ({ ...p, description: e.target.innerHTML }))} />
                          </div>
                          <p className="text-[9px] text-slate-600 uppercase font-bold text-center">Tip: Press 'Enter' twice for paragraph spacing</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <input className="bg-slate-800 rounded-2xl p-5 text-white outline-none font-bold italic text-sm" placeholder="Bonus Header" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} required />
                          <input className="bg-slate-800 rounded-2xl p-5 text-indigo-400 font-mono text-xs outline-none" placeholder="Affiliate URL" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} required />
                        </div>
                        <button className="w-full bg-indigo-600 py-6 rounded-3xl font-black text-white uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-500 transition-all">Launch Review</button>
                      </form>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl h-fit">
                      <div className="p-6 border-b border-slate-800 font-black text-[10px] text-slate-500 uppercase tracking-widest bg-slate-800/20 italic text-center">Live Listings</div>
                      <div className="divide-y divide-slate-800/50">
                        {casinos.map(c => (
                          <div key={c.id} className="p-5 flex items-center justify-between hover:bg-slate-800/30">
                            <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700 shadow-xl">{c.logo && <img src={c.logo} className="w-full h-full object-cover" />}</div><span className="font-bold text-sm text-white italic truncate">{c.name}</span></div>
                            <div className="flex gap-1 shrink-0"><button onClick={() => { setIsEditing(c.id); setFormData(c); if(editorRef.current) editorRef.current.innerHTML = c.description; window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"><Edit3 size={18}/></button><button onClick={async () => { if(window.confirm('Delete?')) await deleteDoc(doc(db, 'casinos', c.id)); }} className="p-2 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 size={18}/></button></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 max-w-4xl mx-auto pb-40">
                    {pendingReviews.map(r => (
                      <div key={r.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between gap-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex-1 space-y-3"><p className="text-white font-medium italic leading-relaxed text-lg">"{r.text}"</p><p className="text-slate-500 text-xs font-bold uppercase tracking-widest">— {r.email} ({r.casinoName})</p></div>
                        <div className="flex items-center gap-3 shrink-0"><button onClick={async () => await updateDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id), { isApproved: true })} className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-2xl font-black text-xs text-white uppercase">Approve</button><button onClick={async () => await deleteDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id))} className="bg-slate-800 px-6 py-4 rounded-2xl font-black text-xs text-white border border-slate-700 uppercase">Reject</button></div>
                      </div>
                    ))}
                    {pendingReviews.length === 0 && <p className="p-20 text-center text-slate-700 font-black uppercase text-xs">No pending items</p>}
                  </div>
                )}
              </div>
            )}

            {view === 'auth' && (
              <div className="max-w-md mx-auto mt-20 p-12 bg-slate-900 border border-slate-800 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95">
                <div className="text-center mb-10"><div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-6 font-black text-white text-3xl italic">CP</div><h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">{isSignUp ? 'REGISTER' : 'LOGIN'}</h2></div>
                <form onSubmit={async e => { e.preventDefault(); try { if (isSignUp) await createUserWithEmailAndPassword(auth, authEmail, authPass); else await signInWithEmailAndPassword(auth, authEmail, authPass); setView('public'); } catch (err) { alert(err.message); } }} className="space-y-4">
                  <input className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold italic" placeholder="Email Address" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required />
                  <input className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold italic" type="password" placeholder="Password" value={authPass} onChange={e=>setAuthPass(e.target.value)} required />
                  <button className="w-full bg-indigo-600 py-5 rounded-3xl font-black text-white uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-500 transition-all">CONTINUE</button>
                </form>
                <button onClick={()=>setIsSignUp(!isSignUp)} className="w-full mt-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">{isSignUp ? 'Login' : 'Sign Up'}</button>
              </div>
            )}
          </>
        )}
      </main>
      {notif && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-indigo-600 px-8 py-4 rounded-3xl font-black text-white shadow-2xl z-[1000] text-xs uppercase tracking-widest animate-in slide-in-from-bottom-6">{notif}</div>}
    </div>
  );
}
