import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadUser, loadBalance, saveBalance, saveTx } from '../utils/storage';
import { formatNaira } from '../utils/format';

export default function Mine(){
  const router = useRouter();
  const [user,setUser] = useState(null);
  const [stage,setStage] = useState('idle');
  const [amount,setAmount] = useState(0);

  useEffect(()=>{
    const u = loadUser();
    if(!u) router.push('/');
    setUser(u);
  },[]);

  const startMine = ()=>{
    const val = Math.floor(Math.random()*(100000-60000+1))+60000;
    setStage('mining');
    setTimeout(()=>{
      setAmount(val);
      setStage('result');
    },5200);
  };

  const claim = ()=>{
    const bal = Number(loadBalance()||0) + Number(amount);
    saveBalance(bal);
    saveTx({type:'mine',amount, status:'claimed', created_at: new Date().toISOString()});
    setStage('claimed');
    setTimeout(()=> router.push('/dashboard'),1000);
  };

  if(!user) return <Layout><div className="center"><div className="card">Loading...</div></div></Layout>;

  return (
    <Layout>
      <LogoHeader small />
      <div className="card">
        <h3>Mine</h3>
        <p className="small muted">Your current plan: {user.plan}. You can mine between ₦60,000 – ₦100,000.</p>
        {stage==='idle' && <button className="btn" onClick={startMine}>Start Mine ⛏️</button>}
        {stage==='mining' && <div className="center"><div className="small muted">Initializing miner... Connecting... Mining...</div><div style={{height:12}}/><div className="small muted">Please wait...</div></div>}
        {stage==='result' && <div className="center"><h3>🎉 Congratulations!</h3><div style={{fontSize:20,fontWeight:700}}>{formatNaira(amount)}</div><p className="small muted">You've mined {formatNaira(amount)} — claim to add to your wallet.</p><div style={{height:12}}/><button className="btn" onClick={claim}>Claim ✅</button></div>}
      </div>
    </Layout>
  );
}
