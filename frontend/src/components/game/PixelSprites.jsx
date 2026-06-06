import React, { useEffect, useState } from "react";

/**
 * Pixel-art SVG sprites for hero & monsters.
 * Drawn as <rect> grids (no external assets). Scaled with `image-rendering: pixelated`.
 *
 * All sprites are 16x16 in their viewBox. Pass `size` for px dimensions.
 */

const PIXEL = { shapeRendering: "crispEdges", imageRendering: "pixelated" };

/**
 * Hero sprite — adventurer with sword + shield.
 *  - facing: 'right' | 'left'  (flip horizontally)
 *  - frame: 0 | 1   (walk-cycle leg swap)
 *  - state: 'idle' | 'walk' | 'attack' | 'cast' | 'victory'
 *  - klass: 'warrior' | 'paladin' | 'mage'  (WoW-themed palette + weapon)
 */
const CLASS_PALETTE = {
  warrior: {
    tunic: "#a8341f",       // dark-red plate
    tunicShade: "#6e1e10",
    pants: "#3a2410",
    boots: "#1a0e08",
    shield: "#5a3a1f",
    shieldRim: "#2c1a0c",
    accent: "#f0b144",      // golden trim
    weapon: "axe",
  },
  paladin: {
    tunic: "#dccd8f",       // gold-silver holy plate
    tunicShade: "#a8954e",
    pants: "#3a4250",
    boots: "#1d2533",
    shield: "#f5d142",      // gold shield with red cross drawn later
    shieldRim: "#a67c0c",
    accent: "#ffffff",
    weapon: "hammer",
  },
  mage: {
    tunic: "#5a39b6",       // arcane purple robe
    tunicShade: "#3a1f7a",
    pants: "#2c1a52",
    boots: "#1a0e30",
    shield: null,            // no shield, just staff
    shieldRim: null,
    accent: "#5ad1e8",
    weapon: "staff",
  },
};

