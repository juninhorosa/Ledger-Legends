import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { hapticImpact } from "../../lib/telegram";
import { Skull } from "lucide-react";
import SkillEffect from "./SkillEffect";
import DungeonMap from "./DungeonMap";
import { PixelHero, MonsterSprite, useWalkFrame } from "./PixelSprites";

const TILE            = 48;   // pixels per grid tile
const MOVE_MS         = 200;  // hero step interval (ms) — Tibia default feel
const MONSTER_MS      = 480;  // monster step interval (ms)
const ATTACK_RANGE_T  = 2;    // attack range in tiles (Manhattan distance)
const ATTACK_MS       = 650;  // minimum ms between auto-attack hits

/* ─── Helpers ─── */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function manhattan(a, b) { return Math.abs(a.col - b.col) + Math.abs(a.row - b.row); }

export default function BattleArena() {
  const { t, lang } = useI18n();
  const monsters     = useGame((s) => s.monsters);
  const wave         = useGame((s) => s.wave);
  const heroState    = useGame((s) => s.heroState);
  const activeEffect = useGame((s) => s.activeEffect);
  const damageNumbers = useGame((s) => s.damageNumbers);
  const classId      = useGame((s) => s.classId);

  const arenaRef = useRef(null);
  const [size, setSize] = useState({ w: 672, h: 480 });

  const cols = Math.max(6, Math.floor(size.w / TILE));
  const rows = Math.max(5, Math.floor(size.h / TILE));

  /* ── Hero grid state ── */
  const [heroPos, setHeroPos]     = useState({ col: 2, row: 3 });
  const heroGridRef   = useRef({ col: 2, row: 3 });
  const targetGridRef = useRef({ col: 2, row: 3 });

  /* ── Visual state ── */
  const [heroFacing, setHeroFacing] = useState("right");
  const [heroMoving, setHeroMoving] = useState(false);
  const heroWalkFrame = useWalkFrame(heroMoving, MOVE_MS);
  const walkTimerRef  = useRef(null);

  /* ── Monster grid state ── */
  const [monsterGrids, setMonsterGrids] = useState({});
  const monsterGridsRef = useRef({});

  /* ── Combat ── */
  const [hitFlash, setHitFlash]   = useState({});
  const lastAttackRef = useRef(0);
  const [globalFrame, setGlobalFrame] = useState(0);

  /* ── Keys held ── */
  const keysRef = useRef({});

  /* ── Arena resize ── */
  useEffect(() => {
    const update = () => {
      if (!arenaRef.current) return;
      const r = arenaRef.current.getBoundingClientRect();
      setSize({ w: r.width || 672, h: r.height || 480 });
    };
    update();
    const obs = new ResizeObserver(update);
    if (arenaRef.current) obs.observe(arenaRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Reset hero to centre-left when grid changes ── */
  useEffect(() => {
    const startRow = Math.floor(rows / 2);
    const pos = { col: 2, row: startRow };
    heroGridRef.current   = pos;
    targetGridRef.current = pos;
    setHeroPos(pos);
  }, [cols, rows]);

  /* ── Keyboard input ── */
  useEffect(() => {
    const down = (e) => {
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) {
        keysRef.current[k] = true;
        e.preventDefault();
      }
    };
    const up = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  /* ── Spawn monster grid positions ── */
  useEffect(() => {
    const next = { ...monsterGridsRef.current };
    let changed = false;
    const alive = new Set(monsters.map((m) => m.id));

    monsters.forEach((m, idx) => {
      if (!next[m.id]) {
        const spawnCol = clamp(cols - 2 - (idx % 2) * 2, 0, cols - 1);
        const spawnRow = clamp(
          Math.floor(rows / 2) + (idx - Math.floor(monsters.length / 2)) * 2,
          1, rows - 2
        );
        next[m.id] = { col: spawnCol, row: spawnRow };
        changed = true;
      }
    });
    Object.keys(next).forEach((k) => { if (!alive.has(k)) { delete next[k]; changed = true; } });

    if (changed) {
      monsterGridsRef.current = next;
      setMonsterGrids({ ...next });
    }
  }, [monsters, cols, rows]);

  /* ── Hero movement timer — Tibia-style (one tile per interval) ── */
  useEffect(() => {
    const timer = setInterval(() => {
      const keys = keysRef.current;
      let dc = 0, dr = 0;

      if      (keys.w || keys.arrowup)    dr = -1;
      else if (keys.s || keys.arrowdown)  dr =  1;
      else if (keys.a || keys.arrowleft)  dc = -1;
      else if (keys.d || keys.arrowright) dc =  1;
      else {
        /* click-to-walk: move one step toward clicked target */
        const cur = heroGridRef.current;
        const tgt = targetGridRef.current;
        if (tgt.col !== cur.col || tgt.row !== cur.row) {
          if (Math.abs(tgt.col - cur.col) >= Math.abs(tgt.row - cur.row)) {
            dc = Math.sign(tgt.col - cur.col);
          } else {
            dr = Math.sign(tgt.row - cur.row);
          }
        }
      }

      if (dc || dr) {
        const cur = heroGridRef.current;
        const nc = clamp(cur.col + dc, 0, cols - 1);
        const nr = clamp(cur.row + dr, 0, rows - 1);
        const next = { col: nc, row: nr };
        heroGridRef.current = next;
        setHeroPos(next);
        if (dc > 0) setHeroFacing("right");
        if (dc < 0) setHeroFacing("left");
        setHeroMoving(true);
        clearTimeout(walkTimerRef.current);
        walkTimerRef.current = setTimeout(() => setHeroMoving(false), MOVE_MS - 40);
      }
    }, MOVE_MS);
    return () => clearInterval(timer);
  }, [cols, rows]);

  /* ── Monster movement timer ── */
  useEffect(() => {
    const timer = setInterval(() => {
      const hero = heroGridRef.current;
      const next = { ...monsterGridsRef.current };
      const occupied = new Set(Object.entries(next).map(([, p]) => `${p.col},${p.row}`));
      let changed = false;

      useGame.getState().monsters.forEach((m) => {
        if (m.hp <= 0) return;
        const mp = next[m.id];
        if (!mp) return;
        const dist = manhattan(hero, mp);
        if (dist <= 1) return;

        let dc = 0, dr = 0;
        if (Math.abs(hero.col - mp.col) >= Math.abs(hero.row - mp.row)) {
          dc = Math.sign(hero.col - mp.col);
        } else {
          dr = Math.sign(hero.row - mp.row);
        }

        const nc = clamp(mp.col + dc, 0, cols - 1);
        const nr = clamp(mp.row + dr, 0, rows - 1);
        const key = `${nc},${nr}`;

        if (!occupied.has(key) || (nc === hero.col && nr === hero.row)) {
          occupied.delete(`${mp.col},${mp.row}`);
          occupied.add(key);
          next[m.id] = { col: nc, row: nr };
          changed = true;
        }
      });

      if (changed) {
        monsterGridsRef.current = next;
        setMonsterGrids({ ...next });
      }
    }, MONSTER_MS);
    return () => clearInterval(timer);
  }, [cols, rows]);

  /* ── Global monster walk frame ── */
  useEffect(() => {
    const id = setInterval(() => setGlobalFrame((f) => (f + 1) % 2), 220);
    return () => clearInterval(id);
  }, []);

  /* ── Auto-attack loop ── */
  useEffect(() => {
    const timer = setInterval(() => {
      if (!useGame.getState().autoAttack) return;
      const now = performance.now();
      if (now - lastAttackRef.current < ATTACK_MS) return;

      const hero   = heroGridRef.current;
      const grids  = monsterGridsRef.current;
      const alive  = useGame.getState().monsters.filter((m) => m.hp > 0);
      let best = null, bestDist = Infinity;

      alive.forEach((m) => {
        const mp = grids[m.id];
        if (!mp) return;
        const dist = manhattan(hero, mp);
        if (dist <= ATTACK_RANGE_T && dist < bestDist) { bestDist = dist; best = m; }
      });

      if (best) {
        lastAttackRef.current = now;
        useGame.getState().attack(best.id);
        setHitFlash((f) => ({ ...f, [best.id]: true }));
        setTimeout(() => setHitFlash((f) => ({ ...f, [best.id]: false })), 200);
        hapticImpact("light");
      }
    }, 80);
    return () => clearInterval(timer);
  }, []);

  /* ── Click / tap to set walk target ── */
  const handleArenaClick = useCallback((e) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const cx = (e.clientX ?? e.changedTouches?.[0]?.clientX) - rect.left;
    const cy = (e.clientY ?? e.changedTouches?.[0]?.clientY) - rect.top;
    const col = clamp(Math.floor(cx / TILE), 0, cols - 1);
    const row = clamp(Math.floor(cy / TILE), 0, rows - 1);
    targetGridRef.current = { col, row };
  }, [cols, rows]);

  /* ─── Derived ─── */
  const aliveMonsters = useMemo(() => monsters.filter((m) => m.hp > 0), [monsters]);
  const isBossWave    = monsters.some((m) => m.isBoss);
  const hordeCount    = monsters.length;

  const heroPixelX = heroPos.col * TILE + TILE / 2;
  const heroPixelY = heroPos.row * TILE + TILE / 2;

  return (
    <div
      ref={arenaRef}
      data-testid="battle-arena"
      onClick={handleArenaClick}
      onTouchEnd={handleArenaClick}
      className="relative flex-1 border-2 border-amber-900/50 rounded-md overflow-hidden min-h-[480px] cursor-pointer select-none"
      style={{ minHeight: `${rows * TILE}px` }}
    >
      {/* ── WoW Dungeon tile floor ── */}
      <DungeonMap cols={cols} rows={rows} seed={wave} />

      {/* ── Wave badges ── */}
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

      {/* ── Kill counter ── */}
      <div data-testid="kill-counter" className="absolute top-2 right-2 z-20 px-3 py-1 rounded font-mono-num text-xs bg-black/70 border border-amber-700/60 text-amber-200 tracking-wide">
        {monsters.length - aliveMonsters.length}/{monsters.length} kills
      </div>

      {/* ── Attack-range ring (follows hero) ── */}
      <div
        className="absolute rounded-full pointer-events-none z-5"
        style={{
          width:  (ATTACK_RANGE_T * 2 + 1) * TILE,
          height: (ATTACK_RANGE_T * 2 + 1) * TILE,
          left:   heroPixelX - (ATTACK_RANGE_T + 0.5) * TILE,
          top:    heroPixelY - (ATTACK_RANGE_T + 0.5) * TILE,
          border: "1px solid rgba(245,158,11,0.2)",
          transition: `left ${MOVE_MS - 30}ms linear, top ${MOVE_MS - 30}ms linear`,
        }}
      />

      {/* ── Hero ── */}
      <div
        data-testid="arena-hero"
        className="absolute z-10 flex items-center justify-center pointer-events-none"
        style={{
          width:  TILE * 1.6,
          height: TILE * 1.6,
          left:   heroPixelX - TILE * 0.8,
          top:    heroPixelY - TILE * 0.8,
          transition: `left ${MOVE_MS - 30}ms linear, top ${MOVE_MS - 30}ms linear`,
          filter: heroState === "attack"
            ? "drop-shadow(0 0 12px rgba(255,140,40,0.95))"
            : heroState === "cast"
            ? "drop-shadow(0 0 14px rgba(90,209,232,0.95))"
            : "drop-shadow(0 5px 10px rgba(0,0,0,0.75))",
        }}
      >
        <PixelHero
          size={TILE * 1.5}
          facing={heroFacing}
          frame={heroWalkFrame}
          state={heroState}
          klass={classId || "warrior"}
        />
      </div>

      {/* ── Monsters ── */}
      {monsters.map((m) => {
        const gp = monsterGrids[m.id];
        if (!gp) return null;
        const px = gp.col * TILE + TILE / 2;
        const py = gp.row * TILE + TILE / 2;
        const r  = m.isBoss ? TILE * 1.1 : TILE * 0.9;
        const alive  = m.hp > 0;
        const isHit  = !!hitFlash[m.id];
        const facing = heroPos.col > gp.col ? "right" : "left";
        const idHash = m.id?.charCodeAt?.(m.id.length - 1) ?? 0;
        const walkFr = alive ? (globalFrame + idHash) % 2 : 0;

        return (
          <div
            key={m.id}
            className="absolute z-10 flex items-center justify-center pointer-events-none"
            data-testid={`arena-monster-${m.id}`}
            style={{
              width:  r * 2,
              height: r * 2,
              left:   px - r,
              top:    py - r,
              transition: `left ${MONSTER_MS - 60}ms linear, top ${MONSTER_MS - 60}ms linear, opacity 0.3s, transform 0.3s`,
              opacity:   alive ? 1 : 0,
              transform: alive ? "scale(1) rotate(0deg)" : "scale(0.4) rotate(90deg)",
              filter: isHit
                ? "brightness(2.8) drop-shadow(0 0 10px #fff)"
                : m.isBoss
                ? "drop-shadow(0 0 16px rgba(220,38,38,0.9))"
                : "drop-shadow(0 3px 8px rgba(0,0,0,0.7))",
            }}
          >
            <MonsterSprite kind={m.sprite} size={r * 2} facing={facing} frame={walkFr} isBoss={!!m.isBoss} />

            {/* HP bar */}
            {alive && (
              <div className="absolute -top-3.5 left-1 right-1 h-1.5 bg-black/80 border border-slate-700/80 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${m.isBoss ? "bg-red-500" : m.isMinion ? "bg-slate-300" : "bg-amber-400"}`}
                  style={{ width: `${(m.hp / m.maxHp) * 100}%` }}
                />
              </div>
            )}
            {m.isBoss && alive && (
              <div
                className="absolute -inset-2 rounded-full border-2 border-red-500/70 pointer-events-none"
                style={{ animation: "pulse 1.4s infinite" }}
              />
            )}
          </div>
        );
      })}

      {/* ── Skill effect ── */}
      {activeEffect && (
        <SkillEffect
          key={activeEffect.id}
          effect={activeEffect.effect}
          onComplete={() => useGame.getState().clearEffect()}
        />
      )}

      {/* ── Floating damage numbers ── */}
      {damageNumbers.map((dn, idx) => (
        <span
          key={dn.id}
          className={`damage-number ${dn.crit ? "crit" : ""}`}
          style={{ left: heroPixelX + ((idx % 5) - 2) * 20, top: heroPixelY - 54 }}
        >
          {dn.crit ? "CRIT! " : ""}{dn.value}
        </span>
      ))}

      {/* ── Hint ── */}
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-500/60 font-mono-num pointer-events-none">
        WASD / 🖱️ {lang === "pt" ? "mover" : "move"} · {lang === "pt" ? "clique p/ caminhar" : "click to walk"}
      </div>
    </div>
  );
}
