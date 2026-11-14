/**
 * Next.js 15 server instrumentation.
 *
 * If this project already has src/instrumentation.ts or instrumentation.ts
 * at the repository root, merge this register() body into the existing file
 * instead of creating a second instrumentation entry point.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startTaseetyServerDiscovery } = await import(
    "./lib/server-discovery"
  );

  startTaseetyServerDiscovery();
}
