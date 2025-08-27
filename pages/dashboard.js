import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import Link from 'next/link';
import { loadUser, loadBalance, loadTx } from '../utils/storage';
import { formatNaira } from '../utils/format';

export default function Dashboard(){
  const router = useRouter();
  const [user,setUser] = useState(null);
  const [balance,setBalance] = useState(0);
  const [tx,setTx] = useState([]);

  useEffect(()=>{
    const u = loadUser();
    if(!u) router.push('/');
    setUser(u);
    setBalance(loadBalance());
    setTx(loadTx());
  },[]);

  if(!user) return <Layout><div className="center"><div className="card">Loading...</div></div></Layout>;

  return (
    <Layout>
      <LogoHeader />
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div className="small muted">Wallet Balance</div>
            <div style={{fontSize:28,fontWeight:800}}>{formatNaira(balance)}</div>
            <div className="small muted">{user.fullName} • Miner: {user.phone}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <Link href="/profile" className="link">Profile</Link>
          </div>
        </div>

        <div style={{height:18}}/>
        <div className="row">
          <div className="actionBox" onClick={()=>router.push('/mine')}><div style={{fontSize:22}}>⛏️</div><div style={{marginTop:8,fontWeight:700}}>Mine</div></div>
          <div className="actionBox" onClick={()=>router.push('/withdraw')}><div style={{fontSize:22}}>💸</div><div style={{marginTop:8,fontWeight:700}}>Withdraw</div></div>
        </div>

        <div style={{height:12}} />
        <div style={{display:'flex',gap:12}}>
          <button className="btnGhost" onClick={()=>router.push('/buy-code')}>Buy Activation Code</button>
          <Link href="/history" className="btnGhost">Transaction History</Link>
        </div>
      </div>
    </Layout>
  );
}
