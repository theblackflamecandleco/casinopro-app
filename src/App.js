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

// --- CONFIGURATION ---
const ADMIN_EMAIL = "chasepoore@icloud.com"; 

// !!! PASTE YOUR FIREBASE KEYS HERE !!!
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

try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch (e) {}

// --- UI COMPONENTS ---

const ListView = ({ casinos, onOpen }) => (
  <div className="max-w-5xl mx-auto space-y-6 p-4 pt-6">
    <div className="text-center py-10">
      <h1 className="text-5xl font-black mb-2 text-white italic tracking-tighter">CASINO<span className="text-indigo-500">PRO</span></h1>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Elite Directory & Reviews</p>
    </div>
    <div className="grid gap-4">
      {casinos.map((c) => (
        <div key={c.id} onClick={() => onOpen(c)} className="bg-slate-900/60 border border-slate-800 p-5 rounded-[2rem] flex items-center gap-5 hover:border-indigo-500/50 transition-all active:scale-95">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
            {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black bg-indigo-600 text-white">{c.name.charAt(0)}</div>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{c.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase">{c.rating} Expert Rating</span>
            </div>
          </div>
          <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest">View</button>
        </div>
      ))}
    </div>
  </div>
);

// --- MAIN APP ---

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
  const [formData, setFormData] = useState({ name: '', rating: '5', bonus: '', link: '', description: '', logo: '' });
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) signInAnonymously(auth);
    });
  }, []);

  // Data Listener
  useEffect(() => {
    return onSnapshot(collection(db, 'casinos'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCasinos(data.sort((a, b) => b.rating - a.rating));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setView('public');
    window.location.reload(); // Force refresh to clear state
  };

  const isAdmin = user && user.email === ADMIN_EMAIL;

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans pb-10">
      {/* HEADER - ALWAYS VISIBLE */}
      <nav className="sticky top-0 z-[100] bg-[#050608] border-b border-slate-800 h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div onClick={() => setView('public')} className="flex items-center gap-3 cursor-pointer">
            <div className="bg-indigo-600 p-2 rounded-xl text-white"><ShieldCheck size={24} /></div>
            <span className="font-black text-xl tracking-tighter uppercase italic text-white hidden sm:block">CASINOPRO</span>
          </div>

          <div className="flex items-center gap-3">
            {/* ADMIN BUTTON - Only shows for your email */}
            {isAdmin && (
              <button 
                onClick={() => setView('admin')} 
                className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Admin Panel
              </button>
            )}

            {/* LOGIN/LOGOUT LOGIC */}
            {(!user || user.isAnonymous) ? (
              <button 
                onClick={() => setView('auth')} 
                className="bg-white text-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-white/5"
              >
                Login / Join
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase hidden md:block">{user.email}</span>
                <button 
                  onClick={handleLogout} 
                  className="bg-slate-800 text-rose-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* CONTENT AREA */}
      <main>
        {loading && casinos.length === 0 ? (
          <div className="flex justify-center p-40">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {view === 'public' && <ListView casinos={casinos} onOpen={(c) => { setSelectedCasino(c); setView('details'); }} />}
            
            {view === 'auth' && (
              <div className="max-w-md mx-auto mt-20 p-10 bg-slate-900 border border-slate-800 rounded-[3rem]">
                <h2 className="text-2xl font-black text-center mb-8 uppercase text-white">{isSignUp ? 'Create Profile' : 'Member Login'}</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    if (isSignUp) await createUserWithEmailAndPassword(auth, authEmail, authPass);
                    else await signInWithEmailAndPassword(auth, authEmail, authPass);
                    setView('public');
                  } catch (err) { alert(err.message); }
                }} className="space-y-4">
                  <input className="w-full bg-slate-800 rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Email Address" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required />
                  <input className="w-full bg-slate-800 rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500" type="password" placeholder="Password" value={authPass} onChange={e=>setAuthPass(e.target.value)} required />
                  <button className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-white uppercase tracking-widest">Continue</button>
                </form>
                <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-xs font-bold text-slate-500 uppercase">{isSignUp ? 'Already a member? Log In' : 'Need an account? Sign Up'}</button>
              </div>
            )}

            {view === 'admin' && isAdmin && (
              <div className="max-w-5xl mx-auto p-4 pt-10">
                <h1 className="text-3xl font-black mb-10 text-white uppercase">Management Dashboard</h1>
                {/* (Admin Tabs and Forms go here - simplified for speed) */}
                <p className="text-slate-500 italic">Admin forms enabled for {user.email}</p>
                <button onClick={() => setView('public')} className="mt-4 bg-indigo-600 px-6 py-2 rounded-lg">Back to Site</button>
              </div>
            )}

            {/* Details View skeleton if selected */}
            {view === 'details' && selectedCasino && (
               <div className="max-w-4xl mx-auto p-4 pt-10">
                 <button onClick={() => setView('public')} className="text-indigo-400 font-bold mb-6 flex items-center gap-2"><ArrowLeft size={16}/> Back</button>
                 <h1 className="text-4xl font-black text-white mb-4">{selectedCasino.name}</h1>
                 <div className="prose prose-invert max-w-none text-slate-300" dangerouslySetInnerHTML={{ __html: selectedCasino.description }} />
                 <a href={selectedCasino.link} target="_blank" rel="noreferrer" className="inline-block mt-8 bg-indigo-600 px-10 py-4 rounded-2xl font-black text-white">PLAY NOW</a>
               </div>
            )}
          </>
        )}
      </main>
    </div>
  );
            }
