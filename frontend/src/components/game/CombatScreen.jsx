import React, { useEffect, useRef, useState } from "react";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { MONSTER_SPRITES } from "../../game/items";
import { Sword, Pause, Play, Skull } from "lucide-react";

export default function CombatScreen() {
  const { t, lang } = useI18n();
  const state = useGame();
  const [hitFx, setHitFx] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!state.monster) state.initRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-attack loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (state.autoAttack) {
      const aspd = state.derived().aspd;
      const period = Math.max(250, Math.floor(1000 / aspd));
      intervalRef.current = setInterval(() => {
        useGame.getState().attack();
        setHitFx(true);
        setTimeout(() => setHitFx(false), 250);
      }, period);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [state.autoAttack, state.derived().aspd]);

  const handleAttack = () => {
    state.attack();
    setHitFx(true);
    setTimeout(() => setHitFx(false), 250);
  };

  if (!state.monster) return null;
  const sprite = MONSTER_SPRITES[state.monster.sprite] || MONSTER_SPRITES.orc;
  const hpPct = (state.monsterHp / state.monster.hp) * 100;
  const d = state.derived();

  return (
    <div data-testid="combat-screen" className="game-panel p-6 flex flex-col gap-4 min-h-[500px]">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-400">{t("wave")}</div>
          <div className="font-heading text-3xl text-amber-300" data-testid="wave-counter">{state.wave}</div>
        </div>
        {state.monster.isBoss && (
          <div className="px-4 py-1 rounded font-heading text-red-300 border border-red-500 bg-red-950/40 tracking-widest text-sm animate-pulse" data-testid="boss-indicator">
            <Skull className="inline" size={14} /> {t("bossWave")}
          </div>
        )}
        <button
          data-testid="auto-attack-toggle"
          onClick={() => state.toggleAuto()}
          className="tab-pill flex items-center gap-1"
        >
          {state.autoAttack ? <Pause size={14} /> : <Play size={14} />}
          {state.autoAttack ? t("autoAttack") : t("autoAttackOff")}
        </button>
      </div>

      {/* Monster Arena */}
      <div className="relative flex-1 flex items-center justify-center bg-black/40 border-2 border-slate-700 rounded-md overflow-hidden min-h-[300px]"
        style={{ backgroundImage: "radial-gradient(ellipse at center, rgba(217,119,6,0.15), transparent 70%)" }}>
        <div className={`relative ${hitFx ? "monster-hit" : "monster-float"}`}>
          <img
            src={sprite}
            alt={state.monster.name[lang]}
            className="w-56 h-56 object-cover rounded-full border-4 border-amber-700 shadow-[0_0_40px_rgba(217,119,6,0.6)]"
            data-testid="monster-sprite"
          />
        </div>

        {/* Floating damage numbers */}
        {state.damageNumbers.map((dn) => (
          <span
            key={dn.id}
            className={`damage-number ${dn.crit ? "crit" : ""}`}
            style={{ left: `${dn.x}%`, top: `${dn.y}%` }}
          >
            {dn.crit ? "CRIT! " : ""}{dn.value}
          </span>
        ))}
      </div>

      {/* Monster info */}
      <div className="space-y-1">
        <div className="flex justify-between font-heading text-amber-200">
          <span data-testid="monster-name">{state.monster.name[lang]}</span>
          <span className="font-mono-num text-sm">{state.monsterHp} / {state.monster.hp} HP</span>
        </div>
        <div className="bar-track h-4">
          <div className="bar-fill bar-fill-hp" style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      <div className="flex justify-between items-center gap-2">
        <div className="text-xs text-slate-400 font-mono-num">
          {t("dps")}: <span className="text-amber-200">{d.dps}</span>
        </div>
        <button
          data-testid="combat-attack-button"
          onClick={handleAttack}
          className="btn-epic flex items-center gap-2 text-base"
        >
          <Sword size={18} /> {t("attack")}
        </button>
      </div>
    </div>
  );
}
