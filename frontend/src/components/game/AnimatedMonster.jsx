import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// Animated monster with idle float, hit flash & death fade.
export default function AnimatedMonster({ src, alt, hitFx, dying, isBoss }) {
  return (
    <div className="relative w-56 h-56">
      <AnimatePresence>
        <motion.div
          key={src}
          initial={{ opacity: 0, scale: 0.5, y: -40 }}
          animate={{
            opacity: dying ? 0 : 1,
            scale: dying ? 1.4 : 1,
            y: dying ? 60 : 0,
            rotate: dying ? 90 : 0,
          }}
          exit={{ opacity: 0, scale: 0.4 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className="absolute inset-0"
        >
          <motion.img
            src={src}
            alt={alt}
            data-testid="monster-sprite"
            className={`w-full h-full object-cover rounded-full border-4 ${isBoss ? "border-red-600" : "border-amber-700"}`}
            style={{
              boxShadow: isBoss
                ? "0 0 50px rgba(220,38,38,0.7), inset 0 0 20px rgba(0,0,0,0.5)"
                : "0 0 40px rgba(217,119,6,0.6), inset 0 0 15px rgba(0,0,0,0.4)",
              filter: hitFx ? "brightness(3) saturate(0.3)" : "brightness(1)",
            }}
            animate={
              hitFx
                ? { x: [0, -8, 8, -4, 0], y: [0, -3, 3, 0] }
                : { y: [0, -6, 0] }
            }
            transition={
              hitFx
                ? { duration: 0.25 }
                : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            }
            draggable={false}
          />
          {isBoss && (
            <motion.div
              className="absolute -inset-2 rounded-full border-2 border-red-500"
              animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.05, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
