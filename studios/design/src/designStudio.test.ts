import test from "node:test";
import assert from "node:assert/strict";
import type {
  Artifact,
  StudioHandoffRequest,
  WorkRequest,
} from "../../../packages/shared-types/src/index.ts";
import {
  computeContrastRatio,
  CortexDesignStudio,
  DESIGN_STUDIO_MANIFEST,
} from "./index.ts";

function sampleWorkRequest(overrides: Partial<WorkRequest> = {}): WorkRequest {
  const now = new Date().toISOString();
  return {
    id: "wreq-design-001",
    organizationId: "org-001",
    projectId: "proj-cortex-ui",
    studioId: "design",
    objective: "Design MainBrain summonable Design Workspace and WCAG AA token palette",
    constraints: [
      "Preserve Agent Dock + MainBrain + Terminal Sandbox layout",
      "Meet WCAG 2.1 AA contrast and keyboard Escape dismissal",
    ],
    successCriteria: [
      "Emit user flow specification",
      "Emit responsive wireframe blueprint",
      "Emit semantic token design system",
    ],
    contextArtifacts: ["art-prd-001"],
    priority: "high",
    status: "assigned",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("CortexDesignStudio implements manifest, initialize, execute, validate, and Jarvis handoff", async () => {
  const emitted: Artifact[] = [];
  const handoffs: StudioHandoffRequest[] = [];

  const studio = new CortexDesignStudio({
    onArtifactCreated: (artifact) => {
      emitted.push(artifact);
    },
    onHandoff: (handoff) => {
      handoffs.push(handoff);
    },
  });

  assert.equal(studio.manifest.id, "design");
  assert.deepEqual(
    studio.manifest.supportedArtifacts,
    DESIGN_STUDIO_MANIFEST.supportedArtifacts
  );

  await studio.initialize();
  assert.ok(studio.getLocalMemory().length >= 4);

  const response = await studio.execute(sampleWorkRequest());
  assert.equal(response.status, "completed");
  assert.equal(response.studioId, "design");
  assert.equal(response.nextRecommendedPhase, "architecture");
  assert.equal(response.artifactIds.length, 3);
  assert.equal(emitted.length, 3);

  const artifactTypes = new Set(emitted.map((a) => a.artifactType));
  assert.deepEqual(artifactTypes, new Set(["ui_design", "wireframe", "design_system"]));

  for (const id of response.artifactIds) {
    assert.equal(await studio.validate(id), true);
  }
  assert.equal(await studio.validate("non-existent-id"), false);

  const a11y = studio.getAccessibilityReport();
  assert.ok(a11y);
  assert.equal(a11y.passed, true);
  assert.equal(a11y.score, 100);

  assert.equal(handoffs.length, 1);
  assert.equal(handoffs[0].fromStudioId, "design");
  assert.equal(handoffs[0].toStudioId, "architecture");
  assert.deepEqual(handoffs[0].artifactIds, response.artifactIds);
  assert.equal(studio.agent.id, "design-agent");
  assert.equal(studio.agent.role, "Experience Architect");
  assert.equal(studio.agent.status, "completed");
});

test("CortexDesignStudio blocks on WCAG 2.1 AA low-contrast palette failure", async () => {
  assert.ok(computeContrastRatio("#F8FAFC", "#0B0F17") > 15);
  assert.ok(computeContrastRatio("#94A3B8", "#FFFFFF") < 4.5);

  const studio = new CortexDesignStudio({
    palette: {
      surfaceCanvas: "#FFFFFF",
      surfaceElevated: "#F8FAFC",
      surfaceRecessed: "#F1F5F9",
      inkPrimary: "#94A3B8", // Fails WCAG 4.5:1 on white
      inkSecondary: "#CBD5E1", // Fails WCAG 4.5:1 on F8FAFC
      accentPrimary: "#38BDF8",
      inkOnAccent: "#FFFFFF",
      borderSubtle: "#E2E8F0",
      borderFocus: "#E2E8F0",
    },
  });

  const response = await studio.execute(sampleWorkRequest({ id: "wreq-a11y-fail" }));
  assert.equal(response.status, "blocked");
  assert.match(response.summary, /Contrast failure/i);
  assert.equal(studio.getLastHandoff(), null);
  assert.equal(studio.agent.status, "blocked");
});

test("CortexDesignStudio enforces studio boundary & governance constraints", async () => {
  const studio = new CortexDesignStudio();

  const wrongStudio = await studio.execute(
    sampleWorkRequest({ id: "wreq-wrong", studioId: "architecture" })
  );
  assert.equal(wrongStudio.status, "failed");

  const forbidden = await studio.execute(
    sampleWorkRequest({
      id: "wreq-forbidden",
      objective: "Write SQL migration and modify MainBrain directly",
    })
  );
  assert.equal(forbidden.status, "blocked");
  assert.match(forbidden.summary, /governance constraints/i);
});
