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
  monsters: [], // array of {id, sprite, name, maxHp, hp, dmg, gold, xp, isBoss}
  autoAttack: true,
  damageNumbers: [],
  saving: false,
  heroState: "idle",
  activeEffect: null,
  skillCooldowns: {},
  referredBy: null,
};

function xpToLevel(level) { return 100 + (level - 1) * 80; }

function spawnWaveMonsters(wave) {
  const primary = getMonsterForWave(wave);
  const list = [{ ...primary, id: `m${wave}-0`, maxHp: primary.hp }];
  if (!primary.isBoss) {
    // Hordes: every 3rd wave adds 1 minion, every 5th adds 2 minions
    const extra = (wave % 3 === 0 ? 1 : 0) + (wave % 5 === 0 ? 2 : 0);
    for (let i = 0; i < extra; i++) {
      const hp = Math.max(8, Math.floor(primary.hp * 0.55));
      list.push({
        ...primary,
        id: `m${wave}-${i + 1}`,
        hp,
        maxHp: hp,
        gold: Math.floor(primary.gold * 0.4),
        xp: Math.floor(primary.xp * 0.4),
        isMinion: true,
      });
    }
  }
  return list;
}

function computeDerived(state) {
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

function applyDamageToMonster(monsters, id, dmg) {
  return monsters.map((m) => (m.id === id ? { ...m, hp: Math.max(0, m.hp - dmg) } : m));
}

function processDefeats(s, before, after) {
  // Identify newly defeated monsters
  const beforeMap = Object.fromEntries(before.map((m) => [m.id, m]));
  const defeated = after.filter((m) => m.hp === 0 && beforeMap[m.id] && beforeMap[m.id].hp > 0);
  let goldGain = 0, xpGain = 0, seasonXpGain = 0;
  let newInv = [...s.inventory];
  let newMat = { ...s.materials };
  const d = computeDerived(s);

  for (const m of defeated) {
    goldGain += Math.floor(m.gold * d.goldMult);
    xpGain += Math.floor(m.xp * d.xpMult);
    seasonXpGain += Math.floor(m.xp * 0.5);

    const lootChance = 0.18 * d.lootMult * (m.isBoss ? 3 : 1) * (m.isMinion ? 0.5 : 1);
    if (Math.random() < lootChance) {
      const tier = Math.min(4, Math.floor(s.wave / 8));
      const tiers = ["common", "uncommon", "rare", "epic", "legendary"];
      const targetRarity = tiers[tier];
      const candidates = Object.values(ITEMS).filter((it) => it.rarity === targetRarity);
      if (candidates.length) {
        newInv.push(candidates[Math.floor(Math.random() * candidates.length)].id);
      }
    }
    if (Math.random() < 0.4) newMat.ore = (newMat.ore || 0) + 1 + (m.isBoss ? 3 : 0);
    if (Math.random() < 0.3) newMat.leather = (newMat.leather || 0) + 1;
    if (s.wave >= 10 && Math.random() < 0.18) newMat.rune = (newMat.rune || 0) + 1;
    if (s.wave >= 30 && Math.random() < 0.08) newMat.dragonbone = (newMat.dragonbone || 0) + 1;
  }

  return { defeated, goldGain, xpGain, seasonXpGain, newInv, newMat };
}

export const useGame = create((set, get) => ({
  ...DEFAULT_STATE,

  derived: () => computeDerived(get()),

  setWallet: (wallet) => set({ wallet }),
  setReferredBy: (refId) => set({ referredBy: refId }),

  hydrateFromServer: (data) => {
    const monsters = spawnWaveMonsters(data.wave || 1);
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
      monsters,
    });
  },

  initRun: () => {
    set({ monsters: spawnWaveMonsters(get().wave) });
  },

  toggleAuto: () => set((s) => ({ autoAttack: !s.autoAttack })),

  // Damage a specific monster; advances wave when all are dead.
  damageMonster: (id, dmg, opts = {}) => {
    const s = get();
    if (!s.monsters.length) return;
    const before = s.monsters;
    const after = applyDamageToMonster(before, id, dmg);

    const target = after.find((m) => m.id === id) || before[0];
    const dn = {
      id: Date.now() + Math.random(),
      value: dmg,
      crit: !!opts.crit,
      x: opts.x ?? 50,
      y: opts.y ?? 30,
      worldX: opts.worldX,
      worldY: opts.worldY,
    };

    const allDead = after.every((m) => m.hp === 0);
    let updates = {
      monsters: after,
      damageNumbers: [...s.damageNumbers, dn],
      heroState: opts.cast ? "cast" : "attack",
    };

    if (allDead) {
      // Process all defeats then advance wave
      const { goldGain, xpGain, seasonXpGain, newInv, newMat } = processDefeats(s, before, after);
      let newXp = s.xp + xpGain;
      let newLevel = s.level;
      let newTp = s.talentPoints;
      while (newXp >= xpToLevel(newLevel)) {
        newXp -= xpToLevel(newLevel);
        newLevel += 1;
        newTp += 1;
      }
      const newWave = s.wave + 1;
      updates = {
        ...updates,
        gold: s.gold + goldGain,
        xp: newXp,
        level: newLevel,
        talentPoints: newTp,
        wave: newWave,
        highestWave: Math.max(s.highestWave, newWave),
        inventory: newInv,
        materials: newMat,
        seasonXp: s.seasonXp + seasonXpGain,
        monsters: spawnWaveMonsters(newWave),
        heroState: "victory",
      };
    } else {
      // Only the just-killed minions reward (if any)
      const { defeated, goldGain, xpGain, seasonXpGain, newInv, newMat } = processDefeats(s, before, after);
      if (defeated.length > 0) {
        updates = {
          ...updates,
          gold: s.gold + goldGain,
          xp: s.xp + xpGain,
          seasonXp: s.seasonXp + seasonXpGain,
          inventory: newInv,
          materials: newMat,
        };
      }
    }

    set(updates);
    setTimeout(() => set((st) => ({ heroState: st.heroState !== "idle" ? "idle" : st.heroState })),
      allDead ? 700 : 250);
    setTimeout(() => {
      set((st) => ({ damageNumbers: st.damageNumbers.filter((x) => x.id !== dn.id) }));
    }, 900);
  },

  // Manual / auto-attack convenience: hit the first alive monster
  attack: (targetId) => {
    const s = get();
    if (!s.monsters.length) {
      set({ monsters: spawnWaveMonsters(s.wave) });
      return;
    }
    const target = targetId
      ? s.monsters.find((m) => m.id === targetId && m.hp > 0)
      : s.monsters.find((m) => m.hp > 0);
    if (!target) return;
    const d = computeDerived(s);
    let dmg = d.baseDamage;
    const isCrit = Math.random() < d.critChance;
    if (isCrit) dmg = Math.floor(dmg * d.critDmg);
    get().damageMonster(target.id, dmg, { crit: isCrit });
  },

  castSkill: (skillId) => {
    const s = get();
    const sk = SKILLS[skillId];
    if (!sk) return;
    const now = Date.now();
    if ((s.skillCooldowns[skillId] || 0) > now) return;
    if (!s.monsters.length) return;

    const d = computeDerived(s);
    set({ skillCooldowns: { ...s.skillCooldowns, [skillId]: now + sk.cooldown }, activeEffect: { id: Date.now(), effect: sk.effect } });

    if (sk.type === "damage") {
      let dmg = Math.floor(d.baseDamage * (sk.multiplier || 1));
      const isCrit = Math.random() < d.critChance;
      if (isCrit) dmg = Math.floor(dmg * d.critDmg);
      if (skillId === "fireball") {
        // AOE: hit every alive monster
        s.monsters.filter((m) => m.hp > 0).forEach((m) => {
          get().damageMonster(m.id, dmg, { crit: true, cast: true });
        });
      } else {
        const target = s.monsters.find((m) => m.hp > 0);
        if (target) get().damageMonster(target.id, dmg, { crit: true, cast: true });
      }
    } else if (sk.type === "buff") {
      // Heal: clear wave + bonus gold
      const totalGold = s.monsters.reduce((a, m) => a + (m.hp > 0 ? m.gold : 0), 0);
      const bonus = Math.floor(totalGold * 0.5 * d.goldMult);
      const newWave = s.wave + 1;
      set({
        gold: s.gold + bonus,
        wave: newWave,
        highestWave: Math.max(s.highestWave, newWave),
        monsters: spawnWaveMonsters(newWave),
        heroState: "victory",
      });
      setTimeout(() => set((st) => ({ heroState: st.heroState === "victory" ? "idle" : st.heroState })), 600);
    }
  },

  clearEffect: () => set({ activeEffect: null }),

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
