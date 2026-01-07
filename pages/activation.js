// pages/activation.js
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';

/*
  Activation UX:
  - On click: 1s "initializing" phase, then 20s progress from 0% -> 100%.
  - Progress persists across refresh using localStorage.gt_activation_start (timestamp ms).
  - When 100%: clear restriction, set gt_activated, show success, redirect to /dashboard.
  - While activation running (or before activation completes) back navigation is blocked.
*/

export default function Activation() {
  const router = useRouter();

  const INIT_SECONDS = 1;   // initial "spinner" period
  const PROG_SECONDS = 20;  // actual progress duration requested
  const TOTAL_SECONDS = INIT_SECONDS + PROG_SECONDS; // total observed duration

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0..100
  const [phase, setPhase] = useState('idle'); // 'idle' | 'init' | 'progress' | 'done'
  const [message, setMessage] = useState('');
  const intervalRef = useRef(null);

  // helper to safely access localStorage
  const safeLSGet = (k) => {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  };
  const safeLSSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const safeLSRemove = (k) => { try { localStorage.removeItem(k); } catch (e) {} };

  useEffect(() => {
    // If already activated, go to dashboard immediately
    try {
      const activated = safeLSGet('gt_activated');
      if (activated === 'true') {
        router.replace('/dashboard');
        return;
      }
    } catch (e) {}

    // If activation already started earlier, resume
    const start = safeLSGet('gt_activation_start');
    if (start) {
      startActivationFromTimestamp(Number(start));
    }

    // cleanup on unmount
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prevent back navigation while activation is running OR not yet activated
  useEffect(() => {
    const blockBack = () => {
      try { window.history.pushState(null, '', window.location.href); } catch (e) {}
    };

    if (loading || phase === 'progress' || phase === 'init') {
      blockBack();
      window.addEventListener('popstate', blockBack);
    }

    return () => {
      try { window.removeEventListener('popstate', blockBack); } catch (e) {}
    };
  }, [loading, phase]);

  function startActivationFromTimestamp(startTimestamp) {
    // startTimestamp = ms when the user first clicked activate
    // compute elapsed since start
    clearInterval(intervalRef.current);
    setLoading(true);
    setPhase('init'); // default; effect below will set to progress when elapsed >= INIT_SECONDS
    setMessage('Initializing secure activation…');

    intervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimestamp;
      const elapsedSec = Math.floor(elapsedMs / 1000);

      if (elapsedSec < INIT_SECONDS) {
        // still in init phase
        setPhase('init');
        setMessage('Initializing secure activation…');
        setProgress(0);
        return;
      }

      // progress phase
      const progElapsedSec = elapsedSec - INIT_SECONDS;
      const pct = Math.min(100, Math.round((progElapsedSec / PROG_SECONDS) * 100));
      setPhase('progress');
      setMessage(`Activating account… ${pct}%`);
      setProgress(pct);

      if (pct >= 100) {
        // complete
        clearInterval(intervalRef.current);
        completeActivation();
      }
    }, 250);
  }

  const activateAccount = () => {
    // if already running, do nothing
    if (loading) return;

    // save start timestamp so we can resume on refresh
    const startTs = Date.now();
    safeLSSet('gt_activation_start', String(startTs));

    // begin activation run
    startActivationFromTimestamp(startTs);
  };

  const completeActivation = () => {
    setPhase('done');
    setProgress(100);
    setMessage('✅ Account Successfully Activated');

    // Persist activation and clear restriction
    try {
      safeLSRemove('gt_activation_start');
      safeLSRemove('gt_restriction_end'); // clear restriction
      safeLSSet('gt_activated', 'true'); // mark activated
    } catch (e) {}

    // short success pause then redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard?activated=success');
    }, 1200);
  };

  return (
    <Layout>
      <LogoHeader small />

      <div className="center" style={{ padding: 20 }}>
        <div className="card shadow-lg p-6 rounded-2xl space-y-4 max-w-md w-full text-center">
          <h2 className="text-xl font-extrabold">🔒 Secure Account Activation</h2>

          <p className="text-gray-600 text-sm leading-relaxed">
            To protect your funds, your account must be activated before withdrawals can be completed.
            Click the button below to begin a short secure activation process.
          </p>

          {/* Idle / start state */}
          {phase === 'idle' && (
            <div className="space-y-3">
              <button
                className="btn bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform"
                onClick={activateAccount}
                aria-disabled={loading}
              >
                ✅ ACTIVATE ACCOUNT
              </button>

              <div className="text-xs text-gray-500 mt-2">
                Activation takes ~20 seconds. Please stay on this page.
              </div>
            </div>
          )}

          {/* Init or progress */}
          {(phase === 'init' || phase === 'progress') && (
            <div className="space-y-4">
              {/* top status text */}
              <div className="text-sm font-semibold text-blue-600" aria-live="polite">
                {phase === 'init' ? 'Initializing secure activation…' : `Activating account… ${progress}%`}
              </div>

              {/* progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden" aria-hidden="true" style={{marginTop:8}}>
                <div
                  className="bg-blue-600 h-3 transition-all"
                  style={{ width: `${progress}%`, transition: 'width 220ms linear' }}
                />
              </div>

              {/* numeric percentage + small note */}
              <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                <div>{progress}%</div>
                <div>Do not close this page</div>
              </div>
            </div>
          )}

          {/* done */}
          {phase === 'done' && (
            <div className="space-y-3">
              <div className="text-lg font-bold text-green-600">✅ Account Successfully Activated</div>
              <div className="small muted">You will be redirected to your dashboard shortly.</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}