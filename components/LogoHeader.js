import Image from 'next/image';
import Link from 'next/link';
import { loadTx } from "../utils/storage";

const WA_NUMBER = '+2348161662371'; // change if needed
export default function LogoHeader({ small }) {
  return (
    <div className="logo">
      <Image src="/logo.svg" alt="GoldTrust" width={56} height={56} />
      <div>
        <h1>GoldTrust Wallet 🥇</h1>
        {!small && <div className="small muted">Your Money, Your Trust</div>}
      </div>
      <div style={{marginLeft:'auto'}}>
        <Link href={`https://wa.me/${WA_NUMBER.replace('+','')}`} className="link">Contact</Link>
      </div>
    </div>
  );
}