export function PixelHero({ size = 64, facing = "right", frame = 0, state = "idle", klass = "warrior" }) {
  const attack = state === "attack";
  const cast = state === "cast";
  const pal = CLASS_PALETTE[klass] || CLASS_PALETTE.warrior;

  // Common palette
  const skin = "#f3c19a";
  const skinShade = "#c89167";
  const hair = klass === "mage" ? "#2a1f4a" : "#3a2410";
  const belt = "#5a3a1f";
  const outline = "#1a0e08";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ ...PIXEL, transform: facing === "left" ? "scaleX(-1)" : undefined, overflow: "visible" }}
    >
      {/* Drop shadow under feet */}
      <ellipse cx="8" cy="15.4" rx="3.4" ry="0.6" fill="rgba(0,0,0,0.45)" />

      {/* Mage hood / Warrior horns / Paladin halo */}
      {klass === "mage" && (
        <>
          <rect x="5" y="0" width="6" height="2" fill={pal.tunic} />
          <rect x="4" y="1" width="8" height="1" fill={pal.tunicShade} />
          <rect x="6" y="2" width="4" height="1" fill={pal.tunic} />
        </>
      )}
      {klass === "warrior" && (
        <>
          {/* Helmet horns */}
          <rect x="4" y="1" width="1" height="1" fill={pal.shieldRim} />
          <rect x="11" y="1" width="1" height="1" fill={pal.shieldRim} />
          <rect x="5" y="1" width="6" height="1" fill={pal.tunicShade} />
        </>
      )}
      {klass === "paladin" && (
        <>
          {/* Holy halo */}
          <rect x="5" y="0" width="6" height="1" fill={pal.accent} opacity="0.9" />
          <rect x="4" y="0" width="1" height="1" fill={pal.accent} opacity="0.5" />
          <rect x="11" y="0" width="1" height="1" fill={pal.accent} opacity="0.5" />
        </>
      )}

      {/* Head */}
      <rect x="6" y="1" width="4" height="3" fill={skin} />
      {klass !== "mage" && <rect x="6" y="1" width="4" height="1" fill={hair} />}
      {klass !== "mage" && <rect x="5" y="2" width="1" height="2" fill={hair} />}
      {klass !== "mage" && <rect x="10" y="2" width="1" height="1" fill={hair} />}
      {/* Eyes */}
      <rect x="7" y="2" width="1" height="1" fill={outline} />
      <rect x="9" y="2" width="1" height="1" fill={outline} />
      {/* Cheek shade */}
      <rect x="6" y="3" width="1" height="1" fill={skinShade} />

      {/* Neck */}
      <rect x="7" y="4" width="2" height="1" fill={skinShade} />

      {/* Torso (tunic / armor / robe) */}
      <rect x="5" y="5" width="6" height="3" fill={pal.tunic} />
      <rect x="5" y="7" width="6" height="1" fill={pal.tunicShade} />
      {/* Class emblem on chest */}
      {klass === "paladin" && (
        <>
          <rect x="7" y="6" width="2" height="1" fill="#c0392b" />
          <rect x="7" y="5" width="2" height="2" fill="#c0392b" opacity="0.4" />
        </>
      )}
      {klass === "mage" && (
        <rect x="7" y="6" width="2" height="1" fill={pal.accent} />
      )}
      {/* Belt */}
      <rect x="5" y="8" width="6" height="1" fill={belt} />

      {/* Shield (left arm — visible on right when facing right because of mirror) */}
      {pal.shield && (
        <>
          <rect x="3" y="5" width="2" height="3" fill={pal.shield} />
          <rect x="3" y="5" width="2" height="1" fill={pal.shieldRim} />
          <rect x="3" y="7" width="2" height="1" fill={pal.shieldRim} />
          {klass === "paladin" && (
            <>
              {/* gold cross */}
              <rect x="3" y="6" width="2" height="1" fill="#c0392b" />
              <rect x="3" y="5" width="2" height="3" fill="none" />
            </>
          )}
          {klass === "warrior" && (
            <rect x="3" y="6" width="1" height="1" fill="#e07a7a" />
          )}
        </>
      )}

      {/* Sword / Weapon arm */}
      {attack ? (
        // Swing forward
        <>
          {klass === "mage" ? (
            // Staff projecting magic
            <>
              <rect x="11" y="3" width="1" height="7" fill="#5a3a1f" />
              <rect x="10" y="2" width="3" height="2" fill={pal.accent} />
              <rect x="11" y="1" width="1" height="1" fill="#fff" />
            </>
          ) : klass === "paladin" ? (
            // Hammer
            <>
              <rect x="11" y="5" width="1" height="2" fill={skin} />
              <rect x="12" y="3" width="1" height="6" fill="#5a3a1f" />
              <rect x="11" y="2" width="3" height="2" fill={pal.shield} />
              <rect x="11" y="2" width="3" height="1" fill={pal.shieldRim} />
            </>
          ) : (
            // Warrior axe
            <>
              <rect x="11" y="5" width="1" height="2" fill={skin} />
              <rect x="12" y="4" width="1" height="5" fill={pal.accent} />
              <rect x="13" y="2" width="1" height="3" fill={pal.shieldRim} />
              <rect x="14" y="3" width="1" height="2" fill={pal.shieldRim} />
            </>
          )}
        </>
      ) : cast ? (
        // Raised arm casting
        <>
          <rect x="11" y="3" width="1" height="3" fill={skin} />
          <rect x="11" y="2" width="1" height="1" fill={pal.accent} opacity="0.9" />
          <rect x="10" y="1" width="3" height="1" fill={pal.accent} opacity="0.7" />
        </>
      ) : (
        // Resting weapon by side
        <>
          {klass === "mage" ? (
            <>
              {/* Staff */}
              <rect x="11" y="3" width="1" height="9" fill="#5a3a1f" />
              <rect x="10" y="2" width="3" height="2" fill={pal.accent} />
              <rect x="11" y="3" width="1" height="1" fill="#fff" />
            </>
          ) : klass === "paladin" ? (
            <>
              {/* Hammer down */}
              <rect x="11" y="5" width="1" height="3" fill={skin} />
              <rect x="11" y="8" width="1" height="3" fill="#5a3a1f" />
              <rect x="10" y="3" width="3" height="2" fill={pal.shield} />
              <rect x="10" y="3" width="3" height="1" fill={pal.shieldRim} />
            </>
          ) : (
            <>
              {/* Warrior axe down */}
              <rect x="11" y="5" width="1" height="3" fill={skin} />
              <rect x="11" y="8" width="1" height="3" fill="#5a3a1f" />
              <rect x="10" y="3" width="2" height="3" fill={pal.shieldRim} />
              <rect x="12" y="4" width="1" height="2" fill={pal.accent} />
            </>
          )}
        </>
      )}

      {/* Pants / robe-bottom */}
      <rect x="5" y="9" width="6" height="3" fill={pal.pants} />

      {/* Legs / boots — alternate per frame */}
      {frame === 0 ? (
        <>
          <rect x="5" y="12" width="2" height="2" fill={pal.pants} />
          <rect x="5" y="14" width="2" height="1" fill={pal.boots} />
          <rect x="9" y="12" width="2" height="2" fill={pal.pants} />
          <rect x="9" y="14" width="2" height="1" fill={pal.boots} />
        </>
      ) : (
        <>
          <rect x="5" y="12" width="2" height="1" fill={pal.pants} />
          <rect x="5" y="13" width="2" height="2" fill={pal.pants} />
          <rect x="5" y="14" width="2" height="1" fill={pal.boots} />
          <rect x="9" y="13" width="2" height="2" fill={pal.pants} />
          <rect x="9" y="14" width="2" height="1" fill={pal.boots} />
        </>
      )}

      {/* Cast aura */}
      {cast && (
        <>
          <rect x="2" y="0" width="1" height="1" fill={pal.accent} opacity="0.7" />
          <rect x="13" y="0" width="1" height="1" fill={pal.accent} opacity="0.7" />
          <rect x="0" y="3" width="1" height="1" fill={pal.accent} opacity="0.7" />
        </>
      )}
    </svg>
  );
}

