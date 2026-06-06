// Items database. Each item has rarity, slot, stats, sell value, icon emoji or Lucide icon name.
export const RARITY_MULT = { common: 1, uncommon: 1.4, rare: 1.9, epic: 2.6, legendary: 3.6 };

export const ITEMS = {
  // Weapons
  rusty_sword:        { id: "rusty_sword", slot: "weapon", rarity: "common", name: { en: "Rusty Sword", pt: "Espada Enferrujada" }, stats: { dmg: 5, str: 1 }, sell: 8 },
  iron_axe:           { id: "iron_axe", slot: "weapon", rarity: "uncommon", name: { en: "Iron Axe", pt: "Machado de Ferro" }, stats: { dmg: 12, str: 3 }, sell: 25 },
  rune_blade:         { id: "rune_blade", slot: "weapon", rarity: "rare", name: { en: "Rune Blade", pt: "Lâmina Rúnica" }, stats: { dmg: 24, str: 6, int: 4 }, sell: 80 },
  dragonfang:         { id: "dragonfang", slot: "weapon", rarity: "epic", name: { en: "Dragonfang", pt: "Presa de Dragão" }, stats: { dmg: 48, str: 10, agi: 6 }, sell: 240 },
  sunforge:           { id: "sunforge", slot: "weapon", rarity: "legendary", name: { en: "Sunforge", pt: "Forjasol" }, stats: { dmg: 95, str: 18, int: 12, agi: 8 }, sell: 900 },
  // Armor - Helmet
  leather_cap:        { id: "leather_cap", slot: "helmet", rarity: "common", name: { en: "Leather Cap", pt: "Gorro de Couro" }, stats: { def: 3, sta: 2 }, sell: 6 },
  iron_helm:          { id: "iron_helm", slot: "helmet", rarity: "uncommon", name: { en: "Iron Helm", pt: "Elmo de Ferro" }, stats: { def: 8, sta: 4 }, sell: 22 },
  rune_helm:          { id: "rune_helm", slot: "helmet", rarity: "rare", name: { en: "Rune Helm", pt: "Elmo Rúnico" }, stats: { def: 16, sta: 7, int: 4 }, sell: 70 },
  dragonscale_helm:   { id: "dragonscale_helm", slot: "helmet", rarity: "epic", name: { en: "Dragonscale Helm", pt: "Elmo Escama de Dragão" }, stats: { def: 30, sta: 12, agi: 5 }, sell: 220 },
  // Chest
  cloth_robe:         { id: "cloth_robe", slot: "chest", rarity: "common", name: { en: "Cloth Robe", pt: "Manto de Tecido" }, stats: { def: 4, sta: 2 }, sell: 7 },
  chainmail:          { id: "chainmail", slot: "chest", rarity: "uncommon", name: { en: "Chainmail", pt: "Cota de Malha" }, stats: { def: 12, sta: 5 }, sell: 28 },
  rune_plate:         { id: "rune_plate", slot: "chest", rarity: "rare", name: { en: "Rune Plate", pt: "Placa Rúnica" }, stats: { def: 22, sta: 9, str: 4 }, sell: 90 },
  dragon_plate:       { id: "dragon_plate", slot: "chest", rarity: "epic", name: { en: "Dragon Plate", pt: "Placa de Dragão" }, stats: { def: 42, sta: 16, str: 8 }, sell: 280 },
  // Boots
  worn_boots:         { id: "worn_boots", slot: "boots", rarity: "common", name: { en: "Worn Boots", pt: "Botas Desgastadas" }, stats: { def: 2, agi: 2 }, sell: 5 },
  iron_boots:         { id: "iron_boots", slot: "boots", rarity: "uncommon", name: { en: "Iron Boots", pt: "Botas de Ferro" }, stats: { def: 6, agi: 4 }, sell: 20 },
  rune_boots:         { id: "rune_boots", slot: "boots", rarity: "rare", name: { en: "Rune Boots", pt: "Botas Rúnicas" }, stats: { def: 12, agi: 8 }, sell: 65 },
  // Ring & Amulet
  copper_ring:        { id: "copper_ring", slot: "ring", rarity: "common", name: { en: "Copper Ring", pt: "Anel de Cobre" }, stats: { int: 2 }, sell: 6 },
  silver_ring:        { id: "silver_ring", slot: "ring", rarity: "uncommon", name: { en: "Silver Ring", pt: "Anel de Prata" }, stats: { int: 5, agi: 3 }, sell: 24 },
  rune_ring:          { id: "rune_ring", slot: "ring", rarity: "rare", name: { en: "Rune Ring", pt: "Anel Rúnico" }, stats: { int: 10, str: 4, agi: 4 }, sell: 75 },
  amulet_of_power:    { id: "amulet_of_power", slot: "amulet", rarity: "epic", name: { en: "Amulet of Power", pt: "Amuleto do Poder" }, stats: { int: 15, str: 8, sta: 8 }, sell: 250 },
  amulet_of_kings:    { id: "amulet_of_kings", slot: "amulet", rarity: "legendary", name: { en: "Amulet of Kings", pt: "Amuleto dos Reis" }, stats: { int: 28, str: 14, sta: 14, agi: 10 }, sell: 950 },
};

