// pages/withdraw.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadUser, loadBalance, saveTx, savePendingWithdraw, loadTx } from '../utils/storage';



const BANKS = [
  "Access Bank", "GTBank", "Zenith Bank", "UBA", "First Bank", "FCMB",
  "Polaris Bank", "Wema Bank", "Stanbic IBTC", "Keystone Bank",
  "Opay", "Moniepoint", "Paga", "PalmPay", "ALAT", "Kuda", "Rubies Bank"
];

export default function Withdraw() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState('');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [recentTx, setRecentTx] = useState([]);

  useEffect(()=>{
    const u = loadUser();
    if(!u) {
      router.push('/');
      return;
    }
    setUser(u);
    setBalance(Number(u.balance || loadBalance() || 0));

    const tx = loadTx() || [];
    const recent = tx.filter(t=> t.type === 'withdraw' ).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
    setRecentTx(recent.slice(0,3));
  },[]);

  const proceed = ()=>{
    const amt = Number(amount);
    if(!account || !bank || !amt) return alert('Complete all fields');
    if(amt > balance) return alert('Insufficient balance');

    setLoading(true);

    setTimeout(()=>{
      // build transaction with meta keys so history/receipt can read beneficiary details
      const txPayload = {
        type: 'withdraw',
        amount: amt,
        status: 'pending',
        created_at: new Date().toISOString(),
        fullName: user.fullName || '',
        phone: user.phone || '',
        meta: {
          beneficiaryName: user.fullName || '',
          beneficiaryAccount: account,
          bank: bank,
          remark: 'Withdrawal requested by user'
        }
      };

      // save pending withdraw separately for verification step
      savePendingWithdraw({ account, bank, amount: amt, meta: { initiatedBy: user.fullName } });

      // append transaction to history
      saveTx(txPayload);

      setLoading(false);
      alert(`✅ Withdrawal request of ₦${amt.toLocaleString()} submitted!\nProceed to code verification.`);
      router.push('/verify-code');
    }, 3000); // simulate short processing
  };

  if(!user) return (
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
        <p className="text-gray-500 small">Your Wallet Balance: <b>₦{balance.toLocaleString()}</b></p>

        <input
          className="input"
          placeholder="Account Number"
          value={account}
          onChange={e=>setAccount(e.target.value.replace(/\D/g,''))}
        />

        <select
          className="input"
          value={bank}
          onChange={e=>setBank(e.target.value)}
        >
          <option value="">Select Bank</option>
          {BANKS.map((b,i)=><option key={i} value={b}>{b}</option>)}
        </select>

        <input
          className="input"
          placeholder="Amount (₦)"
          type="number"
          value={amount}
          onChange={e=>setAmount(e.target.value)}
        />

        <button
          className={`btn bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform ${loading?'opacity-50 cursor-not-allowed':''}`}
          onClick={proceed}
          disabled={loading}
        >
          {loading ? 'Processing withdrawal...' : 'Proceed to Code Verification'}
        </button>

        {/* Recent Withdrawals */}
        {recentTx.length>0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl shadow-inner">
            <h4 className="font-semibold mb-2">📄 Recent Withdrawals</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              {recentTx.map((t,i)=>(
                <li key={i} className="flex justify-between">
                  <span>{t.meta?.bank || t.bank} • {maskAccount(t.meta?.beneficiaryAccount || t.account)}</span>
                  <span className={t.status==='pending'?'text-yellow-600':'text-green-600'}>₦{t.amount.toLocaleString()} • {t.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}

// small helper for recent list mask
function maskAccount(a) {
  if(!a) return '';
  const s = String(a).replace(/\s+/g,'');
  if(s.length <= 4) return s;
  return '**** **** ' + s.slice(-4);
}
