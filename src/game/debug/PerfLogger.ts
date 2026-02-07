// lightweight performance logger gated behind ?perf query param.
// all methods are no-ops when disabled so there's zero cost in production.

const enabled =
  typeof window !== 'undefined' && window.location.search.includes('perf');

interface PerfEntry {
  label: string;
  time: number;
}

const marks: PerfEntry[] = [];
let summaryScheduled = false;

// seconds after page load to print the summary table
const SUMMARY_DELAY_MS = 7_000;

function pad(ms: number): string {
  return String(Math.round(ms)).padStart(6, ' ');
}

export const PerfLogger = {
  // record a named instant with wall-clock time since navigation start
  mark(label: string): void {
    if (!enabled) return;
    const now = performance.now();
    performance.mark(label);
    marks.push({ label, time: now });
    // eslint-disable-next-line no-console
    console.log(`[Perf] ${pad(now)}ms  ${label}`);
    scheduleSummary();
  },

  // record a named duration between two existing marks
  measure(label: string, startMark: string, endMark: string): void {
    if (!enabled) return;
    try {
      const m = performance.measure(label, startMark, endMark);
      // eslint-disable-next-line no-console
      console.log(`[Perf] ${pad(m.duration)}ms  ${label} (duration)`);
    } catch {
      // marks might not exist if timing was skipped
    }
  },

  // print a summary table of all recorded marks
  summary(): void {
    if (!enabled || marks.length === 0) return;
    // eslint-disable-next-line no-console
    console.log('\n[Perf] Summary:');
    // eslint-disable-next-line no-console
    console.table(
      marks.map((m) => ({ event: m.label, 'ms since load': Math.round(m.time) })),
    );
  },

  get enabled(): boolean {
    return enabled;
  },
};

function scheduleSummary(): void {
  if (summaryScheduled) return;
  summaryScheduled = true;
  setTimeout(() => PerfLogger.summary(), SUMMARY_DELAY_MS);
}
