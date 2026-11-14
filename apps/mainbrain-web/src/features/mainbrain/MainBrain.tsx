import type { ReactNode } from "react";

export function MainBrain({ children }: { children?: ReactNode }) {
  return <section data-cortexos-core="mainbrain">{children}</section>;
}
