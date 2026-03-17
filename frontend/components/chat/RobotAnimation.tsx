"use client";

import { motion } from "framer-motion";

export function RobotAnimation({ className }: { className?: string }) {
  return (
    <div className={className}>
      <motion.svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        initial="idle"
        animate="idle"
      >
        <defs>
          <linearGradient id="robot-body-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="[stop-color:var(--primary)]" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="robot-glow" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" className="[stop-color:var(--primary)]" stopOpacity="0.3" />
            <stop offset="100%" className="[stop-color:var(--primary)]" stopOpacity="0" />
          </linearGradient>
          <filter id="robot-shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" className="[flood-color:var(--primary)]" />
          </filter>
          <filter id="glow-filter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ambient glow ring */}
        <motion.ellipse
          cx="100" cy="175" rx="50" ry="8"
          fill="url(#robot-glow)"
          animate={{ rx: [45, 55, 45], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Floating body group */}
        <motion.g
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          filter="url(#robot-shadow)"
        >
          {/* Antenna */}
          <motion.line
            x1="100" y1="42" x2="100" y2="28"
            className="stroke-primary" strokeWidth="3" strokeLinecap="round"
            animate={{ y2: [28, 24, 28] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="100" cy="24" r="5"
            className="fill-primary"
            filter="url(#glow-filter)"
            animate={{ r: [4, 6, 4], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Head */}
          <rect x="65" y="42" width="70" height="55" rx="16" fill="url(#robot-body-grad)" />

          {/* Eyes */}
          <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}>
            <circle cx="84" cy="66" r="8" className="fill-background" />
            <circle cx="116" cy="66" r="8" className="fill-background" />
            <motion.circle
              cx="85" cy="66" r="4"
              className="fill-foreground"
              animate={{ cx: [85, 88, 82, 85] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle
              cx="117" cy="66" r="4"
              className="fill-foreground"
              animate={{ cx: [117, 120, 114, 117] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.g>

          {/* Mouth / speaker grill */}
          <motion.rect
            x="88" y="80" width="24" height="4" rx="2"
            className="fill-background/60"
            animate={{ width: [24, 18, 24], x: [88, 91, 88] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Body */}
          <rect x="72" y="102" width="56" height="48" rx="12" fill="url(#robot-body-grad)" opacity="0.9" />

          {/* Core light */}
          <motion.circle
            cx="100" cy="122" r="7"
            className="fill-background"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="100" cy="122" r="4"
            className="fill-primary"
            filter="url(#glow-filter)"
            animate={{ r: [3, 5, 3], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Speed lines on body (train theme) */}
          <motion.g
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <rect x="82" y="134" width="12" height="2" rx="1" className="fill-background/50" />
            <rect x="82" y="139" width="18" height="2" rx="1" className="fill-background/40" />
            <rect x="82" y="144" width="10" height="2" rx="1" className="fill-background/30" />
          </motion.g>

          {/* Left arm */}
          <motion.rect
            x="54" y="108" width="14" height="32" rx="7"
            fill="url(#robot-body-grad)" opacity="0.75"
            animate={{ rotate: [-5, 5, -5], y: [108, 106, 108] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "61px 108px" }}
          />

          {/* Right arm */}
          <motion.rect
            x="132" y="108" width="14" height="32" rx="7"
            fill="url(#robot-body-grad)" opacity="0.75"
            animate={{ rotate: [5, -5, 5], y: [108, 106, 108] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            style={{ transformOrigin: "139px 108px" }}
          />

          {/* Legs */}
          <rect x="82" y="152" width="12" height="16" rx="6" fill="url(#robot-body-grad)" opacity="0.8" />
          <rect x="106" y="152" width="12" height="16" rx="6" fill="url(#robot-body-grad)" opacity="0.8" />
        </motion.g>

        {/* Floating particles */}
        {[
          { cx: 40, cy: 60, delay: 0 },
          { cx: 160, cy: 50, delay: 0.8 },
          { cx: 35, cy: 130, delay: 1.6 },
          { cx: 165, cy: 120, delay: 0.4 },
        ].map((p, i) => (
          <motion.circle
            key={i}
            cx={p.cx} cy={p.cy} r="2"
            className="fill-primary/40"
            animate={{ y: [0, -15, 0], opacity: [0, 0.8, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </motion.svg>
    </div>
  );
}
