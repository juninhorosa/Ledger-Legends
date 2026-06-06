import React from "react";
import { motion } from "framer-motion";

// Animated hero portrait reacting to combat state.
// state: "idle" | "attack" | "hurt" | "victory" | "cast"
const POSE = {
  idle: { rotate: 0, y: 0, scale: 1, filter: "brightness(1)" },
  attack: { rotate: -12, y: -6, scale: 1.08, filter: "brightness(1.4)" },
  hurt: { rotate: 0, y: 4, scale: 0.96, filter: "brightness(0.7) saturate(0.6)" },
  victory: { rotate: 0, y: -10, scale: 1.12, filter: "brightness(1.5)" },
  cast: { rotate: 0, y: -4, scale: 1.06, filter: "brightness(1.6) hue-rotate(20deg)" },
};

export default function AnimatedHero({ state = "idle", size = 80, src }) {
  const avatar = src || "https://images.unsplash.com/photo-1773216344064-e1231ff27d09?w=400&q=70";
  return (
    <motion.div
      data-testid="animated-hero"
      data-state={state}
      className="relative inline-block"
      style={{ width: size, height: size }}
      animate={POSE[state] || POSE.idle}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow:
            state === "cast"
              ? "0 0 30px rgba(6,182,212,0.9), inset 0 0 20px rgba(6,182,212,0.5)"
              : state === "attack"
              ? "0 0 24px rgba(217,119,6,0.8)"
              : state === "victory"
              ? "0 0 28px rgba(245,158,11,0.9)"
              : "0 0 14px rgba(217,119,6,0.4)",
        }}
        transition={{ duration: 0.3 }}
      />
      <motion.img
        src={avatar}
        alt="hero"
        className="w-full h-full object-cover rounded-full border-4 border-amber-700"
        animate={{ y: state === "idle" ? [0, -3, 0] : 0 }}
        transition={state === "idle" ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        draggable={false}
      />
      {state === "attack" && (
        <motion.div
          className="absolute -top-2 -right-2 text-2xl"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: [0, 1.4, 0], rotate: 45 }}
          transition={{ duration: 0.4 }}
        >
          ⚔️
        </motion.div>
      )}
    </motion.div>
  );
}
