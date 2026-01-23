import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { saveTx } from '../utils/storage';

const CODE_PRICE = 8000;
const WA = '+2348136347797';
const TOTAL_SECONDS = 10 * 60; // 10 minutes
const ACCOUNT_NUMBER = '2082683908';
const ACCOUNT_NAME = 'Abdulrahim Usman';
const BANK_NAME = 'Kuda Bank';

export default function BuyCode() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [countdown, setCountdown] = useState(TOTAL_SECONDS);
  const timerRef = useRef(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | pending | unsuccessful | success
  const [receiptFile, setReceiptFile] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (step === 2) {
      setCountdown(TOTAL_SECONDS);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  const proceed = () => {
    if (!name || !phone || !email) return alert('Please fill in all fields');
    setStep(2);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) return alert('File too large (max 6MB)');
    setReceiptFile(f);
  };

  const copyAccount = async () => {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(ACCOUNT_NUMBER);
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 1500);
      } else {
        // fallback
        const el = document.createElement('textarea');
        el.value = ACCOUNT_NUMBER;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 1500);
      }
    } catch (err) {
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(''), 1500);
    }
  };

  const confirmPayment = async () => {
    if (countdown === 0) return alert('⏳ Payment time expired! Restart process.');
    if (!receiptFile) return alert('Please upload your payment receipt before confirming.');

    setLoading(true);
    setPaymentStatus('pending');

    // Save transaction locally as pending. In a real app you would upload the receipt to your server or cloud storage
    saveTx({
      type: 'buy_code',
      amount: CODE_PRICE,
      status: 'pending',
      meta: { name, phone, email, receiptName: receiptFile.name },
      created_at: new Date().toISOString()
    });

    setTimeout(() => {
      setLoading(false);

      // Prepare message (note: file can't be auto-attached)
      const message = `Hello, I have paid ₦${CODE_PRICE.toLocaleString()}.
Name: ${name}
Phone: ${phone}
Email: ${email}
Receipt: ${receiptFile.name}
Please confirm and issue my activation code.`;
      const waLink = `https://wa.me/${WA.replace('+','')}?text=${encodeURIComponent(message)}`;

      // Open WhatsApp chat in new tab
      window.open(waLink, '_blank');

      setPaymentStatus('unsuccessful');
    }, 1200);
  };

  const minutes = String(Math.floor(countdown / 60)).padStart(2, '0');
  const seconds = String(countdown % 60).padStart(2, '0');

  // For circular timer
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = countdown / TOTAL_SECONDS; // 1 -> full, 0 -> empty
  const dashOffset = circumference * (1 - progress);

  // dashboard dark yellow (tailwind amber-700-ish)
  const DASHBOARD_YELLOW = '#b45309';

  return (
    <Layout>
      <LogoHeader small />

      <div className="max-w-xl mx-auto p-6">
        <div className="card shadow-xl rounded-2xl p-6 space-y-6 bg-white">
          <h3 className="text-2xl font-bold text-center">🔑 Buy Activation Code</h3>

          {/* Step 1 form */}
          {step === 1 && (
            <div className="space-y-4">
              <input className="input" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
              <input className="input" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
              <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />

              <div className="flex space-x-3">
                <button className="btn bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform flex-1"
                        onClick={proceed}>Proceed 🚀</button>
                <button className="btnGhost px-4 py-3 rounded-xl" onClick={() => { setName(''); setPhone(''); setEmail(''); }}>Clear</button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-6">

              {/* Payment message */}
              <div className="bg-yellow-50 p-4 rounded-xl text-center shadow-md space-y-2">
                <p className="text-gray-700 text-lg">Hello <b>{name}</b>, please make a one-time payment of <b>₦{CODE_PRICE.toLocaleString()}</b></p>
              </div>

              {/* Bank account details with copy button immediately before account number */}
              <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-200 space-y-2">
                <p className="font-semibold text-center text-gray-800">Bank Details</p>
                <hr className="my-2" />
                <p>Account Name: <b>{ACCOUNT_NAME}</b></p>
                <p>
                  Account Number:
                  <button onClick={copyAccount} aria-label="Copy account number" className="ml-3 inline-flex items-center px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 2a2 2 0 00-2 2v1H5a2 2 0 00-2 2v7a2 2 0 002 2h7a2 2 0 002-2v-1h1a2 2 0 002-2V8a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H8z" />
                    </svg>
                  </button>
                  <b className="ml-3 tracking-wider">{ACCOUNT_NUMBER}</b>
                  {copySuccess && <span className="ml-3 text-sm text-green-600">{copySuccess}</span>}
                </p>
                <p>Bank: <b>{BANK_NAME}</b></p>
                <p>Amount: <b>₦{CODE_PRICE.toLocaleString()}</b></p>
                <p>Status: <b>PROMO 85% Discount 🔥💸💰</b></p>
              </div>

              {/* Circular countdown (text is white; stroke is dashboard yellow) */}
              <div className="flex items-center justify-center space-x-6 mt-4">
                <div className="relative" aria-hidden>
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <g transform="translate(70,70)">
                      <circle r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                      <circle
                        r={radius}
                        fill="transparent"
                        strokeWidth="12"
                        stroke={DASHBOARD_YELLOW}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{ transition: 'stroke-dashoffset 0.9s linear', transform: 'rotate(-90deg)' }}
                      />
                      <text x="0" y="6" textAnchor="middle" fontSize="22" fontWeight="700" fill="#ffffff">
                        {minutes}:{seconds}
                      </text>
                    </g>
                  </svg>
                </div>

                <div className="text-left">
                  <p className="font-semibold">Time left to complete payment</p>
                  <p className="text-sm text-gray-500">This session will expire in {minutes}:{seconds}</p>
                </div>
              </div>

              {/* Upload receipt (no filename or preview shown; only upload button) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Upload Payment Receipt (max 6MB)</label>
                <div>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                    <span className="text-sm font-medium">Upload receipt</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`col-span-2 btn bg-yellow-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={confirmPayment}
                    disabled={loading}
                  >{loading ? 'Processing...' : 'Confirm Payment & Contact Vendor'}</button>
                </div>

                <div className="flex justify-between">
                  <button className="btnGhost px-4 py-2 rounded-xl" onClick={() => setStep(1)}>Back</button>
                  <a className="btnGhost px-4 py-2 rounded-xl" href={`https://wa.me/${WA.replace('+','')}`} target="_blank" rel="noreferrer">Contact Vendor (WhatsApp)</a>
                </div>
              </div>

            </div>
          )}

          {/* Payment pending instructions */}
          {paymentStatus === 'unsuccessful' && (
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <h4 className="font-semibold text-yellow-700">⚠️ Payment Pending</h4>
              <p className="text-sm text-gray-600">Your payment is pending verification. You have been redirected to WhatsApp with payment details — please attach your receipt in the chat so the vendor can confirm and issue your activation code.</p>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

/*
  NOTES & NEXT STEPS:
  - WhatsApp cannot accept automatic file attachments via a client-side redirect. To automatically include the receipt
    you must implement a server-side upload that returns a public URL and include that URL in the WhatsApp message.
*/
