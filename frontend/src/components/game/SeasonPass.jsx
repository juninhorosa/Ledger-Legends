import React from "react";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { SEASON_TIERS, ITEMS } from "../../game/items";
import { Gift, Lock, Check, Coins } from "lucide-react";

export default function SeasonPass() {
  const { t, lang } = useI18n();
  const state = useGame();

  // Determine current tier reached
  let currentTier = 0;
  let xpAccumulated = 0;
  for (const tier of SEASON_TIERS) {
    xpAccumulated += tier.xp_required;
    if (state.seasonXp >= xpAccumulated) currentTier = tier.tier;
    else break;
  }

  // Progress toward next tier
  const nextTier = SEASON_TIERS[currentTier];
  const prevAccum = SEASON_TIERS.slice(0, currentTier).reduce((a, b) => a + b.xp_required, 0);
  const progressInTier = state.seasonXp - prevAccum;
  const tierTotal = nextTier ? nextTier.xp_required : 1;
  const pct = nextTier ? Math.min(100, (progressInTier / tierTotal) * 100) : 100;

  return (
    <div data-testid="season-pass" className="game-panel p-5 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h2 className="panel-title text-lg">{t("seasonPass")}</h2>
        <div className="text-xs text-cyan-300 font-mono-num" data-testid="season-xp">
          {state.seasonXp} XP
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">{t("tier")} {currentTier}</span>
          <span className="text-slate-400 font-mono-num">{nextTier ? `${progressInTier}/${tierTotal}` : "MAX"}</span>
        </div>
        <div className="bar-track"><div className="bar-fill bar-fill-season" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
        {SEASON_TIERS.map((tier) => {
          const unlocked = currentTier >= tier.tier;
          const claimed = state.seasonClaimed.includes(tier.tier);
          const isItem = tier.reward.type === "item";
          const itemDef = isItem ? ITEMS[tier.reward.value] : null;
          return (
            <div
              key={tier.tier}
              className={`item-slot p-2 ${unlocked ? (claimed ? "rarity-uncommon" : "rarity-legendary") : ""}`}
              data-testid={`season-tier-${tier.tier}`}
            >
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-heading">T{tier.tier}</span>
                {claimed ? <Check size={12} className="text-emerald-400" /> : unlocked ? <Gift size={12} className="text-amber-300" /> : <Lock size={12} className="text-slate-600" />}
              </div>
              <div className="text-[10px] mt-1 text-slate-400 truncate">
                {isItem ? (
                  <span className={`text-rarity-${itemDef?.rarity || "rare"}`}>{itemDef?.name[lang]}</span>
                ) : (
                  <span className="text-yellow-300 flex items-center gap-1"><Coins size={10} /> {tier.reward.value}</span>
                )}
              </div>
              <button
                data-testid={`season-claim-${tier.tier}`}
                disabled={!unlocked || claimed}
                onClick={() => state.claimSeasonTier(tier.tier, tier.reward)}
                className="mt-1 w-full text-[10px] py-0.5 rounded border border-amber-600 text-amber-200 disabled:opacity-30 hover:bg-amber-900/30"
              >
                {claimed ? t("claimed") : t("claim")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
