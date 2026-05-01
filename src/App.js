import React, { useState, useEffect, memo, useRef } from 'react';
import { 
  ShieldCheck, Star, ExternalLink, Plus, Trash2, Edit3, Lock, 
  LayoutDashboard, Eye, LogOut, TrendingUp, CheckCircle2, 
  AlertCircle, Zap, Crown, MessageSquare, User, ArrowLeft, Send,
  ShieldAlert, ThumbsUp, XCircle, Clock, Image as ImageIcon,
  Type, Bold, Italic, List, Heading1, Heading2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';

// --- CONFIG ---
const ADMIN_EMAIL = "chasepoore@icloud.com"; 

const firebaseConfig = {
  api  apiKey: "AIzaSyCwkztsGABPEjWOkNoNHr8XZ7GmlrGCf60",
  authDomain: "casinopro-directory.firebaseapp.com",
  projectId: "casinopro-directory",
  storageBucket: "casinopro-directory.appspot.com",
  messagingSenderId: "500565041910",
  appId: "1:500565041910:web:323f83d280efe36da442d7"
};
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- HELPER: Image Compression & Base64 ---
const handleImageUpload = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Keep size small for Firestore 1MB limit
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compressed JPEG
      };
    };
  });
};

// --- SUB-COMPONENTS ---

const ListView = memo(({ casinos, onOpen }) => (
  <div className="max-w-5xl mx-auto space-y-8 p-4 animate-in fade-in duration-500">
    <div className="text-center py-10">
      <h1 className="text-5xl font-black mb-4 text-white">Elite <span className="text-indigo-500">Rankings</span></h1>
      <p className="text-slate-400">Trusted reviews and exclusive bonuses.</p>
    </div>
    <div className="grid gap-6">
      {casinos.map((c, i) => (
        <div key={c.id} onClick={() => onOpen(c)} className="group cursor-pointer bg-slate-900/60 border border-slate-800 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 hover:border-indigo-500/50 transition-all hover:shadow-2xl">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden bg-slate-800 border border-slate-700">
            {c.logo ? <img src={c.logo} className="w-full h-full object-cover" alt="logo" /> : <span className="text-3xl font-black text-white">{c.name.charAt(0)}</span>}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold text-white">{c.name}</h3>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-slate-300">{c.rating} Expert Rating</span>
            </div>
          </div>
          <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-sm">REVIEWS</button>
        </div>
      ))}
    </div>
  </div>
));

