import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Star, ExternalLink, Plus, Trash2, Edit3, Lock, 
  LayoutDashboard, Eye, LogOut, TrendingUp, CheckCircle2, 
  AlertCircle, Zap, Crown, MessageSquare, User, ArrowLeft, Send,
  ShieldAlert, ThumbsUp, XCircle, Clock
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

// --- CONFIG ---
const ADMIN_EMAIL = "chasepoore@icloud.com"; 

// PASTE YOUR ACTUAL FIREBASE CONFIG HERE FROM PROJECT SETTINGS
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
  const [casinos, setCasinos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '', rating: '5', bonus: '', link: '', description: '', features: '', color: '#818cf8'
  });
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [showNotification, setShowNotification] = useState(null);

  const isAdmin = user && user.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) signInAnonymously(auth);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = collection(db, 'casinos');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCasinos(data.sort((a, b) => b.rating - a.rating));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedCasino || view !== 'details') return;
    const q = query(
      collection(db, 'casinos', selectedCasino.id, 'user_reviews'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const allRev = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(allRev.filter(r => r.isApproved === true));
    });
  }, [selectedCasino, view]);

  useEffect(() => {
    if (!isAdmin || view !== 'admin' || adminTab !== 'moderation') return;
    const unsubscribes = casinos.map(c => {
      const q = collection(db, 'casinos', c.id, 'user_reviews');
      return onSnapshot(q, (snapshot) => {
        const revs = snapshot.docs.map(doc => ({ id: doc.id, casinoId: c.id, casinoName: c.name, ...doc.data() })).filter(r => !r.isApproved);
        setPendingReviews(prev => {
          const others = prev.filter(p => p.casinoId !== c.id);
          return [...others, ...revs].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        });
      });
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [view, adminTab, casinos, isAdmin]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, authEmail, authPass);
      else await signInWithEmailAndPassword(auth, authEmail, authPass);
      setView('public');
    } catch (err) { 
      setShowNotification(err.message);
      setTimeout(() => setShowNotification(null), 5000);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user || user.isAnonymous) { setIsSignUp(false); setView('auth'); return; }
    await addDoc(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), {
      uid: user.uid, email: user.email, rating: Number(newReview.rating), text: newReview.text, isApproved: false, createdAt: serverTimestamp()
    });
    setNewReview({ rating: 5, text: '' });
    setShowNotification("Review submitted! Pending approval.");
    setTimeout(() => setShowNotification(null), 5000);
  };

  const handleSaveCasino = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const payload = { ...formData, features: typeof formData.features === 'string' ? formData.features.split(',').map(f => f.trim()) : formData.features, updatedAt: Date.now() };
    if (isEditing) await setDoc(doc(db, 'casinos', isEditing), payload);
    else await addDoc(collection(db, 'casinos'), payload);
    setFormData({ name: '', rating: '5', bonus: '', link: '', description: '', features: '', color: '#818cf8' });
    setIsEditing(null);
  };

  const ListView = () => (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center py-10">
        <h1 className="text-5xl font-black mb-4">Elite <span className="text-indigo-500">Rankings</span></h1>
        <p className="text-slate-400">Trusted reviews and exclusive bonuses.</p>
      </div>
      <div className="grid gap-6">
        {casinos.map((c, i) => (
          <div key={c.id} onClick={() => { setSelectedCasino(c); setView('details'); }} className="cursor-pointer bg-slate-900/60 border border-slate-800 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 hover:border-indigo-500/50 transition-all">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg text-white" style={{ backgroundColor: c.color }}>{c.name.charAt(0)}</div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold">{c.name}</h3>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-slate-300">{c.rating} Expert Rating</span>
              </div>
            </div>
            <div className="text-center md:text-right px-6">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Bonus</p>
              <p className="text-lg font-black">{c.bonus}</p>
            </div>
            <button className="bg-indigo-600 px-6 py-3 rounded-xl font-black text-sm">READ REVIEWS</button>
          </div>
        ))}
      </div>
    </div>
  );

  const DetailsView = () => (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-300">
      <button onClick={() => setView('public')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-bold text-sm">
        <ArrowLeft size={18} /> BACK TO LIST
      </button>
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden">
        <div className="h-32 w-full" style={{ backgroundColor: selectedCasino.color + '33' }}></div>
        <div className="px-10 pb-10 -mt-16">
          <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
            <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-5xl font-black border-4 border-slate-900 text-white shadow-2xl" style={{ backgroundColor: selectedCasino.color }}>{selectedCasino.name.charAt(0)}</div>
            <div className="flex-1 pb-2">
              <h1 className="text-4xl font-black">{selectedCasino.name}</h1>
              <a href={selectedCasino.link} target="_blank" className="text-indigo-400 font-bold flex items-center gap-1 hover:underline">Official Site <ExternalLink size={14} /></a>
            </div>
            <a href={selectedCasino.link} target="_blank" className="w-full md:w-auto bg-indigo-600 px-10 py-4 rounded-2xl font-black text-center shadow-lg shadow-indigo-600/20 text-white">PLAY NOW</a>
          </div>
          <div className="grid md:grid-cols-2 gap-10 border-t border-slate-800 pt-10">
            <div className="space-y-4"><h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">Expert Verdict</h4><p className="text-slate-300 leading-relaxed">{selectedCasino.description}</p></div>
            <div className="space-y-4"><h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">Highlights</h4>{selectedCasino.features?.map((f, i) => (<div key={i} className="flex items-center gap-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50"><CheckCircle2 size={16} className="text-indigo-400" /><span className="text-sm font-bold">{f}</span></div>))}</div>
          </div>
        </div>
      </div>
      <div className="space-y-8">
        <h2 className="text-2xl font-black flex items-center gap-3"><MessageSquare className="text-indigo-500" /> Community Reviews</h2>
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem]">
          <form onSubmit={submitReview} className="space-y-4">
            <div className="flex gap-2 mb-2">{[1,2,3,4,5].map(num => (<button key={num} type="button" onClick={() => setNewReview({...newReview, rating: num})} className={`p-2 rounded-lg transition-all ${newReview.rating >= num ? 'text-amber-400' : 'text-slate-700'}`}><Star fill={newReview.rating >= num ? 'currentColor' : 'none'} /></button>))}</div>
            <textarea required placeholder={(!user || user.isAnonymous) ? "Sign in to leave a review..." : "Share your experience..."} className="w-full bg-slate-800 border-none rounded-2xl p-4 text-white h-24 focus:ring-2 focus:ring-indigo-500" value={newReview.text} disabled={(!user || user.isAnonymous)} onChange={(e) => setNewReview({...newReview, text: e.target.value})} />
            <button type="submit" disabled={(!user || user.isAnonymous)} className="bg-indigo-600 px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 text-white">SUBMIT</button>
          </form>
        </div>
        <div className="space-y-4">{reviews.map(r => (<div key={r.id} className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-2xl"><div className="flex justify-between mb-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center"><User size={14} className="text-indigo-400" /></div><div><p className="text-sm font-bold">{r.email?.split('@')[0]}</p><div className="flex gap-0.5">{[...Array(5)].map((_, i) => (<Star key={i} size={10} className={i < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-700"} />))}</div></div></div></div><p className="text-slate-400 text-sm italic">"{r.text}"</p></div>))}</div>
      </div>
    </div>
  );

  const AdminView = () => (
    <div className="max-w-5xl mx-auto space-y-10 p-4">
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
        <div className="flex gap-4">
          <button onClick={() => setAdminTab('casinos')} className={`px-6 py-2 rounded-xl text-xs font-black ${adminTab === 'casinos' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Casinos</button>
          <button onClick={() => setAdminTab('moderation')} className={`px-6 py-2 rounded-xl text-xs font-black ${adminTab === 'moderation' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Moderation {pendingReviews.length > 0 && <span className="ml-1 bg-rose-500 text-white px-2 py-0.5 rounded-full">{pendingReviews.length}</span>}</button>
        </div>
        <button onClick={() => setView('public')} className="text-xs font-bold text-slate-500">LIVE SITE</button>
      </div>
      {adminTab === 'casinos' ? (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[2rem]">
            <form onSubmit={handleSaveCasino} className="grid md:grid-cols-2 gap-6">
              <input className="bg-slate-800 rounded-xl p-4 text-white" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <select className="bg-slate-800 rounded-xl p-4 text-white" value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})}><option value="5">5 Stars</option><option value="4.5">4.5 Stars</option></select>
              <input className="md:col-span-2 bg-slate-800 rounded-xl p-4 text-white" placeholder="Bonus" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} required />
              <input className="md:col-span-2 bg-slate-800 rounded-xl p-4 font-mono text-sm text-indigo-400" placeholder="Link" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} required />
              <textarea className="md:col-span-2 bg-slate-800 rounded-xl p-4 h-32 text-white" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              <input className="bg-slate-800 rounded-xl p-4 text-white" placeholder="Features" value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} />
              <input type="color" className="w-full h-14 bg-slate-800 rounded-xl" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
              <button className="md:col-span-2 bg-indigo-600 py-4 rounded-2xl font-black text-white">{isEditing ? 'Update' : 'Launch'}</button>
            </form>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden h-fit">
            {casinos.map(c => (<div key={c.id} className="p-4 flex justify-between border-b border-slate-800/50"><span>{c.name}</span><div className="flex gap-2"><button onClick={() => { setIsEditing(c.id); setFormData({...c, features: c.features.join(', ')}); }}><Edit3 size={16}/></button><button onClick={async () => await deleteDoc(doc(db, 'casinos', c.id))}><Trash2 size={16}/></button></div></div>))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingReviews.map(r => (
            <div key={r.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex justify-between">
              <div><p className="text-white font-bold">"{r.text}"</p><p className="text-slate-500 text-xs">{r.casinoName} — {r.email}</p></div>
              <div className="flex gap-2"><button onClick={async () => await updateDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id), {isApproved: true})} className="bg-emerald-600 px-4 py-2 rounded-xl text-xs font-black">APPROVE</button><button onClick={async () => await deleteDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id))} className="bg-rose-900/50 px-4 py-2 rounded-xl text-xs font-black">DELETE</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans pb-20">
      <nav className="sticky top-0 z-50 bg-[#050608]/80 backdrop-blur-xl border-b border-slate-800/50 h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div onClick={() => setView('public')} className="flex items-center gap-3 cursor-pointer"><div className="bg-indigo-600 p-2 rounded-xl text-white"><ShieldCheck size={24} /></div><span className="font-black text-2xl tracking-tighter italic text-white uppercase">CASINO<span className="text-indigo-500">PRO</span></span></div>
          <div className="flex gap-3">
            {(!user || user.isAnonymous) ? (<button onClick={() => setView('auth')} className="bg-white text-black px-6 py-2 rounded-xl text-xs font-black uppercase">Login</button>) : (
              <div className="flex items-center gap-4">
                {isAdmin && <button onClick={() => setView('admin')} className="text-xs font-black text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl">Admin</button>}
                <button onClick={() => signOut(auth)} className="text-slate-500 hover:text-rose-400 transition-colors"><LogOut size={20} /></button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="p-6">
        {loading ? <div className="text-center p-20">Loading Database...</div> : (
          <>
            {view === 'public' && <ListView />}
            {view === 'details' && <DetailsView />}
            {view === 'admin' && <AdminView />}
            {view === 'auth' && (
              <div className="max-w-md mx-auto mt-20 p-10 bg-slate-900 border border-slate-800 rounded-[3rem]">
                <h2 className="text-2xl font-black text-center mb-6 text-white">{isSignUp ? 'Join Elite' : 'Login'}</h2>
                <form onSubmit={handleAuth} className="space-y-4">
                  <input className="w-full bg-slate-800 rounded-xl p-4 text-white" placeholder="Email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} />
                  <input className="w-full bg-slate-800 rounded-xl p-4 text-white" type="password" placeholder="Password" value={authPass} onChange={e=>setAuthPass(e.target.value)} />
                  <button className="w-full bg-indigo-600 py-4 rounded-xl font-black text-white">{isSignUp ? 'REGISTER' : 'LOG IN'}</button>
                </form>
                <button onClick={()=>setIsSignUp(!isSignUp)} className="w-full mt-4 text-slate-500 text-sm font-bold">{isSignUp ? 'Back to Login' : 'Create Account'}</button>
                <button onClick={()=>setView('public')} className="w-full mt-2 text-xs text-indigo-500 font-bold uppercase">Cancel</button>
              </div>
            )}
          </>
        )}
      </main>
      {showNotification && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-indigo-600 px-6 py-3 rounded-2xl font-bold text-white shadow-2xl z-[100]">{showNotification}</div>}
    </div>
  );
}
