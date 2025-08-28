import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import LogoHeader from '../components/LogoHeader';
import { loadUser, saveUser } from '../utils/storage';
import { loadTx } from "../utils/storage";


export default function Profile(){
  const [user,setUser] = useState({});
  useEffect(()=>{ const u = loadUser(); if(u) setUser(u); },[]);
  const save = ()=>{ saveUser(user); alert('Saved'); }
  return (
    <Layout>
      <LogoHeader small />
      <div className="card">
        <h3>Profile</h3>
        <input className="input" placeholder="Full name" value={user.fullName||''} onChange={e=>setUser({...user, fullName:e.target.value})} />
        <input className="input" placeholder="Phone" value={user.phone||''} onChange={e=>setUser({...user, phone:e.target.value})} />
        <input className="input" placeholder="Email" value={user.email||''} onChange={e=>setUser({...user, email:e.target.value})} />
        <button className="btn" onClick={save}>Save</button>
      </div>
    </Layout>
  );
}
