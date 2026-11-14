"use client";

import React from "react";
import MainBrainV2 from "@/components/os/MainBrainV2";
import type { BrainNode } from "@/lib/knowledge-data";

export default function MainBrainHome({
  onGraphNodesLoaded,
}: {
  onGraphNodesLoaded?: (nodes: BrainNode[]) => void;
}) {
  return <MainBrainV2 onGraphNodesLoaded={onGraphNodesLoaded} />;
}

