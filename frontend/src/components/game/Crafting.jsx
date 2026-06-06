import React from "react";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { RECIPES, ITEMS, MATERIAL_NAMES, rarityLabel } from "../../game/items";
import { Hammer, Coins } from "lucide-react";
import { toast } from "sonner";

export default function Crafting() {
  const { t, lang } = useI18n();
  const state = useGame();

  return (
    <div data-testid="crafting-panel" className="game-panel p-5 flex flex-col gap-3">
      <h2 className="panel-title text-lg">{t("crafting")}</h2>

      <div className="grid grid-cols-2 gap-2 mb-2">
        {Object.entries(state.materials).map(([k, v]) => (
          <div key={k} className="bg-black/40 border border-slate-700 rounded px-2 py-1 text-xs flex justify-between" data-testid={`material-${k}`}>
            <span className="text-slate-300">{MATERIAL_NAMES[k]?.[lang] || k}</span>
            <span className="font-mono-num text-amber-200">{v}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
        {RECIPES.map((r) => {
          const result = ITEMS[r.result];
          const canCraft = state.gold >= r.gold && Object.entries(r.materials).every(([m, q]) => (state.materials[m] || 0) >= q);
          return (
            <div key={r.id} className={`item-slot p-3 rounded rarity-${result.rarity}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className={`font-heading text-sm text-rarity-${result.rarity}`}>{result.name[lang]}</div>
                  <div className="text-[10px] text-slate-400">{rarityLabel(result.rarity, lang)}</div>
                  <div className="text-xs text-slate-300 mt-1 font-mono-num">
                    {Object.entries(r.materials).map(([m, q]) => (
                      <span key={m} className="mr-2">
                        <span className={(state.materials[m] || 0) >= q ? "text-emerald-300" : "text-red-400"}>
                          {q}
                        </span> {MATERIAL_NAMES[m]?.[lang] || m}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs mt-1 flex items-center gap-1 text-yellow-300 font-mono-num">
                    <Coins size={11} /> {r.gold}
                  </div>
                </div>
                <button
                  data-testid={`craft-${r.id}`}
                  disabled={!canCraft}
                  onClick={() => {
                    if (state.craftItem(r)) toast.success(`Crafted ${result.name[lang]}`);
                  }}
                  className="btn-epic text-xs py-1 px-2 flex items-center gap-1"
                >
                  <Hammer size={12} /> {t("craft")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
