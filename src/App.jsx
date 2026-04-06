import React, { useState, useEffect, useRef } from 'react';
import { auth, db, signInWithGoogle, logout, loginWithEmail, registerWithEmail, updateUserProfile } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, setDoc, updateDoc, onSnapshot, serverTimestamp, collection, query, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cookie, 
  ShoppingBag, 
  Zap, 
  MousePointer2, 
  RefreshCw, 
  LogOut, 
  User, 
  TrendingUp,
  ChevronRight,
  Sparkles,
  Trophy,
  Mail,
  Lock,
  UserPlus,
  LogIn,
  AlertCircle
} from 'lucide-react'; // Trophy is new

// --- Constants ---
const CLICK_UPGRADE_BASE_COST = 10;
const AUTO_CLICK_BASE_COST = 50;
const SPEED_UPGRADE_BASE_COST = 100;
const REBIRTH_BASE_COST = 10000;

const INITIAL_DATA = {
  cookies: 0,
  rebirths: 0,
  clickLevel: 0,
  autoClickLevel: 0,
  autoClickSpeedLevel: 0,
  totalCookiesEarned: 0,
};

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [gameData, setGameData] = useState(INITIAL_DATA);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState([]);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [nickname, setNickname] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const gameDataRef = useRef(gameData);
  const lastSavedRef = useRef(Date.now());

  // Update ref whenever state changes
  useEffect(() => {
    gameDataRef.current = gameData;
  }, [gameData]);

  // --- Firebase Sync ---
  useEffect(() => {
    if (!user) {
      setIsDataLoaded(false);
      setGameData(INITIAL_DATA);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    
    // Listen for changes
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameData(data);
        if (!isDataLoaded) {
          setIsDataLoaded(true);
        }
      } else {
        // Create initial doc for a new user
        const initialDocData = { ...INITIAL_DATA, displayName: user.displayName || '', lastUpdated: serverTimestamp() };
        setDoc(userDocRef, initialDocData).then(() => {
          setIsDataLoaded(true);
        });
      }
      
    });

    return () => unsubscribe();
  }, [user, isDataLoaded]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (!user || !isDataLoaded) return;

    const interval = setInterval(async () => {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, {
          ...gameDataRef.current,
          lastUpdated: serverTimestamp()
        });
        console.log('Game saved');
      } catch (err) {
        console.error('Save error:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [user, isDataLoaded]);

  // --- Leaderboard Sync ---
  useEffect(() => {
    if (!isLeaderboardOpen) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, 
      orderBy('rebirths', 'desc'), 
      orderBy('cookies', 'desc'), 
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const topUsers = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setLeaderboardData(topUsers);
    });

    return () => unsubscribe();
  }, [isLeaderboardOpen]);


  // --- Game Logic ---
  const cookiesPerClick = (1 + gameData.clickLevel) + (gameData.rebirths * 0.25);
  const autoClickAmount = gameData.autoClickLevel;
  const autoClickInterval = Math.max(100, 1000 / (1 + gameData.autoClickSpeedLevel * 0.2));

  // Auto Clicker Loop
  useEffect(() => {
    if (autoClickAmount <= 0) return;

    const interval = setInterval(() => {
      setGameData(prev => ({
        ...prev,
        cookies: prev.cookies + autoClickAmount,
        totalCookiesEarned: prev.totalCookiesEarned + autoClickAmount
      }));
    }, autoClickInterval);

    return () => clearInterval(interval);
  }, [autoClickAmount, autoClickInterval]);

  const handleCookieClick = (e) => {
    const x = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const y = 'clientY' in e ? e.clientY : e.touches[0].clientY;
    
    setGameData(prev => ({
      ...prev,
      cookies: prev.cookies + cookiesPerClick,
      totalCookiesEarned: prev.totalCookiesEarned + cookiesPerClick
    }));

    // Floating text
    const id = Date.now();
    setFloatingTexts(prev => [...prev, { id, x, y, value: `+${cookiesPerClick.toFixed(2)}` }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1000);
  };

  // --- Shop Actions ---
  const getUpgradeCost = (base, level) => Math.floor(base * Math.pow(1.5, level));
  const getRebirthCost = (level) => Math.floor(REBIRTH_BASE_COST * Math.pow(5, level));

  const buyClickUpgrade = () => {
    const cost = getUpgradeCost(CLICK_UPGRADE_BASE_COST, gameData.clickLevel);
    if (gameData.cookies >= cost) {
      setGameData(prev => ({
        ...prev,
        cookies: prev.cookies - cost,
        clickLevel: prev.clickLevel + 1
      }));
    }
  };

  const buyAutoClickUpgrade = () => {
    const cost = getUpgradeCost(AUTO_CLICK_BASE_COST, gameData.autoClickLevel);
    if (gameData.cookies >= cost) {
      setGameData(prev => ({
        ...prev,
        cookies: prev.cookies - cost,
        autoClickLevel: prev.autoClickLevel + 1
      }));
    }
  };

  const buySpeedUpgrade = () => {
    const cost = getUpgradeCost(SPEED_UPGRADE_BASE_COST, gameData.autoClickSpeedLevel);
    if (gameData.cookies >= cost) {
      setGameData(prev => ({
        ...prev,
        cookies: prev.cookies - cost,
        autoClickSpeedLevel: prev.autoClickSpeedLevel + 1
      }));
    }
  };

  const performRebirth = () => {
    const cost = getRebirthCost(gameData.rebirths);
    if (gameData.cookies >= cost) {
      setGameData(prev => ({
        ...INITIAL_DATA,
        rebirths: prev.rebirths + 1,
        totalCookiesEarned: prev.totalCookiesEarned // Keep total earned
      }));
      setIsShopOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Cookie className="w-16 h-16 text-yellow-500" />
        </motion.div>
      </div>
    );
  }

  if (user && isDataLoaded && !gameData.displayName) {
    const handleSetNickname = async (e) => {
      e.preventDefault();
      if (!nickname.trim()) return;
      setIsAuthLoading(true);
      try {
        await updateDoc(doc(db, 'users', user.uid), { displayName: nickname });
        // The useAuthState hook will cause a re-render with the new user object
      } catch (error) {
        setAuthError(error.message);
      } finally {
        setIsAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full space-y-6 bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-xl shadow-2xl"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to Cookie Plus!</h1>
            <p className="text-zinc-400">Please set your nickname to continue.</p>
          </div>
          <form onSubmit={handleSetNickname} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
                required
                minLength="3"
                maxLength="15"
              />
            </div>
            {authError && (
              <p className="text-red-400 text-xs text-center">{authError}</p>
            )}
            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-yellow-500 text-black font-black py-4 rounded-2xl hover:bg-yellow-400 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAuthLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Save and Play'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    const handleAuthAction = async (e) => {
      e.preventDefault();
      setAuthError('');
      setIsAuthLoading(true);
      try {
        if (authMode === 'login') {
          await loginWithEmail(email, password);
        } else {
          if (!displayName.trim()) throw new Error('Please enter a display name');
          await registerWithEmail(email, password, displayName);
        }
      } catch (err) {
        setAuthError(err.message);
      } finally {
        setIsAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4 py-8 text-center overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-6 sm:space-y-8 bg-zinc-900/50 p-6 sm:p-8 rounded-3xl border border-zinc-800 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex flex-col items-center">
            <div className="p-3 sm:p-4 bg-yellow-500/10 rounded-2xl mb-3 sm:mb-4">
              <Cookie className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white mb-1">Cookie Plus</h1>
            <p className="text-zinc-500 text-xs sm:text-sm">มาช่วยคุณย่า ทำคุกกี้กันเถอะ!</p>
          </div>

          <div className="flex bg-zinc-800/50 p-1 rounded-xl mb-6">
            <button 
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'login' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Login
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'register' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthAction} className="space-y-4">
            {authMode === 'register' && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="email" 
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
                required
              />
            </div>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-left"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-yellow-500 text-black font-black py-4 rounded-2xl hover:bg-yellow-400 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
            >
              {isAuthLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {authMode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {authMode === 'login' ? 'LOGIN TO GAME' : 'CREATE ACCOUNT'}
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-4 text-zinc-500 font-bold">Or continue with</span>
            </div>
          </div>
          
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-zinc-800 text-white font-bold py-4 px-6 rounded-2xl hover:bg-zinc-700 transition-all active:scale-95 border border-zinc-700"
          >
           <div className="flex items-center gap-2">
          <img 
             src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
            className="w-6 h-6" 
    alt="Google" 
  />
  <span>Google Account</span>
</div>
          </button>
          
          <p className="text-zinc-600 text-xs mt-8">
            ขอบคุณที่ช่วยสนับสนุนผลงานของเรา!
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* --- Header --- */}
      <header className="p-4 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-500/50">
            <img src={user.photoURL || ''} alt={user.displayName || ''} referrerPolicy="no-referrer" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-zinc-500 font-medium">Player</p>
            <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[80px] sm:max-w-[150px]">{user.displayName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-zinc-800/50 px-3 py-1.5 rounded-full flex items-center gap-2 border border-zinc-700/50">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{gameData.rebirths}</span>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* --- Main Game Area --- */}
      <main className="flex-1 flex flex-col items-center justify-center relative p-6">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px]" />
        </div>

        {/* Stats Display */}
        <div className="text-center mb-8 sm:mb-12 z-10">
          <motion.div 
            key={gameData.cookies}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center gap-2 sm:gap-3 mb-2"
          >
            <Cookie className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500" />
            <h2 className="text-4xl sm:text-6xl font-black font-display text-white tracking-tighter">
              {Math.floor(gameData.cookies).toLocaleString()}
            </h2>
          </motion.div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-zinc-500 font-medium text-sm sm:text-base">
            <div className="flex items-center gap-1.5">
              <MousePointer2 className="w-4 h-4" />
              <span>{cookiesPerClick.toFixed(2)}</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-zinc-700 rounded-full" />
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>{autoClickAmount} / sec</span>
            </div>
          </div>
        </div>

        {/* The Big Cookie */}
        <div className="relative z-10 scale-75 sm:scale-100 transition-transform">
          {/* Auto Clicker UI - Small Dots Circling */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: Math.min(30, gameData.autoClickLevel) }).map((_, i, arr) => {
              const angle = (360 / arr.length) * i;
              const radius = 150;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              
              return (
                <motion.div
                  key={`dot-${i}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: 0.6, 
                    scale: 1,
                    x, 
                    y 
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.6, 1, 0.6],
                      x: [0, -Math.cos((angle * Math.PI) / 180) * 10, 0],
                      y: [0, -Math.sin((angle * Math.PI) / 180) * 10, 0]
                    }}
                    transition={{ 
                      duration: Math.max(0.3, autoClickInterval / 1000), 
                      repeat: Infinity, 
                      ease: "easeInOut",
                      delay: (i * 0.05) % (autoClickInterval / 1000)
                    }}
                    className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.6)]"
                  />
                </motion.div>
              );
            })}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCookieClick}
            className="relative group"
          >
            <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-3xl group-hover:bg-yellow-500/30 transition-all duration-500" />
            <div className="relative p-4 bg-zinc-900/50 rounded-full border border-yellow-500/20 backdrop-blur-sm shadow-2xl">
              <Cookie className="w-48 h-48 text-yellow-600 drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]" />
            </div>
          </motion.button>
        </div>

        {/* Floating Texts */}
        <AnimatePresence>
          {floatingTexts.map(text => (
            <motion.div
              key={text.id}
              initial={{ opacity: 1, scale: 0.5 }}
              animate={{ opacity: 0, y: -120, scale: 1.2 }}
              exit={{ opacity: 0 }}
              style={{ 
                position: 'fixed', 
                left: text.x, 
                top: text.y,
                transform: 'translate(-50%, -50%)'
              }}
              className="pointer-events-none text-3xl font-black text-yellow-400 z-[100] select-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
            >
              {text.value}
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* --- Footer / Shop Toggle --- */}
      <footer className="p-6 flex justify-center z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="p-4 bg-zinc-800/50 text-zinc-300 rounded-2xl border border-zinc-700 hover:bg-zinc-700 transition-all active:scale-95"
          >
            <Trophy className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsShopOpen(true)}
            className="flex items-center gap-3 bg-yellow-500 text-black font-black px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:bg-yellow-400 transition-all active:scale-95 uppercase tracking-widest text-sm"
          >
            <ShoppingBag className="w-5 h-5" />
            Shop & Upgrades
          </button>
        </div>
      </footer>


      {/* --- Shop Modal --- */}
      <AnimatePresence>
        {isShopOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] bg-zinc-950/95 sm:bg-zinc-900/90 backdrop-blur-xl sm:rounded-3xl border-0 sm:border sm:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 sm:p-6 flex items-center justify-between border-b border-zinc-800">
                <h3 className="text-xl sm:text-2xl font-black font-display">Upgrade Shop</h3>
                <button 
                  onClick={() => setIsShopOpen(false)}
                  className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 rotate-90" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-zinc-900/50 p-3 sm:p-4 rounded-2xl border border-zinc-800">
                    <p className="text-[10px] sm:text-xs text-zinc-500 mb-1 uppercase tracking-wider">Current Cookies</p>
                    <p className="text-lg sm:text-xl font-bold text-yellow-500">{Math.floor(gameData.cookies).toLocaleString()}</p>
                  </div>
                  <div className="bg-zinc-900/50 p-3 sm:p-4 rounded-2xl border border-zinc-800">
                    <p className="text-[10px] sm:text-xs text-zinc-500 mb-1 uppercase tracking-wider">Total Earned</p>
                    <p className="text-lg sm:text-xl font-bold text-zinc-300">{Math.floor(gameData.totalCookiesEarned).toLocaleString()}</p>
                  </div>
                </div>

              {/* Upgrade List */}
              <div className="space-y-4">
                {/* Click Power */}
                <UpgradeItem 
                  icon={<MousePointer2 className="w-6 h-6" />}
                  title="Click Power"
                  description="Increase cookies per click by 1"
                  level={gameData.clickLevel}
                  cost={getUpgradeCost(CLICK_UPGRADE_BASE_COST, gameData.clickLevel)}
                  canAfford={gameData.cookies >= getUpgradeCost(CLICK_UPGRADE_BASE_COST, gameData.clickLevel)}
                  onBuy={buyClickUpgrade}
                />

                {/* Auto Clicker */}
                <UpgradeItem 
                  icon={<Zap className="w-6 h-6" />}
                  title="Auto Clicker"
                  description="Get cookies automatically every second"
                  level={gameData.autoClickLevel}
                  cost={getUpgradeCost(AUTO_CLICK_BASE_COST, gameData.autoClickLevel)}
                  canAfford={gameData.cookies >= getUpgradeCost(AUTO_CLICK_BASE_COST, gameData.autoClickLevel)}
                  onBuy={buyAutoClickUpgrade}
                />

                {/* Speed Boost */}
                <UpgradeItem 
                  icon={<TrendingUp className="w-6 h-6" />}
                  title="Speed Boost"
                  description="Increase auto clicker speed"
                  level={gameData.autoClickSpeedLevel}
                  cost={getUpgradeCost(SPEED_UPGRADE_BASE_COST, gameData.autoClickSpeedLevel)}
                  canAfford={gameData.cookies >= getUpgradeCost(SPEED_UPGRADE_BASE_COST, gameData.autoClickSpeedLevel)}
                  onBuy={buySpeedUpgrade}
                />

                {/* Rebirth */}
                <div className="pt-6 border-t border-zinc-800">
                  <div className={`p-5 rounded-2xl border-2 transition-all ${
                    gameData.cookies >= getRebirthCost(gameData.rebirths) 
                    ? 'bg-emerald-500/10 border-emerald-500/50' 
                    : 'bg-zinc-900/50 border-zinc-800 opacity-60'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                          <RefreshCw className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-white">Rebirth</h4>
                          <p className="text-sm text-zinc-400">Reset progress for +0.25 permanent click bonus</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Current</p>
                        <p className="text-lg font-bold text-emerald-400">{gameData.rebirths}</p>
                      </div>
                    </div>
                    <button
                      disabled={gameData.cookies < getRebirthCost(gameData.rebirths)}
                      onClick={performRebirth}
                      className={`w-full py-4 rounded-xl font-black transition-all active:scale-95 ${
                        gameData.cookies >= getRebirthCost(gameData.rebirths)
                        ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {gameData.cookies >= getRebirthCost(gameData.rebirths) 
                        ? `REBIRTH FOR ${getRebirthCost(gameData.rebirths).toLocaleString()} COOKIES`
                        : `NEED ${getRebirthCost(gameData.rebirths).toLocaleString()} COOKIES`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* --- Leaderboard Modal --- */}
    <AnimatePresence>
      {isLeaderboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] bg-zinc-950/95 sm:bg-zinc-900/90 backdrop-blur-xl sm:rounded-3xl border-0 sm:border sm:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 sm:p-6 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h3 className="text-xl sm:text-2xl font-black font-display">Leaderboard</h3>
              </div>
              <button 
                onClick={() => setIsLeaderboardOpen(false)}
                className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 rotate-90" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {leaderboardData.map((player, index) => (
                <LeaderboardItem 
                  key={player.uid}
                  rank={index + 1}
                  player={player}
                  isCurrentUser={user.uid === player.uid}
                />
              ))}
              
              {/* Show current user's rank if not in top 5 */}
              {!leaderboardData.some(p => p.uid === user.uid) && (
                <div className="pt-4 mt-4 border-t border-zinc-800">
                  <LeaderboardItem 
                    rank={'...'}
                    player={{...gameData, displayName: user.displayName}}
                    isCurrentUser={true}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </div>
  );
}

function UpgradeItem({ icon, title, description, level, cost, canAfford, onBuy }) {
  return (
    <div className={`p-3 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
      canAfford ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/30 border-zinc-800 opacity-50'
    }`}>
      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
        <div className="p-2 sm:p-2.5 bg-yellow-500/10 rounded-xl text-yellow-500 shrink-0">
          {icon}
        </div>
        <div className="overflow-hidden">
          <h4 className="font-bold text-white text-sm sm:text-base truncate">{title}</h4>
          <p className="text-[10px] sm:text-xs text-zinc-500 truncate">{description}</p>
          <p className="text-[10px] sm:text-xs font-bold text-yellow-500/70 mt-0.5">Level {level}</p>
        </div>
      </div>
      <button
        disabled={!canAfford}
        onClick={onBuy}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 shrink-0 ${
          canAfford ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-600'
        }`}
      >
        {cost.toLocaleString()}
      </button>
    </div>
  );
}

function LeaderboardItem({ rank, player, isCurrentUser }) {
  const rankColors = {
    1: 'text-yellow-400',
    2: 'text-slate-300',
    3: 'text-yellow-600',
  };
  const rankColor = rankColors[rank] || 'text-zinc-400';

  return (
    <div className={`p-3 sm:p-4 rounded-2xl border flex items-center gap-4 transition-all ${
      isCurrentUser ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-zinc-900/50 border-zinc-800'
    }`}>
      <div className={`w-10 text-center text-xl font-black ${rankColor}`}>{rank}</div>
      <div className="flex-1 overflow-hidden">
        <p className="font-bold text-white truncate">{player.displayName || 'Anonymous'}</p>
      </div>
      <div className="flex items-center gap-4 text-sm text-right">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <RefreshCw className="w-4 h-4" />
          <span className="font-bold">{player.rebirths.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5 text-yellow-500">
          <Cookie className="w-4 h-4" />
          <span className="font-bold">{Math.floor(player.cookies).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
