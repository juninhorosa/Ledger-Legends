import React, { useEffect, useState } from "react";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { Pause, Play, Sword } from "lucide-react";
import BattleArena from "./BattleArena";
import SkillsBar from "./SkillsBar";
import { hapticImpact } from "../../lib/telegram";

export default function CombatScreen() {
  const { t, lang } = useI18n();
  const state = useGame();
  const d = state.derived();

  useEffect(() => {
    if (!state.monster) state.initRun();
  }, []);

  const handleManualAttack = () => {
    state.attack();
    hapticImpact("light");
  };

  if (!state.monster) return null;
  const hpPct = (state.monsterHp / state.monster.hp) * 100;

  return (
    <div data-testid="combat-screen" className="game-panel p-6 flex flex-col gap-4 min-h-[560px]">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-400">{t("wave")}</div>
          <div className="font-heading text-3xl text-amber-300" data-testid="wave-counter">{state.wave}</div>
        </div>
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-slate-400">{t("dps")}</div>
          <div className="font-mono-num text-xl text-amber-200">{d.dps}</div>
        </div>
        <button
          data-testid="auto-attack-toggle"
          onClick={() => state.toggleAuto()}
          className="tab-pill flex items-center gap-1"
        >
          {state.autoAttack ? <Pause size={14} /> : <Play size={14} />}
          {state.autoAttack ? t("autoAttack") : t("autoAttackOff")}
        </button>
      </div>

      <BattleArena />

      {/* Monster HP bar */}
      <div className="space-y-1">
        <div className="flex justify-between font-heading text-amber-200">
          <span data-testid="monster-name">{state.monster.name[lang]}</span>
          <span className="font-mono-num text-sm">{state.monsterHp} / {state.monster.hp} HP</span>
        </div>
        <div className="bar-track h-4">
          <div className="bar-fill bar-fill-hp" style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      {/* Skills */}
      <SkillsBar />

      <div className="flex justify-end">
        <button
          data-testid="combat-attack-button"
          onClick={handleManualAttack}
          className="btn-epic flex items-center gap-2 text-sm"
        >
          <Sword size={16} /> {t("attack")}
        </button>
      </div>
    </div>
  );
}
