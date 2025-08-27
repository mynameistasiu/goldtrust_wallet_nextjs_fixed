import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadUser, loadBalance, saveTx, savePendingWithdraw } from '../utils/storage';

export default function Withdraw(){
  const router = useRouter();
  const [user,setUser] = useState(null);
  const [account,setAccount] = useState('');
  const [bank,setBank] = useState('');
  const [amount,setAmount] = useState('');

  useEffect(()=>{
    const u = loadUser();
    if(!u) router.push('/');
    setUser(u);
  },[]);

  const proceed = ()=>{
    const amt = Number(amount);
    if(!account || !bank || !amt) return alert('Complete all fields');
    if(amt > Number(loadBalance()||0)) return alert('Insufficient balance');
    const payload = { account, bank, amount: amt };
    savePendingWithdraw(payload);
    saveTx({type:'withdraw', amount:amt, status:'pending', created_at: new Date().toISOString()});
    router.push('/verify-code');
  };

  return (
    <Layout>
      <LogoHeader small />
      <div className="card">
        <h3>Withdraw</h3>
        <input className="input" placeholder="Account Number" value={account} onChange={e=>setAccount(e.target.value)} />
        <input className="input" placeholder="Bank Name" value={bank} onChange={e=>setBank(e.target.value)} />
        <input className="input" placeholder="Amount (₦)" value={amount} onChange={e=>setAmount(e.target.value)} />
        <button className="btn" onClick={proceed}>Proceed to Code Verification</button>
      </div>
    </Layout>
  );
}
