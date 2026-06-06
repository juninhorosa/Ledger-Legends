import { create } from "zustand";
import { ITEMS, TALENTS, getMonsterForWave } from "../game/items";
import { SKILLS } from "../game/skills";
import { savePlayer } from "../lib/api";

const DEFAULT_STATE = {
  wallet: null,
  name: "Hero",
  level: 1,
  xp: 0,
  gold: 100,
  wave: 1,
  highestWave: 1,
  stats: { strength: 10, agility: 10, intellect: 10, stamina: 10 },
  equipment: { weapon: null, helmet: null, chest: null, boots: null, ring: null, amulet: null },
  inventory: [],
  materials: { ore: 2, leather: 1, rune: 0, dragonbone: 0 },
  talents: {},
  talentPoints: 0,
  seasonXp: 0,
  seasonClaimed: [],
  // runtime
  monster: null,
  monsterHp: 0,
  autoAttack: true,
  damageNumbers: [],
  saving: false,
  heroState: "idle", // idle | attack | hurt | victory | cast
  activeEffect: null, // { id, effect, ts }
  skillCooldowns: {}, // { skillId: timestampReady }
};

function xpToLevel(level) { return 100 + (level - 1) * 80; }

function computeDerived(state) {
  // Sum stats from equipment
  const eqStats = { dmg: 0, def: 0, str: 0, agi: 0, int: 0, sta: 0 };
  Object.values(state.equipment).forEach((id) => {
    if (!id) return;
    const it = ITEMS[id];
    if (!it) return;
    Object.entries(it.stats || {}).forEach(([k, v]) => { eqStats[k] = (eqStats[k] || 0) + v; });
  });
  const totalStr = state.stats.strength + (eqStats.str || 0);
  const totalAgi = state.stats.agility + (eqStats.agi || 0);
  const totalInt = state.stats.intellect + (eqStats.int || 0);
  const totalSta = state.stats.stamina + (eqStats.sta || 0);

  // Talent modifiers
  const t = state.talents || {};
  const dmgMult = 1 + (t.power_strike || 0) * 0.10;
  const hpMult = 1 + (t.iron_skin || 0) * 0.08;
  const critChance = (t.berserker || 0) * 0.05;
  const aspd = 1 + (t.swift_blade || 0) * 0.08;
  const dodge = (t.evasion || 0) * 0.04;
  const critDmg = 1.5 + (t.shadowstep || 0) * 0.15;
  const goldMult = 1 + (t.arcane_mind || 0) * 0.12;
  const xpMult = 1 + (t.scholar || 0) * 0.15;
  const lootMult = 1 + (t.rune_master || 0) * 0.10;

  const baseDamage = Math.floor((5 + totalStr * 1.2 + (eqStats.dmg || 0)) * dmgMult);
  const dps = +(baseDamage * aspd).toFixed(1);
  const maxHp = Math.floor((50 + totalSta * 8 + state.level * 12) * hpMult);
  const defense = (eqStats.def || 0) + Math.floor(totalSta * 0.4);

  // Battle Meter aggregates everything
  const bm = Math.floor(
    baseDamage * 8 +
    maxHp * 1.2 +
    defense * 4 +
    (totalStr + totalAgi + totalInt + totalSta) * 5 +
    Object.values(state.talents || {}).reduce((a, b) => a + b, 0) * 30 +
    state.level * 50
  );

  return { baseDamage, dps, maxHp, defense, totalStr, totalAgi, totalInt, totalSta, critChance, aspd, dodge, critDmg, goldMult, xpMult, lootMult, bm };
}

