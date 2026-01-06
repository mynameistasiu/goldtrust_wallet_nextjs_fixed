import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { 
  loadPendingWithdraw, 
  loadBalance, 
  saveBalance, 
  saveTx, 
  clearPendingWithdraw 
} from '../utils/storage';

const WITHDRAW_CODE = 'GT1024W';

export default function VerifyCode() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = loadPendingWithdraw();
    if (!p) {
      router.push('/dashboard');
      return;
    }
    setPending(p);

    // Ensure the canonical code exists client-side for other pages
    try {
      localStorage.setItem('gt_activation_code', WITHDRAW_CODE);
    } catch (e) {}
  }, []);

  const verify = () => {
    if (!code.trim()) return alert('Enter your withdrawal code');

    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      if (code.trim().toUpperCase() === WITHDRAW_CODE) {
        const amt = Number(pending.amount);
        const newBal = Number(loadBalance() || 0) - amt;
        saveBalance(newBal);

        // Write transaction to history
        saveTx({
          type: 'withdraw_confirm',
          amount: amt,
          status: 'successful',
          created_at: new Date().toISOString(),
          meta: {
            bank: pending.bank,
            account: pending.account
          }
        });

        // Clear pending withdrawal (we've confirmed it)
        clearPendingWithdraw();

        // Start 10-minute restriction timer AFTER success
        try {
          localStorage.setItem('gt_restriction_end', String(Date.now() + (10 * 60 * 1000)));
        } catch (e) {}

        alert(`🎉 Withdrawal Successful!\n₦${amt.toLocaleString()} has been processed ✅`);
        router.push('/dashboard');
      } else {
        if (confirm('❌ Invalid code. Buy code now?')) {
          router.push('/buy-code');
        }
      }
    }, 1500); // short verification delay
  };

  if (!pending) return null;

  return (
    <Layout>
      <LogoHeader small />
      <div className="card shadow-lg p-6 rounded-2xl text-center space-y-4 animate-fadeIn">
        <h3 className="text-xl font-bold mb-2">🔐 Verify Withdrawal Code</h3>
        <p className="text-gray-500 small">
          Enter the withdrawal code you received to confirm your withdrawal.
        </p>

        {/* Show pending withdrawal info */}
        {pending && (
          <div className="bg-gray-50 p-4 rounded-xl shadow-inner text-left space-y-1">
            <p><b>Bank:</b> {pending.bank}</p>
            <p><b>Account:</b> {pending.account}</p>
            <p><b>Amount:</b> ₦{Number(pending.amount).toLocaleString()}</p>
            <p className="text-yellow-600 text-sm">Status: Pending</p>
          </div>
        )}

        <input
          className="input text-center"
          placeholder="Enter your withdrawal code"
          value={code}
          onChange={e => setCode(e.target.value)}
        />

        <button
          className={`btn bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={verify}
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Verify Code ✅'}
        </button>
      </div>
    </Layout>
  );
}