"use client";

import React from "react";
import { Brain, Shield } from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";

export default function ModeSwitcher() {
  const { mode, setMode, setMainBrainView } = useAgentOS();

  const isMainBrain = mode === "mainbrain" || mode === "brain";
  const isWarRoom = mode === "warroom";

  return (
    <div
      role="group"
      aria-label="Operating Environment Switcher"
      data-testid="mode-switcher"
      className="flex items-center gap-1 p-1 rounded-md bg-[#11141a] border border-white/10 shrink-0"
    >
      <button
        type="button"
        data-testid="mode-mainbrain"
        aria-pressed={isMainBrain}
        onClick={() => {
          setMode("mainbrain");
          setMainBrainView("feed");
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
          isMainBrain
            ? "bg-[#00ffa3] text-black font-semibold"
            : "text-[#e4e6eb]/75 hover:text-white hover:bg-white/5"
        }`}
      >
        <Brain className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>MainBrain</span>
      </button>

      <button
        type="button"
        data-testid="mode-warroom"
        aria-pressed={isWarRoom}
        onClick={() => setMode("warroom")}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
          isWarRoom
            ? "bg-[#00ffa3] text-black font-semibold"
            : "text-[#e4e6eb]/75 hover:text-white hover:bg-white/5"
        }`}
      >
        <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>War Room Mode</span>
      </button>
    </div>
  );
}