/** Generic body: head + body silhouette per monster type. */
export function MonsterSprite({ kind = "wolf", size = 56, facing = "left", frame = 0, isBoss = false }) {
  const w = isBoss ? size * 1.5 : size;
  // Each sub-renderer returns SVG children for a 16x16 grid.
  const Body = (
    kind === "wolf" ? <Wolf frame={frame} /> :
    kind === "goblin" ? <Goblin frame={frame} /> :
    kind === "skeleton" ? <Skeleton frame={frame} /> :
    kind === "orc" ? <Orc frame={frame} /> :
    kind === "wraith" ? <Wraith frame={frame} /> :
    kind === "troll" ? <Troll frame={frame} /> :
    kind === "lich" ? <Lich frame={frame} /> :
    kind === "dragon" ? <Dragon frame={frame} /> :
    <Goblin frame={frame} />
  );
  return (
    <svg
      width={w}
      height={w}
      viewBox="0 0 16 16"
      style={{ ...PIXEL, transform: facing === "right" ? "scaleX(-1)" : undefined, overflow: "visible" }}
    >
      <ellipse cx="8" cy="15.4" rx="4.2" ry="0.7" fill="rgba(0,0,0,0.5)" />
      {Body}
    </svg>
  );
}

function Wolf({ frame }) {
  const fur = "#7a7a7a";
  const furD = "#4a4a4a";
  const eye = "#ffd34d";
  const tongue = "#e25b5b";
  return (
    <>
      {/* body */}
      <rect x="3" y="8" width="9" height="4" fill={fur} />
      <rect x="3" y="11" width="9" height="1" fill={furD} />
      {/* head */}
      <rect x="11" y="6" width="4" height="4" fill={fur} />
      <rect x="11" y="9" width="4" height="1" fill={furD} />
      {/* ears */}
      <rect x="11" y="5" width="1" height="1" fill={fur} />
      <rect x="14" y="5" width="1" height="1" fill={fur} />
      {/* eye */}
      <rect x="13" y="7" width="1" height="1" fill={eye} />
      {/* snout */}
      <rect x="15" y="8" width="1" height="1" fill={furD} />
      <rect x="15" y="9" width="1" height="1" fill={tongue} />
      {/* tail */}
      <rect x="1" y="7" width="2" height="2" fill={fur} />
      <rect x="1" y="8" width="2" height="1" fill={furD} />
      {/* legs */}
      {frame === 0 ? (
        <>
          <rect x="4" y="12" width="1" height="3" fill={furD} />
          <rect x="6" y="12" width="1" height="2" fill={furD} />
          <rect x="9" y="12" width="1" height="3" fill={furD} />
          <rect x="11" y="12" width="1" height="2" fill={furD} />
        </>
      ) : (
        <>
          <rect x="4" y="12" width="1" height="2" fill={furD} />
          <rect x="6" y="12" width="1" height="3" fill={furD} />
          <rect x="9" y="12" width="1" height="2" fill={furD} />
          <rect x="11" y="12" width="1" height="3" fill={furD} />
        </>
      )}
    </>
  );
}