export const ITEM_ICONS = {
  weapon: "Sword",
  helmet: "HardHat",
  chest: "Shield",
  boots: "Footprints",
  ring: "Circle",
  amulet: "Gem",
};

// Monster waves
export const MONSTERS = [
  { id: "wolf", name: { en: "Forest Wolf", pt: "Lobo da Floresta" }, hp: 30, dmg: 5, gold: 6, xp: 8, sprite: "wolf" },
  { id: "goblin", name: { en: "Goblin Raider", pt: "Goblin Saqueador" }, hp: 60, dmg: 8, gold: 12, xp: 14, sprite: "goblin" },
  { id: "skeleton", name: { en: "Restless Skeleton", pt: "Esqueleto Inquieto" }, hp: 110, dmg: 14, gold: 22, xp: 24, sprite: "skeleton" },
  { id: "orc", name: { en: "Orc Berserker", pt: "Orc Berserker" }, hp: 200, dmg: 22, gold: 40, xp: 38, sprite: "orc" },
  { id: "wraith", name: { en: "Dark Wraith", pt: "Espectro Sombrio" }, hp: 360, dmg: 32, gold: 70, xp: 60, sprite: "wraith" },
  { id: "troll", name: { en: "Mountain Troll", pt: "Troll da Montanha" }, hp: 620, dmg: 48, gold: 120, xp: 95, sprite: "troll" },
  { id: "lich", name: { en: "Lich Lord", pt: "Senhor Lich" }, hp: 1050, dmg: 70, gold: 220, xp: 160, sprite: "lich" },
  { id: "dragon", name: { en: "Ancient Dragon", pt: "Dragão Ancestral" }, hp: 1800, dmg: 110, gold: 420, xp: 280, sprite: "dragon" },
];

export const MONSTER_SPRITES = {
  wolf: "https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=600&q=70",
  goblin: "https://images.unsplash.com/photo-1568223953582-1d0698f0e734?w=600&q=70",
  skeleton: "https://images.unsplash.com/photo-1635399860495-2a2802a6df50?w=600&q=70",
  orc: "https://images.unsplash.com/photo-1568223953582-1d0698f0e734?w=600&q=70",
  wraith: "https://images.unsplash.com/photo-1635399860495-2a2802a6df50?w=600&q=70",
  troll: "https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=600&q=70",
  lich: "https://images.unsplash.com/photo-1635399860495-2a2802a6df50?w=600&q=70",
  dragon: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&q=70",
};

export function getMonsterForWave(wave) {
  const idx = Math.min(MONSTERS.length - 1, Math.floor((wave - 1) / 5));
  const tpl = MONSTERS[idx];
  const isBoss = wave % 10 === 0;
  const scale = 1 + (wave - 1) * 0.18;
  return {
    ...tpl,
    wave,
    isBoss,
    hp: Math.floor(tpl.hp * scale * (isBoss ? 3 : 1)),
    dmg: Math.floor(tpl.dmg * scale * (isBoss ? 1.6 : 1)),
    gold: Math.floor(tpl.gold * scale * (isBoss ? 4 : 1)),
    xp: Math.floor(tpl.xp * scale * (isBoss ? 3 : 1)),
    sprite: tpl.sprite,
  };
}

