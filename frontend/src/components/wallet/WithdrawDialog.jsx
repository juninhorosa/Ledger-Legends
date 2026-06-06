import React, { useEffect, useState } from "react";
import { X, Loader2, ArrowUpFromLine, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "../../i18n/I18nContext";
import { requestWithdraw, getWithdrawHistory, getBalance } from "../../lib/api";

export default function WithdrawDialog({ open, onClose, wallet }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState("1");
  const [toAddress, setToAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState({ ton_balance: 0 });

  const refresh = async () => {
    if (!wallet) return;
    try {
      const [b, h] = await Promise.all([getBalance(wallet), getWithdrawHistory(wallet, 10)]);
      setBalance(b);
      setHistory(h);
    } catch (_) {
      /* silent */
    }
  };

  useEffect(() => {
    if (!open || !wallet) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [b, h] = await Promise.all([getBalance(wallet), getWithdrawHistory(wallet, 10)]);
        if (!cancelled) {
          setBalance(b);
          setHistory(h);
        }
      } catch (_) {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, wallet]);

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt < 0.1) {
      toast.error(t("minWithdraw"));
      return;
    }
    if (!toAddress || toAddress.length < 10) {
      toast.error(t("invalidAddress"));
      return;
    }
    if (amt > balance.ton_balance + 1e-9) {
      toast.error(t("notEnoughTon"));
      return;
    }
    setBusy(true);
    try {
      await requestWithdraw(wallet, amt, toAddress.trim());
      toast.success(t("withdrawRequested"));
      setAmount("1");
      setToAddress("");
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  const fmtTon = (v) => Number(v || 0).toFixed(4);

  return (
    <div
      data-testid="withdraw-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="game-panel max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-lg border border-rose-700/40 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-rose-700/30 bg-gradient-to-r from-rose-900/30 to-transparent">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="text-rose-300" size={20} />
            <h2 className="text-lg font-bold text-rose-200">{t("withdrawTitle")}</h2>
          </div>
          <button data-testid="withdraw-close" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 border border-cyan-700/30 rounded-md px-3 py-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide">{t("inGameBalance")}</span>
            <span data-testid="withdraw-balance" className="text-cyan-400 font-mono-num font-semibold">
              {fmtTon(balance.ton_balance)} TON
            </span>
          </div>

          <p className="text-xs text-amber-300/80 leading-snug">⚠ {t("withdrawDesc")}</p>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1">
              {t("amountTon")}
            </label>
            <input
              data-testid="withdraw-amount-input"
              type="number"
              step="0.01"
              min="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              className="w-full bg-slate-900/80 border border-rose-700/40 rounded px-3 py-2 text-rose-100 font-mono-num focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1">
              {t("destinationAddress")}
            </label>
            <input
              data-testid="withdraw-to-address"
              type="text"
              placeholder="UQ... / EQ..."
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              disabled={busy}
              className="w-full bg-slate-900/80 border border-rose-700/40 rounded px-3 py-2 text-rose-100 font-mono-num text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            data-testid="withdraw-submit"
            onClick={handleSubmit}
            disabled={busy}
            className="btn-ton w-full flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={14} /> : <ArrowUpFromLine size={14} />}
            {t("requestWithdraw")}
          </button>

          {history.length > 0 && (
            <div className="border-t border-slate-700/40 pt-3">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">{t("history")}</h3>
              <ul className="space-y-1 max-h-44 overflow-y-auto" data-testid="withdraw-history">
                {history.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-2 text-xs bg-slate-900/40 border border-slate-700/40 rounded px-2 py-1"
                  >
                    <span className="font-mono-num text-slate-300">{fmtTon(w.amount_ton)} TON</span>
                    <span
                      className={`flex items-center gap-1 ${
                        w.status === "approved"
                          ? "text-emerald-400"
                          : w.status === "rejected"
                          ? "text-red-400"
                          : "text-amber-300"
                      }`}
                    >
                      {w.status === "approved" ? <CheckCircle2 size={10} /> : w.status === "rejected" ? <XCircle size={10} /> : <Clock size={10} />}
                      {w.status}
                    </span>
                    <span className="text-slate-500 font-mono-num">
                      {new Date(w.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
