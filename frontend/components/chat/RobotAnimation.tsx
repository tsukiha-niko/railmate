"use client";

import { motion } from "framer-motion";

export function RobotAnimation({ className }: { className?: string }) {
  return (
    <div className={className}>
      <motion.svg viewBox="0 0 240 240" className="w-full h-full">
        <defs>
          <linearGradient id="rail-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="[stop-color:var(--primary)]" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="track-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" className="[stop-color:var(--primary)]" stopOpacity="0" />
            <stop offset="50%" className="[stop-color:var(--primary)]" stopOpacity="0.3" />
            <stop offset="100%" className="[stop-color:var(--primary)]" stopOpacity="0" />
          </linearGradient>
          <filter id="ai-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="train-shadow">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.2" className="[flood-color:var(--primary)]" />
          </filter>
        </defs>

        {/* Track / rails at bottom */}
        <motion.g animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 3, repeat: Infinity }}>
          <rect x="20" y="195" width="200" height="2" rx="1" fill="url(#track-grad)" />
          <rect x="20" y="201" width="200" height="2" rx="1" fill="url(#track-grad)" />
          {/* Sleepers */}
          {[40, 70, 100, 130, 160, 190].map((x) => (
            <rect key={x} x={x} y="192" width="3" height="14" rx="1" className="fill-primary/15" />
          ))}
        </motion.g>

        {/* Speed lines (left side, showing motion) */}
        <motion.g
          animate={{ x: [-10, -25], opacity: [0.5, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        >
          <rect x="22" y="110" width="20" height="2" rx="1" className="fill-primary/30" />
          <rect x="18" y="120" width="28" height="2" rx="1" className="fill-primary/20" />
          <rect x="25" y="130" width="16" height="2" rx="1" className="fill-primary/25" />
        </motion.g>

        {/* Main floating train-bot */}
        <motion.g
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          filter="url(#train-shadow)"
        >
          {/* Train body (bullet train shape) */}
          <path
            d="M65,140 L65,105 C65,95 75,85 90,82 L150,82 C165,85 175,95 175,105 L175,140 C175,148 170,152 165,152 L75,152 C70,152 65,148 65,140 Z"
            fill="url(#rail-grad)"
          />
          {/* Train nose (aerodynamic) */}
          <path
            d="M175,120 C175,120 195,118 200,115 C205,112 205,108 200,105 C195,102 175,100 175,100"
            fill="url(#rail-grad)" opacity="0.9"
          />

          {/* Window strip */}
          <rect x="72" y="98" width="98" height="22" rx="8" className="fill-background/90" />

          {/* AI "eyes" in the window — neural network dots */}
          <motion.g>
            {/* Left eye */}
            <circle cx="98" cy="109" r="7" className="fill-background" stroke="url(#rail-grad)" strokeWidth="2" />
            <motion.circle
              cx="99" cy="109" r="3.5"
              className="fill-primary"
              filter="url(#ai-glow)"
              animate={{ cx: [99, 101, 96, 99], r: [3.5, 3, 3.5, 3.5] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Right eye */}
            <circle cx="142" cy="109" r="7" className="fill-background" stroke="url(#rail-grad)" strokeWidth="2" />
            <motion.circle
              cx="143" cy="109" r="3.5"
              className="fill-primary"
              filter="url(#ai-glow)"
              animate={{ cx: [143, 145, 140, 143], r: [3.5, 3, 3.5, 3.5] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Blink overlay */}
            <motion.rect
              x="88" y="102" width="24" height="14" rx="7"
              fill="url(#rail-grad)"
              animate={{ scaleY: [0, 0, 1, 0, 0], opacity: [0, 0, 1, 0, 0] }}
              transition={{ duration: 5, repeat: Infinity, times: [0, 0.44, 0.48, 0.52, 1] }}
              style={{ transformOrigin: "100px 109px" }}
            />
            <motion.rect
              x="132" y="102" width="24" height="14" rx="7"
              fill="url(#rail-grad)"
              animate={{ scaleY: [0, 0, 1, 0, 0], opacity: [0, 0, 1, 0, 0] }}
              transition={{ duration: 5, repeat: Infinity, times: [0, 0.44, 0.48, 0.52, 1] }}
              style={{ transformOrigin: "144px 109px" }}
            />

            {/* Neural link between eyes */}
            <motion.line
              x1="105" y1="109" x2="135" y2="109"
              className="stroke-primary/30" strokeWidth="1" strokeDasharray="3 3"
              animate={{ strokeDashoffset: [0, -12] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </motion.g>

          {/* AI core light (on body) */}
          <motion.circle
            cx="120" cy="138" r="5"
            className="fill-background"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <motion.circle
            cx="120" cy="138" r="3"
            className="fill-primary"
            filter="url(#ai-glow)"
            animate={{ r: [2.5, 4, 2.5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />

          {/* Stripe details on body */}
          <rect x="72" y="128" width="40" height="2" rx="1" className="fill-background/20" />
          <rect x="72" y="133" width="25" height="2" rx="1" className="fill-background/15" />

          {/* Wheels */}
          <motion.circle cx="90" cy="155" r="6" className="fill-foreground/20" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
          <motion.circle cx="150" cy="155" r="6" className="fill-foreground/20" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
          <circle cx="90" cy="155" r="2.5" className="fill-primary" />
          <circle cx="150" cy="155" r="2.5" className="fill-primary" />
        </motion.g>

        {/* Floating AI circuit particles */}
        {[
          { cx: 45, cy: 75, delay: 0, r: 2 },
          { cx: 195, cy: 70, delay: 0.7, r: 1.5 },
          { cx: 35, cy: 140, delay: 1.4, r: 2 },
          { cx: 205, cy: 145, delay: 0.3, r: 1.5 },
          { cx: 120, cy: 60, delay: 1, r: 2.5 },
        ].map((p, i) => (
          <motion.circle
            key={i}
            cx={p.cx} cy={p.cy} r={p.r}
            className="fill-primary/50"
            animate={{ y: [0, -12, 0], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}

        {/* Data stream arcs (connecting particles to train) */}
        <motion.path
          d="M45,75 Q80,70 90,82"
          fill="none" className="stroke-primary/20" strokeWidth="1"
          strokeDasharray="4 4"
          animate={{ strokeDashoffset: [0, -16] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M195,70 Q170,72 165,82"
          fill="none" className="stroke-primary/20" strokeWidth="1"
          strokeDasharray="4 4"
          animate={{ strokeDashoffset: [0, -16] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </motion.svg>
    </div>
  );
}
