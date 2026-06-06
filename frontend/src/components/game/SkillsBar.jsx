import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "../../store/gameStore";
import { useI18n } from "../../i18n/I18nContext";
import { SKILLS } from "../../game/skills";
import { Swords, Flame, Heart } from "lucide-react";
import { hapticImpact } from "../../lib/telegram";

const ICONS = { Swords, Flame, Heart };

export default function SkillsBar() {
  const { lang } = useI18n();
  const cooldowns = useGame((s) => s.skillCooldowns);
  const castSkill = useGame((s) => s.castSkill);
  const [, force] = useState(0);

  // Tick to update cooldown UI every 100ms
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();

  return (
    <div data-testid="skills-bar" className="flex justify-center gap-3 mt-3">
      {Object.values(SKILLS).map((s) => {
        const Icon = ICONS[s.icon] || Swords;
        const ready = (cooldowns[s.id] || 0) <= now;
        const remainingMs = ready ? 0 : (cooldowns[s.id] - now);
        const pct = ready ? 0 : (remainingMs / s.cooldown) * 100;
        return (
          <motion.button
            key={s.id}
            data-testid={`skill-${s.id}`}
            disabled={!ready}
            onClick={() => { if (ready) { castSkill(s.id); hapticImpact("heavy"); } }}
            whileTap={ready ? { scale: 0.92 } : {}}
            whileHover={ready ? { scale: 1.06, boxShadow: `0 0 18px ${s.color}` } : {}}
            className="relative w-16 h-16 rounded-md border-2 flex items-center justify-center overflow-hidden game-panel"
            style={{
              borderColor: ready ? s.color : "#475569",
              boxShadow: ready ? `0 0 12px ${s.color}88, inset 0 0 12px ${s.color}33` : "none",
            }}
            title={`${s.name[lang]} — ${s.desc[lang]}`}
          >
            <Icon size={26} style={{ color: ready ? s.color : "#64748B" }} />
            {!ready && (
              <>
                <div
                  className="absolute inset-0 bg-black/80 flex items-center justify-center"
                  style={{ clipPath: `polygon(0 0, 100% 0, 100% ${pct}%, 0 ${pct}%)` }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-mono-num text-white text-sm font-bold">
                  {Math.ceil(remainingMs / 1000)}s
                </span>
              </>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
