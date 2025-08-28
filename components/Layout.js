import Head from 'next/head';
import { loadTx } from "../utils/storage";


export default function Layout({ children, title='GoldTrust Wallet' }) {
  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="container">
        {children}
      </main>
    </div>
  );
}
