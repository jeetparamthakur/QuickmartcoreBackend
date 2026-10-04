const DEFAULT_CORS_ORIGINS =
  'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3007,http://localhost:8082,http://127.0.0.1:8082';

export function parseCorsOrigins(raw?: string): string[] {
  return (raw ?? DEFAULT_CORS_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function createCorsOriginChecker(
  allowedOrigins: string[],
  nodeEnv: string,
): (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void {
  const allowed = new Set(allowedOrigins);

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowed.has(origin)) {
      callback(null, true);
      return;
    }
    if (nodeEnv !== 'production' && isLocalDevOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };
}
