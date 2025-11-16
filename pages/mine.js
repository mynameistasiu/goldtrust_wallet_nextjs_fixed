import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadUser, loadBalance, saveBalance, saveTx } from '../utils/storage';
import { formatNaira } from '../utils/format';
import { loadTx } from "../utils/storage";


export default function Mine() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stage, setStage] = useState('idle');
  const [amount, setAmount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasMined, setHasMined] = useState(false);

  useEffect(() => {
    const u = loadUser();
    if (!u) router.push('/');
    setUser(u);

    // Check if user already mined
    const minedFlag = localStorage.getItem('hasMined');
    if (minedFlag === 'true') {
      setHasMined(true);
      setStage('done');
    }
  }, []);

  const startMine = () => {
    if (hasMined) return;

    const val = Math.floor(Math.random() * (200000 - 150000 + 1)) + 150000;
    setStage('mining');
    setProgress(0);

    // Fake progress bar increase (10 seconds)
    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      if (p >= 100) {
        clearInterval(interval);
      }
      setProgress(p);
    }, 200); // 200ms * 50 = 10s

    setTimeout(() => {
      setAmount(val);
      setStage('result');
      setHasMined(true);
      localStorage.setItem('hasMined', 'true'); // lock mining forever
    }, 10000);
  };

  const claim = () => {
    setStage('claiming');

    setTimeout(() => {
      const bal = Number(loadBalance() || 0) + Number(amount);
      saveBalance(bal);
      saveTx({ type: 'mine', amount, status: 'claimed', created_at: new Date().toISOString() });

      setStage('claimed');
      setTimeout(() => router.push('/dashboard'), 2000);
    }, 5000); // 5 seconds wait before adding
  };

  if (!user) {
    return (
      <Layout>
        <div className="center">
          <div className="card animate-pulse">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <LogoHeader small />
      <div className="card shadow-2xl p-6 rounded-2xl text-center transition-all">
        <h3 className="text-2xl font-bold mb-2">⛏️ Mining Center</h3>
        <p className="small muted mb-4">
          Your current plan: <span className="font-semibold text-green-600">{user.plan}</span>. 
          You can mine between <b>₦150,000 – ₦200,000</b>.
        </p>

        {/* Idle State */}
        {stage === 'idle' && !hasMined && (
          <button 
            className="btn bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl px-6 py-3 text-lg shadow-md hover:scale-105 transition-transform"
            onClick={startMine}
          >
            Start Mining 🚀
          </button>
        )}

        {/* Already mined */}
        {stage === 'done' && (
          <div className="text-gray-500">
            ⛏️ You have already mined. Mining is only allowed once.
          </div>
        )}

        {/* Mining Progress */}
        {stage === 'mining' && (
          <div className="space-y-4">
            <p className="text-gray-500 animate-pulse">⚡ Mining in progress... please wait</p>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{progress}% completed</p>
          </div>
        )}

        {/* Result */}
        {stage === 'result' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="p-4 bg-green-100 rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-green-700">🎉 Congratulations!</h3>
              <div className="text-3xl font-extrabold text-green-800">{formatNaira(amount)}</div>
              <p className="text-gray-600 mt-2">
                You successfully mined <b>{formatNaira(amount)}</b> 💎  
              </p>
              <p className="text-sm text-gray-500">Click below to claim your reward.</p>
            </div>
            <button 
              className="btn bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition-transform"
              onClick={claim}
            >
              Claim to Wallet ✅
            </button>
          </div>
        )}

        {/* Claiming Loading */}
        {stage === 'claiming' && (
          <div className="animate-pulse text-green-700 font-semibold mt-4">
            ⏳ Claiming your reward... Please wait
          </div>
        )}

        {/* Claimed */}
        {stage === 'claimed' && (
          <div className="animate-bounce text-green-600 font-bold mt-4">
            🎊 Reward Claimed! Redirecting to Dashboard...
          </div>
        )}
      </div>
    </Layout>
  );
}
