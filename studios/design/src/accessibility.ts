export interface ColorTokenPair {
  name: string;
  foreground: string;
  background: string;
  isLargeTextOrUi?: boolean;
}

export interface ContrastCheckResult {
  name: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  passed: boolean;
}

export interface AccessibilityAuditReport {
  standard: "WCAG 2.1 AA";
  passed: boolean;
  score: number;
  contrastChecks: ContrastCheckResult[];
  landmarkChecks: {
    hasPrimaryMainLandmark: boolean;
    hasKeyboardTraversalPlan: boolean;
    hasReducedMotionFallback: boolean;
    hasLoadingEmptyErrorStates: boolean;
  };
  blockers: string[];
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.trim().replace(/^#/, "");
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : cleaned;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid hex color token: ${hex}`);
  }

  const intVal = Number.parseInt(normalized, 16);
  return [(intVal >> 16) & 255, (intVal >> 8) & 255, intVal & 255];
}

function linearizeChannel(channel255: number): number {
  const srgb = channel255 / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * linearizeChannel(r) +
    0.7152 * linearizeChannel(g) +
    0.0722 * linearizeChannel(b)
  );
}

/**
 * Computes exact WCAG 2.1 relative luminance contrast ratio between two hex colors.
 */
export function computeContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function auditDesignAccessibility(params: {
  tokenPairs: ColorTokenPair[];
  hasPrimaryMainLandmark: boolean;
  hasKeyboardTraversalPlan: boolean;
  hasReducedMotionFallback: boolean;
  hasLoadingEmptyErrorStates: boolean;
}): AccessibilityAuditReport {
  const contrastChecks: ContrastCheckResult[] = params.tokenPairs.map((pair) => {
    const ratio = computeContrastRatio(pair.foreground, pair.background);
    const requiredRatio = pair.isLargeTextOrUi ? 3.0 : 4.5;
    return {
      name: pair.name,
      foreground: pair.foreground,
      background: pair.background,
      ratio,
      requiredRatio,
      passed: ratio >= requiredRatio,
    };
  });

  const blockers: string[] = [];
  for (const check of contrastChecks) {
    if (!check.passed) {
      blockers.push(
        `Contrast failure for '${check.name}' (${check.foreground} on ${check.background}): ${check.ratio}:1 < ${check.requiredRatio}:1`
      );
    }
  }
  if (!params.hasPrimaryMainLandmark) {
    blockers.push("Missing semantic <main> landmark definition in wireframe layout.");
  }
  if (!params.hasKeyboardTraversalPlan) {
    blockers.push("Missing keyboard Tab/Escape focus traversal specification.");
  }
  if (!params.hasReducedMotionFallback) {
    blockers.push("Missing prefers-reduced-motion fallback in motion tokens.");
  }
  if (!params.hasLoadingEmptyErrorStates) {
    blockers.push("Wireframe must define loading, empty, and error UI states.");
  }

  const totalChecks = contrastChecks.length + 4;
  const passedChecks =
    contrastChecks.filter((c) => c.passed).length +
    Number(params.hasPrimaryMainLandmark) +
    Number(params.hasKeyboardTraversalPlan) +
    Number(params.hasReducedMotionFallback) +
    Number(params.hasLoadingEmptyErrorStates);

  return {
    standard: "WCAG 2.1 AA",
    passed: blockers.length === 0,
    score: Math.round((passedChecks / Math.max(1, totalChecks)) * 100),
    contrastChecks,
    landmarkChecks: {
      hasPrimaryMainLandmark: params.hasPrimaryMainLandmark,
      hasKeyboardTraversalPlan: params.hasKeyboardTraversalPlan,
      hasReducedMotionFallback: params.hasReducedMotionFallback,
      hasLoadingEmptyErrorStates: params.hasLoadingEmptyErrorStates,
    },
    blockers,
  };
}
