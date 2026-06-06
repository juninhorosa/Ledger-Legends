import React, { useEffect, useState } from "react";

/**
 * 3D-style SVG character sprites for hero & monsters.
 * Uses SVG gradients, highlights, and shading for a 3D appearance.
 */

/* ─── Hero 3D Palettes ─── */
const CLASS_PALETTE = {
  warrior: {
    armorMain:    "#c0392b",
    armorDark:    "#7a1f15",
    armorLight:   "#e85d4a",
    armorShine:   "#ff9080",
    pants:        "#2c1a10",
    pantsDark:    "#1a0e08",
    boots:        "#1a0e08",
    bootsDark:    "#0d0704",
    shield:       "#7a5020",
    shieldDark:   "#3a2010",
    shieldLight:  "#c08040",
    accent:       "#f0b144",
    accentLight:  "#ffd580",
    weapon:       "axe",
    hairColor:    "#3a2410",
    beltColor:    "#5a3a1f",
    glowColor:    "rgba(192,57,43,0.5)",
  },
  paladin: {
    armorMain:    "#d4c070",
    armorDark:    "#8a7a30",
    armorLight:   "#f0e090",
    armorShine:   "#fffacc",
    pants:        "#2a3040",
    pantsDark:    "#151820",
    boots:        "#1d2533",
    bootsDark:    "#0d1018",
    shield:       "#f5d142",
    shieldDark:   "#a67c0c",
    shieldLight:  "#fff8aa",
    accent:       "#ffffff",
    accentLight:  "#ffffff",
    weapon:       "hammer",
    hairColor:    "#d4aa50",
    beltColor:    "#a67c0c",
    glowColor:    "rgba(245,209,66,0.5)",
  },
  mage: {
    armorMain:    "#6a44cc",
    armorDark:    "#3a1f7a",
    armorLight:   "#9a70ff",
    armorShine:   "#c8b0ff",
    pants:        "#2c1a52",
    pantsDark:    "#180e30",
    boots:        "#1a0e30",
    bootsDark:    "#0d0718",
    shield:       null,
    shieldDark:   null,
    shieldLight:  null,
    accent:       "#5ad1e8",
    accentLight:  "#a0eeff",
    weapon:       "staff",
    hairColor:    "#2a1f4a",
    beltColor:    "#3a2060",
    glowColor:    "rgba(90,209,232,0.5)",
  },
};

