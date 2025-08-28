// pages/register.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { saveUser, saveBalance, saveTx, loadUser } from '../utils/storage';
import { loadTx } from "../utils/storage";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [referral, setReferral] = useState('');
  const [accept, setAccept] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Preparing your secure wallet...');

  const [errors, setErrors] = useState({});

  useEffect(()=>{
    const u = loadUser();
    if(u) router.push('/dashboard');
  },[]);

  // sanitize phone input to digits only
  const onPhoneChange = (v) => {
    const digits = v.replace(/\D/g, ''); // remove non-digits
    setPhone(digits);
    if (errors.phone) setErrors(prev => ({...prev, phone: null}));
  }

  const validate = () => {
    const e = {};
    if(!name || name.trim().length < 2) e.name = 'Enter your full name (min 2 characters).';
    if(!phone) e.phone = 'Phone number is required.';
    else if(!/^\d{11}$/.test(phone)) e.phone = 'Phone must be 11 digits (e.g. 08031234567).';
    if(!accept) e.accept = 'You must accept the Terms & Privacy policy.';
    return e;
  }

  const start = async ()=>{
    const e = validate();
    if(Object.keys(e).length){
      setErrors(e);
      // focus first error - optional UX improvement
      const first = Object.keys(e)[0];
      alert(Object.values(e)[0]);
      return;
    }

    // start visual loading overlay + staged messages
    setLoadingMessage('Creating your secure account…');
    setLoading(true);

    setTimeout(()=> setLoadingMessage('Activating free miner robot…'), 600);
    setTimeout(()=> setLoadingMessage('Finalizing security settings…'), 1200);

    // simulate server processing / animation then save user & redirect
    setTimeout(()=>{
      const user = { fullName: name.trim(), phone, email: email.trim(), plan:'Free Miner Robot', referral: referral.trim() || null };
      saveUser(user);
      // keep initial balance 0 (we don't auto-credit); but you can change this if you want a welcome bonus:
      saveBalance(0);
      saveTx([]);
      // finish loading then redirect
      setLoading(false);
      router.push('/dashboard');
    }, 1700);
  };

  return (
    <Layout>
      <LogoHeader />
      <div className="center" style={{ padding: '18px 12px' }}>
        <div className="card" style={{ maxWidth:480, width:'100%' }}>
          <h2>Get Started</h2>
          <p className="small muted">Enter your details to start earning with your Free Miner Robot.</p>

          {/* Name */}
          <label className="small" style={{display:'block', marginTop:10}}>Full name</label>
          <input
            className="input"
            placeholder="John Doe"
            value={name}
            onChange={e=>{ setName(e.target.value); if(errors.name) setErrors(prev=>({...prev, name:null})); }}
            disabled={loading}
          />
          {errors.name && <div style={{color:'#ffcccb', marginTop:6}}>{errors.name}</div>}

          {/* Phone (digits only, 11-digit validation) */}
          <label className="small" style={{display:'block', marginTop:8}}>Phone number (11 digits)</label>
          <input
            className="input"
            placeholder="08031234567"
            value={phone}
            onChange={e=>onPhoneChange(e.target.value)}
            maxLength={11}
            disabled={loading}
          />
          <div className="small muted">Enter your full 11-digit local phone number — digits only.</div>
          {errors.phone && <div style={{color:'#ffcccb', marginTop:6}}>{errors.phone}</div>}

          {/* Email optional */}
          <label className="small" style={{display:'block', marginTop:8}}>Email (optional)</label>
          <input
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            disabled={loading}
          />

          {/* Referral optional */}
          <label className="small" style={{display:'block', marginTop:8}}>Referral code (optional)</label>
          <input
            className="input"
            placeholder="Referral code"
            value={referral}
            onChange={e=>setReferral(e.target.value)}
            disabled={loading}
          />

          {/* Terms checkbox */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:12}}>
            <input id="accept" type="checkbox" checked={accept} onChange={()=>{ setAccept(a=>!a); if(errors.accept) setErrors(prev=>({...prev, accept:null})); }} disabled={loading}/>
            <label htmlFor="accept" className="small">I accept the <a href="/terms" className="link">Terms</a> & <a href="/privacy" className="link">Privacy Policy</a></label>
          </div>
          {errors.accept && <div style={{color:'#ffcccb', marginTop:6}}>{errors.accept}</div>

          }

          {/* Helpful details */}
          <div style={{marginTop:12}} className="small muted">
            <div><strong>What to expect:</strong></div>
            <ul style={{marginTop:8, paddingLeft:18}} className="small muted">
              <li>Free Miner Robot activation after registration.</li>
              <li>Mine once per activation (₦60,000–₦100,000 for free plan).</li>
              <li>Withdrawals require a 4-digit code for security.</li>
            </ul>
          </div>

          {/* CTA */}
          <div style={{marginTop:14, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
            <button className="btn" onClick={start} disabled={loading}>
              {loading ? 'Starting...' : 'Start Earning'}
            </button>
            <button className="btnGhost" onClick={()=>router.push('/login')} disabled={loading}>Have account? Login</button>
          </div>

          <p className="small muted" style={{marginTop:12}}>By continuing you accept terms & policies of GoldTrust Wallet.</p>
        </div>
      </div>

      {/* Loading overlay (re-uses the same style used on homepage if present) */}
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
              <div className="small muted" style={{marginTop:6}}>This only takes a moment — thank you for using GoldTrust.</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
