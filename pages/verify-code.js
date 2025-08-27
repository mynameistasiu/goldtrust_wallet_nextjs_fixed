import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadPendingWithdraw, loadBalance, saveBalance, saveTx, clearPendingWithdraw } from '../utils/storage';

const GLOBAL_CODE = '2256';

export default function VerifyCode(){
  const router = useRouter();
  const [code,setCode] = useState('');

  useEffect(()=>{
    const p = loadPendingWithdraw();
    if(!p) router.push('/dashboard');
  },[]);

  const verify = ()=>{
    if(code === GLOBAL_CODE){
      const pending = loadPendingWithdraw();
      if(!pending) return alert('No pending withdraw');
      const amt = Number(pending.amount);
      const newBal = Number(loadBalance()||0) - amt;
      saveBalance(newBal);
      saveTx({type:'withdraw_confirm', amount:amt, status:'successful', created_at: new Date().toISOString()});
      clearPendingWithdraw();
      alert('Withdrawal Successful ✅💸');
      router.push('/dashboard');
    } else {
      if(confirm('Invalid code. Buy code now?')) router.push('/buy-code');
    }
  };

  return (
    <Layout>
      <LogoHeader small />
      <div className="card">
        <h3>Code Verification</h3>
        <p className="small muted">Enter your 4-digit withdrawal code.</p>
        <input className="input" placeholder="0000" value={code} onChange={e=>setCode(e.target.value)} />
        <button className="btn" onClick={verify}>Verify Code</button>
      </div>
    </Layout>
  );
}