export function PixelHero({ size = 64, facing = "right", frame = 0, state = "idle", klass = "warrior" }) {
  const attack = state === "attack";
  const pal = CLASS_PALETTE[klass] || CLASS_PALETTE.warrior;
  const uid = `hero_${klass}_${size}`;

  const skin      = "#f3c19a";
  const skinShade = "#c89167";
  const skinDark  = "#a07050";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 56"
      style={{ transform: facing === "left" ? "scaleX(-1)" : undefined, overflow: "visible", filter: `drop-shadow(0 4px 8px ${pal.glowColor})` }}
    >
      <defs>
        {/* Skin gradient */}
        <radialGradient id={`${uid}_skin`} cx="45%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#ffd8b0" />
          <stop offset="60%"  stopColor={skin} />
          <stop offset="100%" stopColor={skinShade} />
        </radialGradient>
        {/* Armor gradient */}
        <linearGradient id={`${uid}_armor`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={pal.armorLight} />
          <stop offset="40%"  stopColor={pal.armorMain} />
          <stop offset="100%" stopColor={pal.armorDark} />
        </linearGradient>
        {/* Armor shine */}
        <linearGradient id={`${uid}_armorShine`} x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%"   stopColor={pal.armorShine} stopOpacity="0.7" />
          <stop offset="100%" stopColor={pal.armorMain}  stopOpacity="0" />
        </linearGradient>
        {/* Pants gradient */}
        <linearGradient id={`${uid}_pants`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={pal.pants} />
          <stop offset="100%" stopColor={pal.pantsDark} />
        </linearGradient>
        {/* Boot gradient */}
        <linearGradient id={`${uid}_boots`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={pal.boots} />
          <stop offset="100%" stopColor={pal.bootsDark} />
        </linearGradient>
        {/* Shield gradient */}
        {pal.shield && (
          <linearGradient id={`${uid}_shield`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={pal.shieldLight} />
            <stop offset="50%"  stopColor={pal.shield} />
            <stop offset="100%" stopColor={pal.shieldDark} />
          </linearGradient>
        )}
        {/* Accent glow */}
        <radialGradient id={`${uid}_accent`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={pal.accentLight} />
          <stop offset="100%" stopColor={pal.accent} />
        </radialGradient>
        {/* Hair */}
        <linearGradient id={`${uid}_hair`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={pal.hairColor} />
          <stop offset="100%" stopColor="#1a0e08" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="20" cy="55" rx="10" ry="2.5" fill="rgba(0,0,0,0.35)" />

      {/* ── Class headgear ── */}
      {klass === "warrior" && (
        <g>
          {/* Horned helmet */}
          <rect x="11" y="4" width="18" height="12" rx="3" fill={`url(#${uid}_armor)`} />
          <rect x="11" y="4" width="18" height="5"  rx="3" fill={`url(#${uid}_armorShine)`} />
          {/* Horns */}
          <ellipse cx="10" cy="5" rx="3" ry="4" fill={pal.armorDark} />
          <ellipse cx="30" cy="5" rx="3" ry="4" fill={pal.armorDark} />
          <ellipse cx="10" cy="4" rx="1.5" ry="2.5" fill={pal.armorLight} />
          <ellipse cx="30" cy="4" rx="1.5" ry="2.5" fill={pal.armorLight} />
        </g>
      )}
      {klass === "paladin" && (
        <g>
          {/* Holy crown / halo */}
          <ellipse cx="20" cy="5" rx="12" ry="2.5" fill="none" stroke={pal.accent} strokeWidth="2" opacity="0.8" />
          <ellipse cx="20" cy="5" rx="10" ry="1.5" fill="none" stroke={pal.accentLight} strokeWidth="1" opacity="0.5" />
          {/* Helmet */}
          <rect x="12" y="5" width="16" height="11" rx="3" fill={`url(#${uid}_armor)`} />
          <rect x="12" y="5" width="16" height="5"  rx="3" fill={`url(#${uid}_armorShine)`} />
        </g>
      )}
      {klass === "mage" && (
        <g>
          {/* Pointed wizard hat */}
          <polygon points="20,0 12,14 28,14" fill={pal.armorDark} />
          <polygon points="20,0 14,14 26,14" fill={`url(#${uid}_armor)`} />
          <rect x="10" y="13" width="20" height="3" rx="1.5" fill={pal.armorMain} />
          <rect x="10" y="13" width="20" height="1.5" rx="1" fill={pal.armorLight} opacity="0.6" />
          {/* Star on hat */}
          <circle cx="20" cy="6" r="2" fill={`url(#${uid}_accent)`} opacity="0.9" />
        </g>
      )}

      {/* ── Head ── */}
      <rect x="13" y="14" width="14" height="13" rx="3" fill={`url(#${uid}_skin)`} />
      {/* Cheek shading */}
      <ellipse cx="15" cy="22" rx="2" ry="1.5" fill={skinShade} opacity="0.4" />
      <ellipse cx="25" cy="22" rx="2" ry="1.5" fill={skinShade} opacity="0.4" />
      {/* Eyes */}
      <ellipse cx="17" cy="20" rx="2" ry="2" fill="white" />
      <ellipse cx="23" cy="20" rx="2" ry="2" fill="white" />
      <circle cx="17.5" cy="20" r="1.2" fill={klass === "mage" ? "#5ad1e8" : "#3a2410"} />
      <circle cx="23.5" cy="20" r="1.2" fill={klass === "mage" ? "#5ad1e8" : "#3a2410"} />
      <circle cx="18"   cy="19.5" r="0.5" fill="white" />
      <circle cx="24"   cy="19.5" r="0.5" fill="white" />
      {/* Eyebrows */}
      <rect x="15" y="17" width="4" height="1.5" rx="0.7" fill={pal.hairColor} />
      <rect x="21" y="17" width="4" height="1.5" rx="0.7" fill={pal.hairColor} />
      {/* Mouth */}
      <path d={attack ? "M17,25 Q20,27 23,25" : "M17,25 Q20,26 23,25"} fill="none" stroke={skinDark} strokeWidth="1" strokeLinecap="round" />
      {/* Hair */}
      {klass !== "mage" && (
        <rect x="13" y="14" width="14" height="4" rx="3" fill={`url(#${uid}_hair)`} />
      )}

      {/* ── Neck ── */}
      <rect x="17" y="27" width="6" height="4" fill={skinShade} />

      {/* ── Body / Torso ── */}
      <rect x="10" y="30" width="20" height="14" rx="2" fill={`url(#${uid}_armor)`} />
      {/* Armor shine highlight */}
      <rect x="11" y="30" width="9"  height="7"  rx="2" fill={`url(#${uid}_armorShine)`} opacity="0.6" />
      {/* Class emblem */}
      {klass === "paladin" && (
        <g>
          <rect x="17" y="33" width="6" height="2" fill="#c0392b" rx="0.5" />
          <rect x="19" y="31" width="2" height="6" fill="#c0392b" rx="0.5" />
        </g>
      )}
      {klass === "mage" && (
        <circle cx="20" cy="36" r="3" fill={`url(#${uid}_accent)`} opacity="0.8" />
      )}
      {klass === "warrior" && (
        <g>
          <rect x="17" y="32" width="6" height="1.5" fill={pal.accent} rx="0.5" opacity="0.7" />
          <rect x="17" y="35" width="6" height="1.5" fill={pal.accent} rx="0.5" opacity="0.5" />
        </g>
      )}
      {/* Belt */}
      <rect x="10" y="43" width="20" height="3" rx="1" fill={pal.beltColor} />
      <rect x="18" y="43" width="4"  height="3" rx="1" fill={pal.accent} />

      {/* ── Shield (left side) ── */}
      {pal.shield && (
        <g transform={attack ? "translate(-2,0) rotate(-20,5,35)" : ""}>
          <rect x="2" y="29" width="9" height="14" rx="2" fill={`url(#${uid}_shield)`} />
          <rect x="3" y="30" width="4" height="6"  rx="1" fill={pal.shieldLight} opacity="0.4" />
          {klass === "paladin" && (
            <g>
              <rect x="5" y="31" width="3" height="1.5" fill="#c0392b" rx="0.5" />
              <rect x="6" y="29" width="1.5" height="5.5" fill="#c0392b" rx="0.5" />
            </g>
          )}
          {klass === "warrior" && (
            <circle cx="7" cy="36" r="2" fill={pal.accentLight} opacity="0.5" />
          )}
        </g>
      )}

      {/* ── Weapon arm (right) ── */}
      {attack ? (
        <g transform="rotate(-30,32,32)">
          {klass === "mage" ? (
            // Staff swinging
            <g>
              <rect x="29" y="14" width="3" height="26" rx="1.5" fill="#5a3a1f" />
              <ellipse cx="30.5" cy="13" rx="5" ry="5" fill={`url(#${uid}_accent)`} opacity="0.9" />
              <circle cx="30.5" cy="13" r="3" fill={pal.accentLight} opacity="0.7" />
            </g>
          ) : klass === "paladin" ? (
            // Hammer swinging
            <g>
              <rect x="30" y="24" width="3" height="16" rx="1" fill="#5a3a1f" />
              <rect x="26" y="20" width="11" height="6" rx="2" fill={`url(#${uid}_shield)`} />
              <rect x="27" y="20" width="5" height="3"  rx="1" fill={pal.shieldLight} opacity="0.5" />
            </g>
          ) : (
            // Warrior axe swinging
            <g>
              <rect x="30" y="24" width="3" height="16" rx="1" fill="#5a3a1f" />
              <path d="M29,17 L38,20 L38,30 L29,27 Z" fill={`url(#${uid}_armor)`} />
              <path d="M29,17 L35,18 L35,22 L29,21 Z" fill={pal.armorShine} opacity="0.6" />
              <rect x="37" y="18" width="2" height="4" rx="1" fill={pal.accent} />
            </g>
          )}
        </g>
      ) : (
        // Resting weapon
        klass === "mage" ? (
          <g>
            <rect x="29" y="18" width="3" height="28" rx="1.5" fill="#5a3a1f" />
            <ellipse cx="30.5" cy="17" rx="5" ry="5" fill={`url(#${uid}_accent)`} opacity="0.85" />
            <circle cx="30.5" cy="17" r="3" fill={pal.accentLight} opacity="0.7" />
            {/* Magic sparkles */}
            <circle cx="28" cy="13" r="1" fill={pal.accent} opacity={frame === 0 ? 0.9 : 0.4} />
            <circle cx="33" cy="12" r="0.7" fill={pal.accentLight} opacity={frame === 0 ? 0.5 : 0.9} />
          </g>
        ) : klass === "paladin" ? (
          <g>
            <rect x="30" y="32" width="3" height="14" rx="1" fill="#5a3a1f" />
            <rect x="26" y="26" width="11" height="7" rx="2" fill={`url(#${uid}_shield)`} />
            <rect x="27" y="27" width="5" height="3"  rx="1" fill={pal.shieldLight} opacity="0.5" />
          </g>
        ) : (
          <g>
            <rect x="30" y="32" width="3" height="14" rx="1" fill="#5a3a1f" />
            <path d="M29,22 L38,25 L38,33 L29,30 Z" fill={`url(#${uid}_armor)`} />
            <path d="M29,22 L35,24 L35,28 L29,27 Z" fill={pal.armorShine} opacity="0.5" />
          </g>
        )
      )}

      {/* ── Arm (left, near shield) ── */}
      <rect x="9" y="30" width="5" height="10" rx="2" fill={`url(#${uid}_armor)`} />
      {/* ── Arm (right) ── */}
      <rect x="26" y="30" width="5" height="10" rx="2" fill={`url(#${uid}_armor)`} />
      {/* Right hand/fist */}
      <ellipse cx="28.5" cy="40" rx="3" ry="2.5" fill={`url(#${uid}_skin)`} />

      {/* ── Legs ── */}
      {frame === 0 ? (
        <g>
          {/* Left leg */}
          <rect x="11" y="46" width="8" height="7" rx="2" fill={`url(#${uid}_pants)`} />
          <rect x="11" y="51" width="8" height="4" rx="1.5" fill={`url(#${uid}_boots)`} />
          <rect x="11" y="51" width="4" height="2" rx="1" fill={pal.boots} opacity="0.5" />
          {/* Right leg */}
          <rect x="21" y="46" width="8" height="7" rx="2" fill={`url(#${uid}_pants)`} />
          <rect x="21" y="51" width="8" height="4" rx="1.5" fill={`url(#${uid}_boots)`} />
          <rect x="21" y="51" width="4" height="2" rx="1" fill={pal.boots} opacity="0.5" />
        </g>
      ) : (
        <g>
          {/* Left leg forward */}
          <rect x="11" y="44" width="8" height="9" rx="2" fill={`url(#${uid}_pants)`} />
          <rect x="11" y="51" width="9" height="4" rx="1.5" fill={`url(#${uid}_boots)`} />
          {/* Right leg back */}
          <rect x="21" y="48" width="8" height="5" rx="2" fill={`url(#${uid}_pants)`} />
          <rect x="21" y="51" width="7" height="4" rx="1.5" fill={`url(#${uid}_boots)`} />
        </g>
      )}

      {/* ── Victory aura / Attack glow ── */}
      {state === "victory" && (
        <g>
          <circle cx="20" cy="28" r="22" fill={pal.glowColor} opacity="0.25" />
          <circle cx="20" cy="28" r="14" fill={pal.glowColor} opacity="0.15" />
        </g>
      )}
      {attack && (
        <circle cx="32" cy="30" r="8" fill={pal.glowColor} opacity="0.4" />
      )}
    </svg>
  );
}

/* ═══════════════════════════════════════════
   Monster Sprites — 3D-style
═══════════════════════════════════════════ */

export function MonsterSprite({ kind = "wolf", size = 56, facing = "left", frame = 0, isBoss = false }) {
  const w = isBoss ? size * 1.5 : size;
  return (
    <svg
      width={w}
      height={w}
      viewBox="0 0 40 40"
      style={{ transform: facing === "right" ? "scaleX(-1)" : undefined, overflow: "visible" }}
    >
      <ellipse cx="20" cy="39" rx="12" ry="2.5" fill="rgba(0,0,0,0.4)" />
      {kind === "wolf"     && <Wolf3D     frame={frame} />}
      {kind === "goblin"   && <Goblin3D   frame={frame} />}
      {kind === "skeleton" && <Skeleton3D frame={frame} />}
      {kind === "orc"      && <Orc3D      frame={frame} />}
      {kind === "wraith"   && <Wraith3D   frame={frame} />}
      {kind === "troll"    && <Troll3D    frame={frame} />}
      {kind === "lich"     && <Lich3D     frame={frame} />}
      {kind === "dragon"   && <Dragon3D   frame={frame} />}
      {!["wolf","goblin","skeleton","orc","wraith","troll","lich","dragon"].includes(kind) && <Goblin3D frame={frame} />}
    </svg>
  );
}

function Wolf3D({ frame }) {
  return (
    <g>
      <defs>
        <radialGradient id="wolf_body" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#a0a0a0" />
          <stop offset="60%" stopColor="#707070" />
          <stop offset="100%" stopColor="#404040" />
        </radialGradient>
      </defs>
      {/* Body */}
      <ellipse cx="18" cy="24" rx="12" ry="8" fill="url(#wolf_body)" />
      <ellipse cx="18" cy="22" rx="8" ry="4" fill="#b0b0b0" opacity="0.4" />
      {/* Head */}
      <ellipse cx="30" cy="20" rx="8" ry="7" fill="url(#wolf_body)" />
      <ellipse cx="31" cy="18" rx="4" ry="3" fill="#b0b0b0" opacity="0.4" />
      {/* Snout */}
      <ellipse cx="37" cy="23" rx="4" ry="3" fill="#606060" />
      <ellipse cx="38" cy="22" rx="1.5" ry="1" fill="#404040" />
      {/* Nose */}
      <ellipse cx="38" cy="21" rx="1.5" ry="1" fill="#202020" />
      {/* Eye */}
      <circle cx="32" cy="18" r="2.5" fill="white" />
      <circle cx="32.5" cy="18.5" r="1.5" fill="#ffd34d" />
      <circle cx="33" cy="18" r="0.7" fill="#202020" />
      {/* Ears */}
      <polygon points="28,13 25,6 31,11" fill="#707070" />
      <polygon points="36,12 34,6 39,10" fill="#707070" />
      <polygon points="29,12 27,7 31,11" fill="#c06060" opacity="0.6" />
      {/* Tail */}
      <path d="M6,20 Q2,14 5,10" fill="none" stroke="#707070" strokeWidth="4" strokeLinecap="round" />
      <path d="M6,20 Q3,15 6,11" fill="none" stroke="#a0a0a0" strokeWidth="2" strokeLinecap="round" />
      {/* Legs */}
      {frame === 0 ? (
        <g>
          <rect x="10" y="30" width="5" height="8" rx="2" fill="#606060" />
          <rect x="18" y="30" width="5" height="7" rx="2" fill="#606060" />
          <rect x="25" y="30" width="5" height="8" rx="2" fill="#606060" />
        </g>
      ) : (
        <g>
          <rect x="10" y="28" width="5" height="10" rx="2" fill="#606060" />
          <rect x="18" y="32" width="5" height="6" rx="2" fill="#606060" />
          <rect x="25" y="28" width="5" height="10" rx="2" fill="#606060" />
        </g>
      )}
    </g>
  );
}

function Goblin3D({ frame }) {
  return (
    <g>
      <defs>
        <radialGradient id="goblin_skin" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#7de077" />
          <stop offset="60%" stopColor="#4a9e45" />
          <stop offset="100%" stopColor="#2a5e28" />
        </radialGradient>
      </defs>
      {/* Body */}
      <ellipse cx="20" cy="27" rx="9" ry="8" fill="url(#goblin_skin)" />
      {/* Leather vest */}
      <ellipse cx="20" cy="27" rx="7" ry="6" fill="#7a4a2a" opacity="0.7" />
      <ellipse cx="19" cy="24" rx="4" ry="2.5" fill="#9a6a3a" opacity="0.5" />
      {/* Head */}
      <ellipse cx="20" cy="14" rx="8" ry="8" fill="url(#goblin_skin)" />
      <ellipse cx="19" cy="11" rx="5" ry="3.5" fill="#7de077" opacity="0.5" />
      {/* Ears */}
      <ellipse cx="10" cy="14" rx="3" ry="5" fill="#4a9e45" />
      <ellipse cx="30" cy="14" rx="3" ry="5" fill="#4a9e45" />
      <ellipse cx="10" cy="14" rx="2" ry="3" fill="#ff8080" opacity="0.5" />
      <ellipse cx="30" cy="14" rx="2" ry="3" fill="#ff8080" opacity="0.5" />
      {/* Eyes */}
      <circle cx="17" cy="13" r="2.5" fill="#ff3535" />
      <circle cx="23" cy="13" r="2.5" fill="#ff3535" />
      <circle cx="17.5" cy="12.5" r="1" fill="#200000" />
      <circle cx="23.5" cy="12.5" r="1" fill="#200000" />
      {/* Teeth */}
      <rect x="17" y="18" width="2.5" height="3" rx="1" fill="ivory" />
      <rect x="21" y="18" width="2.5" height="3" rx="1" fill="ivory" />
      {/* Arms */}
      <ellipse cx="10" cy="27" rx="3" ry="6" fill="url(#goblin_skin)" />
      <ellipse cx="30" cy="27" rx="3" ry="6" fill="url(#goblin_skin)" />
      {/* Legs */}
      {frame === 0 ? (
        <g>
          <rect x="13" y="33" width="6" height="7" rx="2" fill="#2a5e28" />
          <rect x="21" y="33" width="6" height="7" rx="2" fill="#2a5e28" />
        </g>
      ) : (
        <g>
          <rect x="13" y="31" width="6" height="9" rx="2" fill="#2a5e28" />
          <rect x="21" y="35" width="6" height="5" rx="2" fill="#2a5e28" />
        </g>
      )}
    </g>
  );
}

function Skeleton3D({ frame }) {
  return (
    <g>
      <defs>
        <radialGradient id="bone_grad" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#f5f0e0" />
          <stop offset="70%" stopColor="#d0c8a8" />
          <stop offset="100%" stopColor="#9a9278" />
        </radialGradient>
      </defs>
      {/* Ribcage */}
      <ellipse cx="20" cy="26" rx="9" ry="8" fill="url(#bone_grad)" />
      {[22,25,28].map(y => (
        <ellipse key={y} cx="20" cy={y} rx="7" ry="1.2" fill="none" stroke="#9a9278" strokeWidth="1" />
      ))}
      {/* Pelvis */}
      <ellipse cx="20" cy="33" rx="8" ry="4" fill="url(#bone_grad)" />
      {/* Skull */}
      <ellipse cx="20" cy="13" rx="9" ry="9" fill="url(#bone_grad)" />
      <ellipse cx="19" cy="10" rx="6" ry="4" fill="#f5f0e0" opacity="0.5" />
      {/* Eye sockets */}
      <ellipse cx="16" cy="13" rx="3" ry="3.5" fill="#1a2040" />
      <ellipse cx="24" cy="13" rx="3" ry="3.5" fill="#1a2040" />
      <circle cx="16" cy="13" r="1.5" fill="#5ad1e8" opacity="0.8" />
      <circle cx="24" cy="13" r="1.5" fill="#5ad1e8" opacity="0.8" />
      {/* Nasal cavity */}
      <ellipse cx="20" cy="17" rx="1.5" ry="1" fill="#1a2040" />
      {/* Teeth */}
      {[17,19,21,23].map(x => (
        <rect key={x} x={x} y="19" width="1.8" height="2.5" rx="0.5" fill="ivory" />
      ))}
      {/* Arms - just bones */}
      <rect x="9"  y="22" width="3" height="10" rx="1.5" fill="url(#bone_grad)" />
      <rect x="28" y="22" width="3" height="10" rx="1.5" fill="url(#bone_grad)" />
      {/* Legs */}
      {frame === 0 ? (
        <g>
          <rect x="13" y="35" width="4" height="9"  rx="2" fill="url(#bone_grad)" />
          <rect x="22" y="35" width="4" height="9"  rx="2" fill="url(#bone_grad)" />
        </g>
      ) : (
        <g>
          <rect x="13" y="33" width="4" height="11" rx="2" fill="url(#bone_grad)" />
          <rect x="22" y="37" width="4" height="7"  rx="2" fill="url(#bone_grad)" />
        </g>
      )}
    </g>
  );
}

function Orc3D({ frame }) {
  return (
    <g>
      <defs>
        <radialGradient id="orc_skin" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#b06030" />
          <stop offset="60%" stopColor="#7a4020" />
          <stop offset="100%" stopColor="#3a1a08" />
        </radialGradient>
        <linearGradient id="orc_armor" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7a8090" />
          <stop offset="100%" stopColor="#2a3040" />
        </linearGradient>
      </defs>
      {/* Body */}
      <ellipse cx="20" cy="27" rx="12" ry="9" fill="url(#orc_skin)" />
      {/* Armor plates */}
      <ellipse cx="20" cy="25" rx="10" ry="7" fill="url(#orc_armor)" opacity="0.85" />
      <ellipse cx="19" cy="22" rx="6" ry="3.5" fill="#9ab0c0" opacity="0.4" />
      {/* Head */}
      <ellipse cx="20" cy="14" rx="10" ry="9" fill="url(#orc_skin)" />
      <ellipse cx="19" cy="11" rx="6" ry="4" fill="#c07040" opacity="0.4" />
      {/* Tusks */}
      <ellipse cx="15" cy="21" rx="2" ry="4" fill="ivory" />
      <ellipse cx="25" cy="21" rx="2" ry="4" fill="ivory" />
      <ellipse cx="15" cy="20" rx="1" ry="2.5" fill="#f0e8c0" opacity="0.6" />
      {/* Eyes */}
      <ellipse cx="16" cy="13" rx="3" ry="2.5" fill="#ffcc33" />
      <ellipse cx="24" cy="13" rx="3" ry="2.5" fill="#ffcc33" />
      <circle cx="16.5" cy="13.5" r="1.5" fill="#201000" />
      <circle cx="24.5" cy="13.5" r="1.5" fill="#201000" />
      {/* Brow ridge */}
      <path d="M12,10 Q16,8 20,9 Q24,8 28,10" fill="none" stroke="#3a1a08" strokeWidth="2" />
      {/* Arms */}
      <ellipse cx="8"  cy="27" rx="4" ry="7" fill="url(#orc_skin)" />
      <ellipse cx="32" cy="27" rx="4" ry="7" fill="url(#orc_skin)" />
      {/* Legs */}
      {frame === 0 ? (
        <g>
          <rect x="11" y="34" width="7" height="8" rx="3" fill="#3a1a08" />
          <rect x="22" y="34" width="7" height="8" rx="3" fill="#3a1a08" />
        </g>
      ) : (
        <g>
          <rect x="11" y="32" width="7" height="10" rx="3" fill="#3a1a08" />
          <rect x="22" y="36" width="7" height="6"  rx="3" fill="#3a1a08" />
        </g>
      )}
    </g>
  );
}

function Wraith3D({ frame }) {
  const glow = frame === 0 ? 0.9 : 0.6;
  return (
    <g>
      <defs>
        <radialGradient id="wraith_body" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#6060a0" />
          <stop offset="60%" stopColor="#30305a" />
          <stop offset="100%" stopColor="#101020" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      {/* Ghostly cloak */}
      <ellipse cx="20" cy="24" rx="14" ry="18" fill="url(#wraith_body)" opacity="0.85" />
      {/* Inner glow */}
      <ellipse cx="20" cy="20" rx="9" ry="11" fill="#8080c0" opacity="0.3" />
      {/* Spectral wisps at bottom */}
      <ellipse cx="14" cy="38" rx="3" ry="5" fill="#30305a" opacity="0.6" />
      <ellipse cx="20" cy="40" rx="3" ry="4" fill="#30305a" opacity={glow * 0.7} />
      <ellipse cx="26" cy="38" rx="3" ry="5" fill="#30305a" opacity="0.6" />
      {/* Hood / face area */}
      <ellipse cx="20" cy="13" rx="9" ry="8" fill="#20203a" opacity="0.9" />
      {/* Glowing eyes */}
      <ellipse cx="16" cy="13" rx="3" ry="2" fill="white" opacity={glow} />
      <ellipse cx="24" cy="13" rx="3" ry="2" fill="white" opacity={glow} />
      <circle cx="16" cy="13" r="1.5" fill="#a99cff" />
      <circle cx="24" cy="13" r="1.5" fill="#a99cff" />
      {/* Ghost hands */}
      <ellipse cx="7"  cy="25" rx="4" ry="6" fill="#30305a" opacity="0.7" />
      <ellipse cx="33" cy="25" rx="4" ry="6" fill="#30305a" opacity="0.7" />
      {/* Aura glow */}
      <ellipse cx="20" cy="22" rx="16" ry="20" fill="#a99cff" opacity={glow * 0.1} />
    </g>
  );
}

function Troll3D({ frame }) {
  return (
    <g>
      <defs>
        <radialGradient id="troll_skin" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#80c090" />
          <stop offset="60%" stopColor="#4a7a58" />
          <stop offset="100%" stopColor="#1e3828" />
        </radialGradient>
      </defs>
      {/* Huge body */}
      <ellipse cx="20" cy="26" rx="14" ry="11" fill="url(#troll_skin)" />
      <ellipse cx="19" cy="22" rx="9" ry="6" fill="#90d0a0" opacity="0.35" />
      {/* Large head */}
      <ellipse cx="20" cy="13" rx="11" ry="10" fill="url(#troll_skin)" />
      <ellipse cx="19" cy="10" rx="7" ry="5" fill="#90d0a0" opacity="0.35" />
      {/* Nose */}
      <ellipse cx="20" cy="16" rx="3" ry="2.5" fill="#3a6048" />
      {/* Eyes */}
      <ellipse cx="15" cy="11" rx="3" ry="2.5" fill="white" />
      <ellipse cx="25" cy="11" rx="3" ry="2.5" fill="white" />
      <circle cx="15.5" cy="11.5" r="1.5" fill="#101010" />
      <circle cx="25.5" cy="11.5" r="1.5" fill="#101010" />
      {/* Club weapon */}
      <rect x="3" y="8" width="4" height="20" rx="2" fill="#5a3a1f" />
      <ellipse cx="5" cy="8" rx="6" ry="5" fill="#4a3010" />
      <ellipse cx="4" cy="6" rx="3" ry="2.5" fill="#6a5028" opacity="0.6" />
      {/* Arms */}
      <ellipse cx="7"  cy="26" rx="5" ry="8" fill="url(#troll_skin)" />
      <ellipse cx="33" cy="26" rx="5" ry="8" fill="url(#troll_skin)" />
      {/* Legs */}
      {frame === 0 ? (
        <g>
          <rect x="10" y="35" width="8" height="7" rx="3" fill="#1e3828" />
          <rect x="22" y="35" width="8" height="7" rx="3" fill="#1e3828" />
        </g>
      ) : (
        <g>
          <rect x="10" y="33" width="8" height="9"  rx="3" fill="#1e3828" />
          <rect x="22" y="37" width="8" height="5"  rx="3" fill="#1e3828" />
        </g>
      )}
    </g>
  );
}

function Lich3D({ frame }) {
  const flameOpacity = frame === 0 ? 0.9 : 0.6;
  return (
    <g>
      <defs>
        <radialGradient id="lich_robe" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#8a2080" />
          <stop offset="60%" stopColor="#4a1050" />
          <stop offset="100%" stopColor="#1a0520" />
        </radialGradient>
        <radialGradient id="lich_skull" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f0ecd8" />
          <stop offset="70%" stopColor="#c8c0a0" />
          <stop offset="100%" stopColor="#807060" />
        </radialGradient>
      </defs>
      {/* Flowing robe */}
      <ellipse cx="20" cy="28" rx="13" ry="11" fill="url(#lich_robe)" />
      <ellipse cx="19" cy="24" rx="8" ry="6" fill="#c060b0" opacity="0.2" />
      {/* Skull head */}
      <ellipse cx="20" cy="12" rx="9" ry="9" fill="url(#lich_skull)" />
      <ellipse cx="19" cy="9" rx="6" ry="4" fill="#f5f0e0" opacity="0.4" />
      {/* Dark eye sockets */}
      <ellipse cx="16" cy="11" rx="3.5" ry="3.5" fill="#101020" />
      <ellipse cx="24" cy="11" rx="3.5" ry="3.5" fill="#101020" />
      <circle cx="16" cy="11" r="2" fill="#5ad1e8" opacity={flameOpacity} />
      <circle cx="24" cy="11" r="2" fill="#5ad1e8" opacity={flameOpacity} />
      {/* Nasal cavity */}
      <ellipse cx="20" cy="16" rx="1.5" ry="1" fill="#101020" />
      {/* Teeth */}
      {[16,18,20,22].map(x => (
        <rect key={x} x={x} y="18" width="1.8" height="2.5" rx="0.5" fill="ivory" />
      ))}
      {/* Staff */}
      <rect x="3" y="5" width="3" height="30" rx="1.5" fill="#3a2010" />
      <circle cx="4.5" cy="5" r="5" fill="#5ad1e8" opacity={flameOpacity} />
      <circle cx="4.5" cy="5" r="3" fill="#a0f0ff" opacity={flameOpacity * 0.8} />
      {/* Robe sleeves / arms */}
      <ellipse cx="9"  cy="26" rx="4" ry="8" fill="url(#lich_robe)" />
      <ellipse cx="31" cy="26" rx="4" ry="8" fill="url(#lich_robe)" />
      {/* Skeletal hands */}
      <ellipse cx="9"  cy="33" rx="3" ry="2.5" fill="url(#lich_skull)" />
      <ellipse cx="31" cy="33" rx="3" ry="2.5" fill="url(#lich_skull)" />
      {/* Dark aura */}
      <ellipse cx="20" cy="25" rx="16" ry="18" fill="#4a1050" opacity="0.15" />
    </g>
  );
}

function Dragon3D({ frame }) {
  return (
    <g>
      <defs>
        <radialGradient id="dragon_scale" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#e85040" />
          <stop offset="60%" stopColor="#a02020" />
          <stop offset="100%" stopColor="#501010" />
        </radialGradient>
        <linearGradient id="dragon_belly" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe080" />
          <stop offset="100%" stopColor="#c0a030" />
        </linearGradient>
      </defs>
      {/* Body */}
      <ellipse cx="18" cy="26" rx="14" ry="10" fill="url(#dragon_scale)" />
      {/* Belly */}
      <ellipse cx="18" cy="27" rx="9" ry="7" fill="url(#dragon_belly)" opacity="0.7" />
      {/* Wings */}
      <path d="M10,20 Q2,10 5,4 Q8,2 12,8 Q14,12 12,20 Z" fill="#701010" />
      <path d="M11,19 Q4,11 6,6 Q9,4 12,10 Q14,13 13,19 Z" fill="#a03030" opacity="0.6" />
      <path d="M26,20 Q34,10 31,4 Q28,2 24,8 Q22,12 24,20 Z" fill="#701010" />
      {/* Head */}
      <ellipse cx="32" cy="18" rx="9" ry="7" fill="url(#dragon_scale)" />
      <ellipse cx="32" cy="15" rx="6" ry="4" fill="#e85040" opacity="0.4" />
      {/* Snout */}
      <ellipse cx="39" cy="20" rx="5" ry="3.5" fill="#a02020" />
      {/* Nostrils */}
      <circle cx="38" cy="18.5" r="1" fill="#501010" />
      <circle cx="40" cy="18.5" r="1" fill="#501010" />
      {/* Eye */}
      <circle cx="33" cy="16" r="3" fill="#ffd700" />
      <circle cx="33.5" cy="16.5" r="1.5" fill="#101010" />
      <circle cx="34" cy="16" r="0.7" fill="white" />
      {/* Spines */}
      {[22,26,30,34].map((x, i) => (
        <polygon key={x} points={`${x},14 ${x+2},14 ${x+1},${8 - i}`} fill="#c03030" />
      ))}
      {/* Tail */}
      <path d="M5,26 Q0,28 2,32" fill="none" stroke="#a02020" strokeWidth="5" strokeLinecap="round" />
      <path d="M5,26 Q1,29 3,32" fill="none" stroke="#e85040" strokeWidth="2" strokeLinecap="round" />
      {/* Legs */}
      {frame === 0 ? (
        <g>
          <rect x="10" y="34" width="7" height="7" rx="3" fill="#701010" />
          <rect x="21" y="34" width="7" height="7" rx="3" fill="#701010" />
        </g>
      ) : (
        <g>
          <rect x="10" y="32" width="7" height="9"  rx="3" fill="#701010" />
          <rect x="21" y="36" width="7" height="5"  rx="3" fill="#701010" />
        </g>
      )}
      {/* Fire breath */}
      {frame === 0 && (
        <g opacity="0.7">
          <ellipse cx="43" cy="22" rx="5" ry="3" fill="#ff8020" />
          <ellipse cx="47" cy="23" rx="4" ry="2" fill="#ffd040" opacity="0.8" />
        </g>
      )}
    </g>
  );
}

/** Simple hook to drive a 2-frame walk cycle based on whether the entity is moving. */
export function useWalkFrame(isMoving, intervalMs = 220) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!isMoving) return undefined;
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), intervalMs);
    return () => clearInterval(id);
  }, [isMoving, intervalMs]);
  return isMoving ? frame : 0;
}
