import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { useGame } from "../../store/gameStore";
import {
  getPackCatalog,
  buyPack,
  getVipCatalog,
  buyVip,
  getBalance,
} from "../../lib/api";
import { toast } from "sonner";
import {
  Gift,
  Crown,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Wallet,
} from "lucide-react";

/**
 * EconomyShop — In-game store for TON-funded purchases:
 *   • Starter Pack & XP Pack
 *   • VIP Levels 1..30 (incremental, cumulative benefits)
 *
 * Uses internal `ton_balance` debited server-side — wallet must deposit first.
 */
export default function EconomyShop() {
  const { t, lang } = useI18n();
  const wallet = useGame((s) => s.wallet);
  const setEconomyBuffs = useGame((s) => s.setEconomyBuffs);
  const [tab, setTab] = useState("packs");
  const [packs, setPacks] = useState([]);
  const [vipCatalog, setVipCatalog] = useState([]);
  const [balance, setBalance] = useState({
    ton_balance: 0,
    vip_level: 0,
    xp_pack_active: false,
    xp_pack_expires_at: null,
    start_pack_purchased: false,
  });
  const [busy, setBusy] = useState(null);
  const [targetVipLevel, setTargetVipLevel] = useState(null);

  const refreshBalance = async () => {
    if (!wallet) return;
    try {
      const b = await getBalance(wallet);
      setBalance(b);
      setEconomyBuffs(b);
    } catch (_) {
      /* silent */
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, v] = await Promise.all([getPackCatalog(), getVipCatalog()]);
        if (!cancelled) {
          setPacks(p.items || []);
          setVipCatalog(v.items || []);
        }
      } catch (_) {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (!wallet) return;
      try {
        const b = await getBalance(wallet);
        if (!cancelled) {
          setBalance(b);
          setEconomyBuffs(b);
        }
      } catch (_) {
        /* silent */
      }
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [wallet, setEconomyBuffs]);

  const onBuyPack = async (pack) => {
    if (!wallet) {
      toast.error(t("connectWalletFirst"));
      return;
    }
    if (balance.ton_balance < pack.price_ton - 1e-9) {
      toast.error(t("needDeposit"));
      return;
    }
    if (pack.one_time && balance.start_pack_purchased && pack.id === "start") {
      toast.error(t("purchased"));
      return;
    }
    const name = pack.name?.[lang] || pack.name?.en || pack.id;
    const ok = window.confirm(
      t("confirmBuyPack").replace("{name}", name).replace("{p}", pack.price_ton)
    );
    if (!ok) return;
    setBusy(`pack:${pack.id}`);
    try {
      const res = await buyPack(wallet, pack.id);
      toast.success(t("packBought"));
      // Hydrate local game state with newly added gold/item (re-fetch player from store)
      if (res.gold != null) {
        useGame.setState({
          gold: res.gold,
          inventory: res.inventory || useGame.getState().inventory,
        });
      }
      refreshBalance();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message || "Error");
    } finally {
      setBusy(null);
    }
  };

  const onBuyVip = async (level) => {
    if (!wallet) {
      toast.error(t("connectWalletFirst"));
      return;
    }
    const totalCost = vipCatalog
      .filter((v) => v.level > balance.vip_level && v.level <= level)
      .reduce((a, b) => a + b.price_ton, 0);
    if (balance.ton_balance < totalCost - 1e-9) {
      toast.error(t("needDeposit"));
      return;
    }
    const ok = window.confirm(
      t("confirmBuyVip").replace("{n}", level).replace("{p}", totalCost.toFixed(2))
    );
    if (!ok) return;
    setBusy(`vip:${level}`);
    try {
      await buyVip(wallet, level);
      toast.success(t("vipUpgraded"));
      setTargetVipLevel(null);
      refreshBalance();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message || "Error");
    } finally {
      setBusy(null);
    }
  };

  const xpPackActiveText = useMemo(() => {
    if (!balance.xp_pack_active || !balance.xp_pack_expires_at) return null;
    try {
      const d = new Date(balance.xp_pack_expires_at);
      return d.toLocaleString();
    } catch {
      return balance.xp_pack_expires_at;
    }
  }, [balance.xp_pack_active, balance.xp_pack_expires_at]);

  return (
    <div data-testid="economy-shop" className="game-panel p-4 flex flex-col gap-3">
      <h2 className="panel-title text-lg flex items-center gap-2">
        <Sparkles size={16} className="text-amber-400" /> {t("economy")}
      </h2>

      {/* Balance header */}
      <div className="flex items-center justify-between bg-slate-900/70 border border-cyan-700/30 rounded px-3 py-2 text-xs">
        <span className="flex items-center gap-1 text-cyan-300">
          <Wallet size={12} /> {t("inGameBalance")}
        </span>
        <span
          data-testid="economy-balance"
          className="font-mono-num text-amber-200 font-semibold"
        >
          {Number(balance.ton_balance || 0).toFixed(4)} TON
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          data-testid="economy-tab-packs"
          onClick={() => setTab("packs")}
          className={`tab-pill flex items-center gap-1 text-xs ${
            tab === "packs" ? "active" : ""
          }`}
        >
          <Gift size={12} /> {t("packs")}
        </button>
        <button
          data-testid="economy-tab-vip"
          onClick={() => setTab("vip")}
          className={`tab-pill flex items-center gap-1 text-xs ${
            tab === "vip" ? "active" : ""
          }`}
        >
          <Crown size={12} /> {t("vipShop")}
        </button>
      </div>

      {tab === "packs" && (
        <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
          {packs.map((p) => {
            const isStart = p.id === "start";
            const owned = isStart && balance.start_pack_purchased;
            const name = p.name?.[lang] || p.name?.en || p.id;
            const desc = p.description?.[lang] || p.description?.en || "";
            return (
              <div
                key={p.id}
                data-testid={`pack-card-${p.id}`}
                className={`item-slot p-3 ${
                  isStart ? "rarity-epic" : "rarity-rare"
                } space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-heading text-base ${
                      isStart ? "text-rarity-epic" : "text-rarity-rare"
                    }`}
                  >
                    {name}
                  </span>
                  <span className="text-cyan-400 font-mono-num font-semibold text-sm">
                    {p.price_ton} TON
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-snug">{desc}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-wider">
                  {isStart ? (
                    <>
                      <span className="px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/40 text-amber-300">
                        {t("oneTimeOnly")}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-700/40 text-emerald-300">
                        +5000 {t("gold")}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-900/40 border border-purple-700/40 text-purple-300">
                        {t("rareItem")}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-900/40 border border-cyan-700/40 text-cyan-300">
                        XP {t("hours24")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-900/40 border border-cyan-700/40 text-cyan-300">
                        2× XP · {t("days7")}
                      </span>
                      {balance.xp_pack_active && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 flex items-center gap-1">
                          <Clock size={10} /> {t("active")}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {!isStart && balance.xp_pack_active && xpPackActiveText && (
                  <p className="text-[10px] text-slate-400">
                    {t("expires")}: <span className="font-mono-num">{xpPackActiveText}</span>
                  </p>
                )}

                <button
                  data-testid={`pack-buy-${p.id}`}
                  onClick={() => onBuyPack(p)}
                  disabled={owned || busy === `pack:${p.id}`}
                  className="btn-ton w-full flex items-center justify-center gap-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {busy === `pack:${p.id}` ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : owned ? (
                    <>
                      <CheckCircle2 size={12} /> {t("purchased")}
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={12} /> {t("buyPack")} · {p.price_ton} TON
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "vip" && (
        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between bg-slate-900/70 border border-amber-700/30 rounded px-3 py-2 text-xs">
            <span className="text-slate-400">{t("currentVip")}</span>
            <span
              data-testid="current-vip-level"
              className="font-mono-num text-amber-300 font-semibold"
            >
              Lv {balance.vip_level || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">{t("vipCumulative")}</p>
          {vipCatalog.length === 0 && (
            <div className="text-xs text-slate-500 italic">Loading...</div>
          )}
          {vipCatalog.map((v) => {
            const owned = v.level <= (balance.vip_level || 0);
            const isNext = v.level === (balance.vip_level || 0) + 1;
            return (
              <div
                key={v.level}
                data-testid={`vip-row-${v.level}`}
                className={`flex items-center justify-between gap-2 rounded border px-3 py-2 text-xs ${
                  owned
                    ? "border-emerald-700/50 bg-emerald-900/15"
                    : isNext
                    ? "border-amber-600/60 bg-amber-900/20"
                    : "border-slate-700/50 bg-slate-900/40"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Crown
                    size={14}
                    className={
                      v.benefits.badge === "gold"
                        ? "text-amber-300"
                        : v.benefits.badge === "silver"
                        ? "text-slate-300"
                        : "text-orange-400"
                    }
                  />
                  <span className="font-mono-num font-semibold text-amber-100 w-12">
                    Lv {v.level}
                  </span>
                  <div className="flex flex-wrap gap-1 min-w-0">
                    <span className="text-cyan-300">+{v.benefits.xp_gain_bonus_pct}% XP</span>
                    <span className="text-amber-300">+{v.benefits.gold_drop_bonus_pct}% {t("gold")}</span>
                    <span className="text-red-300">+{v.benefits.damage_bonus_pct}% DMG</span>
                    <span className="text-emerald-300">{v.benefits.market_tax_pct}% tax</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono-num text-amber-200">{v.price_ton} TON</span>
                  {owned ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : (
                    <button
                      data-testid={`vip-buy-${v.level}`}
                      onClick={() => onBuyVip(v.level)}
                      disabled={busy === `vip:${v.level}`}
                      className="btn-ton text-[10px] px-2 py-1 disabled:opacity-40"
                    >
                      {busy === `vip:${v.level}` ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        t("upgradeTo").replace("{n}", v.level)
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
