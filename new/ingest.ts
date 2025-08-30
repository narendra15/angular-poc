// src/app/system-health/ingest.ts
// Turns raw JSON into:
//  - date list for a reporting period (year, month)
//  - timeline rows for AXIOM (A) and Source Systems (S)
//  - mapping columns (M/L)
// Rules covered:
//  * AXIOM widget shows only one row: "AXIOM"
//  * For DAILY rows in the current month (EST):
//      - Today and future => Blank
//      - Strictly past day => dot/ring from data, or missing default
//  * For MONTHLY rows (A/S) and all MAPPING columns:
//      - If NO record: Blank until 15th (EST), then red dot/ring (unmapped/not generated/not received)
//      - If record exists: show real status immediately (no “15th gate”)
//  * Always render hard-coded catalogues even with no data (no blank screens)

import {
  Cell,
  CellKind,
  CellTooltip,
  IsoDate,
  MappingColumn,
  Row,
  ShLoadStatus,
  ShRaw,
} from './models';

/* ------------------------------------------------------------
 * Hard-coded catalogues (edit to match your mockup labels)
 * ---------------------------------------------------------- */

// AXIOM widget has exactly one file
const AXIOM_CATALOGUE: string[] = ['AXIOM'];

// Source Systems rows (daily + any monthly)
const SOURCE_CATALOGUE: string[] = [
  'ADAxJW',
  'APMS',
  'APMS Monthly',
  'BMO SM',
  'QRM',
  'QRM Monthly',
  'SDR',
];

// Mapping/Lookup columns (all monthly-style)
const MAPPING_CATALOGUE: string[] = [
  'Lookup File 1',
  'Mapping File 1',
  'Mapping File 2',
];

/* ------------------------------------
 * Date helpers
 * ---------------------------------- */

/** Build list of ISO dates for a (year, month). */
export function buildDateList(year: number, month: number): IsoDate[] {
  const days = new Date(year, month, 0).getDate();
  const out: IsoDate[] = [];
  for (let d = 1; d <= days; d++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    out.push(`${year}-${mm}-${dd}` as IsoDate);
  }
  return out;
}

