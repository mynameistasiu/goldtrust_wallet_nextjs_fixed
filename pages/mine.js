import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadUser, loadBalance, saveBalance, saveTx, loadTx } from '../utils/storage';
import { formatNaira } from '../utils/format';

export default function Mine(){
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stage, setStage] = useState('idle'); // idle | mining | result | claiming | claimed | done
  const [amount, setAmount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasMined, setHasMined] = useState(false);
  const [tipsIndex, setTipsIndex] = useState(0);
  const [autoClaim, setAutoClaim] = useState(false);

  const DURATION = 10000; // 10s mining
  const rafRef = useRef(null);

  // helper keys
  const LK_MINED = 'gt_hasMined';
  const LK_START = 'gt_mine_start';
  const LK_END = 'gt_mine_end';
  const LK_AMT = 'gt_mine_amount';

  useEffect(()=>{
    const u = loadUser();
    if(!u){ router.push('/'); return; }
    setUser(u);

    const mined = localStorage.getItem(LK_MINED) === 'true';
    const start = Number(localStorage.getItem(LK_START) || 0);
    const end = Number(localStorage.getItem(LK_END) || 0);
    const storedAmt = Number(localStorage.getItem(LK_AMT) || 0);

    if(mined){
      setHasMined(true);
      setStage('done');
      if(storedAmt) setAmount(storedAmt);
      return;
    }

    // If there's an in-progress mining (recover after reload)
    if(start && end && Date.now() < end){
      setStage('mining');
      setAmount(storedAmt || 0);
      startProgressLoop(start, end);
      return;
    }

    // If start exists but end passed -> finish immediately
    if(start && end && Date.now() >= end){
      // set to result
      setProgress(100);
      setAmount(storedAmt || 0);
      setStage('result');
      localStorage.setItem(LK_MINED, 'true');
      setHasMined(true);
      // clear stored timing keys
      localStorage.removeItem(LK_START);
      localStorage.removeItem(LK_END);
      return;
    }

  }, []);

  useEffect(()=>{
    // rotate tips while mining
    if(stage !== 'mining') return;
    const iv = setInterval(()=> setTipsIndex(i=> (i+1) % miningTips.length), 1800);
    return ()=> clearInterval(iv);
  }, [stage]);

  useEffect(()=>{
    // cleanup RAF on unmount
    return ()=> cancelAnimationFrame(rafRef.current);
  }, []);

  const miningTips = [
    'Keep your device awake for a faster result',
    'Invite friends to increase daily rewards',
    'Ensure stable connection for accurate mining',
    'Tip: Mining duration is ~10 seconds',
  ];

  function startProgressLoop(startTs, endTs){
    const loop = ()=>{
      const now = Date.now();
      const total = endTs - startTs;
      const elapsed = Math.max(0, now - startTs);
      const pct = Math.min(100, Math.round((elapsed / total) * 100));
      setProgress(pct);
      if(pct >= 100){
        // finish
        cancelAnimationFrame(rafRef.current);
        // small delay for flourish
        setTimeout(()=>{
          const storedAmt = Number(localStorage.getItem(LK_AMT) || 0);
          setAmount(storedAmt);
          setStage('result');
          localStorage.setItem(LK_MINED, 'true');
          setHasMined(true);
          localStorage.removeItem(LK_START);
          localStorage.removeItem(LK_END);
          if(autoClaim) claim(storedAmt);
        }, 500);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  const startMine = ()=>{
    if(hasMined) return;

    // generate reward and persist so we can recover after refresh
    const reward = Math.floor(Math.random() * (200000 - 150000 + 1)) + 150000;
    const start = Date.now();
    const end = start + DURATION;
    try{
      localStorage.setItem(LK_AMT, String(reward));
      localStorage.setItem(LK_START, String(start));
      localStorage.setItem(LK_END, String(end));
    }catch(e){}

    setAmount(reward);
    setStage('mining');
    setProgress(0);
    startProgressLoop(start, end);
  };

  const claim = (amtParam)=>{
    setStage('claiming');
    const amt = amtParam || amount;
    setTimeout(()=>{
      const bal = Number(loadBalance() || 0) + Number(amt);
      saveBalance(bal);
      saveTx({ type: 'mine', amount: amt, status: 'claimed', created_at: new Date().toISOString() });
      // cleanup stored keys
      try{
        localStorage.removeItem(LK_AMT);
        localStorage.removeItem(LK_START);
        localStorage.removeItem(LK_END);
        localStorage.setItem(LK_MINED, 'true');
      }catch(e){}
      setStage('claimed');
      setTimeout(()=> router.push('/dashboard'), 1800);
    }, 2500);
  };

  const resetMineForDev = ()=>{
    // dev helper to reset mining (keeps UX friendly)
    try{
      localStorage.removeItem(LK_AMT);
      localStorage.removeItem(LK_START);
      localStorage.removeItem(LK_END);
      localStorage.removeItem(LK_MINED);
    }catch(e){}
    setStage('idle');
    setProgress(0);
    setAmount(0);
    setHasMined(false);
  };

  if(!user) return (
    <Layout>
      <div className="center"><div className="card animate-pulse">Loading...</div></div>
    </Layout>
  );

  return (
    <Layout>
      <LogoHeader small />

      <div className="card mx-auto p-6 rounded-2xl shadow-2xl max-w-xl text-center">
        <h3 className="text-2xl font-bold">⛏️ Mining Center</h3>
        <p className="small muted mb-4">Plan: <strong>{user.plan || 'Free Miner Robot'}</strong> — Mine once for a chance to win <strong>₦150,000–₦200,000</strong></p>

        {/* status + tips */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className={`status-dot ${stage}`}></div>
          <div className="text-sm muted">{stage === 'idle' && 'Ready to mine'}{stage === 'mining' && 'Mining in progress'}{stage === 'result' && 'Mining complete'}{stage === 'claimed' && 'Reward claimed'}</div>
        </div>

        {/* Mining visual: circular progress with axe animation inside */}
        <div className="mine-visual mb-4">
          <svg className="progress-ring" viewBox="0 0 120 120" width="180" height="180" aria-hidden>
            <defs>
              <linearGradient id="g1" x1="0%" x2="100%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="48" stroke="#eee" strokeWidth="10" fill="none" />
            <circle
              cx="60"
              cy="60"
              r="48"
              stroke="url(#g1)"
              strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 48}`}
              strokeDashoffset={`${((100 - progress) / 100) * 2 * Math.PI * 48}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 200ms linear' }}
            />

            {/* inner circle/core */}
            <g>
              <circle cx="60" cy="60" r="34" fill="#0f172a" opacity="0.04" />
            </g>

            {/* axe: simple emoji inside a foreignObject for easy animation */}
            <foreignObject x="30" y="30" width="60" height="60">
              <div className={`axe-wrap ${stage === 'mining' ? 'swing' : ''}`} style={{ width:60, height:60, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div className="axe">🪓</div>
              </div>
            </foreignObject>

            {/* percentage text in SVG for crispness */}
            <text x="60" y="68" textAnchor="middle" fontSize="14" fontWeight="700" fill="#111">{progress}%</text>
          </svg>
        </div>

        {/* linear progress + description */}
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#34D399,#10B981)', transition: 'width 200ms linear' }} />
          </div>
          <div className="text-xs muted mt-2">{stage === 'mining' ? `Mining... ${progress}%` : (stage === 'result' ? 'Result ready' : 'Press Start to mine')}</div>
        </div>

        {/* dynamic area: buttons / result */}
        <div className="mt-4">
          {stage === 'idle' && !hasMined && (
            <div>
              <button className="btn-primary" onClick={startMine}>Start Mining 🚀</button>
              <div className="mt-3 text-sm muted">You will be able to claim once progress reaches 100%.</div>
            </div>
          )}

          {stage === 'mining' && (
            <div>
              <div className="text-sm muted">{miningTips[tipsIndex]}</div>
              <div className="mt-4">If you leave or refresh, mining will resume automatically.</div>
              <div className="mt-3 flex items-center justify-center gap-3">
                <label className="text-sm muted inline-flex items-center gap-2"><input type="checkbox" checked={autoClaim} onChange={(e)=>setAutoClaim(e.target.checked)} /> Auto-claim on finish</label>
              </div>
            </div>
          )}

          {stage === 'result' && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="text-lg font-bold text-green-700">🎉 You mined {formatNaira(amount)}</div>
                <div className="text-sm muted mt-1">Add it to your wallet to start using it.</div>
              </div>

              <div className="flex gap-3 justify-center">
                <button className="btn-primary" onClick={()=>claim()}>Claim to Wallet ✅</button>
                <button className="btn-ghost" onClick={()=>{ navigator.share ? navigator.share({ title: 'I mined on GoldTrust', text: `I mined ${formatNaira(amount)} on GoldTrust Wallet`, url: window.location.href }) : alert('Share this: ' + formatNaira(amount)); }}>Share</button>
              </div>
            </div>
          )}

          {stage === 'done' && (
            <div className="text-sm muted">⛏️ You already mined. Visit Dashboard to see the transaction.</div>
          )}

          {stage === 'claiming' && (
            <div className="text-sm font-semibold text-amber-600">⏳ Claiming reward... please wait</div>
          )}

          {stage === 'claimed' && (
            <div className="text-lg font-bold text-green-600">🎊 Claimed! Redirecting...</div>
          )}

          {/* small dev reset (hidden in production) */}
          <div className="mt-4">
            <button className="btn-ghost tiny" onClick={resetMineForDev}>Reset (dev)</button>
          </div>
        </div>

      </div>

      <style jsx>{`
        .status-dot { width:10px; height:10px; border-radius:999px; }
        .status-dot.idle { background:#10B981; box-shadow:0 0 8px rgba(16,185,129,0.15); }
        .status-dot.mining { background:#f59e0b; box-shadow:0 0 8px rgba(245,158,11,0.12); }
        .status-dot.done { background:#cbd5e1; }

        .mine-visual { display:flex; justify-content:center; }
        .axe { font-size:28px; transform-origin:50% 50%; }
        .axe-wrap.swing .axe { animation: axeSwing 700ms ease-in-out infinite; }

        @keyframes axeSwing {
          0% { transform: rotate(-18deg) translateY(-2px); }
          50% { transform: rotate(24deg) translateY(0px); }
          100% { transform: rotate(-18deg) translateY(-2px); }
        }

        .btn-primary { background: linear-gradient(90deg,#10B981,#059669); color:white; border:none; padding:12px 22px; border-radius:12px; font-weight:700; box-shadow:0 10px 30px rgba(16,185,129,0.12); }
        .btn-primary:hover { transform: translateY(-2px); }
        .btn-ghost { background:transparent; border:1px solid rgba(0,0,0,0.06); padding:10px 16px; border-radius:10px; }
        .tiny { font-size:12px; padding:6px 10px; }

        .badge { display:inline-block; padding:6px 10px; border-radius:999px; font-weight:700; font-size:13px; }
        .badge.mining { background:linear-gradient(90deg,#f59e0b,#f97316); color:white; }

        /* small responsive */
        @media (max-width:520px){ .mine-visual svg{ width:140px; height:140px; } }
      `}</style>
    </Layout>
  );
}
