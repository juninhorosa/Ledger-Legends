import React, { useEffect } from "react";
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
    if (state.monsters.length === 0) state.initRun();
  }, []);

  const handleManualAttack = () => {
    state.attack();
    hapticImpact("light");
  };

  const aliveMonsters = state.monsters.filter((m) => m.hp > 0);
  const totalHp = state.monsters.reduce((a, m) => a + m.hp, 0);
  const totalMaxHp = state.monsters.reduce((a, m) => a + m.maxHp, 0);
  const hpPct = totalMaxHp > 0 ? (totalHp / totalMaxHp) * 100 : 0;
  const primary = state.monsters.find((m) => m.isBoss) || state.monsters[0];
  const headerName = primary ? primary.name[lang] : "";

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

      {/* Wave HP aggregate */}
      <div className="space-y-1">
        <div className="flex justify-between font-heading text-amber-200">
          <span data-testid="monster-name">
            {headerName}
            {aliveMonsters.length > 1 && (
              <span className="text-cyan-300 text-sm font-mono-num ml-2">+{aliveMonsters.length - 1}</span>
            )}
          </span>
          <span className="font-mono-num text-sm">{totalHp} / {totalMaxHp} HP</span>
        </div>
        <div className="bar-track h-4">
          <div className="bar-fill bar-fill-hp" style={{ width: `${hpPct}%` }} />
        </div>
      </div>

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
