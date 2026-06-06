import React from "react";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { TALENTS } from "../../game/items";
import { Sword, Wind, BookOpen, Star } from "lucide-react";

const BRANCH_ICON = { strength: Sword, agility: Wind, intellect: BookOpen };
const BRANCH_COLOR = { strength: "text-red-400", agility: "text-emerald-400", intellect: "text-violet-400" };

export default function TalentTree() {
  const { t, lang } = useI18n();
  const state = useGame();

  const branches = ["strength", "agility", "intellect"];
  const talentsByBranch = {};
  branches.forEach((b) => {
    talentsByBranch[b] = Object.values(TALENTS).filter((tn) => tn.branch === b).sort((a, c) => a.row - c.row);
  });

  return (
    <div data-testid="talent-tree" className="game-panel p-5 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="panel-title text-lg">{t("talents")}</h2>
        <div className="text-xs text-amber-300 font-mono-num" data-testid="talent-points">
          {t("talentPoints")}: <span className="text-amber-200 font-bold">{state.talentPoints}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {branches.map((b) => {
          const Icon = BRANCH_ICON[b];
          return (
            <div key={b} className="flex flex-col items-center gap-3">
              <div className={`flex items-center gap-1 font-heading text-sm ${BRANCH_COLOR[b]}`}>
                <Icon size={14} /> {t(b)}
              </div>
              {talentsByBranch[b].map((tn) => {
                const current = state.talents[tn.id] || 0;
                const reqMet = !tn.requires || (state.talents[tn.requires] || 0) >= 1;
                const maxed = current >= tn.max;
                const canLearn = reqMet && !maxed && state.talentPoints > 0;
                return (
                  <button
                    key={tn.id}
                    data-testid={`talent-${tn.id}`}
                    onClick={() => canLearn && state.learnTalent(tn.id)}
                    disabled={!canLearn}
                    className={`talent-node ${current > 0 ? "unlocked" : ""} ${maxed ? "maxed" : ""} ${!reqMet ? "opacity-40" : ""}`}
                    title={`${tn.name[lang]} (${current}/${tn.max}) — ${tn.desc[lang]}`}
                  >
                    <Star size={20} className={current > 0 ? "text-amber-200" : "text-slate-500"} />
                    <span className="absolute -bottom-1 -right-1 bg-black border border-amber-600 rounded-full text-[10px] px-1 font-mono-num text-amber-200">
                      {current}/{tn.max}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-slate-400 leading-relaxed border-t border-slate-700 pt-3">
        {Object.values(TALENTS).map((tn) => {
          const cur = state.talents[tn.id] || 0;
          if (cur === 0) return null;
          return (
            <div key={tn.id}>
              <span className="text-amber-300 font-heading">{tn.name[lang]}</span> — {tn.desc[lang]} ({cur}/{tn.max})
            </div>
          );
        })}
      </div>
    </div>
  );
}
