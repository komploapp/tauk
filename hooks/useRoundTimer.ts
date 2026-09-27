import { useState, useEffect } from 'react';

export const ROUND_DURATION_S = 90;

function computeRemaining(
  durationS: number,
  startedAt: string | null | undefined,
  referenceMs?: number | null,
  pausedMs = 0,
): number {
  if (!startedAt) return durationS;
  const ref = referenceMs ?? Date.now();
  // Clamp to 0: a future started_at (prep delay) must not inflate remaining above durationS
  const elapsedMs = Math.max(0, ref - new Date(startedAt).getTime() - pausedMs);
  return Math.max(0, durationS - Math.floor(elapsedMs / 1000));
}

export function useRoundTimer(
  startedAt: string | null | undefined,
  frozenAtMs?: number | null,
  pausedMs = 0,
  durationS: number | null = ROUND_DURATION_S,
): {
  remaining: number | null;
  display: string;
  isExpired: boolean;
  isUrgent: boolean;
} {
  const [remaining, setRemaining] = useState<number | null>(() =>
    durationS === null ? null : computeRemaining(durationS, startedAt, frozenAtMs ?? null, pausedMs),
  );

  useEffect(() => {
    if (durationS === null) {
      setRemaining(null);
      return;
    }
    if (!startedAt) return;
    if (frozenAtMs != null) {
      setRemaining(computeRemaining(durationS, startedAt, frozenAtMs, pausedMs));
      return;
    }
    setRemaining(computeRemaining(durationS, startedAt, null, pausedMs));
    const id = setInterval(() => {
      setRemaining(computeRemaining(durationS, startedAt, null, pausedMs));
    }, 500);
    return () => clearInterval(id);
  }, [startedAt, frozenAtMs, pausedMs, durationS]);

  return {
    remaining,
    display: durationS === null ? '∞' : String(remaining ?? 0),
    isExpired: durationS !== null && remaining === 0 && !!startedAt,
    isUrgent: durationS !== null && remaining !== null && remaining > 0 && remaining <= 15,
  };
}
