import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { saveTx } from '../utils/storage';

const CODE_PRICE = 7000;
const WA = '+2347078323440';

// VALID TRANSACTION ID
const VALID_TRX = "TR202511011";

// FIXED ACTIVATION CODE
const ACTIVATION_CODE = "GT2256W";

export default function BuyCode() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [countdown, setCountdown] = useState(10 * 60);
  const timerRef = useRef(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [trxId, setTrxId] = useState('');
  const [validationState, setValidationState] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    if (step === 2) {
      setCountdown(10 * 60);
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

  const proceed = () => {
    if (!name || !phone || !email) return alert('Please fill in all fields');
    setStep(2);
  };

  const confirmPayment = () => {
    if (countdown === 0) return alert('⏳ Payment time expired! Restart process.');
    setPaymentStatus("need_trx");
  };

  const validateTrx = () => {
    if (!trxId.startsWith("TR2025") || trxId.length !== 12) {
      return alert("❌ Invalid Transaction ID Format!");
    }

    setLoading(true);
    setValidationState("validating");

    setTimeout(() => {
      setLoading(false);

      if (trxId === VALID_TRX) {
        saveTx({
          type: 'buy_code',
          amount: CODE_PRICE,
          status: 'successful',
          activation_code: ACTIVATION_CODE,
          trx: trxId,
          meta: { name, phone, email },
          created_at: new Date().toISOString(),
        });

        setShowSuccessPopup(true);
      } else {
        setValidationState("error");
        alert("❌ Transaction ID not found! Please check again.");
      }
    }, 3000);
  };

  const minutes = String(Math.floor(countdown / 60)).padStart(2, '0');
  const seconds = String(countdown % 60).padStart(2, '0');

  return (
    <Layout>
      <LogoHeader small />

      <div className="card shadow-lg rounded-2xl p-6 space-y-6 animate-fadeIn">
        <h3 className="text-2xl font-bold text-center mb-4">🔑 Buy Activation Code</h3>

        {/* STEP 1 FORM */}
        {step === 1 && (
          <div className="space-y-4">
            <input className="input" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

            <button
              className="btn bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform"
              onClick={proceed}
            >
              Proceed 🚀
            </button>
          </div>
        )}

        {/* STEP 2 PAYMENT */}
        {step === 2 && paymentStatus !== "need_trx" && (
          <div className="space-y-6 animate-fadeIn">

            <div className="bg-blue-50 p-4 rounded-xl text-center shadow-md">
              <p>Hello <b>{name}</b>, please pay <b>₦{CODE_PRICE.toLocaleString()}</b></p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-lg border">
              <p className="font-semibold text-center">Bank Details</p>
              <hr className="my-2" />
              <p>Account Name: <b>Abdulrahim Usman</b></p>
              <p>Account Number: <b>2082683908</b></p>
              <p>Bank: <b>Kuda Bank</b></p>
              <p>Amount: <b>₦{CODE_PRICE.toLocaleString()}</b></p>
            </div>

            {/* Countdown */}
            <div className="text-center">
              <div className="text-4xl font-mono">{minutes}:{seconds}</div>
              <p className="text-gray-500 text-sm">Time remaining</p>
            </div>

            <button
              className="btn bg-green-500 text-white w-full py-3 rounded-xl shadow-md hover:scale-105 transition"
              onClick={confirmPayment}
            >
              Confirm Payment ✅
            </button>
          </div>
        )}

        {/* ENTER TRANSACTION ID */}
        {paymentStatus === "need_trx" && (
          <div className="space-y-4 animate-fadeIn text-center">
            <h3 className="text-xl font-bold">🔍 Enter Transaction ID</h3>

            <input
              className="input text-center"
              placeholder="Enter Transaction ID (TR2025.....)"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
            />

            <button
              className="btn bg-blue-600 text-white px-6 py-3 rounded-xl w-full shadow hover:scale-105 transition"
              disabled={loading}
              onClick={validateTrx}
            >
              {loading ? "Validating..." : "Verify Transaction ID"}
            </button>
          </div>
        )}

        {/* SUCCESS POPUP */}
        {showSuccessPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-2xl shadow-2xl text-center animate-fadeIn w-80">
              <div className="text-5xl text-green-600 mb-3">✔️</div>
              <h3 className="text-xl font-bold text-green-600">Payment Successful!</h3>

              <p className="mt-2 text-gray-700">Your activation code:</p>

              <div className="bg-gray-100 p-3 mt-2 rounded-xl font-mono text-lg font-bold">
                {ACTIVATION_CODE}
              </div>

              <button
                className="btn bg-green-600 text-white w-full mt-4 rounded-xl py-3"
                onClick={() => navigator.clipboard.writeText(ACTIVATION_CODE)}
              >
                Copy Code 📋
              </button>

              <button
                className="btn bg-blue-600 text-white w-full mt-2 rounded-xl py-3"
                onClick={() => router.push("/dashboard")}
              >
                Continue
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}