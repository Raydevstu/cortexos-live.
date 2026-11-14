"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FileSearch,
  Send,
  ShieldAlert,
  Users,
  Workflow,
  XCircle,
} from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import type { DockAgentId } from "@/lib/agent-os-logic";

const PHASE_CHAIN: DockAgentId[] = [
  "discovery",
  "product",
  "design",
  "architecture",
  "development",
  "qa",
  "release",
];

export default function JarvisWorkspace() {
  const {
    agents,
    activeProject,
    advanceProjectPhase,
    summonAgent,
    summonUtilityWorkspace,
    dispatchWorkRequest,
    conveneCouncil,
    submitApprovalDecision,
    workRequests,
    workflows,
    pendingApprovals,
    risks,
    councilReport,
    setIsBlueprintOpen,
  } = useAgentOS();

  const [dispatchStudio, setDispatchStudio] = useState<DockAgentId>("design");
  const [dispatchObjective, setDispatchObjective] = useState(
    "Audit accessibility tokens and confirm Architecture handoff readiness"
  );
  const [councilObjective, setCouncilObjective] = useState(
    "Review readiness gate before advancing Architecture phase"
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchObjective.trim() || busyAction) return;
    setBusyAction("dispatch");
    try {
      await dispatchWorkRequest(dispatchStudio, dispatchObjective.trim());
    } finally {
      setBusyAction(null);
    }
  };

  const handleConveneCouncil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!councilObjective.trim() || busyAction) return;
    setBusyAction("council");
    try {
      await conveneCouncil(councilObjective.trim());
    } finally {
      setBusyAction(null);
    }
  };

  const jarvisAgent = agents.find((a) => a.id === "jarvis");

  return (
    <div className="space-y-6">
      {/* Supervisor Context */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Supervisor Orchestration · {activeProject.name}
        </h3>
        <p className="mt-1.5 text-sm text-[#e4e6eb] leading-relaxed">
          {activeProject.objective}
        </p>
        {jarvisAgent && (
          <p className="mt-1.5 text-xs font-mono text-teal-300">
            Last Decision: {jarvisAgent.lastDecision}
          </p>
        )}
      </div>

      {/* Phase Pipeline Control */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Lifecycle Phase Engine
          </h3>
          <span className="font-mono text-xs text-[#00ffa3]">
            Active: {activeProject.phase}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PHASE_CHAIN.map((phaseId) => {
            const isCurrent = activeProject.phase === phaseId;
            return (
              <button
                key={phaseId}
                type="button"
                onClick={() => void advanceProjectPhase(phaseId)}
                className={`px-2.5 py-1.5 rounded text-xs capitalize border transition-colors whitespace-nowrap ${
                  isCurrent
                    ? "bg-[#00ffa3] text-black border-[#00ffa3] font-semibold"
                    : "bg-[#141923] border-white/10 text-slate-300 hover:border-white/30 hover:text-white"
                }`}
              >
                {phaseId}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dispatch WorkRequest to Studio */}
      <form
        onSubmit={handleDispatch}
        className="pt-4 border-t border-white/10 space-y-3"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          WorkRequest Dispatcher (Temporal Mesh)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-xs text-slate-300">
            Target Studio
            <select
              value={dispatchStudio}
              onChange={(e) => setDispatchStudio(e.target.value as DockAgentId)}
              className="mt-1 w-full px-2.5 py-2 rounded bg-[#0b0e14] border border-white/15 text-xs text-[#e4e6eb]"
            >
              {PHASE_CHAIN.map((id) => (
                <option key={id} value={id}>
                  {id.charAt(0).toUpperCase() + id.slice(1)} Studio
                </option>
              ))}
              <option value="librarian">Chief Librarian</option>
            </select>
          </label>

          <label className="sm:col-span-2 text-xs text-slate-300">
            WorkRequest Objective
            <input
              type="text"
              value={dispatchObjective}
              onChange={(e) => setDispatchObjective(e.target.value)}
              placeholder="Specify objective and deliverables..."
              className="mt-1 w-full px-3 py-2 rounded bg-[#0b0e14] border border-white/15 text-xs text-[#e4e6eb]"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="submit"
            disabled={busyAction === "dispatch"}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#00ffa3] text-black text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {busyAction === "dispatch" ? "Dispatching..." : "Dispatch WorkRequest"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => summonAgent(dispatchStudio)}
            className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"
          >
            <span>Open {dispatchStudio} studio</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </form>

      {/* Live Agent Council Runtime */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>Agent Council Runtime</span>
          </h3>
          {councilReport && (
            <span className="font-mono text-[11px] text-teal-300">
              {councilReport.opinions.length} Studio Votes
            </span>
          )}
        </div>

        <form onSubmit={handleConveneCouncil} className="flex items-center gap-2">
          <input
            type="text"
            value={councilObjective}
            onChange={(e) => setCouncilObjective(e.target.value)}
            aria-label="Agent Council Objective"
            className="flex-1 min-w-0 px-3 py-1.5 rounded bg-[#0b0e14] border border-white/15 text-xs text-white"
          />
          <button
            type="submit"
            disabled={busyAction === "council"}
            data-testid="convene-council-btn"
            className="px-3 py-1.5 rounded bg-sky-400 text-black text-xs font-semibold hover:brightness-110 whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {busyAction === "council" ? "Convening..." : "Convene Council"}
          </button>
        </form>

        {councilReport && (
          <div className="p-3 rounded-md bg-[#0b0e14] border border-white/10 space-y-2 text-xs">
            <div className="font-semibold text-white">{councilReport.consensusSummary}</div>
            <div className="space-y-1.5 pt-1 border-t border-white/10">
              {councilReport.opinions.slice(0, 4).map((op) => (
                <div key={op.studioId} className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-sky-300 uppercase text-[11px]">
                      {op.studioId}:{" "}
                    </span>
                    <span className="text-slate-300">{op.recommendation}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                    {Math.round(op.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending Approval Gates */}
      <div className="pt-4 border-t border-white/10 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Approval Engine ({pendingApprovals.filter((p) => p.status === "pending").length} Pending)
          </h3>
        </div>
        {pendingApprovals.length === 0 ? (
          <p className="text-xs text-slate-400">No pending approval gates.</p>
        ) : (
          <div className="divide-y divide-white/10 border border-white/10 rounded-md bg-[#0b0e14]">
            {pendingApprovals.slice(0, 4).map((item) => (
              <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">{item.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {item.requestedBy} · {item.status}
                  </div>
                </div>
                {item.status === "pending" ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        void submitApprovalDecision({
                          approvalId: item.id,
                          workflowId: item.workflowId,
                          artifactId: item.artifactId,
                          approved: true,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#00ffa3]/15 border border-[#00ffa3]/40 text-[#00ffa3] text-[11px]"
                    >
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void submitApprovalDecision({
                          approvalId: item.id,
                          workflowId: item.workflowId,
                          artifactId: item.artifactId,
                          approved: false,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/15 border border-rose-400/40 text-rose-300 text-[11px]"
                    >
                      <XCircle className="w-3 h-3" aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-[11px] text-teal-300">{item.status}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live WorkRequests & Temporal Workflows */}
      <div className="pt-4 border-t border-white/10 space-y-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Workflow className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
          <span>Temporal Workflows ({workflows.length}) & WorkRequests ({workRequests.length})</span>
        </h3>
        <div className="divide-y divide-white/10 border border-white/10 rounded-md bg-[#0b0e14]">
          {workflows.slice(0, 4).map((wf) => (
            <div key={wf.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="font-mono text-white truncate">{wf.workflowType}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  Queue: {wf.taskQueue} · Step: {wf.currentStep}
                </div>
              </div>
              <span className="font-mono text-[11px] text-teal-300 shrink-0">{wf.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Engine Summary */}
      <div className="pt-4 border-t border-white/10 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Risk Engine Telemetry
        </h3>
        <div className="space-y-1.5 text-xs">
          {risks.slice(0, 3).map((r) => (
            <div key={r.id} className="p-2 rounded bg-[#0b0e14] border border-white/10">
              <div className="font-mono text-[11px] text-amber-300 uppercase">
                {r.severity} · {r.source}
              </div>
              <div className="text-slate-300">{r.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summonable Governance Consoles */}
      <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() =>
            summonUtilityWorkspace(
              "audit",
              "4C Audit Engine",
              "Foundation Layer Integrity & Staleness"
            )
          }
          className="flex items-center gap-2 p-2.5 rounded bg-[#141923] border border-white/10 hover:border-[#00ffa3]/50 text-left text-xs"
        >
          <ShieldAlert className="w-4 h-4 text-[#00ffa3] shrink-0" aria-hidden="true" />
          <div>
            <div className="font-semibold text-white">4C Audit Engine</div>
            <div className="text-[11px] text-slate-400">Summon workspace</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            summonUtilityWorkspace(
              "grillme",
              "Grill-Me Stress Test",
              "Adversarial Architectural Interrogation"
            )
          }
          className="flex items-center gap-2 p-2.5 rounded bg-[#141923] border border-white/10 hover:border-[#00ffa3]/50 text-left text-xs"
        >
          <Compass className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-semibold text-white">Grill-Me Stress Test</div>
            <div className="text-[11px] text-slate-400">Challenge assumptions</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsBlueprintOpen(true)}
          className="flex items-center gap-2 p-2.5 rounded bg-[#141923] border border-white/10 hover:border-[#00ffa3]/50 text-left text-xs"
        >
          <FileSearch className="w-4 h-4 text-violet-400 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-semibold text-white">Architecture Blueprint</div>
            <div className="text-[11px] text-slate-400">SDK & Service spec</div>
          </div>
        </button>
      </div>
    </div>
  );
}