function Goblin({ frame }) {
  const skin = "#5fbe5a";
  const skinD = "#2e6f2c";
  const tunic = "#7a4a2a";
  const eye = "#ff3535";
  const tooth = "#fffacd";
  return (
    <>
      {/* head */}
      <rect x="5" y="2" width="6" height="4" fill={skin} />
      <rect x="5" y="5" width="6" height="1" fill={skinD} />
      {/* ears */}
      <rect x="3" y="3" width="2" height="1" fill={skin} />
      <rect x="11" y="3" width="2" height="1" fill={skin} />
      <rect x="3" y="4" width="1" height="1" fill={skinD} />
      <rect x="12" y="4" width="1" height="1" fill={skinD} />
      {/* eyes */}
      <rect x="6" y="3" width="1" height="1" fill={eye} />
      <rect x="9" y="3" width="1" height="1" fill={eye} />
      {/* tooth */}
      <rect x="7" y="5" width="2" height="1" fill={tooth} />
      {/* body */}
      <rect x="5" y="7" width="6" height="4" fill={tunic} />
      <rect x="5" y="10" width="6" height="1" fill="#4a2a18" />
      {/* arms */}
      <rect x="3" y="7" width="2" height="3" fill={skin} />
      <rect x="11" y="7" width="2" height="3" fill={skin} />
      {/* legs */}
      {frame === 0 ? (
        <>
          <rect x="5" y="11" width="2" height="3" fill={skinD} />
          <rect x="9" y="11" width="2" height="3" fill={skinD} />
        </>
      ) : (
        <>
          <rect x="5" y="11" width="2" height="4" fill={skinD} />
          <rect x="9" y="11" width="2" height="2" fill={skinD} />
        </>
      )}
    </>
  );
}

function Skeleton({ frame }) {
  const bone = "#e8e2cf";
  const boneD = "#a59f8a";
  const eye = "#5ad1e8";
  return (
    <>
      <rect x="5" y="2" width="6" height="4" fill={bone} />
      <rect x="5" y="5" width="6" height="1" fill={boneD} />
      <rect x="6" y="3" width="1" height="1" fill={eye} />
      <rect x="9" y="3" width="1" height="1" fill={eye} />
      <rect x="7" y="5" width="2" height="1" fill="#222" />
      <rect x="5" y="7" width="6" height="4" fill={bone} />
      <rect x="6" y="8" width="1" height="2" fill={boneD} />
      <rect x="9" y="8" width="1" height="2" fill={boneD} />
      <rect x="3" y="7" width="2" height="3" fill={bone} />
      <rect x="11" y="7" width="2" height="3" fill={bone} />
      {frame === 0 ? (
        <>
          <rect x="5" y="11" width="2" height="4" fill={bone} />
          <rect x="9" y="11" width="2" height="3" fill={bone} />
        </>
      ) : (
        <>
          <rect x="5" y="11" width="2" height="3" fill={bone} />
          <rect x="9" y="11" width="2" height="4" fill={bone} />
        </>
      )}
    </>
  );
}

function Orc({ frame }) {
  const skin = "#7a4a2a";
  const skinD = "#3a230f";
  const armor = "#3a4250";
  const eye = "#ffcc33";
  const tusk = "#f0e6c8";
  return (
    <>
      <rect x="4" y="2" width="8" height="4" fill={skin} />
      <rect x="4" y="5" width="8" height="1" fill={skinD} />
      <rect x="5" y="3" width="1" height="1" fill={eye} />
      <rect x="10" y="3" width="1" height="1" fill={eye} />
      <rect x="6" y="5" width="1" height="2" fill={tusk} />
      <rect x="9" y="5" width="1" height="2" fill={tusk} />
      <rect x="4" y="7" width="8" height="4" fill={armor} />
      <rect x="5" y="8" width="2" height="2" fill="#5a6678" />
      <rect x="9" y="8" width="2" height="2" fill="#5a6678" />
      <rect x="2" y="7" width="2" height="4" fill={skin} />
      <rect x="12" y="7" width="2" height="4" fill={skin} />
      {frame === 0 ? (
        <>
          <rect x="4" y="11" width="3" height="4" fill={skinD} />
          <rect x="9" y="11" width="3" height="3" fill={skinD} />
        </>
      ) : (
        <>
          <rect x="4" y="11" width="3" height="3" fill={skinD} />
          <rect x="9" y="11" width="3" height="4" fill={skinD} />
        </>
      )}
    </>
  );
}

