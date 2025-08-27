// pages/history.js
import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadTx, saveTx } from '../utils/storage';
import { formatNaira } from '../utils/format';
import Link from 'next/link';

/**
 * History page with animated load + skeleton rows + staggered row fade
 */

export default function History() {
  const [allTx, setAllTx] = useState([]);
  const [loading, setLoading] = useState(false); // used for export / heavy ops
  const [pageLoading, setPageLoading] = useState(true); // page initial load / skeleton

  // UI state
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // modal state
  const [selectedTx, setSelectedTx] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // simulate a short read delay (gives time for skeleton animation)
    setPageLoading(true);
    setTimeout(() => {
      const tx = (typeof window !== 'undefined') ? (loadTx() || []) : [];
      tx.sort((a,b)=> new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setAllTx(tx);
      // small delay so skeleton feels smooth
      setTimeout(()=> setPageLoading(false), 220);
    }, 180);
  }, []);

  // Derived filtered list (memoized)
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

  function openDetails(tx) {
    setSelectedTx(tx);
    setShowModal(true);
  }

  function closeDetails() {
    setSelectedTx(null);
    setShowModal(false);
  }

  function clearHistory() {
    if (!confirm('Clear all transaction history? This action cannot be undone.')) return;
    try { saveTx && saveTx({}); } catch(e){}
    try { if (typeof window !== 'undefined') localStorage.removeItem('gt_transactions'); } catch(e){}
    setAllTx([]);
  }

  async function exportCSV() {
    setLoading(true);
    try {
      const rows = filtered.map(t => ({
        type: t.type || '',
        amount: t.amount || '',
        status: t.status || '',
        created_at: t.created_at || '',
        name: t.fullName || t.name || '',
        phone: t.phone || '',
        meta: t.meta ? JSON.stringify(t.meta) : ''
      }));
      const headers = ['type','amount','status','created_at','name','phone','meta'];
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => {
          const val = (r[h] === undefined || r[h] === null) ? '' : String(r[h]);
          const escaped = val.replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `goldtrust_transactions_${(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + (e.message || e));
    } finally {
      // keep overlay visible a short moment so users see the action
      setTimeout(()=> setLoading(false), 400);
    }
  }

  function prettyDate(ts) {
    try { return new Date(ts).toLocaleString(); } catch(e){ return ts; }
  }

  async function copyJson() {
    if (!selectedTx) return;
    try {
      const json = JSON.stringify(selectedTx, null, 2);
      await navigator.clipboard.writeText(json);
      alert('Transaction JSON copied to clipboard');
    } catch(e) {
      prompt('Copy transaction JSON', JSON.stringify(selectedTx));
    }
  }

  // skeleton row generator for smoother perceived load
  const SkeletonRows = ({rows=6}) => {
    return Array.from({length: rows}).map((_,i)=>(
      <tr key={`skeleton-${i}`}>
        <td style={{padding:10}}><div className="skeletonBlock" style={{width:100}}/></td>
        <td style={{padding:10}}><div className="skeletonBlock" style={{width:80}}/></td>
        <td style={{padding:10}}><div className="skeletonBlock" style={{width:70}}/></td>
        <td style={{padding:10}}><div className="skeletonBlock" style={{width:140}}/></td>
        <td style={{padding:10}}><div className="skeletonBlock" style={{width:140}}/></td>
        <td style={{padding:10}}><div className="skeletonBlock" style={{width:90}}/></td>
      </tr>
    ));
  };

  return (
    <Layout>
      <LogoHeader />
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center', gap:12, flexWrap:'wrap'}}>
          <div>
            <h2 style={{margin:0}}>Transaction History</h2>
            <div className="small muted">All records of your wallet activity — mine, top-ups, withdrawals & purchases.</div>
          </div>

          <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <button className="btnGhost" onClick={exportCSV} disabled={loading}>Export CSV</button>
            <button className="btnGhost" onClick={clearHistory}>Clear History</button>
            <Link href="/dashboard"><button className="btn">Back to Dashboard</button></Link>
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        {/* controls */}
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
              <SkeletonRows rows={6} />
            ) : (
              <>
                {paged.length === 0 && (
                  <tr><td colSpan={6} style={{padding:12}} className="small muted">No transactions found.</td></tr>
                )}
                {paged.map((t, idx) => (
                  <tr
                    key={t.id || t.created_at || idx}
                    className="animatedRow"
                    // stagger effect: small delay per row
                    style={{ borderBottom:'1px solid rgba(255,255,255,0.02)', animationDelay: `${idx * 60}ms` }}
                  >
                    <td style={{padding:10, minWidth:120, fontWeight:700}}>{(t.type||'').toUpperCase()}</td>
                    <td style={{padding:10}}>{formatNaira(t.amount || 0)}</td>
                    <td style={{padding:10}} className={t.status === 'successful' || t.status === 'claimed' ? 'success' : 'muted'}>{t.status}</td>
                    <td style={{padding:10}}>{prettyDate(t.created_at)}</td>
                    <td style={{padding:10}}>{t.fullName || t.name || ''} {t.phone ? <div className="small muted" style={{marginTop:6}}>{t.phone}</div> : null}</td>
                    <td style={{padding:10}}>
                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        <button className="btnGhost" onClick={()=> openDetails(t)}>Details</button>
                        <button className="btnGhost" onClick={()=>{
                          if (!confirm('Remove this transaction?')) return;
                          const newAll = allTx.filter(x => x !== t);
                          setAllTx(newAll);
                          try { localStorage.setItem('gt_transactions', JSON.stringify(newAll)); } catch(e){}
                        }}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>

        {/* pagination */}
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

      {/* details modal */}
      {showModal && selectedTx && (
        <div className="introOverlay" role="dialog" aria-modal="true" onClick={closeDetails}>
          <div className="introBox card" onClick={(e)=>e.stopPropagation()} style={{maxWidth:720}}>
            <div style={{display:'flex',justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <div style={{fontWeight:800}}>{(selectedTx.type || '').toUpperCase()} • {selectedTx.status}</div>
                <div className="small muted">{prettyDate(selectedTx.created_at)}</div>
              </div>
              <div>
                <button className="btnGhost" onClick={copyJson}>Copy JSON</button>
                <button className="btnGhost" onClick={closeDetails}>Close</button>
              </div>
            </div>

            <div style={{marginTop:12}}>
              <div className="small muted">Amount</div>
              <div style={{fontWeight:800}}>{formatNaira(selectedTx.amount || 0)}</div>

              <div style={{height:8}} />
              <div className="small muted">User</div>
              <div>{selectedTx.fullName || selectedTx.name || '-'} {selectedTx.phone ? <div className="small muted">{selectedTx.phone}</div> : null}</div>

              <div style={{height:8}} />
              <div className="small muted">Meta & details</div>
              <pre style={{background:'rgba(255,255,255,0.02)', padding:12, borderRadius:8, overflowX:'auto', maxHeight:260}}>{JSON.stringify(selectedTx, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* small loading overlay while exporting */}
      {loading && (
        <div className="loadingOverlay" role="status" aria-live="polite">
          <div className="loadingBox">
            <div className="loader" aria-hidden="true">
              <span className="ring" />
              <span className="ring ring2" />
              <span className="spark" />
            </div>
            <div>
              <div className="loaderText">Exporting transactions...</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
