import React, { useMemo } from "react";

const TILE = 48;

function rng(seed) {
  let t = seed + 0x6D2B79F5;
  return function () {
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STONE_VARIANTS = [
  { bg: "#28221c", hi: "#382e26", sh: "#181210" },
  { bg: "#252018", hi: "#342a20", sh: "#161008" },
  { bg: "#2c2620", hi: "#3c3028", sh: "#1c1610" },
  { bg: "#221e18", hi: "#302820", sh: "#14100a" },
  { bg: "#2a2418", hi: "#3a2e22", sh: "#1a1408" },
];

function Torch({ x, y }) {
  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y, zIndex: 5 }}>
      <svg width="14" height="24" viewBox="0 0 14 24">
        <rect x="5" y="14" width="4" height="10" rx="1" fill="#5a3a10" />
        <rect x="4" y="10" width="6" height="5"  rx="1" fill="#7a5020" />
        <ellipse cx="7" cy="9"  rx="3.5" ry="5" fill="#ff9020" opacity="0.9" />
        <ellipse cx="7" cy="7"  rx="2"   ry="3" fill="#ffcc40" opacity="0.9" />
        <ellipse cx="7" cy="6"  rx="1"   ry="1.5" fill="#fffacc" />
      </svg>
      <div
        className="absolute"
        style={{
          width: 80, height: 80,
          left: -33, top: -30,
          background: "radial-gradient(circle, rgba(255,160,30,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export default function DungeonMap({ cols = 12, rows = 10, seed = 1 }) {
  const { tileData, torches } = useMemo(() => {
    const r = rng(seed * 7919 + 31337);
    const tiles = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        tiles.push({
          col, row,
          v: Math.floor(r() * STONE_VARIANTS.length),
          crack: r() < 0.07,
          moss:  r() < 0.06,
          stain: r() < 0.05,
        });
      }
    }
    const torchList = [];
    if (cols >= 4 && rows >= 3) {
      torchList.push({ x: TILE * 1 + TILE / 2 - 7,       y: TILE * 1 - 12 });
      torchList.push({ x: TILE * (cols - 2) + TILE / 2 - 7, y: TILE * 1 - 12 });
      if (rows >= 6) {
        torchList.push({ x: TILE * 1 + TILE / 2 - 7,          y: TILE * (rows - 2) - 12 });
        torchList.push({ x: TILE * (cols - 2) + TILE / 2 - 7, y: TILE * (rows - 2) - 12 });
      }
    }
    return { tileData: tiles, torches: torchList };
  }, [cols, rows, seed]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0" style={{ backgroundColor: "#12100c" }} />

      {tileData.map(({ col, row, v, crack, moss, stain }) => {
        const tv = STONE_VARIANTS[v];
        return (
          <div
            key={`${col}-${row}`}
            className="absolute"
            style={{
              left:  col * TILE,
              top:   row * TILE,
              width:  TILE,
              height: TILE,
              backgroundColor: tv.bg,
              borderRight:  `1px solid ${tv.sh}`,
              borderBottom: `1px solid ${tv.sh}`,
              boxShadow: `inset 1px 1px 0 ${tv.hi}`,
            }}
          >
            {crack && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48" style={{ opacity: 0.22 }}>
                <path d="M10,6 L18,22 L13,30 L21,44" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M32,4 L27,16 L34,24"          stroke="#000" strokeWidth="1"   fill="none" strokeLinecap="round" />
              </svg>
            )}
            {moss && (
              <div className="absolute bottom-0 inset-x-0 h-3" style={{ background: "rgba(30,60,15,0.45)", borderRadius: "0 0 2px 2px" }} />
            )}
            {stain && (
              <div className="absolute" style={{ width: 14, height: 9, left: 14, top: 20, background: "#3a0808", borderRadius: "50%", opacity: 0.35 }} />
            )}
          </div>
        );
      })}

      {torches.map((t, i) => <Torch key={i} x={t.x} y={t.y} />)}

      <div className="absolute inset-x-0 top-0 h-5"    style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 h-5" style={{ background: "linear-gradient(to top,    rgba(0,0,0,0.7), transparent)" }} />
      <div className="absolute inset-y-0 left-0 w-5"   style={{ background: "linear-gradient(to right,  rgba(0,0,0,0.6), transparent)" }} />
      <div className="absolute inset-y-0 right-0 w-5"  style={{ background: "linear-gradient(to left,   rgba(0,0,0,0.6), transparent)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />
    </div>
  );
}
