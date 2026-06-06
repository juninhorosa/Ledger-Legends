import React, { useState } from "react";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { ITEMS, rarityLabel } from "../../game/items";
import { Sword, Shield, HardHat, Footprints, Gem, Circle as CircleIcon, Coins } from "lucide-react";

const SLOT_ICONS = {
  weapon: Sword,
  helmet: HardHat,
  chest: Shield,
  boots: Footprints,
  ring: CircleIcon,
  amulet: Gem,
};

export default function InventoryPanel() {
  const { t, lang } = useI18n();
  const state = useGame();
  const [selected, setSelected] = useState(null);

  const slots = Array.from({ length: Math.max(24, state.inventory.length) });

  return (
    <div data-testid="inventory-panel" className="game-panel p-5 flex flex-col gap-3">
      <h2 className="panel-title text-lg">{t("inventory")}</h2>

      <div className="grid grid-cols-6 gap-2">
        {slots.map((_, i) => {
          const id = state.inventory[i];
          const item = id ? ITEMS[id] : null;
          const Icon = item ? SLOT_ICONS[item.slot] : null;
          return (
            <button
              key={i}
              data-testid={`inventory-slot-${i}`}
              onClick={() => item && setSelected(i)}
              className={`item-slot h-12 flex items-center justify-center ${item ? `rarity-${item.rarity}` : ""}`}
              title={item ? item.name[lang] : ""}
            >
              {Icon && <Icon size={20} className={`text-rarity-${item.rarity}`} />}
            </button>
          );
        })}
      </div>

      {selected !== null && state.inventory[selected] && (() => {
        const it = ITEMS[state.inventory[selected]];
        if (!it) return null;
        return (
          <div data-testid="inventory-detail" className={`game-panel p-3 mt-2 border-2 rarity-${it.rarity}`}>
            <div className={`font-heading text-rarity-${it.rarity}`}>{it.name[lang]}</div>
            <div className="text-xs text-slate-400 mb-2">{rarityLabel(it.rarity, lang)} · {t(it.slot)}</div>
            <div className="text-xs text-slate-300 font-mono-num space-y-0.5 mb-2">
              {Object.entries(it.stats).map(([k, v]) => (
                <div key={k}>+{v} {k.toUpperCase()}</div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                data-testid="inventory-equip-button"
                onClick={() => { state.equipItem(selected); setSelected(null); }}
                className="btn-epic text-xs py-1 px-3"
              >{t("equip")}</button>
              <button
                data-testid="inventory-sell-button"
                onClick={() => { state.sellItem(selected); setSelected(null); }}
                className="text-xs px-3 py-1 border border-amber-600 rounded text-amber-300 hover:bg-amber-900/30 flex items-center gap-1"
              >
                <Coins size={12} /> {t("sell")} ({it.sell})
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
