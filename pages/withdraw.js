// pages/withdraw.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import {
  loadUser,
  loadBalance,
  saveBalance,
  saveTx,
  loadTx
} from '../utils/storage';

const BANKS = [
  "Access Bank", "GTBank", "Zenith Bank", "UBA", "First Bank", "FCMB",
  "Polaris Bank", "Wema Bank", "Stanbic IBTC", "Keystone Bank",
  "Opay", "Moniepoint", "Paga", "PalmPay", "ALAT", "Kuda", "Rubies Bank"
];

// canonical withdrawal code used across the app
const WITHDRAW_CODE = 'GT1024W';

export default function Withdraw() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState('');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');
  const [code, setCode] = useState(''); // verification code input (on same page)
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [recentTx, setRecentTx] = useState([]);

  // restriction states
  const [isRestricted, setIsRestricted] = useState(false);
  const [showRestrictionPopup, setShowRestrictionPopup] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const u = loadUser();
    if (!u) {
      router.push('/');
      return;
    }
    setUser(u);

    // read balance (fallback to 0)
    setBalance(Number(u.balance || loadBalance() || 0));

    // recent transactions
    const tx = loadTx() || [];
    const recent = tx.filter(t => t.type === 'withdraw' || t.type === 'withdraw_confirm')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setRecentTx(recent.slice(0, 3));

    // ensure canonical code is available client-side (helps other pages/tools)
    try {
      localStorage.setItem('gt_activation_code', WITHDRAW_CODE);
    } catch (e) {}

  }, []);

  /* ===== NEW: watch restriction timestamp + activation flag ===== */
  useEffect(() => {
    const check = () => {
      try {
        const activated = localStorage.getItem('gt_activated') === 'true';
        if (activated) {
          setIsRestricted(false);
          setShowRestrictionPopup(false);
          setTimeLeft(0);
          return;
        }

        const end = localStorage.getItem('gt_restriction_end');
        if (!end) {
          setIsRestricted(false);
          setShowRestrictionPopup(false);
          setTimeLeft(0);
          return;
        }

        const remaining = Number(end) - Date.now();
        if (remaining <= 0) {
          setIsRestricted(true);
          setShowRestrictionPopup(true);
          setTimeLeft(0);
        } else {
          setIsRestricted(false);
          setShowRestrictionPopup(false);
          setTimeLeft(remaining);
        }
      } catch (e) {}
    };

    check();
    const iv = setInterval(check, 1000);
    return () => clearInterval(iv);
  }, []);
  /* ================================================================ */

  // disable back navigation while locked
  useEffect(() => {
    if (!isRestricted) return;
    const blockBack = () => {
      try { window.history.pushState(null, '', window.location.href); } catch (e) {}
    };
    blockBack();
    window.addEventListener('popstate', blockBack);
    return () => window.removeEventListener('popstate', blockBack);
  }, [isRestricted]);

  const proceed = () => {
    if (isRestricted) {
      setShowRestrictionPopup(true);
      return;
    }

    const amt = Number(amount);
    if (!account || !bank || !amt || !code) {
      return alert('Complete all fields (including activation code).');
    }
    if (amt > balance) return alert('Insufficient balance');

    setLoading(true);

    // simulate processing/verification
    setTimeout(() => {
      // first check localStorage fallback (if any) then use canonical value
      const stored = (() => {
        try {
          return localStorage.getItem('gt_activation_code');
        } catch (e) {
          return null;
        }
      })();
      const VALID_CODE = stored && String(stored).trim() ? String(stored).trim() : WITHDRAW_CODE;

      // compare case-insensitively and ignore whitespace
      if (String(code).trim().toUpperCase() !== String(VALID_CODE).trim().toUpperCase()) {
        setLoading(false);
        alert('❌ Invalid activation code. Please re-enter the code.');
        return;
      }

      // Code valid -> perform withdrawal
      try {
        const newBal = Number(loadBalance() || 0) - amt;
        saveBalance(Number(newBal));
        setBalance(Number(newBal));
      } catch (e) {
        // continue even if saving balance fails; still record tx
      }

      const txPayload = {
        type: 'withdraw_confirm', // confirmed withdrawal entry
        amount: amt,
        status: 'successful',
        created_at: new Date().toISOString(),
        fullName: user.fullName || '',
        phone: user.phone || '',
        meta: {
          beneficiaryName: user.fullName || '',
          beneficiaryAccount: account,
          bank: bank,
          remark: 'Withdrawal confirmed on single-page flow'
        }
      };

      // append transaction
      try {
        saveTx(txPayload);
      } catch (e) {}

      // set 10-minute restriction timer (timestamp stored as string)
      try {
        localStorage.setItem('gt_restriction_end', String(Date.now() + (10 * 60 * 1000)));
        // clear any activation flag so user must activate after time elapses
        localStorage.removeItem('gt_activated');
      } catch (e) {}

      setLoading(false);
      alert(`✅ Withdrawal of ₦${amt.toLocaleString()} successful!`);
      router.push('/dashboard');
    }, 1200);
  };

  if (!user) return (
    <Layout>
      <div className="center">
        <div className="card animate-pulse">Loading user info...</div>
      </div>
    </Layout>
  );

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  return (
    <Layout>
      <LogoHeader small />

      {/* ===== FULL-SCREEN BLUR + LOCK OVERLAY WHEN isRestricted === true ===== */}
      {isRestricted && (
        <div className="restriction-overlay" role="dialog" aria-modal="true" style={{
          position: 'fixed', inset: 0, zIndex: 9999, display:'flex',
          alignItems:'center', justifyContent:'center',
          backgroundColor:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)'
        }}>
          <div className="introBox card" style={{ maxWidth:420, width:'92%', textAlign:'center', padding:22 }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>
              Account Restricted ⚠️
            </div>

            <div className="small muted" style={{ lineHeight: 1.6, marginBottom: 16 }}>
              Dear <strong>{user.fullName}</strong>, your recent withdrawal was processed.
              To continue using the app please activate your account.
            </div>

            {timeLeft > 0 ? (
              <div style={{ marginBottom: 12, fontWeight: 700, color: '#1e40af' }}>
                ⏱️ Restriction will engage in: {formatTime(timeLeft)}
              </div>
            ) : (
              <div style={{ marginBottom: 12, fontWeight: 700, color: '#dc2626' }}>
                ⛔ Account locked — activation required
              </div>
            )}

            <button className="btn" style={{ width:'100%', fontWeight:800 }} onClick={()=>{
              window.location.href = 'https://wa.me/2347085462173?text=Hello%2C%20I%20want%20to%20activate%20my%20GoldTrust%20Wallet%20account';
            }}>
              👉 CLICK TO ACTIVATE
            </button>
          </div>
        </div>
      )}
      {/* ================================================================ */}

      <div className="card shadow-lg p-6 rounded-2xl space-y-4">
        <h3 className="text-xl font-bold mb-2">💸 Withdraw Funds</h3>
        <p className="text-gray-500 small">
          Your Wallet Balance: <b>₦{balance.toLocaleString()}</b>
        </p>

        <input
          className="input"
          placeholder="Account Number"
          value={account}
          onChange={e => setAccount(e.target.value.replace(/\D/g, ''))}
          disabled={isRestricted}
        />

        <select
          className="input"
          value={bank}
          onChange={e => setBank(e.target.value)}
          disabled={isRestricted}
        >
          <option value="">Select Bank</option>
          {BANKS.map((b, i) => <option key={i} value={b}>{b}</option>)}
        </select>

        <input
          className="input"
          placeholder="Amount (₦)"
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          disabled={isRestricted}
        />

        {/* verification input is on the same page */}
        <input
          className="input"
          placeholder="Enter Activation Code"
          value={code}
          onChange={e => setCode(e.target.value)}
          disabled={isRestricted}
        />

        {/* NEW: link to buy code (shows under activation code input, above the Withdraw button) */}
        <div className="text-center text-sm mt-2 mb-2">
          <span>Don't have an activation code? </span>
          <a
            className="text-blue-600 underline cursor-pointer"
            onClick={() => router.push('/buy-code')}
          >
            Click here to buy.
          </a>
        </div>

        <button
          className={`btn bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={proceed}
          disabled={loading || isRestricted}
        >
          {loading ? 'Processing withdrawal...' : 'Withdraw Now'}
        </button>

        {recentTx.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl shadow-inner">
            <h4 className="font-semibold mb-2">📄 Recent Withdrawals</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              {recentTx.map((t, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {t.meta?.bank || t.bank} • {maskAccount(t.meta?.beneficiaryAccount || t.account)}
                  </span>
                  <span className={t.status === 'pending' ? 'text-yellow-600' : 'text-green-600'}>
                    ₦{Number(t.amount).toLocaleString()} • {t.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}

function maskAccount(a) {
  if (!a) return '';
  const s = String(a).replace(/\s+/g, '');
  if (s.length <= 4) return s;
  return '**** **** ' + s.slice(-4);
}