"use client";

import { motion } from "framer-motion";
import { Zap, Clock, ArrowRightLeft, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n";

interface Props {
  onSelect: (text: string) => void;
}

export function QuickActions({ onSelect }: Props) {
  const { t } = useI18n();
  const ACTIONS = [
    { icon: Zap, label: t("chat.quick.fast.label"), text: t("chat.quick.fast.text"), color: "text-amber-500" },
    { icon: Clock, label: t("chat.quick.tomorrow.label"), text: t("chat.quick.tomorrow.text"), color: "text-blue-500" },
    { icon: ArrowRightLeft, label: t("chat.quick.transfer.label"), text: t("chat.quick.transfer.text"), color: "text-emerald-500" },
    { icon: MapPin, label: t("chat.quick.nearby.label"), text: t("chat.quick.nearby.text"), color: "text-purple-500" },
  ];

  return (
    <div className="grid w-full grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
      {ACTIONS.map((action, i) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
          onClick={() => onSelect(action.text)}
          className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/55 p-3 text-left text-sm transition-all hover:border-primary/25 hover:bg-secondary/65"
        >
          <action.icon className={`h-4 w-4 ${action.color} group-hover:scale-110 transition-transform`} />
          <span className="text-foreground">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
