import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  ShieldCheck, Star, ExternalLink, Plus, Trash2, Edit3, Lock, 
  LogOut, CheckCircle2, MessageSquare, User, ArrowLeft, Image as ImageIcon,
  Bold, Italic, List, ListOrdered, Eye, ShieldAlert, 
  Underline, Eraser, Minus, Check, ChevronRight
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

// --- CONFIG ---
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
  const [user, setUser] = useState(null);
  const [view, setView] = useState('public');
  const [adminTab, setAdminTab] = useState('casinos');
  const [selectedCasino, setSelectedCasino] = useState(null);
  const [casinos, setCasinos] = useState(() => {
    try {
      const saved = localStorage.getItem('cp_ultra_v3_perfect');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
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

  // 1. Parallel Sync (Data + Auth)
  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) signInAnonymously(auth);
    });

    const q = query(collection(db, 'casinos'), orderBy('rating', 'desc'));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCasinos(data);
      localStorage.setItem('cp_ultra_v3_perfect', JSON.stringify(data));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  // 2. Sub-Collection Sync (User Reviews & Admin Moderation)
  useEffect(() => {
    if (view === 'details' && selectedCasino) {
      const q = query(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snap) => {
        setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.isApproved === true));
      });
    }
    if (view === 'admin' && isAdmin && adminTab === 'moderation') {
      const unsubs = casinos.map(c => onSnapshot(collection(db, 'casinos', c.id, 'user_reviews'), (snap) => {
        const revs = snap.docs.map(d => ({ id: d.id, casinoId: c.id, casinoName: c.name, ...d.data() })).filter(r => !r.isApproved);
        setPendingReviews(prev => {
          const filtered = prev.filter(p => p.casinoId !== c.id);
          return [...filtered, ...revs].sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        });
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
    setNotif("Listing Synchronized");
    setTimeout(() => setNotif(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans pb-10 selection:bg-indigo-500/40">
      
      {/* GLOBAL CSS OVERRIDE FOR LISTS */}
      <style>{`
        .editor-content ul, .prose ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin-bottom: 1rem !important; }
        .editor-content ol, .prose ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin-bottom: 1rem !important; }
        .editor-content li, .prose li { margin-bottom: 0.25rem !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* HEADER */}
      <nav className="sticky top-0 z-[100] bg-[#050608]/95 backdrop-blur-md border-b border-slate-800/60 h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div onClick={() => { setView('public'); setSelectedCasino(null); }} className="flex items-center gap-3 cursor-pointer group">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><ShieldCheck size={24} /></div>
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
            {/* VIEW: LIST */}
            {view === 'public' && (
              <div className="animate-in fade-in duration-500 pt-6">
                <div className="text-center py-10">
                  <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">RANKINGS</h1>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] mt-2">Verified Directory</p>
                </div>
                <div className="grid gap-4 max-w-4xl mx-auto">
                  {casinos.map(c => (
                    <div key={c.id} onClick={() => { setSelectedCasino(c); setView('details'); window.scrollTo(0,0); }} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] flex items-center gap-5 hover:border-indigo-500 transition-all active:scale-95 cursor-pointer shadow-xl relative overflow-hidden group">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700 shadow-inner">
                        {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black bg-indigo-600 italic">CP</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-black text-white truncate italic uppercase tracking-tight">{c.name}</h3>
                        <div className="flex items-center gap-1.5 mt-2"><Star size={10} className="text-amber-400 fill-amber-400" /><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{c.rating} Rating</span></div>
                      </div>
                      <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-600/20">Review</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW: DETAILS */}
            {view === 'details' && selectedCasino && (
              <div className="pt-6 space-y-10 animate-in fade-in max-w-4xl mx-auto">
                <button onClick={() => setView('public')} className="text-indigo-400 font-bold mb-6 flex items-center gap-2 uppercase text-[10px] tracking-widest hover:text-white transition-colors"><ArrowLeft size={16}/> Back</button>
                
                <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                  <div className="h-48 w-full bg-slate-800 relative overflow-hidden">
                    {selectedCasino.logo && <img src={selectedCasino.logo} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-150" alt="" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  </div>
                  <div className="px-10 pb-12 -mt-24 relative z-10">
                    <div className="flex flex-col md:flex-row items-end gap-8 mb-10">
                      <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden bg-slate-800 border-4 border-slate-900 shadow-2xl shrink-0">
                        {selectedCasino.logo ? <img src={selectedCasino.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-5xl font-black text-white italic">CP</div>}
                      </div>
                      <div className="flex-1 pb-2">
                        <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{selectedCasino.name}</h1>
                        <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mt-4 flex items-center gap-2 italic"><Check size={14}/> Verified Directory Listing</p>
                      </div>
                      <a href={selectedCasino.link} target="_blank" rel="noreferrer" className="w-full md:w-auto bg-indigo-600 px-12 py-5 rounded-[2rem] font-black text-white text-center shadow-xl hover:bg-indigo-500 transition-all uppercase tracking-[0.2em] text-xs italic">Play Now</a>
                    </div>
                    <div className="border-t border-slate-800 pt-10">
                       <div className="prose prose-invert max-w-none text-slate-300 text-sm md:text-base italic leading-relaxed space-y-6" dangerouslySetInnerHTML={{ __html: selectedCasino.description }} />
                    </div>
                  </div>
                </div>

                {/* USER FEEDBACK SECTION */}
                <div className="space-y-6 pb-20 px-1">
                  <h2 className="text-2xl font-black text-white uppercase italic flex items-center gap-3"><MessageSquare size={24} className="text-indigo-500" /> Community Feedback</h2>
                  
                  {/* Submission Form (Width Fixed) */}
                  {(!user || user.isAnonymous) ? (
                    <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[2.5rem] text-center max-w-full">
                       <button onClick={() => setView('auth')} className="bg-white text-black px-10 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl">Login to Submit Feedback</button>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-xl max-w-full overflow-hidden">
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        await addDoc(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), { uid: user.uid, email: user.email, rating: Number(newReview.rating), text: newReview.text, isApproved: false, createdAt: serverTimestamp() });
                        setNewReview({ rating: 5, text: '' });
                        setNotif("Submitted for Moderation");
                        setTimeout(() => setNotif(null), 3000);
                      }} className="space-y-4">
                        <div className="flex gap-2 mb-2">{[1,2,3,4,5].map(n => (<button key={n} type="button" onClick={() => setNewReview({...newReview, rating: n})} className={`p-1 ${newReview.rating >= n ? 'text-amber-400' : 'text-slate-700'}`}><Star size={24} fill={newReview.rating >= n ? 'currentColor' : 'none'} /></button>))}</div>
                        <textarea required placeholder="How was your experience?" className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white h-28 outline-none focus:ring-2 focus:ring-indigo-500 text-sm italic" value={newReview.text} onChange={e => setNewReview({...newReview, text: e.target.value})} />
                        <button type="submit" className="bg-indigo-600 px-10 py-4 rounded-2xl font-black text-[10px] text-white uppercase tracking-widest">Submit Feedback</button>
                      </form>
                    </div>
                  )}

                  {/* Reviews List */}
                  <div className="grid gap-4">
                    {reviews.map(r => (
                      <div key={r.id} className="bg-slate-900/30 border border-slate-800 p-6 rounded-[2rem] shadow-sm animate-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-center mb-4">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-[10px] uppercase">{r.email?.charAt(0)}</div>
                             <p className="text-[10px] font-black text-white uppercase tracking-widest">{r.email?.split('@')[0]}</p>
                           </div>
                           <div className="flex gap-0.5 text-amber-500">
                             {[...Array(Number(r.rating || 5))].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                           </div>
                        </div>
                        <p className="text-slate-400 text-xs italic leading-relaxed">"{r.text}"</p>
                      </div>
                    ))}
                    {reviews.length === 0 && <p className="text-center py-10 text-slate-700 font-black uppercase text-[10px] italic">Zero approved feedback items</p>}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: ADMIN PANEL */}
            {view === 'admin' && isAdmin && (
              <div className="pt-6 space-y-10 animate-in zoom-in-95">
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-5 rounded-[2rem] shadow-xl overflow-x-auto no-scrollbar">
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => setAdminTab('casinos')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'casinos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 bg-slate-800'}`}>Directory</button>
                    <button onClick={() => setAdminTab('moderation')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === 'moderation' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 bg-slate-800'}`}>Moderation ({pendingReviews.length})</button>
                  </div>
                  <button onClick={() => { setView('public'); setIsEditing(null); }} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 px-4"><Eye size={16}/> Site</button>
                </div>

                {adminTab === 'casinos' ? (
                  <div className="grid lg:grid-cols-3 gap-10 pb-40">
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl">
                      <h2 className="text-2xl font-black text-white mb-10 italic uppercase tracking-tighter flex items-center gap-3">
                         {isEditing ? <Edit3 size={24} className="text-indigo-400" /> : <Plus size={24} className="text-emerald-500" />}
                         {isEditing ? 'Modify Listing' : 'New Listing'}
                      </h2>
                      <form onSubmit={handleSave} className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                          <input className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold italic" placeholder="Brand Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                          <div className="relative">
                            <input type="file" id="logo-up" hidden onChange={async e => {
                              if (e.target.files[0]) {
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
                              }
                            }} accept="image/*" />
                            <label htmlFor="logo-up" className="flex items-center justify-center gap-3 w-full bg-slate-800 p-5 rounded-2xl text-slate-500 cursor-pointer border-2 border-dashed border-slate-700">
                              {formData.logo ? <CheckCircle2 size={18} className="text-emerald-500" /> : <ImageIcon size={18} />}
                              <span className="font-bold text-[10px] uppercase tracking-widest">{formData.logo ? 'ID Asset Set' : 'Upload Icon'}</span>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="border border-slate-800 rounded-[2.5rem] overflow-hidden bg-black/40 shadow-2xl">
                            <div className="bg-slate-800 p-2.5 flex gap-1.5 border-b border-slate-700 overflow-x-auto no-scrollbar">
                              <button type="button" onClick={() => exec('bold')} className="p-2.5 hover:bg-indigo-600 rounded-xl text-white font-black text-xs">B</button>
                              <button type="button" onClick={() => exec('italic')} className="p-2.5 hover:bg-indigo-600 rounded-xl text-white italic text-xs">I</button>
                              <button type="button" onClick={() => exec('underline')} className="p-2.5 hover:bg-indigo-600 rounded-xl text-white underline text-xs">U</button>
                              <div className="w-[1px] bg-slate-700 mx-1"></div>
                              <button type="button" onClick={() => exec('formatBlock', 'H2')} className="p-2.5 hover:bg-indigo-600 rounded-xl text-white font-black text-[10px]">H2</button>
                              <button type="button" onClick={() => exec('formatBlock', 'H3')} className="p-2.5 hover:bg-indigo-600 rounded-xl text-white font-black text-[10px]">H3</button>
                              <div className="w-[1px] bg-slate-700 mx-1"></div>
                              <button type="button" onClick={() => exec('insertUnorderedList')} className="p-2.5 hover:bg-indigo-600 rounded-xl text-white"><List size={18}/></button>
                              <button type="button" onClick={() => exec('insertOrderedList')} className="p-2.5 hover:bg-indigo-600 rounded-xl text-white"><ListOrdered size={18}/></button>
                              <div className="w-[1px] bg-slate-700 mx-1"></div>
                              <button type="button" onClick={() => { exec('foreColor', '#10b981'); exec('bold'); }} className="px-3 py-1 hover:bg-emerald-600 rounded-xl text-emerald-400 font-black text-[9px] uppercase">PRO</button>
                              <button type="button" onClick={() => { exec('foreColor', '#f43f5e'); exec('bold'); }} className="px-3 py-1 hover:bg-rose-600 rounded-xl text-rose-400 font-black text-[9px] uppercase">CON</button>
                              <div className="w-[1px] bg-slate-700 mx-1"></div>
                              <button type="button" onClick={() => exec('insertHorizontalRule')} className="p-2.5 hover:bg-indigo-600 rounded-xl text-white"><Minus size={18}/></button>
                              <button type="button" onClick={() => exec('removeFormat')} className="p-2.5 hover:bg-rose-900 rounded-xl text-white"><Eraser size={18}/></button>
                            </div>
                            <div ref={editorRef} contentEditable className="editor-content p-10 min-h-[450px] text-white outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-900/50 prose prose-invert max-w-none text-base italic leading-relaxed" onBlur={e => setFormData(p => ({ ...p, description: e.target.innerHTML }))} dangerouslySetInnerHTML={{ __html: isEditing ? formData.description : '' }} />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                          <input className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 text-white outline-none font-bold italic text-sm" placeholder="Promotional Bonus (e.g. 200% up to $5,000)" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} required />
                          <input className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 text-indigo-400 font-mono text-xs outline-none" placeholder="Tracking Link" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} required />
                        </div>
                        <button className="w-full bg-indigo-600 py-6 rounded-[2rem] font-black text-white uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-500 transition-all text-sm">Commit Listing</button>
                      </form>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl h-fit">
                      <div className="p-6 border-b border-slate-800 font-black text-[10px] text-slate-600 uppercase tracking-widest bg-slate-800/20 italic text-center">Live Database</div>
                      <div className="divide-y divide-slate-800/50 max-h-[700px] overflow-y-auto no-scrollbar">
                        {casinos.map(c => (
                          <div key={c.id} className="p-5 flex items-center justify-between hover:bg-slate-800/30 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                               <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700 shadow-xl">
                                  {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-700" />}
                               </div>
                               <span className="font-bold text-sm text-white italic truncate max-w-[120px]">{c.name}</span>
                            </div>
                            <div className="flex gap-2 shrink-0">
                               <button onClick={() => { setIsEditing(c.id); setFormData(c); if(editorRef.current) editorRef.current.innerHTML = c.description; window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-3 text-slate-500 hover:text-indigo-400 transition-colors"><Edit3 size={20}/></button>
                               <button onClick={async () => { if(window.confirm('Delete?')) await deleteDoc(doc(db, 'casinos', c.id)); }} className="p-3 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 size={20}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 max-w-4xl mx-auto pb-40">
                    {pendingReviews.map(r => (
                      <div key={r.id} className="bg-slate-900 border border-slate-800 p-10 rounded-[3.5rem] flex flex-col md:flex-row justify-between gap-10 shadow-2xl animate-in zoom-in-95">
                        <div className="flex-1 space-y-4">
                           <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-[10px] font-black uppercase tracking-widest w-fit italic">{r.casinoName}</div>
                           <p className="text-white text-xl font-medium leading-relaxed italic tracking-tight">"{r.text}"</p>
                           <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">— {r.email}</p>
                        </div>
                        <div className="flex gap-4">
                          <button onClick={async () => await updateDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id), { isApproved: true })} className="bg-emerald-600 px-10 py-5 rounded-3xl font-black text-xs text-white uppercase shadow-lg">Approve</button>
                          <button onClick={async () => await deleteDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id))} className="bg-slate-800 px-6 py-5 rounded-3xl font-black text-xs text-white border border-slate-700 uppercase">Reject</button>
                        </div>
                      </div>
                    ))}
                    {pendingReviews.length === 0 && <div className="p-24 text-center bg-slate-900/50 border border-slate-800 rounded-[4rem] italic text-slate-700 font-black uppercase text-xs tracking-[0.4em]">Queue Empty</div>}
                  </div>
                )}
              </div>
            )}

            {view === 'auth' && (
              <div className="max-w-md mx-auto mt-20 p-12 bg-slate-900 border border-slate-800 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95">
                <div className="text-center mb-10">
                   <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-8 font-black text-white text-4xl italic">CP</div>
                   <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">{isSignUp ? 'REGISTER' : 'LOGIN'}</h2>
                </div>
                <form onSubmit={async e => { e.preventDefault(); try { if (isSignUp) await createUserWithEmailAndPassword(auth, authEmail, authPass); else await signInWithEmailAndPassword(auth, authEmail, authPass); setView('public'); } catch (err) { alert(err.message); } }} className="space-y-4">
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold italic" placeholder="Email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required />
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold italic" type="password" placeholder="Password" value={authPass} onChange={e=>setAuthPass(e.target.value)} required />
                  <button className="w-full bg-indigo-600 py-6 rounded-3xl font-black text-white uppercase shadow-2xl hover:bg-indigo-500 transition-all text-sm tracking-widest">AUTHENTICATE</button>
                </form>
                <button onClick={()=>setIsSignUp(!isSignUp)} className="w-full mt-10 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{isSignUp ? 'Back to Sign In' : 'Register New User'}</button>
              </div>
            )}
          </>
        )}
      </main>

      {notif && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-indigo-600 px-10 py-5 rounded-[2rem] font-black text-white shadow-2xl z-[1000] text-xs uppercase tracking-widest animate-in slide-in-from-bottom-10 border border-indigo-400/20">
          {notif}
        </div>
      )}
    </div>
  );
}
