import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WAR_ROOM_PANEL_IDS,
  WAR_ROOM_PANELS,
  WAR_ROOM_PRESETS,
  ZONE_DIMENSION_BOUNDS,
  activateWarRoomPanel,
  buildWarRoomGridCssVars,
  clampZoneDimensions,
  createDefaultWarRoomLayout,
  deriveWarRoomGoldenRuleTelemetry,
  deserializeWarRoomLayout,
  findPanelZone,
  isWarRoomPanelVisible,
  isZoneAllowedForPanel,
   getAllowedTargetZonesForPanel,
  moveWarRoomPanelToZone,
  serializeWarRoomLayout,
  setWarRoomMaximizedPanel,
  stepWarRoomZoneDimension,
  toggleWarRoomPanelVisibility,
  toggleWarRoomZoneCollapsed,
} from "./workspace-state.ts";
import {
  DOCK_AGENTS_SEED,
  INITIAL_ACTIVITY_FEED,
  INITIAL_ARTIFACT_FEED,
  INITIAL_TOOL_ACTIVITY_FEED,
  INITIAL_WORKFLOW_FEED,
  PROJECT_CONTEXTS_SEED,
} from "../agent-os-logic.ts";

describe("Step 1: War Room Workspace State Foundation", () => {
  it("registers all 9 Constitutional War Room panels across the fixed 4 zones", () => {
    assert.equal(WAR_ROOM_PANEL_IDS.length, 9);
    const numbers = WAR_ROOM_PANEL_IDS.map((id) => WAR_ROOM_PANELS[id].number).sort(
      (a, b) => a - b
    );
    assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const layout = createDefaultWarRoomLayout("mission-execution");
    const allDocked = [
      ...layout.zones.left.panelIds,
      ...layout.zones.center.panelIds,
      ...layout.zones.right.panelIds,
      ...layout.zones.bottom.panelIds,
    ];
    for (const panelId of WAR_ROOM_PANEL_IDS) {
      assert.ok(
        allDocked.includes(panelId),
        `Expected panel "${panelId}" to be assigned to one of the 4 fixed zones`
      );
    }
  });

  it("supports all 4 deterministic Workspace Presets", () => {
    const presetIds = [
      "mission-execution",
      "code-and-sandbox",
      "review-and-gates",
      "operator-harness",
    ] as const;

    for (const presetId of presetIds) {
      const layout = WAR_ROOM_PRESETS[presetId].createLayout();
      assert.equal(layout.activePresetId, presetId);
      assert.equal(layout.zones.center.collapsed, false);
      assert.ok(layout.zones.center.activePanelId !== null);
    }

    const sandboxLayout = createDefaultWarRoomLayout("code-and-sandbox");
    assert.equal(sandboxLayout.zones.center.activePanelId, "sandbox");

    const reviewLayout = createDefaultWarRoomLayout("review-and-gates");
    assert.equal(reviewLayout.zones.center.activePanelId, "artifacts");

    const operatorLayout = createDefaultWarRoomLayout("operator-harness");
    assert.equal(operatorLayout.zones.left.activePanelId, "harness");
    assert.equal(operatorLayout.zones.bottom.activePanelId, "logs");
  });

  it("deterministically moves panels between the 4 fixed zones without emptying center", () => {
    let layout = createDefaultWarRoomLayout("mission-execution");
    assert.equal(findPanelZone(layout, "harness"), "left");

    // Move Provider Harness from left to bottom
    layout = moveWarRoomPanelToZone(layout, "harness", "bottom");
    assert.equal(findPanelZone(layout, "harness"), "bottom");
    assert.equal(layout.zones.bottom.activePanelId, "harness");
    assert.ok(!layout.zones.left.panelIds.includes("harness"));

    // Move artifacts and sandbox out of center; center must retain its last remaining panel ("chat")
    layout = moveWarRoomPanelToZone(layout, "artifacts", "right");
    layout = moveWarRoomPanelToZone(layout, "sandbox", "right");
    assert.deepEqual(layout.zones.center.panelIds, ["chat"]);

    // Attempting to move the final panel out of center should keep it in center
    layout = moveWarRoomPanelToZone(layout, "chat", "left");
    assert.deepEqual(layout.zones.center.panelIds, ["chat"]);
  });

  it("toggles panel visibility, zone collapse, and maximize state deterministically", () => {
    let layout = createDefaultWarRoomLayout("mission-execution");
    assert.equal(isWarRoomPanelVisible(layout, "terminal"), true);

    // Hide terminal
    layout = toggleWarRoomPanelVisibility(layout, "terminal");
    assert.equal(isWarRoomPanelVisible(layout, "terminal"), false);
    assert.ok(layout.hiddenPanelIds.includes("terminal"));

    // Activate terminal unhides it and makes it active in bottom zone
    layout = activateWarRoomPanel(layout, "terminal");
    assert.equal(isWarRoomPanelVisible(layout, "terminal"), true);
    assert.equal(layout.zones.bottom.activePanelId, "terminal");

    // Collapse right zone; center zone cannot be collapsed
    layout = toggleWarRoomZoneCollapsed(layout, "right");
    assert.equal(layout.zones.right.collapsed, true);
    layout = toggleWarRoomZoneCollapsed(layout, "center");
    assert.equal(layout.zones.center.collapsed, false);

    // Maximize and restore
    layout = setWarRoomMaximizedPanel(layout, "sandbox");
    assert.equal(layout.maximizedPanelId, "sandbox");
    layout = setWarRoomMaximizedPanel(layout, "sandbox");
    assert.equal(layout.maximizedPanelId, null);
  });

  it("clamps CSS-variable zone dimensions and serializes/deserializes safely", () => {
    const clamped = clampZoneDimensions({
      leftWidthPx: 100, // below min 240
      rightWidthPx: 999, // above max 540
      bottomHeightPx: 250,
    });
    assert.equal(clamped.leftWidthPx, ZONE_DIMENSION_BOUNDS.leftWidthPx.min);
    assert.equal(clamped.rightWidthPx, ZONE_DIMENSION_BOUNDS.rightWidthPx.max);
    assert.equal(clamped.bottomHeightPx, 250);

    const cssVars = buildWarRoomGridCssVars(clamped);
    assert.equal(cssVars["--wr-left-w"], "240px");
    assert.equal(cssVars["--wr-right-w"], "540px");
    assert.equal(cssVars["--wr-bottom-h"], "250px");

    const serialized = serializeWarRoomLayout(createDefaultWarRoomLayout("operator-harness"));
    const restored = deserializeWarRoomLayout(serialized);
    assert.equal(restored.activePresetId, "operator-harness");
    assert.equal(restored.zones.left.activePanelId, "harness");

    // Corrupt JSON falls back safely to default mission-execution preset
    const fallback = deserializeWarRoomLayout("{invalid-json");
    assert.equal(fallback.activePresetId, "mission-execution");
  });

  it("computes the 6 War Room Golden Rule answers within 5-second telemetry snapshot", () => {
    const telemetry = deriveWarRoomGoldenRuleTelemetry({
      activeMission: "build-software",
      activeProject: PROJECT_CONTEXTS_SEED[0],
      agents: DOCK_AGENTS_SEED,
      selectedProvider: "anthropic",
      selectedModel: "claude-3-7-sonnet",
      isExecutingCommand: false,
      workflows: INITIAL_WORKFLOW_FEED,
      toolActivityFeed: INITIAL_TOOL_ACTIVITY_FEED,
      artifactFeed: INITIAL_ARTIFACT_FEED,
      activityFeed: INITIAL_ACTIVITY_FEED,
      pendingApprovals: [],
      latestTerminalCompound: null,
    });

    // 1. What am I trying to accomplish?
    assert.equal(telemetry.activeMissionTitle, "Build Software");
    assert.ok(telemetry.projectName.length > 0);
    // 2. What is currently running?
    assert.ok(telemetry.activeWorkflowType.length > 0);
    assert.ok(telemetry.activeTaskSummary.length > 0);
    // 3. Which agent is working?
    assert.ok(telemetry.activeAgentName.length > 0);
    // 4. Which model is being used?
    assert.equal(telemetry.activeProviderId, "anthropic");
    assert.equal(telemetry.activeModel, "claude-3-7-sonnet");
    // 5. What happened?
    assert.ok(telemetry.whatHappenedSummary.length > 0);
    assert.ok(telemetry.estimatedSessionCostUsd >= 0);
    // 6. What should I do next?
    assert.ok(telemetry.nextStepLabel.length > 0);
    assert.ok(telemetry.nextStepCommand.length > 0);
  });

  it("Step 2 WarRoomHeader telemetry prioritizes pending approvals and blocked agents for Next Action", () => {
    const withApproval = deriveWarRoomGoldenRuleTelemetry({
      activeMission: "analyze-knowledge",
      activeProject: PROJECT_CONTEXTS_SEED[0],
      agents: DOCK_AGENTS_SEED,
      selectedProvider: "openai",
      selectedModel: "gpt-4.1",
      isExecutingCommand: true,
      workflows: INITIAL_WORKFLOW_FEED,
      toolActivityFeed: INITIAL_TOOL_ACTIVITY_FEED,
      artifactFeed: INITIAL_ARTIFACT_FEED,
      activityFeed: INITIAL_ACTIVITY_FEED,
      pendingApprovals: [
        {
          id: "appr-1",
          projectId: "proj-solar-crm",
          workflowId: "wf-1",
          title: "OpenAPI 3.1 Gate Spec",
          requestedBy: "Architecture Studio",
          reason: "Phase gate transition check",
          status: "pending",
          createdAt: "14:20:00",
        },
      ],
      latestTerminalCompound: null,
    });

    assert.equal(withApproval.activeMissionTitle, "Analyze Knowledge");
    assert.equal(withApproval.executionState, "executing");
    assert.equal(withApproval.nextStepTargetPanel, "artifacts");
    assert.ok(withApproval.nextStepLabel.includes("Review & Approve Gate: OpenAPI 3.1 Gate Spec"));
    assert.ok(withApproval.nextStepReason.includes("Architecture Studio"));
  });

  it("Step 3 DockZoneFrame enforces allowedZones at state/UI levels and supports keyboard resize stepping", () => {
    // 1. UI helper & metadata check
    assert.equal(isZoneAllowedForPanel("chat", "center"), true);
    assert.equal(isZoneAllowedForPanel("chat", "bottom"), false);
    assert.equal(isZoneAllowedForPanel("harness", "center"), false);
    assert.deepEqual(getAllowedTargetZonesForPanel("chat"), ["center", "left", "right"]);
    assert.deepEqual(getAllowedTargetZonesForPanel("harness"), ["left", "right", "bottom"]);

    // 2. State-level enforcement in moveWarRoomPanelToZone
    let layout = createDefaultWarRoomLayout("mission-execution");
    // Attempting to move 'harness' to 'center' (disallowed) must be rejected
    layout = moveWarRoomPanelToZone(layout, "harness", "center");
    assert.equal(findPanelZone(layout, "harness"), "left");
    assert.ok(!layout.zones.center.panelIds.includes("harness"));

    // Attempting to move 'chat' to 'bottom' (disallowed) must be rejected
    layout = moveWarRoomPanelToZone(layout, "chat", "bottom");
    assert.equal(findPanelZone(layout, "chat"), "center");
    assert.ok(!layout.zones.bottom.panelIds.includes("chat"));

    // 3. Deserialization self-healing when saved JSON places a panel in a disallowed zone
    const tampered = JSON.parse(serializeWarRoomLayout(layout));
    tampered.zones.center.panelIds.push("harness"); // harness is not allowed in center
    tampered.zones.left.panelIds = tampered.zones.left.panelIds.filter(
      (id: string) => id !== "harness"
    );
    const healed = deserializeWarRoomLayout(JSON.stringify(tampered));
    assert.ok(!healed.zones.center.panelIds.includes("harness"));
    assert.equal(findPanelZone(healed, "harness"), "left"); // healed back to defaultZone ("left")

    // 4. Keyboard-accessible resize stepping
    const initialDims = layout.dimensions;
    const steppedLeft = stepWarRoomZoneDimension(initialDims, "left", 1);
    assert.equal(steppedLeft.leftWidthPx, initialDims.leftWidthPx + 24);

    const minRight = stepWarRoomZoneDimension(initialDims, "right", "min");
    assert.equal(minRight.rightWidthPx, ZONE_DIMENSION_BOUNDS.rightWidthPx.min);

    const maxBottom = stepWarRoomZoneDimension(initialDims, "bottom", "max");
    assert.equal(maxBottom.bottomHeightPx, ZONE_DIMENSION_BOUNDS.bottomHeightPx.max);
  });
});