/** Return "today at midnight" in EST/EDT as a UTC Date object. */
function getTodayEST(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', // Eastern time (handles DST)
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = Number(parts.find(p => p.type === 'year')?.value);
  const m = Number(parts.find(p => p.type === 'month')?.value);
  const d = Number(parts.find(p => p.type === 'day')?.value);
  // Create a UTC Date corresponding to EST midnight
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

/** Check if the reporting month (from dates[]) equals the EST current month. */
function isCurrentMonthEST(dates: IsoDate[]): boolean {
  if (!dates.length) return false;
  const [y, m] = dates[0].split('-').map(Number);
  const est = getTodayEST();
  return est.getUTCFullYear() === y && est.getUTCMonth() + 1 === m;
}

/** Extract day-of-month (1..31) from ISO date. */
function dayOfMonth(iso: IsoDate): number {
  return Number(iso.slice(8, 10));
}


/** Are we past the 15th (EST) for this reporting month? */
function isPast15thEST(dates: IsoDate[]): boolean {
  if (!isCurrentMonthEST(dates)) return true; // not current month → no grace period
  const est = getTodayEST();                  // EST midnight today
  return est.getUTCDate() > 15;
}
/* ------------------------------------
 * Small utilities
 * ---------------------------------- */

/** Convert server status (S/W/E) to a UI cell kind. */
function loadStatusToKind(s?: ShLoadStatus): CellKind {
  if (s === 'S') return 'Success';
  if (s === 'W') return 'Warning';
  if (s === 'E') return 'Error';
  return 'Blank';
}

/** Decide if record a is newer (by feed_load_date/report_date) than b. */
function isNewer(a?: ShRaw, b?: ShRaw): boolean {
  if (!a) return false;
  if (!b) return true;
  const ta = new Date(a.sh_feed_load_date || a.sh_report_date).getTime();
  const tb = new Date(b.sh_feed_load_date || b.sh_report_date).getTime();
  return ta >= tb;
}

/* ------------------------------------
 * Tooltip builders (used only when a record exists)
 * ---------------------------------- */

/** Build base title/color from message fields (fallback if header missing). */
function baseTip(rec: ShRaw | undefined, fallback: string): Pick<CellTooltip, 'title' | 'color'> {
  return {
    title: rec?.sh_load_message_header?.trim() || fallback,
    color: rec?.sh_load_message_color || undefined, // 'G' | 'A' | 'R'
  };
}

/** Tooltip for Axiom success record. */
function tipAxiomSuccess(rec: ShRaw): CellTooltip {
  const base = baseTip(rec, 'File Generated');
  return {
    ...base,
    lines: [
      `Last generated on: ${rec.sh_feed_load_date ?? 'NA'}`,
      `No. of Records Loaded: ${rec.sh_target_record_cnt ?? 0}`,
    ],
  };
}

/** Tooltip for Source warning record. */
function tipSourceWarning(rec: ShRaw): CellTooltip {
  const base = baseTip(rec, 'Loaded with Warnings');
  const src = rec.sh_source_record_cnt ?? 0;
  const tgt = rec.sh_target_record_cnt ?? 0;
  const details = (rec.sh_load_message_details && rec.sh_load_message_details.trim()) || 'See log for details.';
  return {
    ...base,
    lines: [
      `Last loaded on: ${rec.sh_feed_load_date ?? 'NA'}`,
      `No. of Records Loaded: ${src}/${tgt}`,
      `Errors: ${details}`,
    ],
  };
}

/** Tooltip for Source error record. */
function tipSourceError(rec: ShRaw): CellTooltip {
  const base = baseTip(rec, 'Load Failed');
  const src = rec.sh_source_record_cnt ?? 0;
  const tgt = rec.sh_target_record_cnt ?? 0;
  const details = (rec.sh_load_message_details && rec.sh_load_message_details.trim()) || 'See error log.';
  return {
    ...base,
    lines: [
      `File received on: ${rec.sh_feed_load_date ?? 'NA'}`,
      `No. of Records Loaded: ${src}/${tgt}`,
      `Errors: ${details}`,
    ],
  };
}

/** Tooltip for Mapping success record. */
function tipMappingSuccess(rec: ShRaw): CellTooltip {
  const base = baseTip(rec, 'Approved and Merged');
  return {
    ...base,
    lines: [
      `File Merged on: ${rec.sh_feed_load_date ?? rec.sh_report_date ?? 'NA'}`,
      `No. of Records: ${rec.sh_target_record_cnt ?? 0}`,
    ],
    action: { label: 'Validation Checks', cmd: 'validation-checks' },
  };
}

/** Tooltip for Mapping warning record. */
function tipMappingWarning(rec: ShRaw): CellTooltip {
  const base = baseTip(rec, 'Submitted with Warnings');
  return {
    ...base,
    lines: [
      `File Submitted on: ${rec.sh_feed_load_date ?? rec.sh_report_date ?? 'NA'}`,
      `No. of Records: ${rec.sh_target_record_cnt ?? 0}`,
    ],
  };
}

/** Tooltip for Mapping error or “no submission” record. */
function tipMappingErrorOrNone(rec?: ShRaw): CellTooltip {
  const base = baseTip(rec, rec ? 'Submitted with Errors' : 'No Submission');
  return {
    ...base,
    lines: [
      `File Date: ${rec?.sh_feed_load_date ?? rec?.sh_report_date ?? 'NA'}`,
      `No. of Records: ${rec?.sh_target_record_cnt ?? 0}`,
    ],
  };
}

/* ------------------------------------
 * Timeline rows (AXIOM 'A' and SOURCE 'S')
 * ---------------------------------- */

/** Build rows for AXIOM ('A') or Source ('S') respecting “today EST” & monthly rules. */
export function buildTimelineRows(raw: ShRaw[], dates: IsoDate[], category: 'A' | 'S'): Row[] {
  const inCurrentMonth = isCurrentMonthEST(dates);
  const todayEST = getTodayEST(); // midnight EST (as UTC Date)

  // Keep only active records for the category and selected month
  const scoped = raw.filter(
    (r) =>
      r.sh_active_rec_ind === 'A' &&
      r.sh_feed_ctgry === category &&
      dates.includes(r.sh_report_date as IsoDate)
  );

  // Group by feed type (UI label equals sh_feed_type)
  const byLabel = new Map<string, ShRaw[]>();
  for (const r of scoped) {
    const list = byLabel.get(r.sh_feed_type) || [];
    list.push(r);
    byLabel.set(r.sh_feed_type, list);
  }

  // Choose catalogue to enforce (AXIOM single-row or Source list)
  const catalogue = category === 'A' ? AXIOM_CATALOGUE : SOURCE_CATALOGUE;
  const rows: Row[] = [];

  for (const label of catalogue) {
    const list = byLabel.get(label);
    const isMonthly = label.toLowerCase().includes('monthly');

    // ---- No data for this label in the month ----
    if (!list || list.length === 0) {
      if (isMonthly) {
        // Monthly: blank until 15th (if current month), else missing (A=red dot, S=red ring)
        const missing: CellKind = category === 'A' ? 'Error' : 'NotReceived';
        const kind: CellKind =
        isPast15thEST(dates) ? missing : 'Blank';
        rows.push({
          label,
          cells: [{ date: dates[0], kind, colSpan: dates.length }], // no tooltip for missing
        });
      } else {
        // Daily: in current month => today & future blank; past => missing
        const cells: Cell[] = dates.map((d) => {
          const js = new Date(d); // local parse of YYYY-MM-DD produces UTC-midnight date
          if (inCurrentMonth && js.getTime() >= todayEST.getTime()) {
            return { date: d, kind: 'Blank' }; // today or future
          }
          return { date: d, kind: category === 'A' ? 'Error' : 'NotReceived' }; // past missing
        });
        rows.push({ label, cells });
      }
      continue;
    }

    // ---- Has data for this label ----
    if (isMonthly) {
      // Pick newest monthly record and render status immediately (no “15th gate” when data exists)
      const latest = list.reduce<ShRaw | undefined>((best, cur) => (isNewer(cur, best) ? cur : best), undefined);
      const kind: CellKind = loadStatusToKind(latest?.sh_load_status) || (category === 'A' ? 'Error' : 'NotReceived');

      let tooltip: CellTooltip | undefined;
      if (latest) {
        if (category === 'S') {
          tooltip =
            latest.sh_load_status === 'E'
              ? tipSourceError(latest)
              : latest.sh_load_status === 'W'
              ? tipSourceWarning(latest)
              : tipAxiomSuccess(latest);
        } else {
          tooltip = latest.sh_load_status === 'S' ? tipAxiomSuccess(latest) : undefined;
        }
      }

      rows.push({ label, cells: [{ date: dates[0], kind, colSpan: dates.length, tooltip }] });
    } else {
      // Daily row: newest record per date; today+future blank in current month
      const latestByDate = new Map<string, ShRaw>();
      for (const rec of list) {
        const prev = latestByDate.get(rec.sh_report_date);
        if (isNewer(rec, prev)) latestByDate.set(rec.sh_report_date, rec);
      }

      const cells: Cell[] = dates.map((d) => {
        const rec = latestByDate.get(d);
        const js = new Date(d);

        // Today and future are always Blank in current month
        if (inCurrentMonth && js.getTime() >= todayEST.getTime()) {
          return { date: d, kind: 'Blank' };
        }

        if (rec) {
          const kind = loadStatusToKind(rec.sh_load_status);
          if (category === 'S') {
            if (rec.sh_load_status === 'E') return { date: d, kind, tooltip: tipSourceError(rec) };
            if (rec.sh_load_status === 'W') return { date: d, kind, tooltip: tipSourceWarning(rec) };
            return { date: d, kind, tooltip: tipAxiomSuccess(rec) }; // reuse success format
          } else {
            // Axiom daily: show real status; tooltips only for success
            return { date: d, kind, tooltip: rec.sh_load_status === 'S' ? tipAxiomSuccess(rec) : undefined };
          }
        }

        // Past & missing → A red dot, S red ring
        return { date: d, kind: category === 'A' ? 'Error' : 'NotReceived' };
      });

      rows.push({ label, cells });
    }
  }

  return rows; // catalogue order preserved
}

/* ------------------------------------
 * Mapping / Lookup columns
 * ---------------------------------- */

/** Build mapping columns with “blank until 15th (EST) if no data, else red dot” rule. */
export function buildMappingColumns(raw: ShRaw[], year: number, month: number): MappingColumn[] {
  const dates = buildDateList(year, month);
  const inCurrentMonth = isCurrentMonthEST(dates);

  // Newest record per mapping label for the selected month
  const newest = new Map<string, ShRaw>();
  for (const r of raw) {
    if (r.sh_active_rec_ind !== 'A') continue;
    if (r.sh_feed_ctgry !== 'M' && r.sh_feed_ctgry !== 'L') continue;
    const y = Number(r.sh_report_date.slice(0, 4));
    const m = Number(r.sh_report_date.slice(5, 7));
    if (y !== year || m !== month) continue;
    const prev = newest.get(r.sh_feed_type);
    newest.set(r.sh_feed_type, isNewer(r, prev) ? r : prev ?? r);
  }

  const cols: MappingColumn[] = [];

  for (const label of MAPPING_CATALOGUE) {
    const rec = newest.get(label);

    if (!rec) {
      // No data: Blank until 15th of current month, else red dot (unmapped)
      const status: CellKind =
      isPast15thEST(dates) ? 'Error' : 'Blank';
      cols.push({ label, status }); // no tooltip for missing
      continue;
    }

    // With data: use status + tooltip
    const statusKind: CellKind = loadStatusToKind(rec.sh_load_status) || 'Error';
    let tooltip: CellTooltip | undefined;
    if (rec.sh_load_status === 'S') tooltip = tipMappingSuccess(rec);
    else if (rec.sh_load_status === 'W') tooltip = tipMappingWarning(rec);
    else tooltip = tipMappingErrorOrNone(rec);

    cols.push({ label, status: statusKind, tooltip });
  }

  return cols; // preserve catalogue order
}




















// src/app/system-health/ingest.ts
// Transforms raw JSON into:
//  - date list for a reporting period (year, month)
//  - timeline rows for AXIOM (A) and Source Systems (S)
//  - mapping columns (M/L)
// Rules:
//  * AXIOM widget shows one row: "AXIOM"
//  * DAILY rows (current month, EST):
//      - Today & future => Blank
//      - Past => show data if present; if missing => A red dot / S red ring
//      - NEW: Weekends with no data => Blank (no dot/ring) for both A & S
//  * MONTHLY rows (A/S) & MAPPING:
//      - If NO record: Blank until 15th (EST), then A red dot / S red ring / M red dot
//      - If record exists: show real status immediately
//  * Always render all hard-coded file names/columns.

import {
  Cell,
  CellKind,
  CellTooltip,
  IsoDate,
  MappingColumn,
  Row,
  ShLoadStatus,
  ShRaw,
} from './models';

/* ------------------------------------------------------------
 * Hard-coded catalogues (edit to match your mock labels)
 * ---------------------------------------------------------- */
const AXIOM_CATALOGUE: string[] = ['AXIOM'];

const SOURCE_CATALOGUE: string[] = [
  'ADAxJW',
  'APMS',
  'APMS Monthly',
  'BMO SM',
  'QRM',
  'QRM Monthly',
  'SDR',
];

const MAPPING_CATALOGUE: string[] = [
  'Lookup File 1',
  'Mapping File 1',
  'Mapping File 2',
];

/* ------------------------------------
 * Date helpers
 * ---------------------------------- */

/** Build list of ISO dates for a (year, month). */
export function buildDateList(year: number, month: number): IsoDate[] {
  const days = new Date(year, month, 0).getDate();
  const out: IsoDate[] = [];
  for (let d = 1; d <= days; d++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    out.push(`${year}-${mm}-${dd}` as IsoDate);
  }
  return out;
}

/** Return "today at midnight" in EST/EDT (DST aware) as a UTC Date. */
function getTodayEST(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = Number(parts.find(p => p.type === 'year')?.value);
  const m = Number(parts.find(p => p.type === 'month')?.value);
  const d = Number(parts.find(p => p.type === 'day')?.value);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

/** Is the reporting month (from dates[]) equal to the EST current month? */
function isCurrentMonthEST(dates: IsoDate[]): boolean {
  if (!dates.length) return false;
  const [y, m] = dates[0].split('-').map(Number);
  const est = getTodayEST();
  return est.getUTCFullYear() === y && est.getUTCMonth() + 1 === m;
}

/** Are we past the 15th (EST) for this reporting month? */
function isPast15thEST(dates: IsoDate[]): boolean {
  if (!isCurrentMonthEST(dates)) return true; // not current month → no grace period
  const est = getTodayEST();
  return est.getUTCDate() > 15;
}

/** Extract day-of-week (0=Sun..6=Sat) safely from ISO without TZ drift. */
function dow(iso: IsoDate): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Is the ISO date a weekend (Sat/Sun)? */
function isWeekend(iso: IsoDate): boolean {
  const day = dow(iso);
  return day === 0 || day === 6;
}

/* ------------------------------------
 * Small utilities
 * ---------------------------------- */

/** Convert server status (S/W/E) to a UI cell kind. */
function loadStatusToKind(s?: ShLoadStatus): CellKind {
  if (s === 'S') return 'Success';
  if (s === 'W') return 'Warning';
  if (s === 'E') return 'Error';
  return 'Blank';
}

/** Is record a newer (by feed_load_date/report_date) than b? */
function isNewer(a?: ShRaw, b?: ShRaw): boolean {
  if (!a) return false;
  if (!b) return true;
  const ta = new Date(a.sh_feed_load_date || a.sh_report_date).getTime();
  const tb = new Date(b.sh_feed_load_date || b.sh_report_date).getTime();
  return ta >= tb;
}

/* ------------------------------------
 * Tooltip builders (used only when a record exists)
 * ---------------------------------- */

/** Build base title/color from message fields (fallback if header missing). */
function baseTip(rec: ShRaw | undefined, fallback: string): Pick<CellTooltip, 'title' | 'color'> {
  return {
    title: rec?.sh_load_message_header?.trim() || fallback,
    color: rec?.sh_load_message_color || undefined, // 'G' | 'A' | 'R'
  };
}

/** Tooltip for Axiom success record. */
function tipAxiomSuccess(rec: ShRaw): CellTooltip {
  const base = baseTip(rec, 'File Generated');
  return {
    ...base,
    lines: [
      `Last generated on: ${rec.sh_feed_load_date ?? 'NA'}`,
      `No. of Records Loaded: ${rec.sh_target_record_cnt ?? 0}`,
    ],
  };
}

/** Tooltip for Source warning record. */
function tipSourceWarning(rec: ShRaw): CellTooltip {
  const base = baseTip(rec, 'Loaded with Warnings');
  const src = rec.sh_source_record_cnt ?? 0;
  const tgt = rec.sh_target_record_cnt ?? 0;
  const details = (rec.sh_load_message_details && rec.sh_load_message_details.trim()) || 'See log for details.';
  return {
    ...base,
    lines: [
      `Last loaded on: ${rec.sh_feed_load_date ?? 'NA'}`,
      `No. of Records Loaded: ${src}/${tgt}`,
      `Errors: ${details}`,
    ],
  };
}

/** Tooltip for Source error record. */
function tipSourceError(rec: ShRaw): CellTooltip {
  const base = baseTip(rec, 'Load Failed');
  const src = rec.sh_source_record_cnt ?? 0;
  const tgt = rec.sh_target_record_cnt ?? 0;
  const details = (rec.sh_load_message_details && rec.sh_load_message_details.trim()) || 'See error log.';
  return {
    ...base,
    lines: [
      `File received on: ${rec.sh_feed_load_date ?? 'NA'}`,
      `No. of Records Loaded: ${src}/${tgt}`,
      `Errors: ${details}`,
    ],
  };
}

/** Tooltip for Mapping success record. */
function tipMappingSuccess(rec: ShRaw): CellTooltip {
  const base = baseTip(rec, 'Approved and Merged');
  return {
    ...base,
    lines: [
      `File Merged on: ${rec.sh_feed_load_date ?? rec.sh_report_date ?? 'NA'}`,
      `No. of Records: ${rec.sh_target_record_cnt ?? 0}`,
    ],
    action: { label: 'Validation Checks', cmd: 'validation-checks' },
  };
}

/** Tooltip for Mapping warning record. */
function tipMappingWarning(rec: ShRaw): CellTooltip {
  const base = baseTip(rec, 'Submitted with Warnings');
  return {
    ...base,
    lines: [
      `File Submitted on: ${rec.sh_feed_load_date ?? rec.sh_report_date ?? 'NA'}`,
      `No. of Records: ${rec.sh_target_record_cnt ?? 0}`,
    ],
  };
}

/** Tooltip for Mapping error or “no submission” record. */
function tipMappingErrorOrNone(rec?: ShRaw): CellTooltip {
  const base = baseTip(rec, rec ? 'Submitted with Errors' : 'No Submission');
  return {
    ...base,
    lines: [
      `File Date: ${rec?.sh_feed_load_date ?? rec?.sh_report_date ?? 'NA'}`,
      `No. of Records: ${rec?.sh_target_record_cnt ?? 0}`,
    ],
  };
}

/* ------------------------------------
 * Timeline rows (AXIOM 'A' and SOURCE 'S')
 * ---------------------------------- */

/** Build rows for AXIOM ('A') or Source ('S') respecting EST “today”, weekend blank, and monthly rules. */
export function buildTimelineRows(raw: ShRaw[], dates: IsoDate[], category: 'A' | 'S'): Row[] {
  const inCurrentMonth = isCurrentMonthEST(dates);
  const todayEST = getTodayEST();

  // Keep only active records for this category & month
  const scoped = raw.filter(
    (r) =>
      r.sh_active_rec_ind === 'A' &&
      r.sh_feed_ctgry === category &&
      dates.includes(r.sh_report_date as IsoDate)
  );

  // Group by feed type (UI label equals sh_feed_type)
  const byLabel = new Map<string, ShRaw[]>();
  for (const r of scoped) {
    const list = byLabel.get(r.sh_feed_type) || [];
    list.push(r);
    byLabel.set(r.sh_feed_type, list);
  }

  const catalogue = category === 'A' ? AXIOM_CATALOGUE : SOURCE_CATALOGUE;
  const rows: Row[] = [];

  for (const label of catalogue) {
    const list = byLabel.get(label);
    const isMonthly = label.toLowerCase().includes('monthly');

    // ---- No data for this label in the month ----
    if (!list || list.length === 0) {
      if (isMonthly) {
        // Monthly: blank until 15th (EST) if no data, else missing indicator
        const missing: CellKind = category === 'A' ? 'Error' : 'NotReceived';
        const kind: CellKind = isPast15thEST(dates) ? missing : 'Blank';
        rows.push({
          label,
          cells: [{ date: dates[0], kind, colSpan: dates.length }], // no tooltip
        });
      } else {
        // Daily with no records: weekend → Blank; else apply today/future blank rule and missing for past
        const cells: Cell[] = dates.map((d) => {
          if (isWeekend(d)) return { date: d, kind: 'Blank' }; // NEW: weekends with no data are blank
          const js = new Date(d);
          if (inCurrentMonth && js.getTime() >= todayEST.getTime()) {
            return { date: d, kind: 'Blank' }; // today/future blank
          }
          return { date: d, kind: category === 'A' ? 'Error' : 'NotReceived' }; // past weekday missing
        });
        rows.push({ label, cells });
      }
      continue;
    }

    // ---- Has data for this label ----
    if (isMonthly) {
      const latest = list.reduce<ShRaw | undefined>((best, cur) => (isNewer(cur, best) ? cur : best), undefined);
      const kind: CellKind = loadStatusToKind(latest?.sh_load_status) || (category === 'A' ? 'Error' : 'NotReceived');

      let tooltip: CellTooltip | undefined;
      if (latest) {
        if (category === 'S') {
          tooltip =
            latest.sh_load_status === 'E'
              ? tipSourceError(latest)
              : latest.sh_load_status === 'W'
              ? tipSourceWarning(latest)
              : tipAxiomSuccess(latest);
        } else {
          tooltip = latest.sh_load_status === 'S' ? tipAxiomSuccess(latest) : undefined;
        }
      }

      rows.push({ label, cells: [{ date: dates[0], kind, colSpan: dates.length, tooltip }] });
    } else {
      // Daily row: newest record per date; weekend rule + today/future blank
      const latestByDate = new Map<string, ShRaw>();
      for (const rec of list) {
        const prev = latestByDate.get(rec.sh_report_date);
        if (isNewer(rec, prev)) latestByDate.set(rec.sh_report_date, rec);
      }

      const cells: Cell[] = dates.map((d) => {
        const rec = latestByDate.get(d);

        // Today and future → Blank (current month)
        const js = new Date(d);
        if (inCurrentMonth && js.getTime() >= todayEST.getTime()) {
          return { date: d, kind: 'Blank' };
        }

        if (rec) {
          const kind = loadStatusToKind(rec.sh_load_status);
          if (category === 'S') {
            if (rec.sh_load_status === 'E') return { date: d, kind, tooltip: tipSourceError(rec) };
            if (rec.sh_load_status === 'W') return { date: d, kind, tooltip: tipSourceWarning(rec) };
            return { date: d, kind, tooltip: tipAxiomSuccess(rec) };
          } else {
            return { date: d, kind, tooltip: rec.sh_load_status === 'S' ? tipAxiomSuccess(rec) : undefined };
          }
        }

        // Missing record: weekend → Blank; weekday → A red dot / S red ring
        if (isWeekend(d)) return { date: d, kind: 'Blank' }; // NEW: weekend missing stays blank
        return { date: d, kind: category === 'A' ? 'Error' : 'NotReceived' };
      });

      rows.push({ label, cells });
    }
  }

  return rows; // catalogue order preserved
}

/* ------------------------------------
 * Mapping / Lookup columns
 * ---------------------------------- */

/** Build mapping columns with “blank until 15th (EST) if no data, else red dot” rule. */
export function buildMappingColumns(raw: ShRaw[], year: number, month: number): MappingColumn[] {
  const dates = buildDateList(year, month);

  // newest record by label for selected month
  const newest = new Map<string, ShRaw>();
  for (const r of raw) {
    if (r.sh_active_rec_ind !== 'A') continue;
    if (r.sh_feed_ctgry !== 'M' && r.sh_feed_ctgry !== 'L') continue;
    const y = Number(r.sh_report_date.slice(0, 4));
    const m = Number(r.sh_report_date.slice(5, 7));
    if (y !== year || m !== month) continue;
    const prev = newest.get(r.sh_feed_type);
    newest.set(r.sh_feed_type, isNewer(r, prev) ? r : prev ?? r);
  }

  const cols: MappingColumn[] = [];

  for (const label of MAPPING_CATALOGUE) {
    const rec = newest.get(label);

    if (!rec) {
      // No data: Blank until 15th (EST), then red dot (unmapped)
      const status: CellKind = isPast15thEST(dates) ? 'Error' : 'Blank';
      cols.push({ label, status }); // no tooltip
      continue;
    }

    // With data: use status + tooltip
    const statusKind: CellKind = loadStatusToKind(rec.sh_load_status) || 'Error';
    let tooltip: CellTooltip | undefined;
    if (rec.sh_load_status === 'S') tooltip = tipMappingSuccess(rec);
    else if (rec.sh_load_status === 'W') tooltip = tipMappingWarning(rec);
    else tooltip = tipMappingErrorOrNone(rec);

    cols.push({ label, status: statusKind, tooltip });
  }

  return cols;
}
