import type { ReactNode } from "react";

export default function MainBrainRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div data-cortexos-root="mainbrain-web">{children}</div>;
}
