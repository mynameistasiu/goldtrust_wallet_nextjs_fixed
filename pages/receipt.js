// pages/receipt.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { loadTx, loadPendingWithdraw, loadUser } from "../utils/storage";

/**
 * Professional receipt page (no external libs).
 * - Renders a styled SVG representation of the receipt
 * - Allows Download SVG, Download JPG, Print, Share (WhatsApp)
 * - Uses tx fields OR falls back to pending withdraw for account/bank
 */

function maskAccount(a = "") {
  const s = String(a).replace(/\s+/g, "");
  if (!s) return "—";
  if (s.length <= 4) return s;
  return "**** **** " + s.slice(-4);
}

export default function ReceiptPage() {
  const [receipt, setReceipt] = useState(null);
  const [svgDataUri, setSvgDataUri] = useState(null);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // pick the latest transaction by default
    const txs = loadTx() || [];
    if (txs.length === 0) {
      setReceipt(null);
      return;
    }
    const tx = txs[0]; // latest
    setReceipt(tx);
  }, []);

  useEffect(() => {
    if (!receipt) return;

    (async () => {
      try {
        const svg = await buildReceiptSvgString(receipt);
        const uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        setSvgDataUri(uri);
      } catch (e) {
        console.error("SVG build failed", e);
      }
    })();
  }, [receipt]);

  if (!receipt) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
        No receipt found — make a transaction or check History.
      </div>
    );
  }

  // actions
  async function downloadSvg() {
    if (!svgDataUri) return alert("Receipt not ready yet.");
    const a = document.createElement("a");
    a.href = svgDataUri;
    const id = (receipt.id || receipt.created_at || Date.now()).toString().replace(/[^0-9]/g, "");
    a.download = `goldtrust_receipt_${id}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadJpg() {
    if (!svgDataUri) return alert("Receipt not ready yet.");
    setGenerating(true);
    try {
      await svgToImageDownload(svgDataUri, `goldtrust_receipt_${(receipt.id||receipt.created_at||Date.now()).toString().replace(/[^0-9]/g,'')}.jpg`, "image/jpeg", 0.92);
    } catch (e) {
      console.error(e);
      alert("Failed to create image. See console.");
    } finally {
      setGenerating(false);
    }
  }

  function printReceipt() {
    if (!svgDataUri) return alert("Receipt not ready yet.");
    const w = window.open("", "_blank", "noopener");
    if (!w) return alert("Unable to open print window. Check popup settings.");
    w.document.write(`
      <html>
        <head><title>Receipt</title></head>
        <body style="margin:0;padding:18px;background:#f3f4f6">
          <div style="max-width:760px;margin:0 auto;padding:12px;background:#fff">${decodeURIComponent(svgDataUri.split(",")[1])}</div>
        </body>
      </html>
    `);
    w.document.close();
    // delay so resource loads (SVG inline string). Then print.
    setTimeout(()=> w.print(), 600);
  }

  function shareWhatsapp() {
    const id = receipt.id || receipt.created_at || "REF";
    const amount = receipt.amount || 0;
    const msg = encodeURIComponent(`I just completed a transaction on GoldTrust Wallet.\nReference: ${id}\nAmount: ₦${Number(amount).toLocaleString()}\nCheck your GoldTrust app.`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  return (
    <div style={{ maxWidth: 920, margin: "18px auto", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src="/logo.svg" alt="logo" style={{ width: 64, height: 64 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>GoldTrust Wallet</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Official Transaction Receipt</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btnGhost" onClick={() => router.push("/dashboard")}>Back</button>
          <button className="btnGhost" onClick={shareWhatsapp}>Share</button>
          <button className="btnGhost" onClick={downloadSvg}>Download SVG</button>
          <button className="btn" onClick={downloadJpg} disabled={generating}>{generating ? "Creating image..." : "Download JPG"}</button>
          <button className="btnGhost" onClick={printReceipt}>Print</button>
        </div>
      </div>

      <div style={{ background: "var(--card)", padding: 18, borderRadius: 12 }}>
        {/* display the SVG on-screen for preview (use iframe-like container) */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, overflow: "hidden" }}>
          {/* show inline decoded SVG if ready, otherwise fallback UI */}
          {svgDataUri ? (
            <div dangerouslySetInnerHTML={{ __html: decodeURIComponent(svgDataUri.split(",")[1]) }} />
          ) : (
            <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Preparing receipt preview...</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

// builds an SVG string for the receipt (no external libs)
async function buildReceiptSvgString(tx) {
  // attempt to load pending withdraw to fill missing account/bank fields
  let pending = null;
  try { pending = loadPendingWithdraw(); } catch (e) { pending = null; }

  const user = loadUser() || {};

  const txRef = tx.id || tx.created_at || `REF-${Math.random().toString(36).slice(2,8)}`;
  const date = new Date(tx.created_at || Date.now()).toLocaleString();
  const amount = Number(tx.amount || 0);
  const initiatedBy = tx.fullName || tx.name || user.fullName || "—";

  // beneficiary info: prefer explicit meta fields; else fallback to pending withdraw
  const beneficiaryName = tx.meta?.beneficiaryName || tx.meta?.beneficiary || (pending ? user.fullName || "—" : user.fullName || "—");
  const beneficiaryAccount = tx.meta?.beneficiaryAccount || tx.account || (pending ? (pending.account || "") : "");
  const beneficiaryBank = tx.meta?.bank || tx.bank || (pending ? (pending.bank || "") : "");
  const status = tx.status || "pending";
  const remark = tx.meta?.remark || (status === "successful" || status === "claimed" ? "Transaction Successful" : "-");

  // mask
  const maskedAccount = maskAccount(beneficiaryAccount);

  // SVG layout sizes
  const width = 760;
  const padding = 28;

  // Create a simple QR-like rectangle (for verification placeholder)
  const qrPlaceholder = `<rect x="${width - padding - 150}" y="${padding + 130}" width="140" height="140" rx="8" fill="#ffffff" stroke="#e6edf3" />
    <text x="${width - padding - 80}" y="${padding + 205}" font-size="12" text-anchor="middle" fill="#7b8794">${txRef.substring(0,10)}</text>`;

  // watermark text (center)
  const watermark = `<g opacity="0.06" transform="translate(${width / 2 - 120}, ${400}) rotate(-15)">
    <text x="0" y="0" font-size="64" font-weight="800" fill="#071224">GoldTrust Wallet</text>
  </g>`;

  // sanitize text (basic)
  const esc = s => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // inline logo image — we reference /logo.svg (same origin). Use <image>.
  // Build SVG content
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="880" viewBox="0 0 ${width} 880" style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
    <defs>
      <style>
        .muted{fill:#6b7280;font-size:13px}
        .label{fill:#6b7280;font-size:14px}
        .value{fill:#071224;font-size:16px;font-weight:700}
        .small{fill:#071224;font-size:12px}
      </style>
      <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000" flood-opacity="0.08"/>
      </filter>
    </defs>

    <rect width="100%" height="100%" fill="#fff" rx="12" filter="url(#cardShadow)"/>

    ${watermark}

    <!-- header -->
    <g transform="translate(${padding}, ${padding})">
      <image href="/logo.svg" width="72" height="72" x="0" y="0" />
      <g transform="translate(92,10)">
        <text x="0" y="14" font-size="20" font-weight="800" fill="#071224">GoldTrust Wallet</text>
        <text x="0" y="36" class="muted">Official Transaction Receipt</text>
      </g>

      <g transform="translate(${width - padding - 220}, 4)">
        <rect x="0" y="0" width="220" height="72" rx="10" fill="#f0f9ff" stroke="#e6f2fb"/>
        <text x="12" y="22" class="muted">Status</text>
        <text x="12" y="46" font-size="18" fill="${status === 'successful' || status === 'claimed' ? '#16A34A' : '#F59E0B'}" font-weight="800">${status === 'successful' || status === 'claimed' ? '✔️ Successful' : esc(status)}</text>
      </g>
    </g>

    <!-- main content -->
    <g transform="translate(${padding}, ${padding + 92})">
      <rect x="0" y="0" width="${width - padding * 2 - 160}" height="160" rx="10" fill="#f8fafc" stroke="#eef2f7"/>
      <text x="16" y="28" class="muted">Amount</text>
      <text x="16" y="64" font-size="28" font-weight="900" fill="#071224">₦${Number(amount).toLocaleString()}</text>
      <text x="16" y="92" class="muted">Reference: <tspan font-family="monospace" font-size="12">${esc(txRef)}</tspan></text>

      <!-- right column QR placeholder -->
      ${qrPlaceholder}
    </g>

    <!-- details table -->
    <g transform="translate(${padding}, ${padding + 92 + 180})">
      <text x="0" y="0" class="muted" font-size="13">Transaction Details</text>

      <g transform="translate(0,18)">
        <text x="0" y="24" class="label">Sender</text>
        <text x="240" y="24" class="value">${esc("GoldTrust Wallet")}</text>

        <text x="0" y="56" class="label">Initiated by</text>
        <text x="240" y="56" class="value">${esc(initiatedBy)}</text>

        <text x="0" y="88" class="label">Beneficiary</text>
        <text x="240" y="88" class="value">${esc(beneficiaryName)}</text>

        <text x="0" y="120" class="label">Beneficiary Account</text>
        <text x="240" y="120" class="value">${esc(maskAccount(beneficiaryAccount || ""))}</text>

        <text x="0" y="152" class="label">Beneficiary Bank</text>
        <text x="240" y="152" class="value">${esc(beneficiaryBank || "—")}</text>

        <text x="0" y="184" class="label">Remark</text>
        <text x="240" y="184" class="value">${esc(remark)}</text>

        <text x="0" y="216" class="label">Date</text>
        <text x="240" y="216" class="small">${esc(date)}</text>

        <text x="0" y="244" class="label">Reference</text>
        <text x="240" y="244" class="small">${esc(txRef)}</text>
      </g>
    </g>

    <!-- footer -->
    <g transform="translate(${padding}, ${padding + 92 + 180 + 300})">
      <text x="0" y="18" class="small">This receipt is issued by GoldTrust Wallet. Contact support via the app for questions.</text>
      <text x="${width - padding - 220}" y="18" class="muted" font-size="11">Verified • GoldTrust Wallet</text>
    </g>
  </svg>
  `;

  return svg;
}

// convert svgDataUri -> image and download via canvas
function svgToImageDownload(svgDataUri, fileName, mime = "image/jpeg", quality = 0.92) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // ensure correct crossOrigin for same-origin SVG
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        // white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Failed to create blob"));
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          resolve();
        }, mime, quality);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(e);
    // set src (svgDataUri)
    img.src = svgDataUri;
  });
}
