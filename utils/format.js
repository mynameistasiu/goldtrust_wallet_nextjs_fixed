export function formatNaira(n){ if(!n && n!==0) return '₦0'; return '₦'+Number(n).toLocaleString('en-NG'); }