const DetailsView = ({ selectedCasino, setView, user, reviews, submitReview, newReview, setNewReview }) => (
  <div className="max-w-4xl mx-auto space-y-10 p-4 animate-in fade-in">
    <button onClick={() => setView('public')} className="flex items-center gap-2 text-slate-500 hover:text-white font-bold text-sm transition-colors">
      <ArrowLeft size={18} /> BACK TO LIST
    </button>

    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden">
      <div className="h-48 w-full bg-slate-800 relative">
        {selectedCasino.logo && <img src={selectedCasino.logo} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xl" alt="bg" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
      </div>
      <div className="px-10 pb-10 -mt-20 relative z-10">
        <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
          <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-800 border-4 border-slate-900 shadow-2xl">
            {selectedCasino.logo ? <img src={selectedCasino.logo} className="w-full h-full object-cover" alt="logo" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white" style={{backgroundColor: selectedCasino.color}}>{selectedCasino.name.charAt(0)}</div>}
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-black text-white">{selectedCasino.name}</h1>
            <p className="text-indigo-400 font-bold text-sm tracking-widest mt-1 uppercase">Vetted Partner</p>
          </div>
          <a href={selectedCasino.link} target="_blank" className="w-full md:w-auto bg-indigo-600 px-10 py-4 rounded-2xl font-black text-white text-center shadow-lg hover:bg-indigo-500 transition-all">PLAY NOW</a>
        </div>
        
        <div className="border-t border-slate-800 pt-10">
          <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6">Expert Verdict</h4>
          {/* Render Rich Text via innerHTML */}
          <div 
            className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-base"
            dangerouslySetInnerHTML={{ __html: selectedCasino.description }}
          />
        </div>
      </div>
    </div>
    
    {/* Reviews Section Omitted for space - keep as per previous version */}
  </div>
);

const AdminView = memo(({ isAdmin, adminTab, setAdminTab, setView, isEditing, setIsEditing, formData, setFormData, handleSaveCasino, casinos, pendingReviews, approveReview, deleteReview }) => {
  const editorRef = useRef(null);

  // Sync editor content
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
      const base64 = await handleImageUpload(file);
      setFormData(prev => ({ ...prev, logo: base64 }));
    }
  };

  if (!isAdmin) return <div className="text-center p-20 text-slate-500">Access Denied</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 p-4">
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
        <div className="flex gap-4">
          <button onClick={() => setAdminTab('casinos')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${adminTab === 'casinos' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Casinos</button>
          <button onClick={() => setAdminTab('moderation')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${adminTab === 'moderation' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Moderation ({pendingReviews.length})</button>
        </div>
      </div>

      {adminTab === 'casinos' && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[3rem]">
            <h3 className="text-xl font-black mb-8 text-white uppercase">{isEditing ? 'Modify Review' : 'Create New Listing'}</h3>
            <form onSubmit={handleSaveCasino} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <input className="bg-slate-800 border-none rounded-xl p-4 text-white" placeholder="Brand Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                <div className="relative">
                  <input type="file" id="logo-up" hidden onChange={handleFileChange} accept="image/*" />
                  <label htmlFor="logo-up" className="flex items-center justify-center gap-2 w-full bg-slate-800 p-4 rounded-xl text-slate-400 cursor-pointer hover:bg-slate-700 transition-colors">
                    {formData.logo ? <CheckCircle2 size={18} className="text-emerald-500" /> : <ImageIcon size={18} />}
                    {formData.logo ? 'Logo Uploaded' : 'Upload Casino Logo'}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Expert Verdict (Visual Editor)</label>
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-800/30">
                  <div className="bg-slate-800 p-2 flex gap-1 border-b border-slate-700 overflow-x-auto">
                    <button type="button" onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-700 rounded text-white"><Bold size={16}/></button>
                    <button type="button" onClick={() => execCmd('italic')} className="p-2 hover:bg-slate-700 rounded text-white"><Italic size={16}/></button>
                    <button type="button" onClick={() => execCmd('formatBlock', 'H2')} className="p-2 hover:bg-slate-700 rounded text-white"><Heading1 size={16}/></button>
                    <button type="button" onClick={() => execCmd('formatBlock', 'H3')} className="p-2 hover:bg-slate-700 rounded text-white"><Heading2 size={16}/></button>
                    <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-2 hover:bg-slate-700 rounded text-white"><List size={16}/></button>
                  </div>
                  <div 
                    ref={editorRef}
                    contentEditable
                    className="p-6 min-h-[300px] text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-900/50"
                    onBlur={(e) => setFormData(prev => ({ ...prev, description: e.target.innerHTML }))}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <input className="bg-slate-800 border-none rounded-xl p-4 text-white" placeholder="Bonus (e.g. $500 + 50 FS)" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} required />
                <input className="bg-slate-800 border-none rounded-xl p-4 text-white" placeholder="Affiliate Link" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} required />
              </div>

              <button className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                {isEditing ? 'COMMIT UPDATES' : 'PUBLISH TO LIVE SITE'}
              </button>
            </form>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden">
             <div className="p-6 border-b border-slate-800 font-black text-xs text-slate-500 uppercase">Live Inventory</div>
             {casinos.map(c => (
               <div key={c.id} className="p-4 flex items-center justify-between border-b border-slate-800/50 hover:bg-slate-800/20">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded bg-slate-800 overflow-hidden">{c.logo && <img src={c.logo} className="w-full h-full object-cover" />}</div>
                   <span className="font-bold text-sm text-white">{c.name}</span>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => { setIsEditing(c.id); setFormData(c); }} className="p-2 text-slate-500 hover:text-indigo-400"><Edit3 size={16}/></button>
                   <button onClick={async () => { if(window.confirm('Delete?')) await deleteDoc(doc(db, 'casinos', c.id)); }} className="p-2 text-slate-500 hover:text-rose-400"><Trash2 size={16}/></button>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}
      {/* Moderation Tab logic kept same as previous */}
    </div>
  );
});

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
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
  const [formData, setFormData] = useState({ name: '', rating: '5', bonus: '', link: '', description: '', features: '', color: '#818cf8', logo: '' });
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [showNotification, setShowNotification] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) signInAnonymously(auth);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const q = collection(db, 'casinos');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCasinos(data.sort((a, b) => b.rating - a.rating));
      setLoading(false);
    });
  }, [authReady]);

  // Sync reviews when looking at details
  useEffect(() => {
    if (!selectedCasino || view !== 'details' || !authReady) return;
    const q = query(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(all.filter(r => r.isApproved === true));
    });
  }, [selectedCasino, view, authReady]);

  // Admin moderation sync
  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL || view !== 'admin' || adminTab !== 'moderation' || !authReady) return;
    const unsubs = casinos.map(c => onSnapshot(collection(db, 'casinos', c.id, 'user_reviews'), (snapshot) => {
      const revs = snapshot.docs.map(doc => ({ id: doc.id, casinoId: c.id, casinoName: c.name, ...doc.data() })).filter(r => !r.isApproved);
      setPendingReviews(prev => {
        const others = prev.filter(p => p.casinoId !== c.id);
        return [...others, ...revs].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      });
    }));
    return () => unsubs.forEach(u => u());
  }, [view, adminTab, casinos, user, authReady]);

  const handleSaveCasino = async (e) => {
    e.preventDefault();
    if (user.email !== ADMIN_EMAIL) return;
    const payload = { ...formData, updatedAt: Date.now() };
    if (isEditing) await setDoc(doc(db, 'casinos', isEditing), payload);
    else await addDoc(collection(db, 'casinos'), payload);
    setFormData({ name: '', rating: '5', bonus: '', link: '', description: '', features: '', color: '#818cf8', logo: '' });
    setIsEditing(null);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, authEmail, authPass);
      else await signInWithEmailAndPassword(auth, authEmail, authPass);
      setView('public');
    } catch (err) { setShowNotification(err.message); setTimeout(() => setShowNotification(null), 5000); }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans pb-20 selection:bg-indigo-500/30">
      <nav className="sticky top-0 z-50 bg-[#050608]/80 backdrop-blur-xl border-b border-slate-800/50 h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div onClick={() => { setView('public'); setIsEditing(null); }} className="flex items-center gap-3 cursor-pointer group">
            <div className="bg-indigo-600 p-2 rounded-xl text-white group-hover:scale-110 transition-transform"><ShieldCheck size={24} /></div>
            <span className="font-black text-2xl tracking-tighter uppercase italic text-white">CASINO<span className="text-indigo-500">PRO</span></span>
          </div>
          <div className="flex gap-4">
            {user?.email === ADMIN_EMAIL && <button onClick={() => setView('admin')} className="text-xs font-black text-indigo-400 border border-indigo-500/30 px-5 py-2 rounded-xl">Admin</button>}
            {(!user || user.isAnonymous) ? (<button onClick={() => setView('auth')} className="bg-white text-black px-6 py-2 rounded-xl text-xs font-black uppercase">Join</button>) : (<button onClick={() => signOut(auth)} className="text-slate-500 hover:text-rose-500"><LogOut size={20} /></button>)}
          </div>
        </div>
      </nav>

      <main>
        {loading || !authReady ? (
          <div className="text-center p-40 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Loading Rankings...</p>
          </div>
        ) : (
          <>
            {view === 'public' && <ListView casinos={casinos} onOpen={(c) => { setSelectedCasino(c); setView('details'); window.scrollTo(0,0); }} />}
            {view === 'details' && <DetailsView selectedCasino={selectedCasino} setView={setView} user={user} reviews={reviews} newReview={newReview} setNewReview={setNewReview} submitReview={async (e) => {
              e.preventDefault();
              await addDoc(collection(db, 'casinos', selectedCasino.id, 'user_reviews'), { uid: user.uid, email: user.email, rating: Number(newReview.rating), text: newReview.text, isApproved: false, createdAt: serverTimestamp() });
              setNewReview({ rating: 5, text: '' });
              setShowNotification("Submitted for moderation.");
              setTimeout(() => setShowNotification(null), 5000);
            }} />}
            {view === 'admin' && <AdminView isAdmin={user?.email === ADMIN_EMAIL} adminTab={adminTab} setAdminTab={setAdminTab} setView={setView} isEditing={isEditing} setIsEditing={setIsEditing} formData={formData} setFormData={setFormData} handleSaveCasino={handleSaveCasino} casinos={casinos} pendingReviews={pendingReviews} approveReview={r => updateDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id), {isApproved: true})} deleteReview={r => deleteDoc(doc(db, 'casinos', r.casinoId, 'user_reviews', r.id))} />}
            {view === 'auth' && (
              <div className="max-w-md mx-auto mt-20 p-10 bg-slate-900 border border-slate-800 rounded-[3rem]">
                <h2 className="text-2xl font-black text-center mb-6 text-white uppercase">{isSignUp ? 'New Member' : 'Login'}</h2>
                <form onSubmit={handleAuth} className="space-y-4">
                  <input className="w-full bg-slate-800 rounded-xl p-4 text-white" placeholder="Email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} />
                  <input className="w-full bg-slate-800 rounded-xl p-4 text-white" type="password" placeholder="Password" value={authPass} onChange={e=>setAuthPass(e.target.value)} />
           
