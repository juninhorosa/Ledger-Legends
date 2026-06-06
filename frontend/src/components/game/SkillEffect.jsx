import React from "react";
import Lottie from "lottie-react";

// Inline Lottie animation data for skill VFX (lightweight, no external fetch).
// These are minimal hand-built JSON for fire/slash/heal effects.
// In production you can replace with high-quality Lottie files.

const FIRE_VFX = {
  v: "5.7.4", fr: 30, ip: 0, op: 30, w: 300, h: 300, nm: "Fire", ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: "Flame", sr: 1,
    ks: {
      o: { a: 1, k: [{ t: 0, s: [0] }, { t: 6, s: [100] }, { t: 24, s: [100] }, { t: 30, s: [0] }] },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [150, 150, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ t: 0, s: [10, 10, 100] }, { t: 15, s: [150, 150, 100] }, { t: 30, s: [200, 200, 100] }] },
    },
    shapes: [{
      ty: "gr",
      it: [
        { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 140] }, d: 1, nm: "Ellipse" },
        { ty: "fl", c: { a: 1, k: [{ t: 0, s: [1, 0.9, 0.2, 1] }, { t: 15, s: [1, 0.5, 0.1, 1] }, { t: 30, s: [0.8, 0.1, 0.05, 1] }] }, o: { a: 0, k: 100 }, nm: "Fill" },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ],
      nm: "Group",
    }],
    ip: 0, op: 30, st: 0, bm: 0,
  }],
};

const SLASH_VFX = {
  v: "5.7.4", fr: 30, ip: 0, op: 24, w: 300, h: 300, nm: "Slash", ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: "Slash", sr: 1,
    ks: {
      o: { a: 1, k: [{ t: 0, s: [0] }, { t: 6, s: [100] }, { t: 18, s: [100] }, { t: 24, s: [0] }] },
      r: { a: 1, k: [{ t: 0, s: [-25] }, { t: 24, s: [35] }] },
      p: { a: 0, k: [150, 150, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ t: 0, s: [50, 50, 100] }, { t: 24, s: [180, 180, 100] }] },
    },
    shapes: [{
      ty: "gr",
      it: [
        { ty: "rc", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [240, 14] }, r: { a: 0, k: 6 }, nm: "Rect" },
        { ty: "fl", c: { a: 0, k: [1, 0.95, 0.6, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ],
    }],
    ip: 0, op: 24, st: 0, bm: 0,
  }],
};

const HEAL_VFX = {
  v: "5.7.4", fr: 30, ip: 0, op: 30, w: 300, h: 300, nm: "Heal", ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: "Halo", sr: 1,
    ks: {
      o: { a: 1, k: [{ t: 0, s: [0] }, { t: 6, s: [80] }, { t: 24, s: [80] }, { t: 30, s: [0] }] },
      r: { a: 1, k: [{ t: 0, s: [0] }, { t: 30, s: [180] }] },
      p: { a: 0, k: [150, 150, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ t: 0, s: [40, 40, 100] }, { t: 30, s: [180, 180, 100] }] },
    },
    shapes: [{
      ty: "gr",
      it: [
        { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [180, 180] }, d: 1, nm: "Ring" },
        { ty: "st", c: { a: 0, k: [0.4, 1, 0.6, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 8 }, lc: 2, lj: 2, nm: "Stroke" },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ],
    }],
    ip: 0, op: 30, st: 0, bm: 0,
  }],
};

const VFX = { fire: FIRE_VFX, slash: SLASH_VFX, heal: HEAL_VFX };

export default function SkillEffect({ effect, onComplete }) {
  if (!effect) return null;
  const data = VFX[effect] || VFX.slash;
  return (
    <div
      data-testid={`skill-effect-${effect}`}
      className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center"
    >
      <Lottie
        animationData={data}
        loop={false}
        autoplay
        onComplete={onComplete}
        style={{ width: "100%", height: "100%", maxWidth: 400, maxHeight: 400 }}
      />
    </div>
  );
}
