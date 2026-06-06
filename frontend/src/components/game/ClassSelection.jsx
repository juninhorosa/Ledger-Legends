import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sword, Shield, Sparkles } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import { useGame } from "../../store/gameStore";
import { api } from "../../lib/api";
import { PixelHero } from "./PixelSprites";

/**
 * ClassSelection — full-screen modal shown when a player has no `class_id` yet.
 * Lists 3 WoW-themed classes (Warrior / Paladin / Mage) with pixel-art preview
 * and stat bonuses. One-time choice persisted on the backend.
 */
const CLASS_ICONS = {
  warrior: Sword,
  paladin: Shield,
  mage: Sparkles,
};

const CLASS_BORDER = {
  warrior: "border-red-600/70",
  paladin: "border-amber-400/80",
  mage: "border-violet-500/70",
};

const CLASS_GLOW = {
  warrior: "shadow-[0_0_30px_rgba(192,57,43,0.45)]",
  paladin: "shadow-[0_0_30px_rgba(245,209,66,0.45)]",
  mage: "shadow-[0_0_30px_rgba(90,209,232,0.45)]",
};

export default function ClassSelection({ onPicked }) {
  const { t, lang } = useI18n();
  const wallet = useGame((s) => s.wallet);
  const setClassId = useGame((s) => s.setClassId);
  const [classes, setClasses] = useState([]);
  const [hover, setHover] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get("/classes");
        if (!cancelled) setClasses(r.data.items || []);
      } catch (_) {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePick = async (cls) => {
    if (!wallet) {
      toast.error(t("connectWalletFirst"));
      return;
    }
    setBusy(cls.id);
    try {
      const r = await api.post(`/player/${wallet}/class`, { class_id: cls.id });
      setClassId(r.data.class_id);
      // Update local stats from server response
      useGame.setState({ stats: r.data.stats });
      toast.success(t("classChosen"));
      onPicked?.(cls.id);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message || "Error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      data-testid="class-selection"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <div className="game-panel max-w-4xl w-full rounded-lg border-2 border-amber-700/50 shadow-2xl p-6">
        <div className="text-center mb-6">
          <h2 className="font-heading text-3xl text-amber-300 tracking-wider mb-1">
            {t("chooseClassTitle")}
          </h2>
          <p className="text-sm text-slate-400">{t("chooseClassSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {classes.map((cls) => {
            const Icon = CLASS_ICONS[cls.id] || Sword;
            const isHover = hover === cls.id;
            const isBusy = busy === cls.id;
            return (
              <div
                key={cls.id}
                data-testid={`class-card-${cls.id}`}
                onMouseEnter={() => setHover(cls.id)}
                onMouseLeave={() => setHover(null)}
                className={`relative rounded-lg border-2 ${CLASS_BORDER[cls.id]} bg-slate-900/70 p-4 flex flex-col items-center gap-3 transition-transform ${isHover ? `scale-[1.03] ${CLASS_GLOW[cls.id]}` : ""}`}
              >
                <div className="flex items-center gap-2 text-amber-100 font-heading text-xl">
                  <Icon size={18} style={{ color: cls.color }} />
                  {cls.name?.[lang] || cls.name?.en}
                </div>

                {/* Sprite preview */}
                <div
                  className="w-32 h-32 flex items-center justify-center rounded-md border border-slate-700/60 bg-slate-950/80"
                  style={{ boxShadow: `inset 0 0 30px ${cls.color}33` }}
                >
                  <PixelHero
                    size={120}
                    klass={cls.id}
                    facing="right"
                    state={isHover ? "attack" : "idle"}
                    frame={0}
                  />
                </div>

                <p className="text-xs text-slate-300 text-center leading-snug min-h-[36px]">
                  {cls.tagline?.[lang] || cls.tagline?.en}
                </p>

                {/* Base stats */}
                <div className="grid grid-cols-2 gap-1 w-full text-[10px] font-mono-num">
                  <Stat label="STR" value={cls.base_stats?.strength} />
                  <Stat label="AGI" value={cls.base_stats?.agility} />
                  <Stat label="INT" value={cls.base_stats?.intellect} />
                  <Stat label="STA" value={cls.base_stats?.stamina} />
                </div>

                {/* Bonuses chips */}
                <div className="flex flex-wrap gap-1 justify-center">
                  {Object.entries(cls.bonuses || {}).map(([k, v]) =>
                    v ? (
                      <span
                        key={k}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700/60 text-slate-200"
                      >
                        +{v}% {labelFor(k, t)}
                      </span>
                    ) : null
                  )}
                </div>

                <button
                  data-testid={`class-pick-${cls.id}`}
                  onClick={() => handlePick(cls)}
                  disabled={isBusy}
                  className="btn-ton w-full flex items-center justify-center gap-1 mt-2 disabled:opacity-50"
                  style={{ borderColor: cls.color }}
                >
                  {isBusy ? <Loader2 className="animate-spin" size={14} /> : <Icon size={14} />}
                  {t("chooseThis")}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-amber-400/70 mt-4">
          ⚠ {t("chooseClassWarn")}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/40">
      <span className="text-slate-400">{label}</span>
      <span className="text-amber-200">{value}</span>
    </div>
  );
}

function labelFor(key, t) {
  const map = {
    damage_pct: t("damageBoost"),
    hp_pct: "HP",
    gold_pct: t("goldBoost"),
    crit_pct: "CRIT",
    cooldown_pct: "CD",
    defense_pct: "DEF",
  };
  return map[key] || key;
}
