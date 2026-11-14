import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0c0d0f] text-[#e4e6eb] flex flex-col items-center justify-center p-6 font-mono">
      <div className="border border-[#e4e6eb]/20 bg-black/60 p-8 max-w-md w-full space-y-4">
        <div className="text-[11px] uppercase tracking-[0.15em] text-[#00ffa3]">
          CORTEXOS // 404 NOT FOUND
        </div>
        <h1 className="text-xl font-bold uppercase tracking-tight text-white">
          Surface Route Not Found
        </h1>
        <p className="text-xs text-[#e4e6eb]/60 leading-relaxed">
          The requested knowledge route or surface does not exist in the active CortexOS workspace.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-[#00ffa3] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all"
          >
            Return to War Room
          </Link>
        </div>
      </div>
    </div>
  );
}
