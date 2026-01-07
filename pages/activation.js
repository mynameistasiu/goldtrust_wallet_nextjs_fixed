// pages/activation.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';

export default function Activation() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // If already activated, go straight to dashboard
    try {
      const activated = localStorage.getItem('gt_activated');
      if (activated === 'true') {
        router.replace('/dashboard');
      }
    } catch (e) {}
  }, []);

  const activateAccount = () => {
    setLoading(true);
    setProgress(0);

    // Fake activation progress (1 minute)
    const duration = 60; // seconds
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 1;
      setProgress(Math.min((elapsed / duration) * 100, 100));

      if (elapsed >= duration) {
        clearInterval(interval);

        try {
          // CLEAR ALL RESTRICTIONS
          localStorage.removeItem('gt_restriction_end');
          localStorage.setItem('gt_activated', 'true');
        } catch (e) {}

        // Redirect to dashboard with success message
        router.push('/dashboard?activated=success');
      }
    }, 1000);
  };

  return (
    <Layout>
      <LogoHeader small />

      <div className="center">
        <div className="card shadow-lg p-6 rounded-2xl space-y-4 max-w-md w-full text-center">
          <h2 className="text-xl font-extrabold">
            🔓 Account Activation
          </h2>

          <p className="text-gray-600 text-sm leading-relaxed">
            To complete your withdrawal successfully, your account
            must be activated. Click the button below to activate
            your account and regain full access.
          </p>

          {!loading && (
            <button
              className="btn bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:scale-105 transition-transform"
              onClick={activateAccount}
            >
              ✅ ACTIVATE ACCOUNT
            </button>
          )}

          {loading && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-blue-600">
                Activating your account… please wait
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-3 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-xs text-gray-500">
                This may take up to 1 minute. Do not close this page.
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}