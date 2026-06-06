import React, { useMemo } from "react";

/**
 * ForestMap — Pixel-art top-down forest tilemap background for the wave arena.
 * Pure CSS gradients + SVG decorations, no external assets.
 *
 * Decorations are placed at deterministic positions per `seed` so they don't
 * jump around as React re-renders, but vary by wave when desired.
 */

// Deterministic pseudo-random (Mulberry32)
function rng(seed) {
  let t = seed + 0x6D2B79F5;
  return function () {
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Decorative SVG sprites (kept tiny + pixel-feel)
function Tree({ size = 56, variant = 0 }) {
  const colors = [
    { trunk: "#5a3a1f", leaves: "#1f5d2a", shadow: "#143d1c" },
    { trunk: "#4a2f18", leaves: "#2a6e36", shadow: "#1d4a25" },
    { trunk: "#6a4624", leaves: "#3a7e3e", shadow: "#235a2e" },
  ];
  const c = colors[variant % colors.length];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.45))" }}
    >
      {/* trunk */}
      <rect x="7" y="11" width="2" height="4" fill={c.trunk} />
      {/* foliage layers */}
      <rect x="5" y="9" width="6" height="2" fill={c.shadow} />
      <rect x="4" y="6" width="8" height="3" fill={c.leaves} />
      <rect x="5" y="3" width="6" height="3" fill={c.leaves} />
      <rect x="6" y="1" width="4" height="2" fill={c.leaves} />
      {/* highlights */}
      <rect x="6" y="4" width="1" height="1" fill="#7fcf6a" />
      <rect x="9" y="2" width="1" height="1" fill="#7fcf6a" />
      <rect x="5" y="7" width="1" height="1" fill="#7fcf6a" />
    </svg>
  );
}

function Rock({ size = 38, variant = 0 }) {
  const palettes = [
    { base: "#7a7367", shade: "#534d44", high: "#a39b8c" },
    { base: "#6e6a60", shade: "#46433b", high: "#988f7f" },
  ];
  const c = palettes[variant % palettes.length];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.45))" }}
    >
      <rect x="3" y="10" width="10" height="3" fill={c.shade} />
      <rect x="4" y="7" width="8" height="3" fill={c.base} />
      <rect x="5" y="5" width="6" height="2" fill={c.base} />
      <rect x="6" y="4" width="4" height="1" fill={c.high} />
      <rect x="5" y="6" width="1" height="1" fill={c.high} />
      <rect x="10" y="6" width="1" height="1" fill={c.high} />
    </svg>
  );
}

function Bush({ size = 32, variant = 0 }) {
  const palettes = [
    { base: "#2a6e36", high: "#5fbe5a", shade: "#1c4a23" },
    { base: "#338040", high: "#74d066", shade: "#1f5527" },
  ];
  const c = palettes[variant % palettes.length];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.35))" }}
    >
      <rect x="3" y="9" width="10" height="3" fill={c.shade} />
      <rect x="2" y="6" width="12" height="4" fill={c.base} />
      <rect x="4" y="4" width="8" height="3" fill={c.base} />
      <rect x="5" y="5" width="1" height="1" fill={c.high} />
      <rect x="9" y="4" width="1" height="1" fill={c.high} />
      <rect x="3" y="7" width="1" height="1" fill={c.high} />
    </svg>
  );
}

function Mushroom({ size = 22, variant = 0 }) {
  const caps = ["#c0392b", "#a23b1c", "#7e5cd6"];
  const cap = caps[variant % caps.length];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.4))" }}
    >
      <rect x="6" y="9" width="4" height="4" fill="#eee2c1" />
      <rect x="4" y="5" width="8" height="4" fill={cap} />
      <rect x="5" y="3" width="6" height="2" fill={cap} />
      <rect x="6" y="6" width="1" height="1" fill="#fff" />
      <rect x="9" y="6" width="1" height="1" fill="#fff" />
    </svg>
  );
}

function Flower({ size = 16, variant = 0 }) {
  const colors = ["#f5d142", "#e85a96", "#5ad1e8"];
  const c = colors[variant % colors.length];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated" }}
    >
      <rect x="7" y="6" width="2" height="6" fill="#2e7d2c" />
      <rect x="6" y="4" width="4" height="2" fill={c} />
      <rect x="5" y="5" width="6" height="1" fill={c} />
      <rect x="7" y="3" width="2" height="1" fill={c} />
      <rect x="7" y="4" width="2" height="1" fill="#fff" />
    </svg>
  );
}

