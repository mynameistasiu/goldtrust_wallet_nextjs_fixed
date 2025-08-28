// utils/storage.js
// Robust localStorage helpers for GoldTrust Wallet
const USER_KEY = 'gt_user';
const BALANCE_KEY = 'gt_balance';
const TX_KEY = 'gt_transactions';
const PENDING_WITHDRAW = 'gt_pending_withdraw';

function isBrowser() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function save(key, value) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('storage.save error', e);
  }
}

export function load(key) {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('storage.load error', e);
    return null;
  }
}

/* ---------------- User & balance ---------------- */
export function saveUser(u) { save(USER_KEY, u); }
export function loadUser() { return load(USER_KEY); }

export function saveBalance(n) {
  // store numeric balance (but keep it JSON serializable)
  if (!isBrowser()) return;
  try {
    const val = Number(n || 0);
    localStorage.setItem(BALANCE_KEY, JSON.stringify(val));
  } catch (e) {
    console.error('saveBalance error', e);
  }
}
export function loadBalance() {
  const v = load(BALANCE_KEY);
  return (v === null || v === undefined) ? 0 : Number(v || 0);
}

/* ---------------- Transactions ----------------
 - saveTx(tx) will accept either:
   * an array -> replace the stored transaction array
   * an object -> append normalized transaction to the head
 - normalize ensures receipt code can read consistent fields:
   id, type, amount (Number), status, created_at, fullName, phone, meta, account, bank
*/
export function saveTx(txOrArray) {
  if (!isBrowser()) return;
  try {
    if (Array.isArray(txOrArray)) {
      // replace entire tx array
      save(TX_KEY, txOrArray);
      return;
    }

    const prev = load(TX_KEY) || [];
    // normalize tx object
    const user = loadUser() || {};
    const normalized = {
      id: txOrArray.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      type: txOrArray.type || 'unknown',
      amount: Number(txOrArray.amount || 0),
      status: txOrArray.status || 'pending',
      created_at: txOrArray.created_at || new Date().toISOString(),
      // user fields
      fullName: txOrArray.fullName || txOrArray.initiatedBy || user.fullName || '',
      phone: txOrArray.phone || user.phone || '',
      // meta: free-form object for beneficiary, remark, etc.
      meta: (txOrArray.meta && typeof txOrArray.meta === 'object') ? txOrArray.meta : (txOrArray.meta ? { note: txOrArray.meta } : {}),
      // legacy / convenience fields
      account: txOrArray.account || undefined,
      bank: txOrArray.bank || undefined
    };

    prev.unshift(normalized);
    save(TX_KEY, prev);
  } catch (e) {
    console.error('saveTx error', e);
  }
}

export function loadTx() {
  const t = load(TX_KEY);
  return Array.isArray(t) ? t : [];
}

/* ---------------- Pending withdraw ----------------
 Save structured pending withdraw so history/receipt can fallback to it.
*/
export function savePendingWithdraw(payload) {
  if (!isBrowser()) return;
  try {
    const obj = {
      account: payload.account || payload.accountNumber || payload.account_no || '',
      bank: payload.bank || payload.bankName || '',
      amount: Number(payload.amount || 0),
      created_at: payload.created_at || new Date().toISOString(),
      meta: payload.meta || {}
    };
    save(PENDING_WITHDRAW, obj);
  } catch (e) {
    console.error('savePendingWithdraw error', e);
  }
}

export function loadPendingWithdraw() {
  return load(PENDING_WITHDRAW);
}

export function clearPendingWithdraw() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(PENDING_WITHDRAW);
  } catch (e) {
    console.error('clearPendingWithdraw error', e);
  }
}

/* ---------------- Convenience helpers ---------------- */
// Remove a tx by id (useful for admin/debug)
export function removeTxById(id) {
  if (!isBrowser()) return;
  try {
    const tx = loadTx();
    const filtered = tx.filter(t => t.id !== id);
    save(TX_KEY, filtered);
  } catch (e) {
    console.error('removeTxById error', e);
  }
}
