import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, timeout: 20000 });

// Players
export const savePlayer = (wallet, payload) =>
  api.post(`/player/${wallet}`, payload).then((r) => r.data);
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
