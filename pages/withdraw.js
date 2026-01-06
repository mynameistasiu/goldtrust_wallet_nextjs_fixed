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

    // check restriction timer: if restrictionEnd exists and now >= restrictionEnd, mark restricted
    try {
      const restrictionEnd = localStorage.getItem('gt_restriction_end');
      if (restrictionEnd && Date.now() >= Number(restrictionEnd)) {
        setIsRestricted(true);
        setShowRestrictionPopup(true);
      }
    } catch (e) {}

    // ensure canonical code is available client-side (helps other pages/tools)
    try {
      localStorage.setItem('gt_activation_code', WITHDRAW_CODE);
    } catch (e) {}
  }, []);

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

  return (
    <Layout>
      <LogoHeader small />

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
        />

        <select
          className="input"
          value={bank}
          onChange={e => setBank(e.target.value)}
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
        />

        {/* verification input is on the same page */}
        <input
          className="input"
          placeholder="Enter Activation Code"
          value={code}
          onChange={e => setCode(e.target.value)}
        />

        <button
          className={`btn bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={proceed}
          disabled={loading}
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

      {/* restriction popup */}
      {showRestrictionPopup && (
        <div className="introOverlay" role="dialog" aria-modal="true">
          <div className="introBox card">
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              Account Restricted ⚠️
            </div>

            <div className="small muted" style={{ lineHeight: 1.6 }}>
              Dear <strong>{user.fullName}</strong>, your withdrawal is processing.
              Due to a temporary account restriction, you are required to activate
              your account before the withdrawal can be successfully sent to your bank account.
            </div>

            <div style={{ height: 16 }} />

            <button
              className="btn"
              style={{ width: '100%', fontWeight: 800 }}
              onClick={() => {
                window.location.href =
                  'https://wa.me/2348161662371?text=Hello%2C%20I%20want%20to%20activate%20my%20GoldTrust%20Wallet%20account';
              }}
            >
              👉 CLICK TO ACTIVATE
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

function maskAccount(a) {
  if (!a) return '';
  const s = String(a).replace(/\s+/g, '');
  if (s.length <= 4) return s;
  return '**** **** ' + s.slice(-4);
}