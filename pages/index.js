import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { saveUser, saveBalance, saveTx, loadUser } from '../utils/storage';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    const u = loadUser();
    if(u) router.push('/dashboard');
  },[]);

  const start = async ()=>{
    if(!name || !phone) return alert('Enter name and phone');
    setLoading(true);
    const user = { fullName: name, phone, email:'', plan:'Free Miner Robot' };
    saveUser(user);
    saveBalance(0);
    saveTx([]);
    setTimeout(()=>{
      setLoading(false);
      router.push('/dashboard');
    },600);
  };

  return (
    <Layout>
      <LogoHeader />
      <div className="center">
        <div className="card" style={{maxWidth:480,width:'100%'}}>
          <h2>Get Started</h2>
          <p className="small muted">Enter your details to start earning with your Free Miner Robot.</p>
          <input className="input" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} />
          <input className="input" placeholder="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} />
          <button className="btn" onClick={start}>{loading ? 'Starting...' : 'Start Earning'}</button>
          <p className="small muted">By continuing you accept terms & policies of GoldTrust Wallet.</p>
        </div>
      </div>
    </Layout>
  )
}
