import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, timeout: 20000 });

// Players
export const savePlayer = (wallet, payload) =>
  api.post(`/player/${wallet}/save`, payload).then((r) => r.data);
export const loadPlayer = (wallet) =>
  api.get(`/player/${wallet}`).then((r) => r.data);
export const getLeaderboard = () => api.get(`/leaderboard`).then((r) => r.data);

// ===== TON Economy =====
export const initDeposit = (wallet, amountTon) =>
  api.post(`/deposit/init`, { wallet, amount_ton: Number(amountTon) }).then((r) => r.data);
export const getDepositStatus = (depositId) =>
  api.get(`/deposit/status/${depositId}`).then((r) => r.data);
export const getDepositHistory = (wallet, limit = 20) =>
  api.get(`/deposits/${wallet}`, { params: { limit } }).then((r) => r.data);
export const getBalance = (wallet) =>
  api.get(`/balance/${wallet}`).then((r) => r.data);
export const getVipCatalog = () =>
  api.get(`/vip/catalog`).then((r) => r.data);
export const buyVip = (wallet, target_level) =>
  api.post(`/vip/buy`, { wallet, target_level }).then((r) => r.data);
export const getPackCatalog = () =>
  api.get(`/pack/catalog`).then((r) => r.data);
export const buyPack = (wallet, pack_id) =>
  api.post(`/pack/buy`, { wallet, pack_id }).then((r) => r.data);

// Withdrawals
export const requestWithdraw = (wallet, amount_ton, to_address) =>
  api.post(`/withdraw/request`, { wallet, amount_ton, to_address }).then((r) => r.data);
export const getWithdrawHistory = (wallet, limit = 30) =>
  api.get(`/withdrawals/${wallet}`, { params: { limit } }).then((r) => r.data);

// Admin (Telegram-id gated)
export const adminCheck = (admin_id) =>
  api.get(`/admin/check/${admin_id}`).then((r) => r.data);
export const adminListWithdrawals = (admin_id, status = "pending") =>
  api.get(`/admin/withdrawals`, { params: { admin_id, status } }).then((r) => r.data);
export const adminApproveWithdrawal = (wid, admin_id, tx_hash = "", note = "") =>
  api.post(`/admin/withdrawals/${wid}/approve`, { admin_id, tx_hash, note }).then((r) => r.data);
export const adminRejectWithdrawal = (wid, admin_id, note = "") =>
  api.post(`/admin/withdrawals/${wid}/reject`, { admin_id, note }).then((r) => r.data);

// Player reset
export const resetPlayerClass = (wallet) =>
  api.post(`/player/${wallet}/reset-class`).then((r) => r.data);

// Market
export const marketSell = (wallet, inv_index, sell_price) =>
  api.post(`/market/sell`, { wallet, inv_index, sell_price }).then((r) => r.data);

// Aliases used by legacy components
export const fetchPlayer = loadPlayer;
export const recordPurchase = (wallet, payload) =>
  api.post(`/player/${wallet}/purchase`, payload).then((r) => r.data);
