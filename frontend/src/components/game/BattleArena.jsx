import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useGame } from "../../store/gameStore";
import { MONSTER_SPRITES } from "../../game/items";
import { useI18n } from "../../i18n/I18nContext";
import { hapticImpact } from "../../lib/telegram";
import { Skull } from "lucide-react";
import SkillEffect from "./SkillEffect";

const HERO_AVATAR = "https://images.unsplash.com/photo-1773216344064-e1231ff27d09?w=400&q=70";
const HERO_RADIUS = 36;
const MONSTER_RADIUS = 36;
const BOSS_RADIUS = 50;
const ATTACK_RANGE = 140;
const BASE_MONSTER_SPEED = 70;

export default function BattleArena() {
  const { t, lang } = useI18n();
  const monsters = useGame((s) => s.monsters);
  const wave = useGame((s) => s.wave);
  const heroState = useGame((s) => s.heroState);
  const activeEffect = useGame((s) => s.activeEffect);
  const damageNumbers = useGame((s) => s.damageNumbers);

  const arenaRef = useRef(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  const prevWaveRef = useRef(wave);
  const [dyingIds, setDyingIds] = useState({});

  // Hero motion values
  const heroX = useMotionValue(120);
  const heroY = useMotionValue(200);
  const heroSpringX = useSpring(heroX, { stiffness: 280, damping: 26 });
  const heroSpringY = useSpring(heroY, { stiffness: 280, damping: 26 });

  // Monster positions (id -> {x,y})
  const monsterPosRef = useRef({});
  const [monsterPositions, setMonsterPositions] = useState({});

  const keysRef = useRef({});
  const targetRef = useRef({ x: 120, y: 200 });
  const lastAttackRef = useRef(0);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);
  const [hitFlash, setHitFlash] = useState({}); // id -> bool

  // Track arena size
  useEffect(() => {
    const update = () => {
      if (!arenaRef.current) return;
      const r = arenaRef.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Initialize / reset monster positions when wave changes or list changes
  useEffect(() => {
    const next = { ...monsterPosRef.current };
    let changed = false;
    const aliveIds = new Set(monsters.map((m) => m.id));
    // Spawn positions for new monsters
    monsters.forEach((m, idx) => {
      if (!next[m.id]) {
        const spread = Math.min(160, size.h / 2 - 80);
        next[m.id] = {
          x: size.w - 80 - (idx % 2) * 60,
          y: Math.max(60, size.h / 2 - spread / 2 + (idx * 60) % Math.max(80, size.h - 160)),
        };
        changed = true;
      }
    });
    // Remove positions for missing
    Object.keys(next).forEach((k) => {
      if (!aliveIds.has(k)) { delete next[k]; changed = true; }
    });
    if (changed) {
      monsterPosRef.current = next;
      setMonsterPositions(next);
    }
  }, [monsters, size.w, size.h]);

  // Detect wave change for death anim
  useEffect(() => {
    if (prevWaveRef.current !== wave) {
      prevWaveRef.current = wave;
    }
  }, [wave]);

  const handlePointerMove = (e) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const px = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const py = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
    if (Number.isFinite(px) && Number.isFinite(py)) {
      targetRef.current = {
        x: Math.max(HERO_RADIUS, Math.min(size.w - HERO_RADIUS, px)),
        y: Math.max(HERO_RADIUS, Math.min(size.h - HERO_RADIUS, py)),
      };
    }
  };

  useEffect(() => {
    const down = (e) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        keysRef.current[k] = true;
      }
    };
    const up = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const tick = (now) => {
      const dt = Math.min(0.05, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      // Keyboard movement
      const keys = keysRef.current;
      const moveSpeed = 240;
      let dx = 0, dy = 0;
      if (keys.w || keys.arrowup) dy -= 1;
      if (keys.s || keys.arrowdown) dy += 1;
      if (keys.a || keys.arrowleft) dx -= 1;
      if (keys.d || keys.arrowright) dx += 1;
      if (dx || dy) {
        const len = Math.hypot(dx, dy) || 1;
        targetRef.current = {
          x: Math.max(HERO_RADIUS, Math.min(size.w - HERO_RADIUS, targetRef.current.x + (dx / len) * moveSpeed * dt)),
          y: Math.max(HERO_RADIUS, Math.min(size.h - HERO_RADIUS, targetRef.current.y + (dy / len) * moveSpeed * dt)),
        };
      }
      heroX.set(targetRef.current.x);
      heroY.set(targetRef.current.y);

      const hx = heroSpringX.get();
      const hy = heroSpringY.get();
      const s = useGame.getState();

      // Move each alive monster toward hero; find closest in range
      let closest = null;
      let closestDist = Infinity;
      const pos = { ...monsterPosRef.current };
      s.monsters.forEach((m, idx) => {
        if (m.hp <= 0) return;
        const p = pos[m.id];
        if (!p) return;
        const ddx = hx - p.x;
        const ddy = hy - p.y;
        const dist = Math.hypot(ddx, ddy);
        const radius = m.isBoss ? BOSS_RADIUS : MONSTER_RADIUS;
        const stop = HERO_RADIUS + radius + 16;
        const speed = m.isBoss ? BASE_MONSTER_SPEED * 0.7 : BASE_MONSTER_SPEED * (1 + 0.05 * idx);
        if (dist > stop) {
          // Avoid overlap with other monsters (basic separation)
          let nx = p.x + (ddx / dist) * speed * dt;
          let ny = p.y + (ddy / dist) * speed * dt;
          Object.entries(pos).forEach(([oid, op]) => {
            if (oid === m.id) return;
            const sep = Math.hypot(nx - op.x, ny - op.y);
            const minSep = radius * 1.6;
            if (sep > 0 && sep < minSep) {
              nx += ((nx - op.x) / sep) * (minSep - sep) * 0.5;
              ny += ((ny - op.y) / sep) * (minSep - sep) * 0.5;
            }
          });
          pos[m.id] = {
            x: Math.max(radius, Math.min(size.w - radius, nx)),
            y: Math.max(radius, Math.min(size.h - radius, ny)),
          };
        }
        if (dist < closestDist) { closestDist = dist; closest = m; }
      });
      monsterPosRef.current = pos;
      setMonsterPositions(pos);

      // Auto-attack closest monster in range
      if (s.autoAttack && closest && closestDist < ATTACK_RANGE) {
        const period = Math.max(220, Math.floor(1000 / s.derived().aspd));
        if (now - lastAttackRef.current > period) {
          lastAttackRef.current = now;
          s.attack(closest.id);
          setHitFlash((f) => ({ ...f, [closest.id]: true }));
          setTimeout(() => setHitFlash((f) => ({ ...f, [closest.id]: false })), 180);
          hapticImpact("light");
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    lastTickRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size.w, size.h, heroX, heroY, heroSpringX, heroSpringY]);

  const aliveMonsters = useMemo(() => monsters.filter((m) => m.hp > 0), [monsters]);
  const isBossWave = monsters.some((m) => m.isBoss);
  const hordeCount = monsters.length;

  return (
    <div
      ref={arenaRef}
      data-testid="battle-arena"
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      className="relative flex-1 bg-black/40 border-2 border-slate-700 rounded-md overflow-hidden min-h-[360px] cursor-crosshair select-none"
      style={{
        backgroundImage: `radial-gradient(ellipse at center, rgba(217,119,6,0.12), transparent 70%),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 40px),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 40px)`,
      }}
    >
      {/* Wave indicators */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
        {isBossWave && (
          <div className="px-3 py-1 rounded font-heading text-red-300 border border-red-500 bg-red-950/60 tracking-widest text-xs animate-pulse" data-testid="boss-indicator">
            <Skull className="inline" size={12} /> {t("bossWave")}
          </div>
        )}
        {hordeCount > 1 && !isBossWave && (
          <div className="px-3 py-1 rounded font-heading text-cyan-300 border border-cyan-500/50 bg-cyan-950/40 tracking-widest text-xs" data-testid="horde-indicator">
            ⚔ HORDE × {aliveMonsters.length}
          </div>
        )}
      </div>

      {/* Range indicator */}
      <motion.div
        className="absolute rounded-full border pointer-events-none"
        style={{
          width: ATTACK_RANGE * 2,
          height: ATTACK_RANGE * 2,
          x: heroSpringX,
          y: heroSpringY,
          translateX: -ATTACK_RANGE,
          translateY: -ATTACK_RANGE,
          borderColor: "rgba(245,158,11,0.35)",
        }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />

      {/* Hero */}
      <motion.div
        className="absolute z-10"
        data-testid="arena-hero"
        style={{
          x: heroSpringX,
          y: heroSpringY,
          translateX: -HERO_RADIUS,
          translateY: -HERO_RADIUS,
          width: HERO_RADIUS * 2,
          height: HERO_RADIUS * 2,
        }}
      >
        <motion.div
          className="w-full h-full"
          animate={
            heroState === "attack" ? { rotate: -12, scale: 1.08 }
            : heroState === "cast" ? { scale: 1.15 }
            : heroState === "victory" ? { scale: 1.15, y: -6 }
            : { rotate: 0, scale: 1, y: [0, -2, 0] }
          }
          transition={heroState === "idle"
            ? { duration: 1.8, repeat: Infinity }
            : { type: "spring", stiffness: 320, damping: 16 }}
        >
          <img
            src={HERO_AVATAR}
            alt="hero"
            draggable={false}
            className="w-full h-full object-cover rounded-full border-4 border-amber-700"
            style={{
              boxShadow: heroState === "cast"
                ? "0 0 30px rgba(6,182,212,0.95), inset 0 0 16px rgba(6,182,212,0.4)"
                : heroState === "victory"
                ? "0 0 32px rgba(245,158,11,0.95)"
                : "0 0 16px rgba(217,119,6,0.5)",
            }}
          />
        </motion.div>
      </motion.div>

      {/* Monsters */}
      {monsters.map((m) => {
        const p = monsterPositions[m.id];
        if (!p) return null;
        const sprite = MONSTER_SPRITES[m.sprite] || "👹";
        const r = m.isBoss ? BOSS_RADIUS : MONSTER_RADIUS;
        const alive = m.hp > 0;
        const isHit = hitFlash[m.id];
        return (
          <motion.div
            key={m.id}
            className="absolute z-10"
            data-testid={`arena-monster-${m.id}`}
            animate={{
              x: p.x,
              y: p.y,
              opacity: alive ? 1 : 0,
              rotate: alive ? 0 : 90,
              scale: alive ? 1 : 0.5,
            }}
            transition={alive ? { type: "tween", duration: 0.08 } : { duration: 0.35 }}
            style={{ translateX: -r, translateY: -r, width: r * 2, height: r * 2 }}
          >
            <motion.div
              className={`relative w-full h-full rounded-full border-4 ${m.isBoss ? "border-red-600" : m.isMinion ? "border-slate-500" : "border-amber-700"} flex items-center justify-center bg-gradient-to-b from-slate-800 to-black`}
              style={{
                boxShadow: m.isBoss
                  ? "0 0 36px rgba(220,38,38,0.7)"
                  : m.isMinion
                  ? "0 0 14px rgba(148,163,184,0.4)"
                  : "0 0 22px rgba(217,119,6,0.55)",
                filter: isHit ? "brightness(2.5)" : "brightness(1)",
                fontSize: m.isBoss ? 56 : 40,
                lineHeight: 1,
              }}
              animate={isHit ? { x: [0, -5, 5, 0], scale: [1, 1.12, 1] } : { y: [0, -3, 0] }}
              transition={isHit ? { duration: 0.18 } : { duration: 1.8, repeat: Infinity }}
            >
              <span style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.85))" }}>{sprite}</span>
              {/* HP bar above monster */}
              {alive && (
                <div className="absolute -top-3 left-0 right-0 h-1.5 bg-black/70 border border-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${m.isBoss ? "bg-red-500" : m.isMinion ? "bg-slate-300" : "bg-amber-400"}`}
                    style={{ width: `${(m.hp / m.maxHp) * 100}%` }}
                  />
                </div>
              )}
              {m.isBoss && alive && (
                <motion.div
                  className="absolute -inset-2 rounded-full border-2 border-red-500 pointer-events-none"
                  animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
            </motion.div>
          </motion.div>
        );
      })}

      {/* Skill effect overlay */}
      {activeEffect && (
        <SkillEffect
          key={activeEffect.id}
          effect={activeEffect.effect}
          onComplete={() => useGame.getState().clearEffect()}
        />
      )}

      {/* Damage numbers (positioned near hero) */}
      {damageNumbers.map((dn) => (
        <span
          key={dn.id}
          className={`damage-number ${dn.crit ? "crit" : ""}`}
          style={{
            left: heroSpringX.get() + (Math.random() - 0.5) * 80,
            top: heroSpringY.get() - 50,
          }}
        >
          {dn.crit ? "CRIT! " : ""}{dn.value}
        </span>
      ))}

      {/* Hint */}
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 font-mono-num pointer-events-none">
        WASD / 🖱️ {lang === "pt" ? "para mover" : "to move"}
      </div>
    </div>
  );
}
