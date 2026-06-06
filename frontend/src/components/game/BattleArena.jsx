import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useGame } from "../../store/gameStore";
import { MONSTER_SPRITES } from "../../game/items";
import { useI18n } from "../../i18n/I18nContext";
import { hapticImpact } from "../../lib/telegram";
import { Skull } from "lucide-react";
import SkillEffect from "./SkillEffect";

const HERO_AVATAR = "https://images.unsplash.com/photo-1773216344064-e1231ff27d09?w=400&q=70";
const HERO_RADIUS = 36;
const MONSTER_RADIUS = 44;
const ATTACK_RANGE = 130;
const MONSTER_SPEED = 80; // px / sec

export default function BattleArena() {
  const { t, lang } = useI18n();
  const state = useGame();
  const arenaRef = useRef(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [dying, setDying] = useState(false);
  const prevWaveRef = useRef(state.wave);
  const [hitFx, setHitFx] = useState(false);

  // Hero motion values (smoothed by spring)
  const heroX = useMotionValue(150);
  const heroY = useMotionValue(200);
  const heroSpringX = useSpring(heroX, { stiffness: 280, damping: 26 });
  const heroSpringY = useSpring(heroY, { stiffness: 280, damping: 26 });

  // Monster local position state
  const [monsterPos, setMonsterPos] = useState({ x: 500, y: 200 });
  const monsterPosRef = useRef({ x: 500, y: 200 });

  const keysRef = useRef({});
  const targetRef = useRef({ x: 150, y: 200 });
  const lastAttackRef = useRef(0);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);

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

  // Reset monster position on wave change
  useEffect(() => {
    if (prevWaveRef.current !== state.wave) {
      setDying(true);
      setTimeout(() => setDying(false), 400);
      const startX = size.w - MONSTER_RADIUS - 30;
      const startY = Math.max(MONSTER_RADIUS + 10, Math.min(size.h - MONSTER_RADIUS - 10, size.h / 2 + (Math.random() - 0.5) * 100));
      monsterPosRef.current = { x: startX, y: startY };
      setMonsterPos({ x: startX, y: startY });
      prevWaveRef.current = state.wave;
    }
  }, [state.wave, size.w, size.h]);

  // Initialize monster center-right
  useEffect(() => {
    const startX = size.w - MONSTER_RADIUS - 30;
    const startY = size.h / 2;
    if (monsterPosRef.current.x !== startX) {
      monsterPosRef.current = { x: startX, y: startY };
      setMonsterPos({ x: startX, y: startY });
    }
    if (heroX.get() < 80) {
      heroX.set(80);
      heroY.set(size.h / 2);
      targetRef.current = { x: 80, y: size.h / 2 };
    }
  }, [size.w, size.h]);

  // Mouse / touch move handler
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

  // Keyboard handler
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

  // Game loop: move hero (keys), move monster toward hero, do attacks
  useEffect(() => {
    const tick = (now) => {
      const dt = Math.min(0.05, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      // Keyboard movement
      const keys = keysRef.current;
      const moveSpeed = 240; // px/sec
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

      // Monster AI: walk toward hero
      const hx = heroSpringX.get();
      const hy = heroSpringY.get();
      const mp = monsterPosRef.current;
      const ddx = hx - mp.x;
      const ddy = hy - mp.y;
      const dist = Math.hypot(ddx, ddy);
      const stopDist = HERO_RADIUS + MONSTER_RADIUS + 20;
      if (dist > stopDist) {
        const nx = mp.x + (ddx / dist) * MONSTER_SPEED * dt;
        const ny = mp.y + (ddy / dist) * MONSTER_SPEED * dt;
        monsterPosRef.current = { x: nx, y: ny };
        setMonsterPos({ x: nx, y: ny });
      }

      // Auto-attack when in range
      const s = useGame.getState();
      if (s.autoAttack && s.monster && dist < ATTACK_RANGE) {
        const period = Math.max(250, Math.floor(1000 / s.derived().aspd));
        if (now - lastAttackRef.current > period) {
          lastAttackRef.current = now;
          s.attack();
          setHitFx(true);
          setTimeout(() => setHitFx(false), 200);
          hapticImpact("light");
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    lastTickRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size.w, size.h]);

  if (!state.monster) return null;
  const sprite = MONSTER_SPRITES[state.monster.sprite] || MONSTER_SPRITES.orc;
  const distToMonster = Math.hypot(monsterPos.x - heroSpringX.get(), monsterPos.y - heroSpringY.get());
  const inRange = distToMonster < ATTACK_RANGE;

  return (
    <div
      ref={arenaRef}
      data-testid="battle-arena"
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      className="relative flex-1 bg-black/40 border-2 border-slate-700 rounded-md overflow-hidden min-h-[360px] cursor-crosshair select-none"
      style={{
        backgroundImage: `radial-gradient(ellipse at center, rgba(217,119,6,0.15), transparent 70%),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 40px),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 40px)`,
      }}
    >
      {/* Boss indicator */}
      {state.monster.isBoss && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded font-heading text-red-300 border border-red-500 bg-red-950/60 tracking-widest text-xs animate-pulse z-20" data-testid="boss-indicator">
          <Skull className="inline" size={12} /> {t("bossWave")}
        </div>
      )}

      {/* Range indicator under hero */}
      <motion.div
        className="absolute rounded-full border pointer-events-none"
        style={{
          width: ATTACK_RANGE * 2,
          height: ATTACK_RANGE * 2,
          x: heroSpringX,
          y: heroSpringY,
          translateX: -ATTACK_RANGE,
          translateY: -ATTACK_RANGE,
          borderColor: inRange ? "rgba(245,158,11,0.45)" : "rgba(148,163,184,0.18)",
          boxShadow: inRange ? "0 0 24px rgba(245,158,11,0.25)" : "none",
        }}
        animate={{ opacity: inRange ? [0.6, 1, 0.6] : 0.5 }}
        transition={{ duration: 1.2, repeat: Infinity }}
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
            state.heroState === "attack"
              ? { rotate: -12, scale: 1.08 }
              : state.heroState === "cast"
              ? { scale: 1.12 }
              : state.heroState === "victory"
              ? { scale: 1.15, y: -6 }
              : { rotate: 0, scale: 1, y: [0, -2, 0] }
          }
          transition={
            state.heroState === "idle"
              ? { duration: 1.8, repeat: Infinity }
              : { type: "spring", stiffness: 320, damping: 16 }
          }
        >
          <img
            src={HERO_AVATAR}
            alt="hero"
            draggable={false}
            className="w-full h-full object-cover rounded-full border-4 border-amber-700"
            style={{
              boxShadow:
                state.heroState === "cast"
                  ? "0 0 30px rgba(6,182,212,0.9), inset 0 0 16px rgba(6,182,212,0.4)"
                  : state.heroState === "victory"
                  ? "0 0 28px rgba(245,158,11,0.95)"
                  : "0 0 16px rgba(217,119,6,0.5)",
            }}
          />
        </motion.div>
      </motion.div>

      {/* Monster */}
      <motion.div
        className="absolute z-10"
        data-testid="arena-monster"
        animate={{
          x: monsterPos.x,
          y: monsterPos.y,
          opacity: dying ? 0 : 1,
          rotate: dying ? 90 : 0,
        }}
        transition={{ type: "tween", duration: 0.06 }}
        style={{
          translateX: -MONSTER_RADIUS,
          translateY: -MONSTER_RADIUS,
          width: MONSTER_RADIUS * 2,
          height: MONSTER_RADIUS * 2,
        }}
      >
        <motion.div
          className={`w-full h-full rounded-full border-4 ${state.monster.isBoss ? "border-red-600" : "border-amber-700"} flex items-center justify-center bg-gradient-to-b from-slate-800 to-black`}
          style={{
            boxShadow: state.monster.isBoss
              ? "0 0 40px rgba(220,38,38,0.7)"
              : "0 0 30px rgba(217,119,6,0.6)",
            filter: hitFx ? "brightness(2.4) hue-rotate(-10deg)" : "brightness(1)",
            fontSize: state.monster.isBoss ? 60 : 50,
            lineHeight: 1,
          }}
          animate={hitFx ? { x: [0, -6, 6, 0], scale: [1, 1.1, 1] } : { y: [0, -3, 0] }}
          transition={hitFx ? { duration: 0.2 } : { duration: 1.8, repeat: Infinity }}
          aria-label={state.monster.name[lang]}
        >
          <span style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}>{sprite}</span>
        </motion.div>
        {state.monster.isBoss && (
          <motion.div
            className="absolute -inset-2 rounded-full border-2 border-red-500 pointer-events-none"
            animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.06, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Skill effect overlay */}
      {state.activeEffect && (
        <SkillEffect
          key={state.activeEffect.id}
          effect={state.activeEffect.effect}
          onComplete={() => useGame.getState().clearEffect()}
        />
      )}

      {/* Damage numbers (positioned over monster) */}
      {state.damageNumbers.map((dn) => (
        <span
          key={dn.id}
          className={`damage-number ${dn.crit ? "crit" : ""}`}
          style={{
            left: monsterPos.x,
            top: monsterPos.y - MONSTER_RADIUS - 10,
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
