export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  if (process.env.NEXT_RUNTIME === "nodejs" || !process.env.NEXT_RUNTIME) {
    try {
      const { ensureDatabaseMigrated } = await import("./lib/db/client");
      await ensureDatabaseMigrated();
    } catch (err) {
      console.error("[CortexOS Boot] Automatic startup migration check error:", err);
    }
  }
}
