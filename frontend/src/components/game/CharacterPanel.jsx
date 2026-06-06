import React from "react";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { ITEMS, ITEM_ICONS, rarityLabel } from "../../game/items";
import { Sword, Shield, HardHat, Footprints, Gem, Circle as CircleIcon, Heart, Swords, ShieldCheck, Sparkles } from "lucide-react";

const SLOT_ICONS = {
  weapon: Sword,
  helmet: HardHat,
  chest: Shield,
  boots: Footprints,
  ring: CircleIcon,
  amulet: Gem,
};

const SLOTS = ["weapon", "helmet", "chest", "boots", "ring", "amulet"];

export default function CharacterPanel() {
  const { t, lang } = useI18n();
  const state = useGame();
  const d = state.derived();
  const equipment = state.equipment;

  const playerAvatar = "https://images.unsplash.com/photo-1773216344064-e1231ff27d09?w=400&q=70";

  return (
    <div data-testid="character-panel" className="game-panel p-5 flex flex-col gap-4">
      <h2 className="panel-title text-lg">{t("character")}</h2>

      <div className="flex gap-4 items-center">
        <div className="w-20 h-20 rounded-md border-2 border-amber-600 overflow-hidden shadow-lg shadow-amber-900/40 shrink-0">
          <img src={playerAvatar} alt="hero" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="font-heading text-amber-300 text-lg" data-testid="hero-name">{state.name}</div>
          <div className="text-xs text-slate-400 font-mono-num">{t("level")} <span className="text-amber-200 text-sm" data-testid="hero-level">{state.level}</span></div>
          <div className="text-xs text-slate-400 font-mono-num">{t("gold")}: <span className="text-yellow-300" data-testid="hero-gold">{state.gold.toLocaleString()}</span></div>
        </div>
      </div>

      {/* XP bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{t("xp")}</span>
          <span className="font-mono-num">{state.xp} / {100 + (state.level - 1) * 80}</span>
        </div>
        <div className="bar-track"><div className="bar-fill bar-fill-xp" style={{ width: `${Math.min(100, (state.xp / (100 + (state.level - 1) * 80)) * 100)}%` }} /></div>
      </div>

      {/* Battle Meter */}
      <div>
        <div className="flex justify-between text-xs text-amber-300 font-heading mb-1">
          <span>{t("battleMeter")}</span>
          <span className="font-mono-num text-amber-200" data-testid="battle-meter-value">{d.bm.toLocaleString()}</span>
        </div>
        <div className="bar-track h-3"><div className="bar-fill bar-fill-bm" style={{ width: `${Math.min(100, Math.log10(d.bm + 1) * 14)}%` }} /></div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat icon={<Swords size={14} />} label={t("dps")} value={d.dps} />
        <Stat icon={<Heart size={14} />} label="HP" value={d.maxHp} />
        <Stat icon={<ShieldCheck size={14} />} label="DEF" value={d.defense} />
        <Stat icon={<Sparkles size={14} />} label={t("strength").slice(0, 3).toUpperCase()} value={d.totalStr} />
        <Stat label={t("agility").slice(0, 3).toUpperCase()} value={d.totalAgi} />
        <Stat label={t("intellect").slice(0, 3).toUpperCase()} value={d.totalInt} />
        <Stat label={t("stamina").slice(0, 3).toUpperCase()} value={d.totalSta} />
        <Stat label={`CRIT`} value={`${(d.critChance * 100).toFixed(0)}%`} />
      </div>

      {/* Equipment slots */}
      <div>
        <h3 className="panel-title text-sm mb-2">{t("equipment")}</h3>
        <div className="grid grid-cols-3 gap-2">
          {SLOTS.map((slot) => {
            const id = equipment[slot];
            const item = id ? ITEMS[id] : null;
            const Icon = SLOT_ICONS[slot];
            return (
              <button
                key={slot}
                data-testid={`equip-slot-${slot}`}
                onClick={() => item && state.unequipItem(slot)}
                className={`item-slot h-16 flex items-center justify-center ${item ? `rarity-${item.rarity}` : ""}`}
                title={item ? item.name[lang] + " — " + rarityLabel(item.rarity, lang) : t(slot)}
              >
                {item ? (
                  <Icon size={28} className={`text-rarity-${item.rarity}`} />
                ) : (
                  <Icon size={22} className="text-slate-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex justify-between items-center bg-black/40 border border-slate-700 rounded px-2 py-1">
      <span className="flex items-center gap-1 text-slate-400">{icon}{label}</span>
      <span className="font-mono-num text-amber-200">{value}</span>
    </div>
  );
}
