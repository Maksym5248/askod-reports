import type { RunningBackend } from '../server';

// Only the standalone entrypoint installs process signal handlers.
export function installShutdownHandlers(api: RunningBackend) {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 15_000);
    timeout.unref();
    void api.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
