import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const fetchPlayer = (wallet) => api.get(`/player/${wallet}`).then((r) => r.data);
export const savePlayer = (wallet, payload) => api.post(`/player/${wallet}/save`, payload).then((r) => r.data);
export const recordPurchase = (wallet, payload) => api.post(`/player/${wallet}/purchase`, payload).then((r) => r.data);
export const fetchLeaderboard = () => api.get(`/leaderboard`).then((r) => r.data);
