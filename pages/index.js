// pages/index.js
import Link from 'next/link';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { loadTx } from "../utils/storage";


export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Preparing secure session...');

  // reusable navigation with nice loading animation
  const goWithLoader = (path, message = 'Preparing secure session...') => {
    setLoadingMessage(message);
    setLoading(true);

    // small staged messages for better UX
    setTimeout(() => setLoadingMessage('Connecting to miner…'), 600);
    setTimeout(() => setLoadingMessage('Securing your wallet…'), 1200);

    // simulate brief loading then navigate — adjust time if you want longer
    setTimeout(() => {
      router.push(path);
      // no need to setLoading(false) — page will change.
    }, 1600);
  };

  return (
    <Layout>
      <div style={{ padding: '18px 0' }}>
        <LogoHeader />

        {/* HERO */}
        <section className="card" style={{ marginBottom: 18 }}>
          <div className="row" style={{ alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h1 style={{ margin: 0, fontSize: 28 }}>GoldTrust Wallet 🥇</h1>
              <p className="small muted" style={{ marginTop: 8 }}>
                The trusted wallet that lets you earn with a Free Miner Robot, save securely,
                and withdraw easily. Fast payments — bank-grade security — 24/7 support.
              </p>

              <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                {/* use buttons so we can show loader before navigation */}
                <button
                  className="btn"
                  onClick={() => goWithLoader('/register', 'Creating your secure account...')}
                  aria-label="Create Free Account"
                >
                  Create Free Account 🚀
                </button>

                <button
                  className="btnGhost"
                  onClick={() => goWithLoader('/login', 'Taking you to login...')}
                  aria-label="Login"
                >
                  Login 🔑
                </button>
              </div>

              <div style={{ marginTop: 12 }} className="small muted">
                <strong>Quick trust facts:</strong> Free miner activation •
                Secure local storage • 2-step withdraw verification
              </div>
            </div>

            <div style={{ width: 200, minWidth: 160, textAlign: 'center' }}>
              {/* simple hero visual */}
              <img src="/logo.svg" alt="GoldTrust logo" style={{ width: 120, height: 120 }} />
            </div>
          </div>
        </section>

        {/* TRUST / BENEFITS */}
        <section style={{ marginBottom: 18 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Why users trust GoldTrust Wallet</h2>
            <div className="row" style={{ marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <h3>🔒 Secure</h3>
                <p className="small muted">Local-only storage; no public sharing of codes. You control your funds.</p>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <h3>⚡ Fast</h3>
                <p className="small muted">Claim mined rewards instantly and withdraw with a secure code.</p>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <h3>🤝 Transparent</h3>
                <p className="small muted">Clear transaction history and visible miner limits (₦60k–₦100k).</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ marginBottom: 18 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>How it works — simple 3 steps</h2>

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginTop: 12 }}>
              <div style={{ padding: 12, background: 'var(--panel)', borderRadius: 10 }}>
                <h4>1. Create account</h4>
                <p className="small muted">Enter your name and phone — you get a Free Miner Robot activation.</p>
              </div>

              <div style={{ padding: 12, background: 'var(--panel)', borderRadius: 10 }}>
                <h4>2. Start mining</h4>
                <p className="small muted">Tap <strong>Mine</strong> — the miner runs with an animation and returns a random reward (₦60k–₦100k).</p>
              </div>

              <div style={{ padding: 12, background: 'var(--panel)', borderRadius: 10 }}>
                <h4>3. Claim & withdraw</h4>
                <p className="small muted">Claim adds to your wallet. Withdraw using a 4-digit code (purchase if needed).</p>
              </div>
            </div>
          </div>
        </section>

        {/* MINER ROBOT EXPLAINER */}
        <section style={{ marginBottom: 18 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Your Free Miner Robot</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <p className="small muted">
                  Each user starts with a Free Miner Robot that can mine once per activation.
                  The robot's yield is capped by your plan (Free Miner: ₦60,000 – ₦100,000).
                  Activation, mining, and claiming are handled in-app — no complex setup.
                </p>
                <ul className="small muted" style={{ paddingLeft: 18 }}>
                  <li>Single-click activation</li>
                  <li>Animated mining experience</li>
                  <li>Instant claim to wallet</li>
                </ul>
              </div>
              <div style={{ width: 160, minWidth: 120, textAlign: 'center' }}>
                <div style={{ borderRadius: 12, padding: 12, background: 'linear-gradient(180deg,#1b3b4b, #0b1b2b)' }}>
                  <div style={{ fontSize: 40 }}>🤖</div>
                  <div className="small muted" style={{ marginTop: 8 }}>Free Miner</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section style={{ marginBottom: 18 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>What early users say</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginTop: 12 }}>
              <blockquote style={{ padding: 12, background: 'var(--panel)', borderRadius: 10 }}>
                <div style={{ fontWeight: 700 }}>Amina S.</div>
                <div className="small muted">"Fast and simple — I claimed my first reward in minutes!"</div>
              </blockquote>
              <blockquote style={{ padding: 12, background: 'var(--panel)', borderRadius: 10 }}>
                <div style={{ fontWeight: 700 }}>Kelechi O.</div>
                <div className="small muted">"Support helped me quickly. The app feels trustworthy."</div>
              </blockquote>
              <blockquote style={{ padding: 12, background: 'var(--panel)', borderRadius: 10 }}>
                <div style={{ fontWeight: 700 }}>Emeka T.</div>
                <div className="small muted">"Clean UI and easy withdraw flow. Love it."</div>
              </blockquote>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 18 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>FAQ — quick answers</h2>
            <details style={{ marginTop: 10 }} open>
              <summary className="small" style={{ cursor: 'pointer' }}>Is GoldTrust Wallet safe?</summary>
              <p className="small muted">Yes. All important actions require code/confirmation and data is stored locally by the app unless you choose otherwise.</p>
            </details>

            <details style={{ marginTop: 8 }}>
              <summary className="small" style={{ cursor: 'pointer' }}>How much can I mine?</summary>
              <p className="small muted">Free miners mine between ₦60,000 and ₦100,000 per activation. You can buy higher-tier miners later.</p>
            </details>

            <details style={{ marginTop: 8 }}>
              <summary className="small" style={{ cursor: 'pointer' }}>How do I get help?</summary>
              <p className="small muted">Tap Contact in the header or use the WhatsApp link in the app — support is available 24/7.</p>
            </details>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ marginBottom: 18, textAlign: 'center' }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Ready to join?</h2>
            <p className="small muted">Create your account now — it only takes a minute.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
              <button className="btn" onClick={() => goWithLoader('/register', 'Creating your free account...')}>Create Account</button>
              <button className="btnGhost" onClick={() => goWithLoader('/login', 'Taking you to login...')}>Login</button>
            </div>
          </div>
        </section>

        <footer style={{ textAlign: 'center', marginTop: 6 }} className="small muted">
          © {new Date().getFullYear()} GoldTrust Wallet — Secure. Simple. Trusted.
        </footer>
      </div>

      {/* Loading overlay — shown when user clicks a CTA */}
      {loading && (
        <div className="loadingOverlay" role="status" aria-live="polite">
          <div className="loadingBox">
            <div className="loader" aria-hidden="true">
              <span className="ring" />
              <span className="ring ring2" />
              <span className="spark" />
            </div>
            <div className="loaderText">{loadingMessage}</div>
          </div>
        </div>
      )}
    </Layout>
  );
}
