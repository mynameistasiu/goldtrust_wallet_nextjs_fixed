import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { saveTx } from '../utils/storage';

const CODE_PRICE = 7000;
const WA = '+2348161662371';

export default function BuyCode(){
  const router = useRouter();
  const [step,setStep] = useState(1);
  const [name,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [email,setEmail] = useState('');
  const [countdown,setCountdown] = useState(10*60);
  const timerRef = useRef(null);

  useEffect(()=>{
    if(step===2){
      setCountdown(10*60);
      timerRef.current = setInterval(()=>{
        setCountdown(c=>{
          if(c<=1){ clearInterval(timerRef.current); return 0; }
          return c-1;
        });
      },1000);
    }
    return ()=> clearInterval(timerRef.current);
  },[step]);

  const proceed = ()=>{
    if(!name || !phone || !email) return alert('Fill details');
    setStep(2);
  };

  const confirmPayment = ()=>{
    const code = 'GT-'+Date.now().toString().slice(-6);
    saveTx({type:'buy_code', amount: CODE_PRICE, status:'successful', meta:{code}, created_at: new Date().toISOString()});
    alert('Code Issued: '+code);
    router.push('/dashboard');
  };

  return (
    <Layout>
      <LogoHeader small />
      <div className="card">
        <h3>Buy Activation Code</h3>
        {step===1 && <>
          <input className="input" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} />
          <input className="input" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <button className="btn" onClick={proceed}>Proceed</button>
        </>}
        {step===2 && <>
          <p>Hello {name}, kindly make a one-time payment of ₦{CODE_PRICE.toLocaleString()} to purchase your personal activation code.</p>
          <div style={{padding:12,border:'1px solid #ddd',borderRadius:10,margin:8}}>
            <div style={{fontWeight:700}}>Bank Details</div>
            <div>Account Name: Abdulmumini Bello</div>
            <div>Account Number: 2078928132</div>
            <div>Bank: Kuda Bank </div>
            <div style={{marginTop:8}}>Amount: ₦{CODE_PRICE.toLocaleString()}</div>
          </div>
          <div>Transfer Pending ⏳</div>
          <div className="countdown">{String(Math.floor(countdown/60)).padStart(2,'0')}:{String(countdown%60).padStart(2,'0')}</div>
          <button className="btn" onClick={()=>{ if(countdown===0) return alert('Expired'); confirmPayment(); }}>Confirm Payment</button>
          <a className="btnGhost" href={`https://wa.me/${WA.replace('+','')}`}>Payment not confirmed? Contact Vendor (WhatsApp)</a>
        </>}
      </div>
    </Layout>
  );
}
