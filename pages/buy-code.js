// pages/buy-code.js
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { saveTx } from '../utils/storage';
import { loadTx } from '../utils/storage';

const CODE_PRICE = 8000;
const WA = '+2347072277091';
const BANK = {
  name: 'Moniepoint',
  accountName: 'Abdulrahim Usman',
  accountNumber: '6511699109'
};

function generateRef() {
  return `GT-CODE-${String(Math.floor(100000 + Math.random() * 900000))}`;
}

export default function BuyCode() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // payment / timer
  const [countdown, setCountdown] = useState(10 * 60);
  const timerRef = useRef(null);
  const INITIAL = useRef(10 * 60);

  // flow
  const [paymentStatus, setPaymentStatus] = useState(null); // null | pending | under_review | approved
  const [issuedCode, setIssuedCode] = useState(null);
  const [reference, setReference] = useState('');

  // receipt
  const [receiptFile, setReceiptFile] = useState(null); // File object
  const [receiptPreview, setReceiptPreview] = useState(null); // dataURL for preview
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setReference(generateRef());
  }, []);

  useEffect(() => {
    if (step === 2) {
      setCountdown(INITIAL.current);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
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

  const minutes = String(Math.floor(countdown / 60)).padStart(2, '0');
  const seconds = String(countdown % 60).padStart(2, '0');

  // SVG circle math
  const R = 15; // radius
  const C = 2 * Math.PI * R;
  const dash = Math.max(0, Math.min(100, Math.round(((INITIAL.current - countdown) / INITIAL.current) * 100)));
  const dashoffset = ((100 - dash) / 100) * C;

  function copyToClipboard(text) {
    try {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch (e) {
      prompt('Copy:', text);
    }
  }

  function onPickFile(file) {
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  async function shareReceipt(file, message) {
    // try Web Share API with files first (best on mobile)
    if (navigator.share && navigator.canShare && file) {
      try {
        const shareData = { files: [file], text: message };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return { ok: true, method: 'web-share' };
        }
      } catch (e) {
        // fallback below
      }
    }

    // fallback: open wa.me with prefilled text (cannot attach file automatically)
    const url = `https://wa.me/${WA.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    return { ok: false, method: 'wa-link' };
  }

  const handleProceed = () => {
    if (!name.trim() || !phone.trim() || !email.trim()) return alert('Please fill in all fields');
    setStep(2);
    setReference(generateRef());
    // timer starts via effect
  };

  const handleSubmitProofAndContact = async () => {
    if (!receiptFile) return alert('Please upload your payment receipt image first.');
    if (countdown === 0) return alert('Payment time expired. Restart the process.');

    setLoading(true);

    // save pending tx locally
    const tx = {
      type: 'buy_code',
      amount: CODE_PRICE,
      status: 'pending',
      reference,
      meta: { name, phone, email, notes: notes || '' },
      // avoid storing full file to localStorage; only store metadata
      receiptName: receiptFile.name,
      created_at: new Date().toISOString(),
    };
    try {
      saveTx(tx);
    } catch (e) {
      // ignore storage errors
    }

    const message = `Hello, I have made payment for activation code.\nReference: ${reference}\nName: ${name}\nPhone: ${phone}\nAmount: ₦${CODE_PRICE.toLocaleString()}\nNote: ${notes || '-'}`;

    try {
      const res = await shareReceipt(receiptFile, message);
      setPaymentStatus('pending');
      if (res.ok && res.method === 'web-share') {
        alert('Share sheet opened. Choose WhatsApp to send your receipt to the vendor.');
      } else {
        alert('WhatsApp opened with a prefilled message. Please attach your receipt image and send.');
      }
    } catch (e) {
      // fallback
      window.open(`https://wa.me/${WA.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
      setPaymentStatus('pending');
      alert('Opened WhatsApp. Please attach the receipt and send the message.');
    }

    setLoading(false);
  };

  // helper to generate preview and revoke object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    };
  }, [receiptPreview]);

  return (
    <Layout>
      <LogoHeader small />
      <div className="card max-w-2xl mx-auto p-6 rounded-2xl shadow-xl dark-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold">🔑 Buy Activation Code</h3>
          <div className="text-sm muted">Step {step} / 2</div>
        </div>

        {/* step indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`step ${step === 1 ? 'active' : ''}`} onClick={() => setStep(1)}>
            <div className="num">1</div>
            <div className="label">Info</div>
          </div>
          <div className={`bar ${step === 2 ? 'active' : ''}`} />
          <div className={`step ${step === 2 ? 'active' : ''}`} onClick={() => step === 2 && setStep(2)}>
            <div className="num">2</div>
            <div className="label">Pay & Verify</div>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <input className="input" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

            <div className="flex gap-3 items-center">
              <button className="btn-filled" onClick={handleProceed}>Proceed & Verify</button>
              <button className="btn-ghost" onClick={() => { setName(''); setPhone(''); setEmail(''); }}>Clear</button>
            </div>

            <div className="trust">
              <div className="small muted">Why verify?</div>
              <ul className="text-sm">
                <li>• We need correct details to issue your unique code.</li>
                <li>• Verification reduces delays when admin issues codes.</li>
                <li>• Support is available on WhatsApp if you get stuck.</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Payment banner */}
            <div className="banner">
              <div>
                <div className="muted">Hello</div>
                <div className="font-bold text-lg">{name || 'Customer'}</div>
                <div className="muted">Please make a one-time payment of</div>
                <div className="amount">₦{CODE_PRICE.toLocaleString()}</div>
              </div>
              <div>
                <div className="muted text-xs">Reference</div>
                <div className="ref small">{reference}</div>
              </div>
            </div>

            {/* vendor / bank info + copy */}
            <div className="vendor p-4 rounded-xl shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="small muted">Official Vendor</div>
                  <div className="vendor-name">{BANK.accountName}</div>
                  <div className="muted small">{BANK.name}</div>
                </div>

                <div className="text-right">
                  <div className="small muted">Amount</div>
                  <div className="font-semibold">₦{CODE_PRICE.toLocaleString()}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div>
                  <div className="muted small">Account number</div>
                  <div className="acct-row">
                    <div className="acct">{BANK.accountNumber}</div>
                    <button className="copy-btn" onClick={() => copyToClipboard(BANK.accountNumber)}>Copy</button>
                  </div>
                </div>

                <div>
                  <div className="muted small">Bank</div>
                  <div className="acct">{BANK.name}</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="muted small">Tip</div>
                <div className="muted text-xs">Pay from your bank app and upload a clear receipt showing account name, number and amount for faster verification.</div>
              </div>
            </div>

            {/* upload + countdown panel */}
            <div className="upload-area p-4 rounded-xl shadow-md flex flex-col md:flex-row gap-4 items-center">
              <div className="countdown-block flex-shrink-0">
                <svg viewBox="0 0 36 36" className="count-svg">
                  <circle cx="18" cy="18" r={R} stroke="rgba(255,255,255,0.06)" strokeWidth="2" fill="none" />
                  <circle
                    cx="18"
                    cy="18"
                    r={R}
                    stroke="url(#ggrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${C}`}
                    strokeDashoffset={dashoffset}
                    transform="rotate(-90 18 18)"
                    style={{ transition: 'stroke-dashoffset 500ms linear' }}
                  />
                  <defs>
                    <linearGradient id="ggrad" x1="0%" x2="100%">
                      <stop offset="0%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#B8871F" />
                    </linearGradient>
                  </defs>
                  <text x="18" y="20.5" fontSize="5" textAnchor="middle" fill="#f8fafc">{minutes}:{seconds}</text>
                </svg>
              </div>

              <div className="flex-1">
                <div className="mb-2">
                  <label className="muted small">Upload payment receipt (jpg/png)</label>
                </div>

                <div className="flex gap-3 items-center">
                  <input id="receipt-input" type="file" accept="image/*" onChange={(e) => onPickFile(e.target.files?.[0])} className="file-input" />
                  <button className="btn-ghost" onClick={() => document.getElementById('receipt-input')?.click()}>Choose file</button>
                  {receiptFile && <div className="preview inline-flex items-center gap-2"><img src={receiptPreview} alt="receipt" className="thumb" /> <span className="small">{receiptFile.name}</span></div>}
                </div>

                <textarea className="input mt-3" placeholder="Optional note (teller name, bank name)" value={notes} onChange={e => setNotes(e.target.value)} />

                <div className="mt-4 flex gap-3">
                  <button className={`btn-filled ${loading ? 'disabled' : ''}`} onClick={handleSubmitProofAndContact} disabled={loading}>
                    {loading ? 'Processing...' : 'Confirm Payment & Contact Vendor'}
                  </button>

                  <a className="btn-ghost" href={`https://wa.me/${WA.replace('+','')}?text=${encodeURIComponent(`Hello, I want help with my activation purchase. Reference: ${reference} - Name: ${name} - Phone: ${phone}`)}`} target="_blank" rel="noreferrer">
                    Contact Support (WhatsApp)
                  </a>
                </div>

                <div className="mt-2 text-xs muted">We will mark payment as pending until vendor verifies your receipt. Expected manual verification 5–30 minutes.</div>
              </div>
            </div>

            {/* status */}
            <div>
              {paymentStatus === 'pending' && <div className="status pending">✅ Payment submitted — pending verification</div>}
              {paymentStatus === 'under_review' && <div className="status review">🔎 Under review — we will notify you</div>}
              {paymentStatus === 'approved' && <div className="status approved">🎉 Approved — code: <b>{issuedCode}</b></div>}
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        :root{
          --app-gold:#D4AF37;
          --app-gold-dark:#B8871F;
          --card-dark:#071022;
          --muted:#cbd5e1;
        }
        .dark-card{
          background: linear-gradient(180deg, rgba(10,14,20,0.85), rgba(8,12,18,0.88));
          color:var(--muted);
        }
        .muted { color:var(--muted); }
        .small { font-size:12px; }

        /* step indicator */
        .step { display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; padding:10px; border-radius:10px; width:84px; }
        .step .num { width:36px; height:36px; border-radius:999px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.05); color:var(--muted); background:transparent; font-weight:800;}
        .step .label { color:var(--muted); font-size:13px; }
        .step.active .num { background: linear-gradient(90deg,var(--app-gold),var(--app-gold-dark)); color:#071022; border:none; }
        .bar { flex:1; height:10px; border-radius:8px; background: rgba(255,255,255,0.02); }
        .bar.active { background: linear-gradient(90deg,var(--app-gold),var(--app-gold-dark)); }

        /* inputs / buttons */
        .input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.04); background:transparent; color:var(--muted); }
        .btn-filled { background: linear-gradient(90deg,var(--app-gold),var(--app-gold-dark)); color:#071022; padding:10px 16px; border-radius:10px; font-weight:800; border:none; }
        .btn-ghost { background:transparent; border:1px solid rgba(255,255,255,0.06); color:var(--muted); padding:8px 12px; border-radius:8px; }
        .btn-ghost:hover, .btn-filled:hover { transform: translateY(-2px); transition: transform .15s ease; }

        .trust { padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.02); }

        /* banner */
        .banner { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:14px; background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border-radius:12px; border:1px solid rgba(255,255,255,0.03); }
        .amount { font-weight:900; font-size:20px; color:#fff; margin-top:6px; }
        .ref { font-family:monospace; background: rgba(255,255,255,0.02); padding:6px 8px; border-radius:8px; display:inline-block; margin-top:6px; }

        /* vendor */
        .vendor { border-radius:12px; background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.015)); padding:16px; border:1px solid rgba(255,255,255,0.03); }
        .vendor-name { font-weight:800; font-size:16px; color:#fff; }
        .acct-row { display:flex; gap:8px; align-items:center; margin-top:6px; }
        .acct { font-family:monospace; padding:8px; background:rgba(255,255,255,0.02); border-radius:8px; color:var(--muted); }
        .copy-btn { background: linear-gradient(90deg,var(--app-gold),var(--app-gold-dark)); color:#071022; border:none; padding:6px 8px; border-radius:8px; font-weight:700; }

        /* upload area */
        .upload-area { border-radius:12px; background:linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.015)); border:1px solid rgba(255,255,255,0.03); padding:12px; }
        .count-svg { width:72px; height:72px; display:block; }
        .file-input { color:var(--muted); }
        .thumb { width:48px; height:48px; object-fit:cover; border-radius:6px; border:1px solid rgba(255,255,255,0.04); }

        .acct, .ref, .thumb { background-clip: padding-box; }

        .status { padding:10px; border-radius:8px; }
        .status.pending { background: rgba(212,175,55,0.08); color:var(--muted); }
        .status.approved { background: rgba(16,185,129,0.08); color: #baf7c8; }

        .disabled { opacity:0.6; pointer-events:none; }

        @media (max-width:720px) {
          .banner { flex-direction:column; align-items:flex-start; gap:6px; }
          .upload-area { flex-direction:column; align-items:flex-start; }
        }
      `}</style>
    </Layout>
  );
}
