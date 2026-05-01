import React, { useState, useEffect, memo, useRef } from 'react';
import { 
  ShieldCheck, Star, ExternalLink, Plus, Trash2, Edit3, Lock, 
  LayoutDashboard, Eye, LogOut, TrendingUp, CheckCircle2, 
  AlertCircle, Zap, Crown, MessageSquare, User, ArrowLeft, Send,
  ShieldAlert, ThumbsUp, XCircle, Clock, Image as ImageIcon,
  Bold, Italic, List, Heading1, Heading2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, enableIndexedDbPersistence } from 'firebase/firestore';

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

// --- ENABLE OFFLINE PERSISTENCE (Crucial for Speed) ---
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open, persistence disabled.");
    } else if (err.code === 'unimplemented') {
      console.warn("Browser doesn't support persistence.");
    }
  });
} catch (e) {}

// --- SUB-COMPONENTS ---

const ListView = memo(({ casinos, onOpen }) => (
  <div className="max-w-5xl mx-auto space-y-5 p-4 animate-in fade-in duration-200">
    <div className="text-center py-6">
      <h1 className="text-4xl font-black mb-2 text-white">Elite <span className="text-indigo-500">Rankings</span></h1>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Direct Affiliate Portal</p>
    </div>
    <div className="grid gap-4">
      {casinos.map((c) => (
        <div 
          key={c.id} 
          onClick={() => onOpen(c)} 
          className="cursor-pointer bg-slate-900/40 border border-slate-800/60 rounded-[1.5rem] p-4 flex items-center gap-4 hover:border-indigo-500/50 transition-all hover:bg-slate-900/80 active:scale-[0.98]"
        >
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/50 shadow-lg">
            {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black bg-indigo-600 text-white">{c.name.charAt(0)}</div>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{c.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star size={10} className="text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase">{c.rating} Rating</span>
            </div>
          </div>
          <button className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">Open</button>
        </div>
      ))}
    </div>
  </div>
));

// ... DetailsView, AuthView, and AdminView remain structured the same ...

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('public');
  const [adminTab, setAdminTab] = useState('casinos');
  const [selectedCasino, setSelectedCasino] = useState(null);
  const [casinos, setCasinos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', rating: '5', bonus: '', link: '', description: '', features: '', color: '#818cf8', logo: '' });
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [showNotification, setShowNotification] = useState(null);

  const isAdmin = user && user.email === ADMIN_EMAIL;

  // SPEED BOOST 1: Fetch data immediately on mount
  useEffect(() => {
    const q = collection(db, 'casinos');
    // We remove the complex orderBy here to ensure the fastest possible primary load
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCasinos(data.sort((a, b) => b.rating - a.rating));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // SPEED BOOST 2: Background Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) signInAnonymously(auth);
    });
    return () => unsub();
  }, []);

  // Moderation logic only runs when Admin view is active
  useEffect(() => {
    if (!isAdmin || view !== 'admin' || adminTab !== 'moderation') return;
    const unsubs = casinos.map(c => onSnapshot(collection(db, 'casinos', c.id, 'user_reviews'), (snap) => {
      const revs = snap.docs.map(d => ({ id: d.id, casinoId: c.id, casinoName: c.name, ...d.data() })).filter(r => !r.isApproved);
      setPendingReviews(prev => [...prev.filter(p => p.casinoId !== c.id), ...revs]);
    }));
    return () => unsubs.forEach(u => u());
  }, [isAdmin, view, adminTab, casinos]);

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans pb-20 selection:bg-indigo-500/30">
      <nav className="sticky top-0 z-50 bg-[#050608]/90 backdrop-blur-xl border-b border-slate-800/50 h-16 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div onClick={() => { setView('public'); setAdminTab('casinos'); }} className="flex items-center gap-3 cursor-pointer">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-lg shadow-indigo-600/20"><ShieldCheck size={20} /></div>
            <span className="font-black text-xl tracking-tighter uppercase italic text-white">CASINO<span className="text-indigo-500">PRO</span></span>
          </div>
          <div className="flex gap-4 items-center">
            {isAdmin && <button onClick={() => setView('admin')} className="text-[10px] font-black text-indigo-400 border border-indigo-500/30 px-4 py-1.5 rounded-lg bg-indigo-500/5 uppercase tracking-widest">Admin</button>}
            <button onClick={() => user?.isAnonymous ? setView('auth') : signOut(auth)} className="text-slate-500 hover:text-white transition-colors">
              {user?.isAnonymous ? <User size={18} /> : <LogOut size={18} />}
            </button>
          </div>
        </div>
      </nav>

      <main>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-40 space-y-4">
             <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {view === 'public' && <ListView casinos={casinos} onOpen={(c) => { setSelectedCasino(c); setView('details'); window.scrollTo(0,0); }} />}
            {/* ... Other Views (Details, Admin, Auth) ... */}
          </>
        )}
      </main>

      {showNotification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-indigo-600 px-6 py-3 rounded-xl font-bold text-white shadow-2xl z-[100] text-sm animate-in slide-in-from-bottom-4">
          {showNotification}
        </div>
      )}
    </div>
  );
                                                                                                                         }
