// pages/login.js
import { useRouter } from 'next/router';
import { useState } from 'react';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadUser } from '../utils/storage';
import { loadTx } from "../utils/storage";


export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Preparing secure session...');
  const [errors, setErrors] = useState({});

  // keep digits only in the phone input
  const onPhoneChange = (value) => {
    const digits = value.replace(/\D/g, '');
    setPhone(digits.slice(0, 11)); // enforce max 11 digits
    if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
  };

  const validate = () => {
    const e = {};
    if (!phone) e.phone = 'Please enter your phone number.';
    else if (!/^\d{11}$/.test(phone)) e.phone = 'Phone must be 11 digits (e.g. 08031234567).';
    return e;
  };

  const startLoader = (message = 'Preparing secure session...') => {
    setLoadingMessage(message);
    setLoading(true);
    setTimeout(() => setLoadingMessage('Checking account…'), 600);
    setTimeout(() => setLoadingMessage('Securing your session…'), 1200);
  };

  const login = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      alert(Object.values(e)[0]);
      return;
    }

    startLoader('Looking up your account...');
    // simulate brief async check (use real API later)
    setTimeout(() => {
      const user = loadUser();
      if (user && user.phone === phone) {
        // success
        setTimeout(() => {
          // navigate after a tiny pause so user sees the final message
          router.push('/dashboard');
        }, 300);
      } else {
        // not found
        setLoading(false);
        alert('User not found. Please register first.');
        router.push('/register');
      }
    }, 1600);
  };

  return (
    <Layout>
      <LogoHeader />
      <div className="center" style={{ padding: '18px 12px' }}>
        <div className="card" style={{ maxWidth: 480, width: '100%' }}>
          <h2>Login</h2>
          <p className="small muted">Welcome back! Enter your phone to continue.</p>

          <label className="small" style={{ display: 'block', marginTop: 8 }}>Phone Number</label>
          <input
            className="input"
            placeholder="08031234567"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            maxLength={11}
            disabled={loading}
          />
          <div className="small muted">Enter your 11-digit local phone number (digits only).</div>
          {errors.phone && <div style={{ color: '#ffcccb', marginTop: 6 }}>{errors.phone}</div>}

          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={login} disabled={loading}>
              {loading ? 'Checking...' : 'Login'}
            </button>
            <button className="btnGhost" onClick={() => router.push('/register')} disabled={loading}>
              Register
            </button>
          </div>

          <p className="small muted" style={{ marginTop: 12 }}>
            Don’t have an account? <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => router.push('/register')}>Register here</span>
          </p>
        </div>
      </div>

      {/* Loading overlay — re-uses the same styles as the register/home loader */}
      {loading && (
        <div className="loadingOverlay" role="status" aria-live="polite">
          <div className="loadingBox">
            <div className="loader" aria-hidden="true">
              <span className="ring" />
              <span className="ring ring2" />
              <span className="spark" />
            </div>
            <div>
              <div className="loaderText">{loadingMessage}</div>
              <div className="small muted" style={{ marginTop: 6 }}>Checking your details securely…</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
