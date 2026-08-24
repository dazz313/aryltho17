import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

const TOKEN_KEY = "eracool_token";
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Terjadi kesalahan. Silakan coba lagi.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  if (detail && typeof detail.message === "string") return detail.message;
  return String(detail);
}

export function formatIDR(n, compact = false) {
  if (n == null || isNaN(n)) return "-";
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(2)} M`;
    if (abs >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1)} jt`;
    if (abs >= 1_000) return `Rp${(n / 1_000).toFixed(0)} rb`;
  }
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function formatValue(value, fmt) {
  if (fmt === "currency") return formatIDR(value);
  if (fmt === "percent") return `${value}%`;
  if (fmt === "number") return Number(value).toLocaleString("id-ID");
  return value;
}

export const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export async function fetchFileBlobUrl(fileId) {
  const res = await api.get(`/files/${fileId}/download`, { responseType: "blob" });
  return URL.createObjectURL(res.data);
}
