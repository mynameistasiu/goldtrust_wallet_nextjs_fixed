const USER_KEY = 'gt_user';
const BALANCE_KEY = 'gt_balance';
const TX_KEY = 'gt_transactions';
const PENDING_WITHDRAW = 'gt_pending_withdraw';

export function save(key, value){
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}
export function load(key){
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function saveUser(u){ save(USER_KEY, u); }
export function loadUser(){ return load(USER_KEY); }

export function saveBalance(n){ save(BALANCE_KEY, n); }
export function loadBalance(){ return load(BALANCE_KEY) || 0; }

export function saveTx(t){
  const prev = load(TX_KEY) || [];
  prev.unshift(t);
  save(TX_KEY, prev);
}
export function loadTx(){ return load(TX_KEY) || []; }

export function savePendingWithdraw(d){ save(PENDING_WITHDRAW, d); }
export function loadPendingWithdraw(){ return load(PENDING_WITHDRAW); }
export function clearPendingWithdraw(){ if (typeof window === 'undefined') return; localStorage.removeItem(PENDING_WITHDRAW); }
