import React, { useEffect, useRef, useState } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { X, Copy, Loader2, CheckCircle2, AlertCircle, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "../../i18n/I18nContext";
import { initDeposit, getDepositStatus, getBalance, getDepositHistory } from "../../lib/api";
import { buildCommentPayload, tonToNanoStr } from "../../lib/ton";

/**
 * DepositDialog — Lets a player deposit TON into the in-game treasury.
 * Flow:
 *  1) User chooses amount → backend creates deposit with unique `comment`
 *  2) User sends TonConnect transaction with that comment in the payload
 *  3) Frontend polls /api/deposit/status until status='confirmed'
 *  4) Backend poller validates the on-chain transaction independently
 */
export default function DepositDialog({ open, onClose, wallet }) {
  const { t } = useI18n();
  const [tonConnectUI] = useTonConnectUI();
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [deposit, setDeposit] = useState(null); // {deposit_id, treasury_address, comment, ...}
  const [status, setStatus] = useState(null);    // 'pending' | 'confirmed' | 'expired'
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState({ ton_balance: 0, vip_level: 0 });
  const pollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    refreshBalanceAndHistory();
    // cleanup polling on close
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wallet]);

  const refreshBalanceAndHistory = async () => {
    if (!wallet) return;
    try {
      const [bal, hist] = await Promise.all([getBalance(wallet), getDepositHistory(wallet, 5)]);
      setBalance(bal);
      setHistory(hist);
    } catch (e) {
      // silent
    }
  };

  const startPolling = (depositId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let ticks = 0;
    pollRef.current = setInterval(async () => {
      ticks += 1;
      try {
        const s = await getDepositStatus(depositId);
        setStatus(s.status);
        if (s.status === "confirmed") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          toast.success(t("depositConfirmed"));
          refreshBalanceAndHistory();
        } else if (s.status === "expired") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          toast.error(t("depositExpired"));
        }
      } catch (e) {
        // silent retry
      }
      // Stop after 30 min (1800s / 10s = 180 ticks)
      if (ticks > 180) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 10000);
  };

  const handleDeposit = async () => {
    const amt = Number(amount);
    if (!amt || amt < 0.05) {
      toast.error(t("minAmount"));
      return;
    }
    if (!wallet) {
      toast.error(t("connectWalletFirst"));
      return;
    }
    if (!tonConnectUI.account) {
      toast.error(t("connectWalletFirst"));
      return;
    }
    setBusy(true);
    try {
      // 1) Backend creates the deposit and returns a unique comment
      const dep = await initDeposit(wallet, amt);
      setDeposit(dep);
      setStatus("pending");

      // 2) Build BoC payload (TON text comment) and send via TonConnect
      const payload = buildCommentPayload(dep.comment);
      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: dep.treasury_address,
            amount: tonToNanoStr(amt),
            payload,
          },
        ],
      };
      try {
        await tonConnectUI.sendTransaction(tx);
        toast.success(t("txSent"));
        startPolling(dep.deposit_id);
      } catch (err) {
        toast.error(t("txRejected"));
        // keep deposit visible so user can still pay manually if they want
        startPolling(dep.deposit_id);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  };

  if (!open) return null;

  const fmtTon = (v) => Number(v || 0).toFixed(4);
  const shortAddr = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-6)}` : "—");

  return (
    <div
      data-testid="deposit-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="game-panel max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-lg border border-amber-700/40 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-amber-700/30 bg-gradient-to-r from-amber-900/30 to-transparent">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="text-cyan-400" size={20} />
            <h2 className="text-lg font-bold text-amber-200">{t("depositTitle")}</h2>
          </div>
          <button
            data-testid="deposit-close"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Current Balance */}
          <div className="flex items-center justify-between bg-slate-900/60 border border-cyan-700/30 rounded-md px-3 py-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide">
              {t("inGameBalance")}
            </span>
            <div className="flex items-center gap-3">
              <span
                data-testid="deposit-current-balance"
                className="text-cyan-400 font-mono-num font-semibold"
              >
                {fmtTon(balance.ton_balance)} TON
              </span>
              {balance.vip_level > 0 && (
                <span className="text-amber-300 text-xs">
                  {t("vipLevel")} {balance.vip_level}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400">{t("depositDesc")}</p>

          {/* Amount input */}
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 block mb-1">
              {t("amountTon")}
            </label>
            <div className="flex gap-2">
              <input
                data-testid="deposit-amount-input"
                type="number"
                step="0.01"
                min="0.05"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={busy || status === "pending"}
                className="flex-1 bg-slate-900/80 border border-amber-700/40 rounded px-3 py-2 text-amber-100 font-mono-num focus:outline-none focus:border-amber-500"
              />
              <button
                data-testid="deposit-init-button"
                onClick={handleDeposit}
                disabled={busy || status === "pending"}
                className="btn-ton flex items-center gap-1 disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={14} /> : <ArrowDownToLine size={14} />}
                {t("sendTransaction")}
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              {[0.5, 1, 5, 10].map((v) => (
                <button
                  key={v}
                  data-testid={`deposit-preset-${v}`}
                  onClick={() => setAmount(String(v))}
                  disabled={busy || status === "pending"}
                  className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-300 disabled:opacity-50"
                >
                  {v} TON
                </button>
              ))}
            </div>
          </div>

          {/* Active deposit info */}
          {deposit && (
            <div
              data-testid="deposit-active"
              className={`rounded-md border p-3 space-y-2 ${
                status === "confirmed"
                  ? "border-emerald-600/50 bg-emerald-900/20"
                  : status === "expired"
                  ? "border-red-600/40 bg-red-900/20"
                  : "border-amber-700/40 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center gap-2 text-sm">
                {status === "confirmed" ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-emerald-300">{t("depositConfirmed")}</span>
                  </>
                ) : status === "expired" ? (
                  <>
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-red-300">{t("depositExpired")}</span>
                  </>
                ) : (
                  <>
                    <Loader2 size={16} className="animate-spin text-amber-400" />
                    <span className="text-amber-300">{t("waitingConfirmation")}</span>
                  </>
                )}
              </div>

              <div className="space-y-1 text-xs">
                <Row label={t("amountTon")} value={`${fmtTon(deposit.amount_ton)} TON`} />
                <Row
                  label={t("treasuryAddress")}
                  value={shortAddr(deposit.treasury_address)}
                  onCopy={() => copy(deposit.treasury_address)}
                />
                <Row
                  label={t("comment")}
                  value={deposit.comment}
                  onCopy={() => copy(deposit.comment)}
                  warn={true}
                />
              </div>

              {status === "pending" && (
                <p className="text-[11px] text-amber-300/80 leading-tight">
                  ⚠ {t("comment")}: <span className="font-mono-num font-semibold">{deposit.comment}</span>
                </p>
              )}
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="border-t border-slate-700/40 pt-3">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-2">History</h3>
              <ul className="space-y-1 max-h-40 overflow-y-auto" data-testid="deposit-history">
                {history.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between text-xs bg-slate-900/40 border border-slate-700/40 rounded px-2 py-1"
                  >
                    <span className="font-mono-num text-slate-300">
                      {fmtTon(d.amount_ton)} TON
                    </span>
                    <span
                      className={
                        d.status === "confirmed"
                          ? "text-emerald-400"
                          : d.status === "expired"
                          ? "text-red-400"
                          : "text-amber-300"
                      }
                    >
                      {d.status}
                    </span>
                    <span className="text-slate-500 font-mono-num">
                      {new Date(d.created_at).toLocaleString()}
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

function Row({ label, value, onCopy, warn }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`font-mono-num ${warn ? "text-amber-300 font-semibold" : "text-slate-200"}`}>
          {value}
        </span>
        {onCopy && (
          <button onClick={onCopy} className="text-slate-400 hover:text-amber-300" title="Copy">
            <Copy size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