function Wraith({ frame }) {
  const cloak = "#3a3252";
  const cloakD = "#1f1a30";
  const glow = "#a99cff";
  const eye = "#fff";
  return (
    <>
      <rect x="3" y="3" width="10" height="9" fill={cloak} />
      <rect x="3" y="11" width="10" height="1" fill={cloakD} />
      <rect x="5" y="1" width="6" height="2" fill={cloak} />
      <rect x="5" y="6" width="2" height="1" fill={eye} />
      <rect x="9" y="6" width="2" height="1" fill={eye} />
      <rect x="2" y="5" width="1" height="4" fill={cloakD} />
      <rect x="13" y="5" width="1" height="4" fill={cloakD} />
      {/* glow tendrils */}
      <rect x="6" y="13" width="1" height={frame === 0 ? "2" : "1"} fill={glow} opacity="0.6" />
      <rect x="9" y="13" width="1" height={frame === 0 ? "1" : "2"} fill={glow} opacity="0.6" />
    </>
  );
}

function Troll({ frame }) {
  const skin = "#5a8a6e";
  const skinD = "#28473a";
  const club = "#5a3a1f";
  return (
    <>
      <rect x="4" y="1" width="8" height="5" fill={skin} />
      <rect x="4" y="5" width="8" height="1" fill={skinD} />
      <rect x="6" y="3" width="1" height="1" fill="#fff" />
      <rect x="9" y="3" width="1" height="1" fill="#fff" />
      <rect x="3" y="6" width="10" height="6" fill={skin} />
      <rect x="3" y="11" width="10" height="1" fill={skinD} />
      <rect x="1" y="6" width="2" height="5" fill={skin} />
      <rect x="13" y="6" width="2" height="5" fill={skin} />
      <rect x="0" y="3" width="2" height="4" fill={club} />
      {frame === 0 ? (
        <>
          <rect x="4" y="12" width="3" height="3" fill={skinD} />
          <rect x="9" y="12" width="3" height="3" fill={skinD} />
        </>
      ) : (
        <>
          <rect x="4" y="12" width="3" height="2" fill={skinD} />
          <rect x="9" y="12" width="3" height="3" fill={skinD} />
        </>
      )}
    </>
  );
}

function Lich({ frame }) {
  const cloak = "#5a1f5a";
  const cloakD = "#2c0c2c";
  const bone = "#e8e2cf";
  const flame = "#5ad1e8";
  return (
    <>
      <rect x="4" y="1" width="8" height="2" fill={cloakD} />
      <rect x="5" y="3" width="6" height="3" fill={bone} />
      <rect x="6" y="4" width="1" height="1" fill={flame} />
      <rect x="9" y="4" width="1" height="1" fill={flame} />
      <rect x="4" y="6" width="8" height="6" fill={cloak} />
      <rect x="4" y="11" width="8" height="1" fill={cloakD} />
      <rect x="2" y="7" width="2" height="4" fill={cloak} />
      <rect x="12" y="7" width="2" height="4" fill={cloak} />
      {/* staff */}
      <rect x="1" y="2" width="1" height="9" fill="#3a2410" />
      <rect x="0" y="1" width="3" height="2" fill={flame} opacity={frame === 0 ? 0.9 : 0.6} />
      {/* hem */}
      <rect x="4" y="12" width="8" height="3" fill={cloakD} />
    </>
  );
}

function Dragon({ frame }) {
  const scale = "#c0392b";
  const scaleD = "#7a1f15";
  const belly = "#f5d142";
  const eye = "#fff";
  return (
    <>
      <rect x="2" y="9" width="11" height="4" fill={scale} />
      <rect x="2" y="12" width="11" height="1" fill={scaleD} />
      <rect x="3" y="10" width="9" height="1" fill={belly} />
      <rect x="11" y="5" width="4" height="5" fill={scale} />
      <rect x="11" y="9" width="4" height="1" fill={scaleD} />
      <rect x="12" y="3" width="2" height="2" fill={scale} />
      <rect x="14" y="2" width="1" height="2" fill={scale} />
      <rect x="13" y="6" width="1" height="1" fill={eye} />
      <rect x="13" y="8" width="2" height="1" fill={belly} />
      {/* wings */}
      <rect x="3" y="4" width="6" height="4" fill={scaleD} />
      <rect x="3" y="4" width="6" height="1" fill={scale} opacity="0.6" />
      <rect x="1" y="5" width="2" height="3" fill={scaleD} />
      {/* legs */}
      {frame === 0 ? (
        <>
          <rect x="3" y="13" width="2" height="2" fill={scaleD} />
          <rect x="10" y="13" width="2" height="2" fill={scaleD} />
        </>
      ) : (
        <>
          <rect x="3" y="13" width="2" height="1" fill={scaleD} />
          <rect x="10" y="13" width="2" height="2" fill={scaleD} />
        </>
      )}
    </>
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
