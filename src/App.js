import React, { useState, useEffect, useRef } from 'react';
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

// --- CONFIGURATION (CONNECTED TO YOUR DATABASE) ---
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
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [view, setView] = useState('public');
  const [adminTab, setAdminTab] = useState('casinos');
  const [selectedCasino, setSelectedCasino] = useState(null);
  const [casinos, setCasinos] = useState(() => {
    const saved = localStorage.getItem('cp_cache_v_fixed_final');
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

  // --- DATABASE SYNC ---
  useEffect(() => {
    // Auth Listener
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) signInAnonymously(auth);
    });

    // Casino Data Listener (Instant Load)
    return onSnapshot(collection(db, 'casinos'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = data.sort((a, b) => b.rating - a.rating);
      setCasinos(sorted);
      localStorage.setItem('cp_cache_v_fixed_final', JSON.stringify(sorted));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  // Sync reviews for details
  useEffect(() => {
    if (!selectedCasino || view !== 'details') return;
    const q = query(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReviews(all.filter(r => r.isApproved));
    });
  }, [selectedCasino, view]);

  // Sync Moderation Queue for Admin
  useEffect(() => {
    if (!isAdmin || view !== 'admin' || adminTab !== 'moderation') return;
    const unsubs = casinos.map(c => onSnapshot(collection(db, 'casinos', c.id, 'user_reviews'), (snap) => {
      const revs = snap.docs.map(d => ({ id: d.id, casinoId: c.id, casinoName: c.name, ...d.data() })).filter(r => !r.isApproved);
      setPendingReviews(prev => [...prev.filter(p => p.casinoId !== c.id), ...revs]);
    }));
    return () => unsubs.forEach(u => u());
  }, [view, adminTab, casinos, isAdmin]);

  // --- HANDLERS ---
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

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, authEmail, authPass);
      else await signInWithEmailAndPassword(auth, authEmail, authPass);
      setView('public');
    } catch (err) { alert(err.message); }
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans pb-10">
      
      {/* NAVIGATION BAR - FIXED & PERSISTENT */}
      <nav className="sticky top-0 z-[100] bg-[#050608] border-b border-slate-800 h-20 flex items-center px-6 shadow-2xl">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div onClick={() => { setView('public'); setSelectedCasino(null); }} className="flex items-center gap-3 cursor-pointer">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/20"><ShieldCheck size={24} /></div>
            <span className="font-black text-xl tracking-tighter uppercase italic text-white">CASINOPRO</span>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button 
                onClick={() => setView('admin')} 
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
              >
                ADMIN
              </button>
            )}

            {(!user || user.isAnonymous) ? (
              <button 
                onClick={() => { setView('auth'); setIsSignUp(false); }} 
                className="bg-white text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl"
              >
                LOGIN
              </button>
            ) : (
              <button 
                onClick={() => { signOut(auth); window.location.reload(); }} 
                className="bg-slate-800 text-rose-500 border border-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase"
              >
                LOGOUT
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-6xl mx-auto p-4">
        
        {/* VIEW: DIRECTORY (HOME) */}
        {view === 'public' && (
          <div className="animate-in fade-in duration-500 pt-10">
            <div className="text-center py-10">
              <h1 className="text-6xl font-black mb-4 text-white italic tracking-tighter uppercase underline decoration-indigo-500 underline-offset-8">RANKINGS</h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">Verified Affiliate Feed</p>
            </div>
            <div className="grid gap-4">
              {casinos.map(c => (
                <div key={c.id} onClick={() => { setSelectedCasino(c); setView('details'); window.scrollTo(0,0); }} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] flex items-center gap-5 hover:border-indigo-500 transition-all active:scale-95 cursor-pointer shadow-xl">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                    {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black bg-indigo-600">CP</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-black text-white truncate leading-none uppercase italic">{c.name}</h3>
                    <div className="flex items-center gap-1.5 mt-2"><Star size={12} className="text-amber-400 fill-amber-400" /><span className="text-[10px] text-slate-500 uppercase font-black">{c.rating} Rating</span></div>
                  </div>
                  <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-600/20">Review</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: ADMIN DASHBOARD (NO PLACEHOLDERS) */}
        {view === 'admin' && isAdmin && (
          <div className="pt-10 space-y-10 animate-in zoom-in-95">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl">
              <div className="flex gap-3">
                <button onClick={() => setAdminTab('casinos')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest ${adminTab === 'casinos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 bg-slate-800'}`}>DIRECTORY</button>
                <button onClick={() => setAdminTab('moderation')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest ${adminTab === 'moderation' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 bg-slate-800'}`}>REVIEWS ({pendingReviews.length})</button>
              </div>
              <button onClick={() => setView('public')} className="text-xs font-black text-indigo-400 hover:text-white flex items-center gap-2 uppercase"><Eye size={16}/> PREVIEW SITE</button>
            </div>

            {adminTab === 'casinos' ? (
              <div className="grid lg:grid-cols-3 gap-8 pb-40">
                {/* CREATE/EDIT FORM */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl">
                  <h2 className="text-2xl font-black text-white mb-8 italic uppercase tracking-tighter">{isEditing ? 'MODIFY LISTING' : 'NEW PARTNER'}</h2>
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <input className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Brand Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                      <div className="relative">
                        <input type="file" id="logo-up" hidden onChange={async e => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = (event) => {
                              const img = new Image();
                              img.src = event.target.result;
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                canvas.width = 300;
                                canvas.height = 300;
                                ctx.drawImage(img, 0, 0, 300, 300);
                                setFormData(p => ({ ...p, logo: canvas.toDataURL('image/jpeg', 0.6) }));
                              };
                            };
                          }
                        }} accept="image/*" />
                        <label htmlFor="logo-up" className="flex items-center justify-center gap-3 w-full bg-slate-800 p-5 rounded-2xl text-slate-400 cursor-pointer border-2 border-dashed border-slate-700">
                          {formData.logo ? <CheckCircle2 size={18} className="text-emerald-500" /> : <ImageIcon size={18} />}
                          <span className="font-bold text-[10px] uppercase">{formData.logo ? 'ID ASSET READY' : 'UPLOAD BRAND LOGO'}</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="border border-slate-800 rounded-3xl overflow-hidden bg-black/40">
                        <div className="bg-slate-800 p-2 flex gap-1 border-b border-slate-700">
                          <button type="button" onClick={() => document.execCommand('bold')} className="p-2 hover:bg-slate-700 rounded text-white font-black">B</button>
                          <button type="button" onClick={() => document.execCommand('italic')} className="p-2 hover:bg-slate-700 rounded text-white italic">I</button>
                        </div>
                        <div 
                          ref={editorRef}
                          contentEditable
                          className="p-8 min-h-[300px] text-white outline-none bg-slate-900/50 prose prose-invert max-w-none text-base"
                          onBlur={e => setFormData(p => ({ ...p, description: e.target.innerHTML }))}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <input className="bg-slate-800 rounded-2xl p-5 text-white outline-none font-bold" placeholder="Bonus: e.g. 200% Match" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} required />
                      <input className="bg-slate-800 rounded-2xl p-5 text-indigo-400 font-mono text-xs outline-none" placeholder="Affiliate URL" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} required />
                    </div>

                    <button className="w-full bg-indigo-600 py-6 rounded-3xl font-black text-white uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-500 transition-all">PUBLISH LISTING</button>
                  </form>
                </div>

                {/* INVENTORY LIST */}
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl h-fit">
                   <div className="p-6 border-b border-slate-800 font-black text-[10px] text-slate-500 uppercase tracking-widest bg-slate-800/20 italic text-center">ACTIVE INVENTORY</div>
                   <div className="divide-y divide-slate-800/50">
                     {casinos.map(c => (
                       <div key={c.id} className="p-5 flex items-center justify-between hover:bg-slate-800/30">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                             {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-700" />}
                           </div>
                           <span className="font-bold text-sm text-white italic">{c.name}</span>
                         </div>
                         <div className="flex gap-1 shrink-0">
                           <button onClick={() => { setIsEditing(c.id); setFormData(c); if(editorRef.current) editorRef.current.innerHTML = c.description; window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-2 text-slate-500 hover:text-indigo-400"><Edit3 size={18}/></button>
                           <button onClick={async () => { if(window.confirm('Delete?')) await deleteDoc(doc(db, 'casinos', c.id)); }} className="p-2 text-slate-500 hover:text-rose-400"><Trash2 size={18}/></button>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            ) : (
              /* MODERATION TAB */
              <div className="grid gap-4 max-w-4xl mx-auto pb-40">
                <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic border-l-4 border-indigo-600 pl-4">PENDING REVIEWS</h2>
                {pendingReviews.map(r => (
                  <div key={r.id} className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] flex flex-col md:flex-row justify-between gap-6 shadow-2xl">
                    <div className="flex-1 space-y-4">
                      <p className="text-white text-lg font-medium leading-relaxed italic">"{r.text}"</p>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">— {r.email} ({r.casinoName})</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={async () => await updateDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id), { isApproved: true })} className="bg-emerald-600 px-8 py-4 rounded-2xl font-black text-xs text-white uppercase shadow-lg">APPROVE</button>
                      <button onClick={async () => await deleteDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id))} className="bg-slate-800 px-6 py-4 rounded-2xl font-black text-xs text-white border border-slate-700 uppercase">REJECT</button>
                    </div>
                  </div>
                ))}
                {pendingReviews.length === 0 && <div className="p-20 text-center text-slate-700 font-black uppercase text-xs tracking-widest italic border border-dashed border-slate-800 rounded-[3rem]">No pending items</div>}
              </div>
            )}
          </div>
        )}

        {/* VIEW: DETAILS */}
        {view === 'details' && selectedCasino && (
          <div className="max-w-4xl mx-auto p-4 pt-10 space-y-10 animate-in fade-in duration-300">
            <button onClick={() => setView('public')} className="text-indigo-400 font-bold mb-6 flex items-center gap-2 uppercase text-[10px] tracking-widest"><ArrowLeft size={16}/> BACK TO FEED</button>
            <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
               <div className="h-48 w-full bg-slate-800 relative overflow-hidden">
                 {selectedCasino.logo && <img src={selectedCasino.logo} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110" alt="" />}
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
               </div>
               <div className="px-10 pb-10 -mt-20 relative z-10">
                 <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                   <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-800 border-4 border-slate-900 shadow-2xl">
                     {selectedCasino.logo ? <img src={selectedCasino.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-4xl font-black text-white">CP</div>}
                   </div>
                   <div className="flex-1 pb-1">
                     <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase">{selectedCasino.name}</h1>
                     <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mt-2 italic flex items-center gap-2"><CheckCircle2 size={16}/> VERIFIED LISTING</p>
                   </div>
                   <a href={selectedCasino.link} target="_blank" rel="noreferrer" className="w-full md:w-auto bg-indigo-600 px-12 py-5 rounded-3xl font-black text-white text-center shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all uppercase tracking-widest text-sm">PLAY NOW</a>
                 </div>
                 <div className="border-t border-slate-800 pt-10">
                    <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm md:text-base space-y-4 italic" dangerouslySetInnerHTML={{ __html: selectedCasino.description }} />
                 </div>
               </div>
            </div>
            
            <div className="space-y-6 pb-20">
              <h2 className="text-2xl font-black text-white uppercase flex items-center gap-2 italic tracking-tighter"><MessageSquare size={24} className="text-indigo-500" /> FEEDBACK</h2>
              {(!user || user.isAnonymous) ? (
                <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[3rem] text-center"><button onClick={() => setView('auth')} className="bg-white text-black px-10 py-3 rounded-2xl font-black text-[10px] uppercase shadow-2xl">LOGIN TO POST</button></div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    await addDoc(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), { uid: user.uid, email: user.email, rating: Number(newReview.rating), text: newReview.text, isApproved: false, createdAt: serverTimestamp() });
                    setNewReview({ rating: 5, text: '' });
                    setNotif("Submitted for Moderation");
                    setTimeout(() => setNotif(null), 3000);
                  }} className="space-y-4">
                    <div className="flex gap-2 mb-2">{[1,2,3,4,5].map(num => (<button key={num} type="button" onClick={() => setNewReview({...newReview, rating: num})} className={`p-1 ${newReview.rating >= num ? 'text-amber-400' : 'text-slate-700'}`}><Star size={24} fill={newReview.rating >= num ? 'currentColor' : 'none'} /></button>))}</div>
                    <textarea required placeholder="Your experience..." className="w-full bg-slate-800 border-none rounded-2xl p-6 text-white h-24 outline-none focus:ring-2 focus:ring-indigo-500 text-sm italic" value={newReview.text} onChange={(e) => setNewReview({...newReview, text: e.target.value})} />
                    <button type="submit" className="bg-indigo-600 px-10 py-3 rounded-2xl font-black text-[10px] text-white uppercase tracking-widest">SUBMIT REVIEW</button>
                  </form>
                </div>
              )}
              <div className="grid gap-4">
                {reviews.map(r => (
                  <div key={r.id} className="bg-slate-900/30 border border-slate-800 p-6 rounded-[2rem]">
                    <p className="text-[10px] font-black text-white uppercase mb-2 italic tracking-widest">{r.email?.split('@')[0]}</p>
                    <p className="text-slate-400 text-xs italic leading-relaxed">"{r.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: AUTHENTICATION */}
        {view === 'auth' && (
          <div className="max-w-md mx-auto mt-20 p-12 bg-slate-900 border border-slate-800 rounded-[3.5rem] shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-10">
               <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-600/30 mb-6 font-black text-white text-3xl italic">CP</div>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">{isSignUp ? 'REGISTER' : 'LOGIN'}</h2>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <input className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold italic" placeholder="Email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required />
              <input className="w-full bg-slate-800 border-none rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold italic" type="password" placeholder="Password" value={authPass} onChange={e=>setAuthPass(e.target.value)} required />
              <button className="w-full bg-indigo-600 py-5 rounded-3xl font-black text-white uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-500 transition-all">CONTINUE</button>
            </form>
            <button onClick={()=>setIsSignUp(!isSignUp)} className="w-full mt-8 text-[10px] font-black text-slate-500 uppercase tracking-widest underline decoration-slate-800 underline-offset-8">{isSignUp ? 'LOGIN' : 'SIGN UP'}</button>
          </div>
        )}
      </main>

      {/* TOAST NOTIFICATIONS */}
      {notif && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-indigo-600 px-8 py-4 rounded-3xl font-black text-white shadow-2xl z-[1000] text-xs uppercase tracking-widest animate-in slide-in-from-bottom-6 border border-indigo-400/20">
          {notif}
        </div>
      )}
    </div>
  );
}
