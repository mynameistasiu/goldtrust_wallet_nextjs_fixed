import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { saveTx } from '../utils/storage';
import { loadTx } from '../utils/storage';

const CODE_PRICE = 8000;
const WA = '+2349021715564';
const BANK = {
  name: 'Moniepoint',
  accountName: 'Sadiq Mamuda',
  accountNumber: '5073816968'
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

  // verification modal
  const [showVerify, setShowVerify] = useState(false);

  // payment flow
  const [countdown, setCountdown] = useState(10 * 60);
  const timerRef = useRef(null);
  const INITIAL_COUNT = useRef(10 * 60);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | pending | under_review | approved
  const [issuedCode, setIssuedCode] = useState(null);
  const [reference, setReference] = useState('');

  // receipt upload
  const [receipt, setReceipt] = useState(null); // base64 string (for storage preview)
  const [receiptFile, setReceiptFile] = useState(null); // actual File object (for sharing)
  const [receiptName, setReceiptName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setReference(generateRef());
  }, []);

  useEffect(() => {
    if (step === 2) {
      setCountdown(INITIAL_COUNT.current);
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
  const countdownPercent = Math.round(((INITIAL_COUNT.current - countdown) / INITIAL_COUNT.current) * 100);

  const proceed = () => {
    if (!name || !phone || !email) return alert('Please fill all fields');
    setShowVerify(true);
  };

  const confirmVerified = () => {
    setShowVerify(false);
    setStep(2);
    setPaymentStatus(null);
    setIssuedCode(null);
    setReference(generateRef());
  };

  const editInfo = () => setShowVerify(false);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch (e) {
      prompt('Copy:', text);
    }
  };

  const onFile = (file) => {
    if (!file) return;
    setReceiptName(file.name);
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = function (ev) {
      const data = ev.target.result;
      setReceipt(data);
    };
    reader.readAsDataURL(file);
  };

  const confirmPayment = () => {
    if (countdown === 0) return alert('Payment time expired - please restart process.');
    const go = confirm(`You will be asked to upload proof of payment. Continue?\nReference: ${reference}`);
    if (!go) return;
    document.getElementById('receipt-input')?.scrollIntoView({ behavior: 'smooth' });
  };

  async function shareReceiptToWhatsApp(file) {
    if (navigator.share && navigator.canShare && file) {
      try {
        const shareData = {
          files: [file],
          text: `Hello, I paid for activation code. Reference: ${reference} - Name: ${name} - Phone: ${phone}`,
        };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return { ok: true, method: 'web-share' };
        }
      } catch (e) {
        // fall through
      }
    }

    const msg = encodeURIComponent(
      `Hello, I have made payment for activation code. Reference: ${reference} \nName: ${name} \nPhone: ${phone} \nNote: ${notes || '-'} \n(Please find my payment receipt attached.)`
    );
    const url = `https://wa.me/${WA.replace('+', '')}?text=${msg}`;
    window.open(url, '_blank');
    return { ok: false, method: 'wa-link' };
  }

  const submitProof = async () => {
    if (!receipt) return alert('Please attach your payment receipt image first');
    setLoading(true);
    setPaymentStatus('pending');

    const tx = {
      type: 'buy_code',
      amount: CODE_PRICE,
      status: 'pending',
      reference,
      meta: { name, phone, email, notes: notes || '' },
      receipt: receipt ? receipt.slice(0, 20000) : null,
      created_at: new Date().toISOString(),
    };

    try {
      saveTx(tx);
    } catch (e) {}

    try {
      const res = await shareReceiptToWhatsApp(receiptFile);
      if (res && res.ok && res.method === 'web-share') {
        alert('Receipt opened in your share sheet — choose WhatsApp to send it to the vendor.');
      } else {
        alert('We opened WhatsApp with a prefilled message. Please attach the receipt image manually and send.');
      }
    } catch (e) {
      window.open(`https://wa.me/${WA.replace('+', '')}?text=${encodeURIComponent(`Hello, I purchased activation code. Reference: ${reference} - Name: ${name} - Phone: ${phone}`)}`, '_blank');
      alert('Unable to share directly — opened WhatsApp. Please attach the receipt manually.');
    }

    setLoading(false);
    setPaymentStatus('pending');
  };

  const _adminApprove = () => {
    const code = `ZEALY25-${String(Math.floor(1000 + Math.random() * 8999))}${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    setIssuedCode(code);
    setPaymentStatus('approved');
    saveTx({ type: 'buy_code', amount: CODE_PRICE, status: 'approved', reference, meta: { name, phone, email, issuedCode: code }, created_at: new Date().toISOString() });
  };

  return (
    <Layout>
      <LogoHeader small />

      <div className="card shadow-lg rounded-2xl p-6 space-y-6 animate-fadeIn max-w-2xl mx-auto dark-card">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">🔑 Buy Activation Code</h3>
          <div className="text-sm muted">Step {step === 1 ? 1 : 2} / 2</div>
        </div>

        {/* STEP INDICATOR */}
        <div className="progress-line mb-4" aria-hidden>
          <div className={`step-dot ${step === 1 ? 'active-step' : ''}`} onClick={() => setStep(1)}>
            <div className="step-num">1</div>
            <div className="step-label">Info</div>
          </div>

          <div className={`step-bar ${step === 2 ? 'active' : ''}`} />

          <div className={`step-dot ${step === 2 ? 'active-step' : ''}`} onClick={() => step === 2 && setStep(2)}>
            <div className="step-num">2</div>
            <div className="step-label">Pay & Verify</div>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <input className="input" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
            <input className="input" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
            <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />

            <div className="flex gap-3">
              <button className="btn-primary-filled" onClick={proceed}>Proceed & Verify 🔐</button>
              <button className="btn-ghost" onClick={() => { setName(''); setPhone(''); setEmail(''); }}>Clear</button>
            </div>

            <div className="trust p-3 rounded-md">
              <div className="small muted">Why verify?</div>
              <ul className="text-sm">
                <li>• We need correct details to issue your unique code.</li>
                <li>• Verification reduces delays when admin issues codes.</li>
                <li>• Support is available on WhatsApp if you get stuck.</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2 - professional layout */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* VENDOR / BANK CARD */}
              <div className="vendor-card p-4 rounded-xl shadow-md">
                <div className="vendor-head flex items-center justify-between">
                  <div>
                    <div className="small muted">Official Vendor</div>
                    <div className="vendor-name">{BANK.accountName}</div>
                    <div className="vendor-sub muted">{BANK.accountNumber} • {BANK.name}</div>
                  </div>
                  <div className="vendor-amount text-right">
                    <div className="text-xs muted">Amount</div>
                    <div className="font-semibold text-lg">₦{CODE_PRICE.toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-copy" onClick={() => copyToClipboard(BANK.accountNumber)}>Copy Account</button>
                  <button className="btn-copy" onClick={() => copyToClipboard(`₦${CODE_PRICE.toLocaleString()}`)}>Copy Amount</button>
                  <button className="btn-copy" onClick={() => copyToClipboard(reference)}>Copy Reference</button>
                </div>

                <div className="mt-4 vendor-extra">
                  <div className="text-sm muted">Reference to send with payment</div>
                  <div className="ref-box">{reference}</div>
                  <div className="mt-2 text-xs muted">Expected verification: <strong>5–30 minutes</strong> (manual)</div>
                </div>

                {/* small QR placeholder - realistic touch */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="qr-placeholder" aria-hidden>QR</div>
                  <div className="text-sm muted">Prefer faster verification? Pay using a bank app and send receipt via WhatsApp immediately.</div>
                </div>
              </div>

              {/* UPLOAD / INSTRUCTIONS */}
              <div className="upload-panel p-4 rounded-xl shadow-md dark-panel">
                <div className="mb-3">
                  <div className="text-sm muted">Payment window</div>
                  <div className="font-semibold">Complete payment & upload receipt</div>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <svg width="72" height="72" viewBox="0 0 36 36" className="countdown-ring">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#111827" strokeWidth="2" />
                    <path strokeDasharray={`${countdownPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
                    <text x="18" y="20.5" alignmentBaseline="middle" textAnchor="middle" fontSize="4" fill="#f8fafc">{minutes}:{seconds}</text>
                  </svg>

                  <div>
                    <div className="text-sm muted">Time left</div>
                    <div className="font-bold">{minutes}:{seconds}</div>
                    <div className="text-xs muted mt-1">After time expires you must restart the purchase</div>
                  </div>
                </div>

                <label className="text-sm muted">Upload receipt (jpg/png)</label>
                <input id="receipt-input" type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="file-input" />
                {receiptName && <div className="text-sm mt-2">Attached: {receiptName}</div>}

                <textarea className="input mt-2" placeholder="Optional note (e.g. teller name)" value={notes} onChange={e => setNotes(e.target.value)} />

                <div className="mt-4 flex items-center gap-3">
                  <button className={`btn-primary-filled ${loading ? 'disabled' : ''}`} onClick={submitProof} disabled={loading}>{loading ? 'Submitting...' : 'Submit Proof & Request Verification'}</button>
                  <button className="btn-ghost" onClick={() => window.open(`https://wa.me/${WA.replace('+','')}?text=${encodeURIComponent(`Hello, I have purchased the activation code. Reference: ${reference} - Name: ${name} - Phone: ${phone}`)}`, '_blank')}>Contact Support</button>
                </div>

                <div className="mt-3 text-xs muted">Tip: For fastest verification attach a clear photo of the transfer showing account name, account number and amount.</div>
              </div>
            </div>

            {/* STATUS */}
            <div>
              {paymentStatus === 'pending' && <div className="p-3 rounded-md bg-yellow-900/10 text-yellow-100">✅ Payment submitted — Pending verification by admin.</div>}
              {paymentStatus === 'under_review' && <div className="p-3 rounded-md bg-blue-900/8 text-muted">🔎 Under review — we will notify you when approved.</div>}
              {paymentStatus === 'approved' && (
                <div className="p-3 rounded-md bg-green-900/8 text-green-200">🎉 Approved — your code: <b>{issuedCode}</b></div>
              )}
            </div>

          </div>
        )}

        {showVerify && (
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-card dark-modal">
              <h4 className="font-bold">Verify account information</h4>
              <div className="mt-2 text-sm muted">Please confirm that the details below are correct. This will be used to issue your unique activation code.</div>

              <div className="mt-4 space-y-2">
                <div><b>Name:</b> {name}</div>
                <div><b>Phone:</b> {phone}</div>
                <div><b>Email:</b> {email}</div>
              </div>

              <div className="mt-4 flex gap-3 justify-end">
                <button className="btn-ghost" onClick={editInfo}>Edit</button>
                <button className="btn-primary-filled" onClick={confirmVerified}>Confirm & Continue</button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        :root{ --app-gold: #D4AF37; --app-gold-dark:#B8871F; --bg-dark:#071022; --card-dark:#0b1220; --muted-light:#f1f5f9; }

        .dark-card{ background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.03); color: var(--muted-light); background-color: var(--card-dark); }
        .dark-panel{ background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.015)); border-color: rgba(255,255,255,0.04); }

        /* STEP indicator */
        .progress-line { display:flex; align-items:center; gap:12px; }
        .step-dot { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; width:86px; padding:10px; border-radius:12px; cursor:pointer; }
        .step-num { width:36px; height:36px; border-radius:999px; display:flex; align-items:center; justify-content:center; font-weight:800; }
        .step-label { font-size:13px; }

        .step-dot .step-num { background: transparent; color:var(--muted-light); border:1px solid rgba(255,255,255,0.03); }
        .step-dot.active-step .step-num { background: linear-gradient(90deg,var(--app-gold),var(--app-gold-dark)); color:#071022; border:none; }
        .step-dot.active-step .step-label { color:#f8fafc; font-weight:700; }
        .step-dot:not(.active-step) .step-label { color:#fff; }

        .step-bar { height:10px; flex:1; border-radius:8px; background: rgba(255,255,255,0.02); }
        .step-bar.active { background: linear-gradient(90deg,var(--app-gold),var(--app-gold-dark)); }

        /* vendor card */
        .vendor-card { background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.03); color:var(--muted-light); }
        .vendor-name { font-size:16px; font-weight:800; color:#fff; }
        .vendor-sub { color: #cbd5e1; }
        .ref-box { margin-top:8px; padding:10px; background: rgba(255,255,255,0.02); border-radius:8px; font-family: monospace; font-weight:700; color:var(--muted-light); }
        .qr-placeholder { width:56px; height:56px; border-radius:8px; background: linear-gradient(90deg,var(--app-gold),var(--app-gold-dark)); display:flex; align-items:center; justify-content:center; color:#071022; font-weight:800; }

        .btn-copy { background: transparent; border:1px solid rgba(255,255,255,0.06); padding:8px 12px; border-radius:8px; color:var(--muted-light); }

        /* upload panel */
        .file-input { margin-top:8px; color:var(--muted-light); }
        .upload-panel { background: transparent; color:var(--muted-light); }

        /* general buttons */
        .btn-primary-filled { background: linear-gradient(90deg,var(--app-gold),var(--app-gold-dark)); color:#071022; border:none; padding:10px 16px; border-radius:10px; font-weight:800; }
        .btn-ghost { background:transparent; border:1px solid rgba(255,255,255,0.06); padding:8px 12px; border-radius:8px; color:var(--muted-light); }
        .btnGhost{ background:transparent; border:1px solid rgba(255,255,255,0.06); padding:8px 12px; border-radius:8px; color:var(--muted-light); }

        .input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.04); background:transparent; color:var(--muted-light); }
        textarea.input { min-height:84px; resize:vertical; }

        .trust { background:transparent; border:1px solid rgba(255,255,255,0.02); color:var(--muted-light); }

        .small { font-size:12px; }
        .muted { color:var(--muted-light); }

        .disabled { opacity:0.6; pointer-events:none; }

        /* modal */
        .modal { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6); z-index:9999; }
        .modal-card { background:white; padding:20px; border-radius:12px; width:420px; box-shadow:0 16px 48px rgba(2,6,23,0.2); }
        .dark-modal{ background: var(--card-dark); color:var(--muted-light); border:1px solid rgba(255,255,255,0.03); }

        @media (max-width:720px){ .modal-card{ width:92%; } .step-dot{ width:76px; } }
      `}</style>
    </Layout>
  );
}
