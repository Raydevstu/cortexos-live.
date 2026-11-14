import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CortexOS — Technical Systematic AI-Native Operating System",
  description:
    "CortexOS combines the 4C Second Brain (3D Knowledge Graph, Chief Librarian, LLM Wiki) with the Jarvis Supervisor, 7 Specialist Studios, and the War Room execution interface.",
  openGraph: {
    title: "CortexOS — Technical Systematic AI-Native Operating System",
    description:
      "CortexOS combines the 4C Second Brain (3D Knowledge Graph, Chief Librarian, LLM Wiki) with the Jarvis Supervisor, 7 Specialist Studios, and the War Room execution interface.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CortexOS — Technical Systematic AI-Native Operating System",
    description:
      "CortexOS combines the 4C Second Brain (3D Knowledge Graph, Chief Librarian, LLM Wiki) with the Jarvis Supervisor, 7 Specialist Studios, and the War Room execution interface.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        suppressHydrationWarning
        className="bg-[#0c0d0f] text-[#e4e6eb] font-sans text-[13px] antialiased selection:bg-[#00ffa3] selection:text-black"
      >
        {children}
      </body>
    </html>
  );
}