// Talent tree
export const TALENTS = {
  power_strike: { id: "power_strike", name: { en: "Power Strike", pt: "Golpe Poderoso" }, desc: { en: "+10% damage per rank", pt: "+10% de dano por rank" }, max: 5, branch: "strength", row: 1, col: 1 },
  iron_skin:    { id: "iron_skin", name: { en: "Iron Skin", pt: "Pele de Ferro" }, desc: { en: "+8% max HP per rank", pt: "+8% HP máximo por rank" }, max: 5, branch: "strength", row: 2, col: 1 },
  berserker:    { id: "berserker", name: { en: "Berserker", pt: "Berserker" }, desc: { en: "+5% crit chance per rank", pt: "+5% chance de crítico por rank" }, max: 3, branch: "strength", row: 3, col: 1, requires: "power_strike" },

  swift_blade:  { id: "swift_blade", name: { en: "Swift Blade", pt: "Lâmina Veloz" }, desc: { en: "+8% attack speed per rank", pt: "+8% velocidade de ataque" }, max: 5, branch: "agility", row: 1, col: 2 },
  evasion:      { id: "evasion", name: { en: "Evasion", pt: "Evasão" }, desc: { en: "+4% dodge per rank", pt: "+4% esquiva por rank" }, max: 5, branch: "agility", row: 2, col: 2 },
  shadowstep:   { id: "shadowstep", name: { en: "Shadowstep", pt: "Passo das Sombras" }, desc: { en: "+15% crit damage per rank", pt: "+15% dano crítico por rank" }, max: 3, branch: "agility", row: 3, col: 2, requires: "swift_blade" },

  arcane_mind:  { id: "arcane_mind", name: { en: "Arcane Mind", pt: "Mente Arcana" }, desc: { en: "+12% gold per rank", pt: "+12% ouro por rank" }, max: 5, branch: "intellect", row: 1, col: 3 },
  scholar:      { id: "scholar", name: { en: "Scholar", pt: "Erudito" }, desc: { en: "+15% XP per rank", pt: "+15% XP por rank" }, max: 5, branch: "intellect", row: 2, col: 3 },
  rune_master:  { id: "rune_master", name: { en: "Rune Master", pt: "Mestre Rúnico" }, desc: { en: "+10% loot chance per rank", pt: "+10% chance de loot por rank" }, max: 3, branch: "intellect", row: 3, col: 3, requires: "arcane_mind" },
};

// Crafting recipes
export const RECIPES = [
  { id: "craft_iron_axe", result: "iron_axe", materials: { ore: 5, leather: 2 }, gold: 50 },
  { id: "craft_rune_blade", result: "rune_blade", materials: { ore: 10, rune: 3, leather: 4 }, gold: 200 },
  { id: "craft_dragonfang", result: "dragonfang", materials: { ore: 20, rune: 8, dragonbone: 2 }, gold: 800 },
  { id: "craft_chainmail", result: "chainmail", materials: { ore: 8, leather: 3 }, gold: 80 },
  { id: "craft_rune_plate", result: "rune_plate", materials: { ore: 15, rune: 5, leather: 5 }, gold: 300 },
  { id: "craft_rune_helm", result: "rune_helm", materials: { ore: 12, rune: 4 }, gold: 250 },
];

export const MATERIAL_NAMES = {
  ore: { en: "Iron Ore", pt: "Minério de Ferro" },
  leather: { en: "Leather", pt: "Couro" },
  rune: { en: "Magic Rune", pt: "Runa Mágica" },
  dragonbone: { en: "Dragonbone", pt: "Osso de Dragão" },
};

// Shop items (with TON/USDT prices)
export const SHOP_ITEMS = [
  { id: "shop_rune_blade", item: "rune_blade", price_ton: 0.5, price_usdt: 1.5, price_gold: 1500 },
  { id: "shop_dragonfang", item: "dragonfang", price_ton: 1.5, price_usdt: 4.5, price_gold: 6000 },
  { id: "shop_sunforge", item: "sunforge", price_ton: 5.0, price_usdt: 15.0, price_gold: 30000 },
  { id: "shop_dragon_plate", item: "dragon_plate", price_ton: 2.0, price_usdt: 6.0, price_gold: 8000 },
  { id: "shop_amulet_of_kings", item: "amulet_of_kings", price_ton: 6.0, price_usdt: 18.0, price_gold: 40000 },
];

// Season pass tiers
export const SEASON_TIERS = Array.from({ length: 20 }, (_, i) => {
  const tier = i + 1;
  return {
    tier,
    xp_required: tier * 100,
    reward: tier % 5 === 0
      ? { type: "item", value: ["rune_blade", "rune_plate", "dragonfang", "amulet_of_power", "sunforge"][Math.min(4, Math.floor(tier / 5) - 1)] }
      : { type: "gold", value: tier * 150 },
  };
});

export const rarityLabel = (r, lang = "en") => {
  const map = {
    en: { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" },
    pt: { common: "Comum", uncommon: "Incomum", rare: "Raro", epic: "Épico", legendary: "Lendário" },
  };
  return (map[lang] || map.en)[r];
};