export const useGame = create((set, get) => ({
  ...DEFAULT_STATE,

  derived: () => computeDerived(get()),

  setWallet: (wallet) => set({ wallet }),

  hydrateFromServer: (data) => {
    const monster = getMonsterForWave(data.wave || 1);
    set({
      wallet: data.wallet,
      name: data.name || "Hero",
      level: data.level || 1,
      xp: data.xp || 0,
      gold: data.gold ?? 100,
      wave: data.wave || 1,
      highestWave: data.highest_wave || 1,
      stats: data.stats || DEFAULT_STATE.stats,
      equipment: data.equipment || DEFAULT_STATE.equipment,
      inventory: data.inventory || [],
      materials: { ...DEFAULT_STATE.materials, ...(data.materials || {}) },
      talents: data.talents || {},
      talentPoints: data.talent_points || 0,
      seasonXp: data.season_xp || 0,
      seasonClaimed: data.season_claimed || [],
      monster,
      monsterHp: monster.hp,
    });
  },

  initRun: () => {
    const m = getMonsterForWave(get().wave);
    set({ monster: m, monsterHp: m.hp });
  },

  toggleAuto: () => set((s) => ({ autoAttack: !s.autoAttack })),

  attack: () => {
    const s = get();
    if (!s.monster) {
      const m = getMonsterForWave(s.wave);
      set({ monster: m, monsterHp: m.hp });
      return;
    }
    const d = computeDerived(s);
    let dmg = d.baseDamage;
    const isCrit = Math.random() < d.critChance;
    if (isCrit) dmg = Math.floor(dmg * d.critDmg);
    const newHp = Math.max(0, s.monsterHp - dmg);

    const dn = { id: Date.now() + Math.random(), value: dmg, crit: isCrit, x: 40 + Math.random() * 20, y: 30 };
    set({ monsterHp: newHp, damageNumbers: [...s.damageNumbers, dn], heroState: "attack" });
    setTimeout(() => set((st) => ({ heroState: st.heroState === "attack" ? "idle" : st.heroState })), 250);
    setTimeout(() => {
      set((st) => ({ damageNumbers: st.damageNumbers.filter((x) => x.id !== dn.id) }));
    }, 900);

    if (newHp <= 0) {
      get().onMonsterDefeated();
    }
  },

  castSkill: (skillId) => {
    const s = get();
    const sk = SKILLS[skillId];
    if (!sk) return;
    const now = Date.now();
    if ((s.skillCooldowns[skillId] || 0) > now) return;
    if (!s.monster) return;

    const d = computeDerived(s);
    let dmg = 0;
    if (sk.type === "damage") {
      dmg = Math.floor(d.baseDamage * (sk.multiplier || 1));
      const isCrit = Math.random() < d.critChance;
      if (isCrit) dmg = Math.floor(dmg * d.critDmg);
      const newHp = Math.max(0, s.monsterHp - dmg);
      const dn = { id: Date.now() + Math.random(), value: dmg, crit: true, x: 45 + Math.random() * 10, y: 30 };
      set({
        monsterHp: newHp,
        damageNumbers: [...s.damageNumbers, dn],
        heroState: "cast",
        activeEffect: { id: Date.now(), effect: sk.effect },
        skillCooldowns: { ...s.skillCooldowns, [skillId]: now + sk.cooldown },
      });
      setTimeout(() => set((st) => ({ heroState: st.heroState === "cast" ? "idle" : st.heroState })), 400);
      setTimeout(() => set((st) => ({ damageNumbers: st.damageNumbers.filter((x) => x.id !== dn.id) })), 900);
      if (newHp <= 0) get().onMonsterDefeated();
    } else if (sk.type === "buff") {
      // Heal/holy light: skip monster + bonus gold
      const bonus = Math.floor(s.monster.gold * 0.5 * d.goldMult);
      set({
        gold: s.gold + bonus,
        heroState: "victory",
        activeEffect: { id: Date.now(), effect: sk.effect },
        skillCooldowns: { ...s.skillCooldowns, [skillId]: now + sk.cooldown },
      });
      setTimeout(() => set((st) => ({ heroState: st.heroState === "victory" ? "idle" : st.heroState })), 600);
    }
  },

  clearEffect: () => set({ activeEffect: null }),

  onMonsterDefeated: () => {
    const s = get();
    const d = computeDerived(s);
    const goldGain = Math.floor(s.monster.gold * d.goldMult);
    const xpGain = Math.floor(s.monster.xp * d.xpMult);
    const seasonXpGain = Math.floor(s.monster.xp * 0.5);

    // Loot drop
    const lootChance = 0.18 * d.lootMult * (s.monster.isBoss ? 3 : 1);
    let newInv = [...s.inventory];
    if (Math.random() < lootChance) {
      const tier = Math.min(4, Math.floor(s.wave / 8));
      const tiers = ["common", "uncommon", "rare", "epic", "legendary"];
      const targetRarity = tiers[tier];
      const candidates = Object.values(ITEMS).filter((it) => it.rarity === targetRarity);
      if (candidates.length) {
        const drop = candidates[Math.floor(Math.random() * candidates.length)];
        newInv.push(drop.id);
      }
    }
    // Material drop
    let newMat = { ...s.materials };
    if (Math.random() < 0.4) newMat.ore = (newMat.ore || 0) + 1 + (s.monster.isBoss ? 3 : 0);
    if (Math.random() < 0.3) newMat.leather = (newMat.leather || 0) + 1;
    if (s.wave >= 10 && Math.random() < 0.18) newMat.rune = (newMat.rune || 0) + 1;
    if (s.wave >= 30 && Math.random() < 0.08) newMat.dragonbone = (newMat.dragonbone || 0) + 1;

    // Level up
    let newXp = s.xp + xpGain;
    let newLevel = s.level;
    let newTp = s.talentPoints;
    while (newXp >= xpToLevel(newLevel)) {
      newXp -= xpToLevel(newLevel);
      newLevel += 1;
      newTp += 1;
    }

    const newWave = s.wave + 1;
    const newHighest = Math.max(s.highestWave, newWave);
    const nextMonster = getMonsterForWave(newWave);

    set({
      gold: s.gold + goldGain,
      xp: newXp,
      level: newLevel,
      talentPoints: newTp,
      wave: newWave,
      highestWave: newHighest,
      inventory: newInv,
      materials: newMat,
      seasonXp: s.seasonXp + seasonXpGain,
      monster: nextMonster,
      monsterHp: nextMonster.hp,
      heroState: "victory",
    });
    setTimeout(() => set((st) => ({ heroState: st.heroState === "victory" ? "idle" : st.heroState })), 700);
  },

  equipItem: (invIndex) => {
    const s = get();
    const itemId = s.inventory[invIndex];
    const it = ITEMS[itemId];
    if (!it) return;
    const newInv = [...s.inventory];
    newInv.splice(invIndex, 1);
    const current = s.equipment[it.slot];
    if (current) newInv.push(current);
    set({ inventory: newInv, equipment: { ...s.equipment, [it.slot]: it.id } });
  },

  unequipItem: (slot) => {
    const s = get();
    const current = s.equipment[slot];
    if (!current) return;
    set({ inventory: [...s.inventory, current], equipment: { ...s.equipment, [slot]: null } });
  },

  sellItem: (invIndex) => {
    const s = get();
    const itemId = s.inventory[invIndex];
    const it = ITEMS[itemId];
    if (!it) return;
    const newInv = [...s.inventory];
    newInv.splice(invIndex, 1);
    set({ inventory: newInv, gold: s.gold + (it.sell || 1) });
  },

  learnTalent: (talentId) => {
    const s = get();
    const tdef = TALENTS[talentId];
    if (!tdef) return;
    if (s.talentPoints <= 0) return;
    const current = s.talents[talentId] || 0;
    if (current >= tdef.max) return;
    if (tdef.requires) {
      const req = s.talents[tdef.requires] || 0;
      if (req < 1) return;
    }
    set({ talents: { ...s.talents, [talentId]: current + 1 }, talentPoints: s.talentPoints - 1 });
  },

  craftItem: (recipe) => {
    const s = get();
    if (s.gold < recipe.gold) return false;
    for (const [mat, qty] of Object.entries(recipe.materials)) {
      if ((s.materials[mat] || 0) < qty) return false;
    }
    const newMat = { ...s.materials };
    for (const [mat, qty] of Object.entries(recipe.materials)) newMat[mat] -= qty;
    set({ materials: newMat, gold: s.gold - recipe.gold, inventory: [...s.inventory, recipe.result] });
    return true;
  },

  buyShopItem: (shopItem, currency) => {
    const s = get();
    if (currency === "GOLD") {
      if (s.gold < shopItem.price_gold) return false;
      set({ gold: s.gold - shopItem.price_gold, inventory: [...s.inventory, shopItem.item] });
      return true;
    }
    // For TON/USDT, item is granted; on-chain confirmation happens via backend in production
    set({ inventory: [...s.inventory, shopItem.item] });
    return true;
  },

  claimSeasonTier: (tier, reward) => {
    const s = get();
    if (s.seasonClaimed.includes(tier)) return;
    const updates = { seasonClaimed: [...s.seasonClaimed, tier] };
    if (reward.type === "gold") updates.gold = s.gold + reward.value;
    if (reward.type === "item") updates.inventory = [...s.inventory, reward.value];
    set(updates);
  },

  setSaving: (v) => set({ saving: v }),

  saveToServer: async () => {
    const s = get();
    if (!s.wallet) return;
    set({ saving: true });
    try {
      await savePlayer(s.wallet, {
        name: s.name,
        level: s.level,
        xp: s.xp,
        gold: s.gold,
        wave: s.wave,
        highest_wave: s.highestWave,
        stats: s.stats,
        equipment: s.equipment,
        inventory: s.inventory,
        materials: s.materials,
        talents: s.talents,
        talent_points: s.talentPoints,
        season_xp: s.seasonXp,
        season_claimed: s.seasonClaimed,
        battle_meter: computeDerived(s).bm,
      });
    } finally {
      set({ saving: false });
    }
  },

  reset: () => set(DEFAULT_STATE),
}));
