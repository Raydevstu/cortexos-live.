"use client";

import React from "react";
import { Brain, Home, Shield } from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import type { OperatingMode } from "@/lib/agent-os-logic";

const MODES: { id: OperatingMode; label: string; icon: React.ReactNode }[] = [
  {
    id: "mainbrain",
    label: "MainBrain",
    icon: <Home className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    id: "brain",
    label: "Brain Mode",
    icon: <Brain className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    id: "warroom",
    label: "War Room Mode",
    icon: <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
];

export default function ModeSwitcher() {
  const { mode, setMode } = useAgentOS();

  return (
    <div
      role="group"
      aria-label="Operating Mode Switcher"
      data-testid="mode-switcher"
      className="flex items-center gap-1 p-1 rounded-md bg-[#11141a] border border-white/10 shrink-0"
    >
      {MODES.map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            data-testid={`mode-${item.id}`}
            aria-pressed={active}
            onClick={() => setMode(item.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
              active
                ? "bg-[#00ffa3] text-black font-semibold"
                : "text-[#e4e6eb]/75 hover:text-white hover:bg-white/5"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
