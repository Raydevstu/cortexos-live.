"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Play,
  Terminal as TerminalIcon,
  Wrench,
} from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import { PROVIDERS_CATALOG, type ProviderId } from "@/lib/agent-os-logic";

const QUICK_COMMANDS = [
  "@design Generate onboarding wireframes & WCAG tokens",
  "@architecture Draft Workspace State WebSocket OpenAPI spec",
  "@jarvis Run phase readiness check",
  "@librarian Extract entities from recent Design artifacts",
  "/brain",
];

export default function TerminalSandboxHome() {
  const {
    agents,
    selectedProvider,
    setSelectedProvider,
    selectedModel,
    setSelectedModel,
    terminalExpanded,
    setTerminalExpanded,
    terminalHistory,
    isExecutingCommand,
    runTerminalCommand,
    summonAgent,
  } = useAgentOS();

  const [input, setInput] = useState("");
  const currentProviderMeta =
    PROVIDERS_CATALOG.find((p) => p.id === selectedProvider) ?? PROVIDERS_CATALOG[0];

  const latestTrace = terminalHistory[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isExecutingCommand) return;
    const cmd = input.trim();
    setInput("");
    await runTerminalCommand(cmd);
  };

  return (
    <section
      aria-label="Terminal Sandbox Execution Environment"
      data-testid="terminal-sandbox-home"
      className="shrink-0 bg-[#0b0e14] border-t border-white/15 text-[#e4e6eb] z-30"
    >
      {/* Expanded Hermes / Claude Code / DeepSeek Harness Split Panel */}
      {terminalExpanded && (
        <div
          data-testid="terminal-sandbox-expanded"
          className="h-[340px] md:h-[370px] border-b border-white/10 grid grid-cols-1 lg:grid-cols-12 overflow-hidden"
        >
          {/* Left Rail: 8-Provider Selector & 6-Layer Context Stack */}
          <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-white/10 p-3.5 overflow-y-auto bg-[#0e121a] space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#00ffa3]" aria-hidden="true" />
                  <span>Provider & Model Harness</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {currentProviderMeta.locality}
                </span>
              </div>

              <label className="block text-[11px] text-slate-400">
                Provider (8 Supported)
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as ProviderId)}
                  aria-label="Select AI Provider"
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#151a24] border border-white/15 text-xs text-white"
                >
                  {PROVIDERS_CATALOG.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.locality})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[11px] text-slate-400">
                Model
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  aria-label="Select Model"
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[#151a24] border border-white/15 text-xs text-white font-mono"
                >
                  {currentProviderMeta.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <div className="text-[11px] text-slate-400 font-mono">
                {currentProviderMeta.capabilities.join(" · ")}
              </div>
            </div>

            {latestTrace && (
              <div className="pt-3 border-t border-white/10 space-y-1.5">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>6-Layer Context Stack</span>
                </div>
                <ul className="space-y-1 text-[11px] font-mono text-slate-400">
                  {latestTrace.contextLayers.map((layer, idx) => (
                    <li key={idx} className="truncate" title={layer}>
                      {layer}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          {/* Center Panel: Execution Console (Hermes + Claude Code + DeepSeek Harness trace) */}
          <div className="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-white/10 p-3.5 overflow-y-auto space-y-3 bg-[#090c11]">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
              <div className="text-xs font-semibold text-white truncate">
                Execution Console · Hermes & DeepSeek Harness
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {QUICK_COMMANDS.slice(0, 3).map((cmd) => {
                  const shortTag = cmd.split(" ")[0];
                  return (
                    <button
                      key={cmd}
                      type="button"
                      title={cmd}
                      onClick={() => void runTerminalCommand(cmd)}
                      className="px-2 py-0.5 rounded bg-white/5 border border-white/10 hover:border-[#00ffa3]/50 text-[10px] font-mono text-slate-300 hover:text-white whitespace-nowrap"
                    >
                      {shortTag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {terminalHistory.map((trace) => (
                <div
                  key={trace.id}
                  className="p-3 rounded-md bg-[#10141c] border border-white/10 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                    <span className="text-[#00ffa3] font-semibold truncate">
                      $ {trace.command}
                    </span>
                    <span className="text-slate-400 shrink-0 tabular-nums">
                      {trace.provider}/{trace.model} · {trace.timestamp}
                    </span>
                  </div>

                  <div className="space-y-1 pl-2 border-l border-white/15">
                    {trace.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <span className="font-mono text-sky-400 shrink-0 w-20">
                          {step.phase}
                        </span>
                        <span className="text-slate-300">{step.detail}</span>
                        {step.tool && (
                          <span className="ml-auto font-mono text-slate-400 shrink-0 inline-flex items-center gap-1">
                            <Wrench className="w-2.5 h-2.5" aria-hidden="true" />
                            {step.tool}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-[#e4e6eb] pt-1 leading-relaxed">
                    {trace.outputSummary}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Emitted Artifact & Agent Binding */}
          <aside className="lg:col-span-3 p-3.5 overflow-y-auto bg-[#0e121a] space-y-3">
            <h3 className="text-xs font-semibold text-slate-300">
              Harness Target & Emitted Artifact
            </h3>
            {latestTrace ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded bg-[#141923] border border-white/10 space-y-1.5">
                  <div className="font-mono text-[11px] text-slate-400">
                    Target Agent: {latestTrace.targetAgentId}
                  </div>
                  <div className="font-semibold text-white">
                    {latestTrace.emittedArtifactTitle ?? "Readiness Verification Report"}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {latestTrace.outputSummary}
                  </p>
                  <button
                    type="button"
                    onClick={() => summonAgent(latestTrace.targetAgentId)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#00ffa3] hover:underline"
                  >
                    <span>Summon {latestTrace.targetAgentId} Workspace</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400">
                    Slash & Agent Commands
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 space-y-0.5">
                    <div>@design &lt;task&gt; · @jarvis &lt;task&gt;</div>
                    <div>/brain · /war-room · /mainbrain</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Run a command below to inspect output.</p>
            )}
          </aside>
        </div>
      )}

      {/* Always-Visible Bottom Command Dock Bar */}
      <form
        onSubmit={handleSubmit}
        className="px-4 md:px-6 py-2.5 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <TerminalIcon className="w-4 h-4 text-[#00ffa3]" aria-hidden="true" />
          <span className="hidden sm:inline font-mono text-xs font-semibold text-white whitespace-nowrap">
            Terminal Sandbox
          </span>
          <span className="hidden md:inline font-mono text-[11px] text-slate-400 whitespace-nowrap">
            {currentProviderMeta.name} · {selectedModel}
          </span>
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Terminal Sandbox Command Input"
            data-testid="terminal-command-input"
            placeholder="Command @design, @architecture, @jarvis, @librarian or type /brain, /war-room..."
            className="w-full px-3 py-1.5 rounded bg-[#141923] border border-white/15 text-xs font-mono text-white placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
          />

          <button
            type="submit"
            disabled={isExecutingCommand}
            data-testid="terminal-run-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00ffa3] text-black text-xs font-semibold hover:brightness-110 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Play className="w-3 h-3" aria-hidden="true" />
            <span>{isExecutingCommand ? "Running..." : "Execute"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTerminalExpanded(!terminalExpanded)}
            aria-expanded={terminalExpanded}
            data-testid="terminal-toggle-button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#141923] border border-white/15 hover:border-white/30 text-xs text-slate-200 whitespace-nowrap"
          >
            <span>{terminalExpanded ? "Collapse" : "Harness Console"}</span>
            {terminalExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
          <span className="hidden xl:inline font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
            {agents.filter((a) => a.status !== "idle").length}/9 active
          </span>
        </div>
      </form>
    </section>
  );
}