const DECOR_TYPES = [
  { Comp: Tree, w: 56, weight: 4 },
  { Comp: Tree, w: 64, weight: 3 },
  { Comp: Rock, w: 36, weight: 3 },
  { Comp: Bush, w: 32, weight: 4 },
  { Comp: Mushroom, w: 22, weight: 2 },
  { Comp: Flower, w: 14, weight: 5 },
];

function pickDecor(r) {
  const total = DECOR_TYPES.reduce((a, b) => a + b.weight, 0);
  let pick = r() * total;
  for (const d of DECOR_TYPES) {
    pick -= d.weight;
    if (pick <= 0) return d;
  }
  return DECOR_TYPES[0];
}

/**
 * @param {{ seed?: number, count?: number, exclusionRadius?: number }} props
 *   - seed: deterministic decoration layout (defaults to 7 — keep "forest scene" stable across waves)
 *   - count: number of decorations
 */
export default function ForestMap({ seed = 7, count = 22 }) {
  const decor = useMemo(() => {
    const r = rng(seed);
    const items = [];
    for (let i = 0; i < count; i++) {
      const d = pickDecor(r);
      const x = r() * 100; // % of arena width
      const y = r() * 100; // % of arena height
      const variant = Math.floor(r() * 3);
      const flip = r() > 0.5;
      // Keep play area more or less clear; push decor toward edges
      const edgeBias = Math.min(x, 100 - x, y, 100 - y);
      if (edgeBias > 22 && r() > 0.35) continue; // skip too-central spawns
      items.push({ id: i, d, x, y, variant, flip });
    }
    return items;
  }, [seed, count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Base tiled grass — layered radial gradients = pixel grass clumps */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#4a8a3a",
          backgroundImage: `
            radial-gradient(circle at 12% 18%, #5fae46 0 6px, transparent 7px),
            radial-gradient(circle at 78% 24%, #5fae46 0 5px, transparent 6px),
            radial-gradient(circle at 35% 70%, #57a341 0 5px, transparent 6px),
            radial-gradient(circle at 88% 82%, #3d7a2e 0 6px, transparent 7px),
            radial-gradient(circle at 50% 50%, #57a341 0 4px, transparent 5px),
            repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 2px, transparent 2px 6px),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px)
          `,
          backgroundSize: "120px 120px, 90px 90px, 110px 110px, 130px 130px, 70px 70px, auto, auto",
          imageRendering: "pixelated",
        }}
      />
      {/* Dirt patches (lighter areas, like trampled paths) */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80px 40px at 18% 60%, #9c7a3f 0%, transparent 70%),
            radial-gradient(ellipse 120px 60px at 70% 40%, #8a6a35 0%, transparent 70%),
            radial-gradient(ellipse 60px 30px at 50% 85%, #a08249 0%, transparent 65%)
          `,
        }}
      />
      {/* Stone borders (top and bottom) like in Pixlands */}
      <div
        className="absolute left-0 right-0 bottom-0 h-10 opacity-55"
        style={{
          backgroundImage: `
            radial-gradient(circle at 10% 60%, #6e6a60 0 8px, transparent 9px),
            radial-gradient(circle at 30% 80%, #534d44 0 10px, transparent 11px),
            radial-gradient(circle at 50% 70%, #7a7367 0 9px, transparent 10px),
            radial-gradient(circle at 75% 85%, #6e6a60 0 11px, transparent 12px),
            radial-gradient(circle at 92% 65%, #534d44 0 8px, transparent 9px)
          `,
          backgroundColor: "transparent",
        }}
      />
      {/* Decorations layer */}
      <div className="absolute inset-0">
        {decor.map((it) => {
          const { Comp, w } = it.d;
          return (
            <div
              key={it.id}
              className="absolute"
              style={{
                left: `${it.x}%`,
                top: `${it.y}%`,
                transform: `translate(-50%, -50%) ${it.flip ? "scaleX(-1)" : ""}`,
                opacity: 0.95,
              }}
            >
              <Comp size={w} variant={it.variant} />
            </div>
          );
        })}
      </div>
      {/* Soft vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </div>
  );
}
