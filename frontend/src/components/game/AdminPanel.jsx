import React, { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "../../i18n/I18nContext";
import { useGame } from "../../store/gameStore";
import {
  adminListWithdrawals,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
} from "../../lib/api";

/**
 * AdminPanel — hidden tab visible only when `useGame` wallet starts with
 * `tg:<adminId>`. Lists pending withdrawals & lets the admin approve/reject.
 */
export default function AdminPanel() {
  const { t } = useI18n();
  const wallet = useGame((s) => s.wallet);
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);

  const adminId = wallet && wallet.startsWith("tg:") ? parseInt(wallet.slice(3), 10) : null;
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!adminId) return undefined;
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const data = await adminListWithdrawals(adminId, status);
        if (!cancelled) {
          setList(data || []);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setLoading(false);
          toast.error(e?.response?.data?.detail || "Failed to load");
        }
      }
    };
    fetchOnce();
    const id = setInterval(fetchOnce, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adminId, status, refreshKey]);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handleApprove = async (wid) => {
    const tx = window.prompt(t("enterTxHash"), "");
    if (tx === null) return; // cancelled
    setBusy(wid + ":approve");
    try {
      await adminApproveWithdrawal(wid, adminId, tx || "", "");
      toast.success(t("approved"));
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message || "Error");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (wid) => {
    const note = window.prompt(t("rejectReason"), "");
    if (note === null) return;
    setBusy(wid + ":reject");
    try {
      await adminRejectWithdrawal(wid, adminId, note || "");
      toast.success(t("rejected"));
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message || "Error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-testid="admin-panel" className="game-panel p-4 flex flex-col gap-3">
      <h2 className="panel-title text-lg flex items-center gap-2">
        <ShieldCheck size={16} className="text-rose-300" /> {t("adminPanel")}
      </h2>

      <div className="flex items-center gap-2">
        <select
          data-testid="admin-status-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 px-2 py-1"
        >
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="all">all</option>
        </select>
        <button
          data-testid="admin-refresh"
          onClick={refresh}
          className="tab-pill text-xs flex items-center gap-1"
        >
          {loading ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
          {t("refresh")}
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
        {list.length === 0 && (
          <div className="text-xs text-slate-500 italic py-4 text-center">
            {loading ? t("loading") : t("noWithdrawals")}
          </div>
        )}
        {list.map((w) => (
          <div
            key={w.id}
            data-testid={`admin-withdrawal-${w.id}`}
            className="rounded border border-slate-700/50 bg-slate-900/40 p-3 text-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-num text-amber-200 font-semibold">
                {Number(w.amount_ton).toFixed(4)} TON
              </span>
              <span
                className={
                  w.status === "approved"
                    ? "text-emerald-400"
                    : w.status === "rejected"
                    ? "text-red-400"
                    : "text-amber-300"
                }
              >
                {w.status}
              </span>
            </div>
            <div className="text-slate-400">
              <div>
                <span className="text-slate-500">wallet:</span>{" "}
                <span className="font-mono-num text-cyan-300">{w.wallet}</span>
              </div>
              <div className="break-all">
                <span className="text-slate-500">to:</span>{" "}
                <span className="font-mono-num text-slate-200">{w.to_address}</span>
              </div>
              <div>
                <span className="text-slate-500">id:</span>{" "}
                <span className="font-mono-num text-slate-300">{w.id}</span>
              </div>
              <div>
                <span className="text-slate-500">date:</span>{" "}
                <span className="font-mono-num">{new Date(w.created_at).toLocaleString()}</span>
              </div>
              {w.tx_hash && (
                <div className="break-all">
                  <span className="text-slate-500">tx:</span>{" "}
                  <span className="font-mono-num text-emerald-300">{w.tx_hash}</span>
                </div>
              )}
              {w.admin_note && (
                <div>
                  <span className="text-slate-500">note:</span>{" "}
                  <span className="text-rose-300">{w.admin_note}</span>
                </div>
              )}
            </div>
            {w.status === "pending" && (
              <div className="flex gap-2">
                <button
                  data-testid={`admin-approve-${w.id}`}
                  onClick={() => handleApprove(w.id)}
                  disabled={busy === w.id + ":approve"}
                  className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded border border-emerald-700/50 bg-emerald-900/30 text-emerald-200 hover:bg-emerald-900/50 disabled:opacity-50"
                >
                  {busy === w.id + ":approve" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  {t("approve")}
                </button>
                <button
                  data-testid={`admin-reject-${w.id}`}
                  onClick={() => handleReject(w.id)}
                  disabled={busy === w.id + ":reject"}
                  className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded border border-red-700/50 bg-red-900/30 text-red-200 hover:bg-red-900/50 disabled:opacity-50"
                >
                  {busy === w.id + ":reject" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <XCircle size={12} />
                  )}
                  {t("reject")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
