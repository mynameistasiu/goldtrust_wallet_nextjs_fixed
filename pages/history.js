import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadTx } from '../utils/storage';
import { formatNaira } from '../utils/format';

export default function History(){
  const tx = typeof window !== 'undefined' ? loadTx() : [];
  return (
    <Layout>
      <LogoHeader small />
      <div className="card">
        <h3>Transaction History</h3>
        {tx.length===0 && <div className="small muted">No transactions yet.</div>}
        {tx.map(t=> (
          <div key={t.id||t.created_at} className="tx">
            <div><div style={{fontWeight:700}}>{t.type.toUpperCase()}</div><div className="small muted">{new Date(t.created_at).toLocaleString()}</div></div>
            <div style={{textAlign:'right'}}><div style={{fontWeight:700}}>{formatNaira(t.amount)}</div><div className={t.status==='successful'?'success':'muted'}>{t.status}</div></div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
