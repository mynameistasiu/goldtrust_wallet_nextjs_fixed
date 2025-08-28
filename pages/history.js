// pages/history.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadTx } from '../utils/storage';
import { formatNaira } from '../utils/format';
import Link from 'next/link';

export default function History() {
  const [allTx, setAllTx] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // UI state
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // receipt preview modal
  const [receiptTx, setReceiptTx] = useState(null);
  const receiptRef = useRef(null);

  useEffect(() => {
    setPageLoading(true);
    setTimeout(() => {
      const tx = (typeof window !== 'undefined') ? (loadTx() || []) : [];
      tx.sort((a,b)=> new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setAllTx(tx);
      setTimeout(()=> setPageLoading(false), 200);
    }, 160);
  }, []);

  const filtered = useMemo(() => {
    let data = allTx.slice();
    if (typeFilter !== 'all') data = data.filter(t => (t.type || '').toLowerCase() === typeFilter);
    if (statusFilter !== 'all') data = data.filter(t => (t.status || '').toLowerCase() === statusFilter);

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      data = data.filter(t => {
        const amount = (t.amount !== undefined && t.amount !== null) ? String(t.amount) : '';
        const date = t.created_at ? new Date(t.created_at).toLocaleString() : '';
        const meta = t.meta ? JSON.stringify(t.meta) : '';
        const userFields = `${t.fullName || ''} ${t.name || ''} ${t.phone || ''}`;
        return (
          (t.type || '').toLowerCase().includes(q) ||
          (t.status || '').toLowerCase().includes(q) ||
          amount.includes(q) ||
          date.toLowerCase().includes(q) ||
          meta.toLowerCase().includes(q) ||
          userFields.toLowerCase().includes(q)
        );
      });
    }

    data.sort((a,b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return sortNewest ? db - da : da - db;
    });

    return data;
  }, [allTx, typeFilter, statusFilter, query, sortNewest]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(()=> {
    if (page > totalPages) setPage(1);
  }, [totalPages]);

  function prettyDate(ts) {
    try { return new Date(ts).toLocaleString(); } catch(e){ return ts; }
  }

  function maskAccount(a) {
    if(!a) return '-';
    const s = String(a).replace(/\s+/g,'');
    if (s.length <= 4) return s;
    return '**** **** ' + s.slice(-4);
  }

  /* ---------- Receipt building & download helpers ---------- */

  // Build off-screen receipt element for tx
  async function buildReceiptElement(tx) {
    // dynamic import qrcode
    let QR;
    try {
      QR = (await import('qrcode')).default || (await import('qrcode'));
    } catch (err) {
      console.error('qrcode import failed - install qrcode', err);
      throw new Error('Missing dependency "qrcode". Run `npm install qrcode`.');
    }

    const txRef = tx.id || tx.created_at || `ref-${Math.random()*1e9|0}`;
    let qrDataUrl = '';
    try {
      qrDataUrl = await (QR.toDataURL ? QR.toDataURL(txRef, { margin:1, width:200 }) : QR(txRef));
    } catch (e) {
      console.warn('QR generation failed', e);
    }

    // map fields
    const senderName = 'GoldTrust Wallet';
    const initiatedBy = tx.fullName || tx.meta?.initiatedBy || tx.name || '-';
    const beneficiaryName = tx.meta?.beneficiaryName || tx.fullName || tx.beneficiary || '-';
    const beneficiaryAccount = tx.meta?.beneficiaryAccount || tx.account || '';
    const beneficiaryBank = tx.meta?.bank || tx.bank || '-';
    const status = tx.status || 'pending';
    const remark = tx.meta?.remark || (status === 'successful' || status === 'claimed' ? 'Transaction Successful' : 'Processed by GoldTrust');
    const txRefText = txRef;

    // wrapper
    const wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.left = '-9999px';
    wrap.style.top = '0';
    wrap.style.width = '900px';
    wrap.style.padding = '28px';
    wrap.style.boxSizing = 'border-box';
    wrap.style.background = '#ffffff';
    wrap.style.color = '#071224';
    wrap.style.fontFamily = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
    wrap.style.zIndex = '999999';

    const watermarkHtml = `
      <div style="position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;display:flex;align-items:center;justify-content:center;">
        <div style="opacity:0.06;font-size:64px;font-weight:800;color:#071224;transform:rotate(-15deg);">
          GoldTrust Wallet
        </div>
      </div>
    `;

    wrap.innerHTML = `
      ${watermarkHtml}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="display:flex;gap:14px;align-items:center">
          <img src="/logo.svg" alt="logo" style="width:72px;height:72px;object-fit:contain"/>
          <div>
            <div style="font-weight:800;font-size:20px;color:#071224">GoldTrust Wallet</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Official Transaction Receipt</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:14px">${(status === 'successful' || status==='claimed') ? '✔️ Successful' : '⏳ '+status}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:6px">${new Date(tx.created_at).toLocaleString()}</div>
        </div>
      </div>

      <div style="display:flex;gap:18px;">
        <div style="flex:1;min-width:0">
          <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:12px;border:1px solid #eef2f7;">
            <div style="font-size:13px;color:#6b7280">Amount</div>
            <div style="font-weight:800;font-size:20px;margin-top:6px">${formatNaira(tx.amount)}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:6px">Reference: <span style="font-family:monospace">${txRefText}</span></div>
          </div>

          <table style="width:100%;border-collapse:collapse;color:#071224">
            <tbody>
              <tr><td style="padding:8px 6px;color:#6b7280;width:40%">Sender</td><td style="padding:8px;font-weight:700">${senderName}</td></tr>
              <tr><td style="padding:8px 6px;color:#6b7280">Initiated by</td><td style="padding:8px">${initiatedBy}</td></tr>
              <tr><td style="padding:8px 6px;color:#6b7280">Beneficiary</td><td style="padding:8px">${beneficiaryName}</td></tr>
              <tr><td style="padding:8px 6px;color:#6b7280">Beneficiary Account</td><td style="padding:8px">${beneficiaryAccount || '-'}</td></tr>
              <tr><td style="padding:8px 6px;color:#6b7280">Beneficiary Bank</td><td style="padding:8px">${beneficiaryBank || '-'}</td></tr>
              <tr><td style="padding:8px 6px;color:#6b7280">Remark</td><td style="padding:8px">${remark}</td></tr>
            </tbody>
          </table>
        </div>

        <div style="width:160px;display:flex;flex-direction:column;align-items:center;gap:12px">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="qr" style="width:140px;height:140px;border-radius:8px;background:#fff;padding:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06)"/>` : ''}
          <div style="font-size:12px;color:#6b7280;text-align:center">Scan QR to verify</div>
        </div>
      </div>

      <div style="margin-top:14px;font-size:11px;color:#6b7280">
        This receipt is issued by GoldTrust Wallet. For support contact the app.
      </div>
    `;

    document.body.appendChild(wrap);
    return wrap;
  }

  async function elementToCanvas(el) {
    let html2canvas;
    try {
      html2canvas = (await import('html2canvas')).default;
    } catch (err) {
      console.error('html2canvas import failed - install html2canvas', err);
      throw new Error('Missing dependency "html2canvas". Run `npm install html2canvas`.');
    }
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    return canvas;
  }

  async function canvasToPdfDataUri(canvas) {
    let jsPDFmod;
    try {
      jsPDFmod = await import('jspdf');
    } catch (err) {
      console.error('jspdf import failed - install jspdf', err);
      throw new Error('Missing dependency "jspdf". Run `npm install jspdf`.');
    }
    const { jsPDF } = jsPDFmod;
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const a4w = 210 - 20;
    const ratio = canvas.width / canvas.height;
    const imgW = a4w;
    const imgH = imgW / ratio;
    pdf.addImage(imgData, 'PNG', 10, 10, imgW, imgH);
    const dataUrl = pdf.output('datauristring');
    return dataUrl;
  }

  async function canvasToJpgDataUri(canvas) {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return dataUrl;
  }

  async function createPdfDataUriForTx(tx) {
    const el = await buildReceiptElement(tx);
    try {
      const canvas = await elementToCanvas(el);
      return await canvasToPdfDataUri(canvas);
    } finally {
      try { el.remove(); } catch(e){}
    }
  }

  async function createJpgDataUriForTx(tx) {
    const el = await buildReceiptElement(tx);
    try {
      const canvas = await elementToCanvas(el);
      return await canvasToJpgDataUri(canvas);
    } finally {
      try { el.remove(); } catch(e){}
    }
  }

  async function downloadDataUri(dataUri, filename) {
    const res = await fetch(dataUri);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadReceiptPdf(tx) {
    try {
      setLoading(true);
      const pdfDataUri = await createPdfDataUriForTx(tx);
      const id = (tx.id || tx.created_at || Date.now()).toString().replace(/[^0-9]/g,'');
      await downloadDataUri(pdfDataUri, `goldtrust_receipt_${id}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF receipt. Check console.');
    } finally {
      setLoading(false);
    }
  }

  async function downloadReceiptJpg(tx) {
    try {
      setLoading(true);
      const jpgDataUri = await createJpgDataUriForTx(tx);
      const id = (tx.id || tx.created_at || Date.now()).toString().replace(/[^0-9]/g,'');
      await downloadDataUri(jpgDataUri, `goldtrust_receipt_${id}.jpg`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate JPG receipt. Check console.');
    } finally {
      setLoading(false);
    }
  }

  function openReceipt(tx) {
    setReceiptTx(tx);
  }
  function closeReceipt() {
    setReceiptTx(null);
  }

  return (
    <Layout>
      <LogoHeader />
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center', gap:12, flexWrap:'wrap'}}>
          <div>
            <h2 style={{margin:0}}>Transaction History</h2>
            <div className="small muted">All records — mine, top-ups, withdrawals & purchases.</div>
          </div>

          <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <button className="btnGhost" onClick={()=>{ /* quick export fallback */ alert('Use the export button later'); }}>Export CSV</button>
            <Link href="/dashboard"><button className="btn">Back to Dashboard</button></Link>
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
          <input className="input" style={{maxWidth:320}} placeholder="Search transactions (type, name, phone, amount, date...)" value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} />
          <select className="input" value={typeFilter} onChange={e=>{ setTypeFilter(e.target.value); setPage(1); }} style={{width:160}}>
            <option value="all">All types</option>
            <option value="mine">Mine</option>
            <option value="withdraw">Withdraw</option>
            <option value="withdraw_confirm">Withdraw Confirm</option>
            <option value="topup">Top-up</option>
            <option value="buy_code">Buy Code</option>
          </select>
          <select className="input" value={statusFilter} onChange={e=>{ setStatusFilter(e.target.value); setPage(1); }} style={{width:160}}>
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="successful">Successful</option>
            <option value="claimed">Claimed</option>
          </select>
          <button className="btnGhost" onClick={()=> setSortNewest(s=>!s)}>{sortNewest ? 'Newest' : 'Oldest'}</button>
        </div>
      </div>

      <div className="card" style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <th style={{padding:'10px'}}>Type</th>
              <th style={{padding:'10px'}}>Amount</th>
              <th style={{padding:'10px'}}>Status</th>
              <th style={{padding:'10px'}}>Date</th>
              <th style={{padding:'10px'}}>User</th>
              <th style={{padding:'10px'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageLoading ? (
              Array.from({length:6}).map((_,i)=>(
                <tr key={`s-${i}`}>
                  <td style={{padding:10}}><div className="skeletonBlock" style={{width:100}}/></td>
                  <td style={{padding:10}}><div className="skeletonBlock" style={{width:80}}/></td>
                  <td style={{padding:10}}><div className="skeletonBlock" style={{width:70}}/></td>
                  <td style={{padding:10}}><div className="skeletonBlock" style={{width:140}}/></td>
                  <td style={{padding:10}}><div className="skeletonBlock" style={{width:140}}/></td>
                  <td style={{padding:10}}><div className="skeletonBlock" style={{width:90}}/></td>
                </tr>
              ))
            ) : (
              <>
                {paged.length === 0 && <tr><td colSpan={6} style={{padding:12}} className="small muted">No transactions found.</td></tr>}
                {paged.map((t, idx) => (
                  <tr key={t.id || t.created_at || idx} className="animatedRow" style={{ borderBottom:'1px solid rgba(255,255,255,0.02)', animationDelay:`${idx*60}ms` }}>
                    <td style={{padding:10, minWidth:120, fontWeight:700}}>{(t.type||'').toUpperCase()}</td>
                    <td style={{padding:10}}>{formatNaira(t.amount || 0)}</td>
                    <td style={{padding:10}} className={t.status === 'successful' || t.status === 'claimed' ? 'success' : 'muted'}>{t.status}</td>
                    <td style={{padding:10}}>{prettyDate(t.created_at)}</td>
                    <td style={{padding:10}}>{t.fullName || t.name || ''} {t.phone ? <div className="small muted" style={{marginTop:6}}>{t.phone}</div> : null}</td>
                    <td style={{padding:10}}>
                      <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                        <button className="btnGhost" onClick={()=> openReceipt(t)}>Preview</button>
                        <button className="btnGhost" onClick={()=> downloadReceiptPdf(t)}>Download PDF</button>
                        <button className="btnGhost" onClick={()=> downloadReceiptJpg(t)}>Download JPG</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, flexWrap:'wrap'}}>
          <div className="small muted">Showing {filtered.length} results • Page {page} of {totalPages}</div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <button className="btnGhost" onClick={()=> setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
            {Array.from({length: totalPages}).slice(0,10).map((_,i)=>(
              <button key={i} className={`btnGhost ${i+1===page ? 'btnActive' : ''}`} onClick={()=> setPage(i+1)}>{i+1}</button>
            ))}
            <button className="btnGhost" onClick={()=> setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>Next</button>
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      {receiptTx && (
        <div className="introOverlay" role="dialog" aria-modal="true" onClick={closeReceipt}>
          <div className="introBox card" onClick={(e)=>e.stopPropagation()} style={{maxWidth:760}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center', marginBottom:10}}>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <img src="/logo.svg" alt="logo" style={{width:48,height:48}} />
                <div>
                  <div style={{fontWeight:800}}>GoldTrust Wallet</div>
                  <div className="small muted">Transaction Receipt</div>
                </div>
              </div>
              <div>
                <button className="btnGhost" onClick={() => downloadReceiptPdf(receiptTx)}>Download PDF</button>
                <button className="btnGhost" onClick={() => downloadReceiptJpg(receiptTx)}>Download JPG</button>
                <button className="btnGhost" onClick={() => window.print()}>Print</button>
                <button className="btnGhost" onClick={closeReceipt}>Close</button>
              </div>
            </div>

            <div ref={receiptRef} style={{padding:16, background:'#fff', color:'#071224', borderRadius:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center', marginBottom:8}}>
                <div>
                  <img src="/logo.svg" alt="logo" style={{width:72,height:72}} />
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:800, fontSize:18}}>Transaction Receipt</div>
                  <div className="small muted" style={{fontSize:12}}>Generated by GoldTrust Wallet</div>
                </div>
              </div>

              <table style={{width:'100%', borderCollapse:'collapse', color:'#071224'}}>
                <tbody>
                  <tr><td style={{padding:'8px 6px', width:160, color:'#6b7280'}}>Transaction Amount</td><td style={{padding:8, fontWeight:800}}>{formatNaira(receiptTx.amount)}</td></tr>
                  <tr><td style={{padding:'8px 6px', color:'#6b7280'}}>Transaction Type</td><td style={{padding:8}}>{(receiptTx.type||'').toUpperCase()}</td></tr>
                  <tr><td style={{padding:'8px 6px', color:'#6b7280'}}>Transaction Date</td><td style={{padding:8}}>{prettyDate(receiptTx.created_at)}</td></tr>
                  <tr><td style={{padding:'8px 6px', color:'#6b7280'}}>Sender</td><td style={{padding:8,fontWeight:700}}>GoldTrust Wallet</td></tr>
                  <tr><td style={{padding:'8px 6px', color:'#6b7280'}}>Initiated by</td><td style={{padding:8}}>{receiptTx.fullName || receiptTx.meta?.initiatedBy || '—'}</td></tr>
                  <tr><td style={{padding:'8px 6px', color:'#6b7280'}}>Beneficiary</td><td style={{padding:8}}>{receiptTx.meta?.beneficiaryName || receiptTx.beneficiary || '—'}</td></tr>
                  <tr><td style={{padding:'8px 6px', color:'#6b7280'}}>Beneficiary Account</td><td style={{padding:8}}>{receiptTx.meta?.beneficiaryAccount ? maskAccount(receiptTx.meta?.beneficiaryAccount) : (receiptTx.account || '—')}</td></tr>
                  <tr><td style={{padding:'8px 6px', color:'#6b7280'}}>Beneficiary Bank</td><td style={{padding:8}}>{receiptTx.meta?.bank || receiptTx.bank || '—'}</td></tr>
                  <tr><td style={{padding:'8px 6px', color:'#6b7280'}}>Remark</td><td style={{padding:8}}>{receiptTx.meta?.remark || (receiptTx.status === 'successful' || receiptTx.status === 'claimed' ? 'Transaction Successful' : '-')}</td></tr>
                  <tr><td style={{padding:'8px 6px', color:'#6b7280'}}>Reference</td><td style={{padding:8, fontSize:12}}>{receiptTx.id || receiptTx.created_at || 'REF-'+(Math.random()*1e6|0)}</td></tr>
                  <tr><td style={{padding:'8px 6px', color:'#6b7280'}}>Status</td>
                    <td style={{padding:8}}>
                      <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
                        {receiptTx.status === 'successful' || receiptTx.status === 'claimed' ? <span style={{color:'#16A34A', fontWeight:800}}>✔️ Successful</span> : <span style={{color:'#F59E0B', fontWeight:700}}>⏳ {receiptTx.status}</span>}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{marginTop:12, fontSize:12, color:'#555'}}>This receipt was generated by GoldTrust Wallet. If you have questions contact support via the app.</div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
