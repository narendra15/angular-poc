// ----------------------------------------------------------
// Core state management service for sync tables
// ----------------------------------------------------------
import { Injectable, computed, signal } from '@angular/core';
import { ArchiveItem, UiMonth, ChangeDelta } from './model';
// import { applyArchiveChanges, fetchArchiveMatrix } from './sync-tables.mock-api';

// Utility: turn month number → "JAN", "FEB" etc
function monthName(m: number): string {
    return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'short' }).toUpperCase();
  }

@Injectable({ providedIn: 'root' })
export class SyncTablesService {
  // Years shown in dropdown (now derived from response)
  readonly years = signal<number[]>([]);

  // Selected year (will default to the newest year from response)
  readonly currentYear = signal<number>(new Date().getFullYear());

  // Baseline: only months provided by API per year
  // Map<year, Map<monthNumber, boolean>>
  private baselineByYear = signal<Map<number, Map<number, boolean>>>(new Map());

  // Track timestamp per (year,month) from API for display
  // Map<year, Map<monthNumber, string>>
  private tsByYear = signal<Map<number, Map<number, string>>>(new Map());

  // Edits relative to baseline: Map<year, Map<month, boolean>>
  private editsByYear = signal<Map<number, Map<number, boolean>>>(new Map());

  // PUBLIC: call this from component with your response array
  setBaselineFromResponse(items: ArchiveItem[]) {
    // Build baseline + timestamps from exact items (no auto-fill)
    const base = new Map<number, Map<number, boolean>>();
    const tsMap = new Map<number, Map<number, string>>();
    const yearsSet = new Set<number>();

    for (const it of items) {
      const y = it.year;
      const m = parseInt(it.month, 10); // "01" -> 1
      const val = it.isIncluded === 'Y';
      yearsSet.add(y);

      if (!base.has(y)) base.set(y, new Map());
      if (!tsMap.has(y)) tsMap.set(y, new Map());

      base.get(y)!.set(m, val);
      tsMap.get(y)!.set(m, it.ts);
    }

    // Set signals
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    this.years.set(sortedYears);
    // Default current year to newest from response, or keep existing if present
    this.currentYear.set(sortedYears[0] ?? this.currentYear());

    this.baselineByYear.set(base);
    this.tsByYear.set(tsMap);
    this.editsByYear.set(new Map()); // clear edits on new baseline
  }

  // UI list for selected year (only months present in baseline)
  readonly monthsForCurrentYear = computed<UiMonth[]>(() => {
    const y = this.currentYear();
    const base = this.baselineByYear().get(y);
    if (!base) return [];

    const tsMap = this.tsByYear().get(y) ?? new Map<number, string>();
    const edits = this.editsByYear().get(y) ?? new Map<number, boolean>();

    const months: UiMonth[] = [];
    // Only months we actually have in baseline (no 1..12 loop)
    for (const [monthNum, baseVal] of base.entries()) {
      const cur = edits.has(monthNum) ? edits.get(monthNum)! : baseVal;
      months.push({
        year: y,
        month: monthNum,
        checked: cur,
        initialChecked: baseVal,
        changed: cur !== baseVal,
        ts: tsMap.get(monthNum) ?? '',
      });
    }
    // Sort ascending by month number for a natural view
    months.sort((a, b) => a.month - b.month);
    return months;
  });

  // Pending changes grouped by year
  readonly pendingByYear = computed(() => {
    const out = new Map<number, { month: number; to: boolean; ts?: string }[]>();
    const baseline = this.baselineByYear();
    const edits = this.editsByYear();
    const tsAll = this.tsByYear();

    for (const [year, editMap] of edits.entries()) {
      const baseMap = baseline.get(year);
      if (!baseMap) continue;

      const rows: { month: number; to: boolean; ts?: string }[] = [];
      for (const [month, toVal] of editMap.entries()) {
        // only consider months that exist in baseline
        if (!baseMap.has(month)) continue;
        if (toVal !== (baseMap.get(month) ?? false)) {
          rows.push({ month, to: toVal, ts: tsAll.get(year)?.get(month) });
        }
      }
      if (rows.length) out.set(year, rows.sort((a, b) => a.month - b.month));
    }
    return out;
  });

  // Flattened deltas for apply
  readonly pendingDeltas = computed<ChangeDelta[]>(() => {
    const out: ChangeDelta[] = [];
    const baseline = this.baselineByYear();

    for (const [year, rows] of this.pendingByYear().entries()) {
      const baseMap = baseline.get(year)!;
      for (const { month, to } of rows) {
        const fromBool = baseMap.get(month) ?? false;
        out.push({
          year,
          month,
          from: fromBool ? 'Y' : 'N',
          to: to ? 'Y' : 'N',
        });
      }
    }
    return out.sort((a, b) => (b.year - a.year) || (a.month - b.month));
  });

  // Toggle a month if it exists in baseline for the current year
  toggleMonth(month: number) {
    const y = this.currentYear();
    const baseMap = this.baselineByYear().get(y);
    if (!baseMap) return;
    if (!baseMap.has(month)) return; // ignore months not in response

    const baselineVal = baseMap.get(month)!;
    const edits = new Map(this.editsByYear());
    const yearEdits = new Map(edits.get(y) ?? new Map());
    const currentVal = yearEdits.has(month) ? yearEdits.get(month)! : baselineVal;

    const nextVal = !currentVal;

    if (nextVal === baselineVal) yearEdits.delete(month);
    else yearEdits.set(month, nextVal);

    if (yearEdits.size === 0) edits.delete(y);
    else edits.set(y, yearEdits);

    this.editsByYear.set(edits);
  }

  setYear(year: number) { this.currentYear.set(year); }
  clearAll() { this.editsByYear.set(new Map()); }

  async applyChanges(): Promise<{ applied: number }> {
    const deltas = this.pendingDeltas();
    if (!deltas.length) return { applied: 0 };

    // TODO: call your real API; leaving payload shape the same as before
    // [{ year, month, to: 'Y'|'N' }]
    // ...perform POST...

    // Merge into baseline
    const baseline = new Map(this.baselineByYear());
    for (const [year, rows] of this.pendingByYear().entries()) {
      const baseMap = new Map(baseline.get(year) ?? new Map());
      for (const { month, to } of rows) baseMap.set(month, to);
      baseline.set(year, baseMap);
    }
    this.baselineByYear.set(baseline);
    this.editsByYear.set(new Map());
    return { applied: deltas.length };
  }

  // UI helpers updated for Included/Removed semantics
  monthLabel(m: number) { return monthName(m); }
  statusText(b: boolean) { return b ? 'Included (Y)' : 'Removed (N)'; }
  statusCode(b: boolean) { return b ? 'Y' : 'N'; }
}
