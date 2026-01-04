import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { saveTx } from '../utils/storage';
import { loadTx } from "../utils/storage";


const CODE_PRICE = 8000;
const WA = '+2347084749682';

export default function BuyCode() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [countdown, setCountdown] = useState(10 * 60);
  const timerRef = useRef(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | pending | success
  const [issuedCode, setIssuedCode] = useState(null);

  useEffect(() => {
    if (step === 2) {
      setCountdown(10 * 60);
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  const proceed = () => {
    if (!name || !phone || !email) return alert('Please fill in all fields');
    setStep(2);
  };

  const confirmPayment = () => {
    if (countdown === 0) return alert('⏳ Payment time expired! Restart process.');
    setLoading(true);
    setPaymentStatus('pending');

    setTimeout(() => {
      setLoading(false);

      // Instead of auto success, show instructions
      setPaymentStatus('unsuccessful');

      saveTx({
        type: 'buy_code',
        amount: CODE_PRICE,
        status: 'pending', // pending until user confirms payment via WhatsApp
        meta: { name, phone, email },
        created_at: new Date().toISOString()
      });
    }, 3000);
  };

  const minutes = String(Math.floor(countdown / 60)).padStart(2, '0');
  const seconds = String(countdown % 60).padStart(2, '0');

  return (
    <Layout>
      <LogoHeader small />
      <div className="card shadow-lg rounded-2xl p-6 space-y-6 animate-fadeIn">
        <h3 className="text-2xl font-bold text-center mb-4">🔑 Buy Activation Code</h3>

        {/* Step 1: User Details */}
        {step === 1 && (
          <div className="space-y-4">
            <input className="input" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
            <input className="input" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
            <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <button
              className="btn bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform"
              onClick={proceed}
            >
              Proceed 🚀
            </button>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && !issuedCode && (
          <div className="space-y-6 animate-fadeIn">

            {/* Payment message */}
            <div className="bg-blue-50 p-4 rounded-xl text-center shadow-md space-y-2">
              <p className="text-gray-700 text-lg">
                Hello <b>{name}</b>, please make a one-time payment of <b>₦{CODE_PRICE.toLocaleString()}</b>
              </p>
              <p className="text-gray-500">to purchase your personal activation code.</p>
            </div>

            {/* Bank account details */}
            <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-200 space-y-1">
              <p className="font-semibold text-center text-gray-800">Bank Details</p>
              <hr className="my-2"/>
              <p>Account Name: <b>Usman Abdulrahim</b></p>
              <p>Account Number: <b>6511699109</b></p>
              <p>Bank: <b>Moniepoint</b></p>
              <p>Amount: <b>₦{CODE_PRICE.toLocaleString()}</b></p>
<p>Status: <b>PROMO 85% Discount 🔥💸💰 </b></p>
            </div>

            {/* Countdown with emoji animation */}
            <div className="flex flex-col items-center space-y-2 mt-4">
              <div className="text-5xl animate-pulse">⏳🔄</div>
              <div className={`text-4xl font-extrabold font-mono ${countdown <= 60 ? 'text-red-500' : 'text-gray-700'}`}>
                {minutes}:{seconds}
              </div>
              <p className="text-gray-500 text-sm">Time remaining to complete payment</p>
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              <button
                className={`btn bg-green-500 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={confirmPayment}
                disabled={loading}
              >
                {loading ? 'Confirming Payment...' : 'Confirm Payment ✅'}
              </button>

              <a
                className="btnGhost w-full text-center"
                href={`https://wa.me/${WA.replace('+','')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Payment not confirmed? Contact Vendor (WhatsApp)
              </a>
            </div>
          </div>
        )}

        {/* Payment Unsuccessful Instructions */}
        {paymentStatus === 'unsuccessful' && (
          <div className="space-y-4 text-center animate-fadeIn">
            <h3 className="text-2xl font-bold text-red-600">⚠️ Payment Pending / Unsuccessful</h3>
            <p className="text-gray-600">
              Your payment has not been automatically verified. Please submit your payment receipt to the vendor via WhatsApp.
            </p>
            <a
              className="btn bg-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform"
              href={`https://wa.me/${WA.replace('+','')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Submit Receipt / Contact Vendor 📲
            </a>
          </div>
        )}
      </div>
    </Layout>
  );
}
