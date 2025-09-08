// ----------------------------------------------------------
// Core state management service for sync tables
// ----------------------------------------------------------
import { Injectable, computed, signal } from '@angular/core';
import { ArchiveItem, UiMonth, ChangeDelta } from './model';
import { applyArchiveChanges, fetchArchiveMatrix } from './sync-tables.mock-api';

// Utility: turn month number → "JAN", "FEB" etc
function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'short' }).toUpperCase();
}

@Injectable({ providedIn: 'root' })
export class SyncTablesService {
  // Dropdown years: fixed set 2025 → 2020
  readonly years = signal<number[]>([2025, 2024, 2023, 2022, 2021, 2020]);

  // Currently selected year in the dropdown (default 2024)
  readonly currentYear = signal<number>(2024);

  // Baseline data loaded from API
  // Map<year, Map<month, boolean>>  (boolean = true if archived)
  private baselineByYear = signal<Map<number, Map<number, boolean>>>(new Map());

  // Edits made by user compared to baseline
  // Same shape as baseline, but only stores months that differ
  private editsByYear = signal<Map<number, Map<number, boolean>>>(new Map());

  // Computed: return UiMonth[] for current selected year (for left panel grid)
  readonly monthsForCurrentYear = computed<UiMonth[]>(() => {
    const y = this.currentYear();
    const baseline = this.baselineByYear().get(y);
    if (!baseline) return [];

    const edits = this.editsByYear().get(y) ?? new Map<number, boolean>();
    const months: UiMonth[] = [];

    for (let m = 1; m <= 12; m++) {
      const initialChecked = baseline.get(m) ?? false;
      const current = edits.has(m) ? edits.get(m)! : initialChecked;
      months.push({
        year: y,
        month: m,
        checked: current,
        initialChecked,
        changed: current !== initialChecked,
      });
    }
    return months;
  });

  // Computed: pending changes grouped by year (for right panel)
  readonly pendingByYear = computed(() => {
    const out = new Map<number, { month: number; to: boolean }[]>();
    const baseline = this.baselineByYear();
    const edits = this.editsByYear();

    for (const [year, editMap] of edits.entries()) {
      const baseMap = baseline.get(year);
      if (!baseMap) continue;
      const rows: { month: number; to: boolean }[] = [];
      for (const [month, toVal] of editMap.entries()) {
        if (toVal !== (baseMap.get(month) ?? false)) {
          rows.push({ month, to: toVal });
        }
      }
      if (rows.length) out.set(year, rows.sort((a, b) => a.month - b.month));
    }
    return out;
  });

  // Computed: flattened list of deltas for Apply Changes
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

  // -------------------------------
  // Public API (used by component)
  // -------------------------------

  // Load baseline data from backend
  async load(): Promise<void> {
    const data = await fetchArchiveMatrix();
    this.seedBaseline(data);
  }

  // Rebuild baseline maps from API data
  private seedBaseline(items: ArchiveItem[]) {
    const byYear = new Map<number, Map<number, boolean>>();
    for (const item of items) {
      if (!byYear.has(item.Year)) byYear.set(item.Year, new Map());
      byYear.get(item.Year)!.set(item.Month, item.isArchived === 'Y');
    }
    this.baselineByYear.set(byYear);
    this.editsByYear.set(new Map()); // reset edits
  }

  // Toggle a month checkbox (update edits)
  toggleMonth(month: number) {
    const y = this.currentYear();
    const baseMap = this.baselineByYear().get(y);
    if (!baseMap) return;

    const baselineVal = baseMap.get(month) ?? false;
    const edits = new Map(this.editsByYear());
    const yearEdits = new Map(edits.get(y) ?? new Map());
    const currentVal = yearEdits.has(month) ? yearEdits.get(month)! : baselineVal;

    const nextVal = !currentVal;

    // If user reset back to baseline → remove from edits
    if (nextVal === baselineVal) {
      yearEdits.delete(month);
    } else {
      yearEdits.set(month, nextVal);
    }

    if (yearEdits.size === 0) edits.delete(y);
    else edits.set(y, yearEdits);

    this.editsByYear.set(edits);
  }

  // Set new current year when user changes dropdown
  setYear(year: number) {
    this.currentYear.set(year);
  }

  // Clear all edits (across all years)
  clearAll() {
    this.editsByYear.set(new Map());
  }

  // Apply changes: POST deltas, then merge into baseline
  async applyChanges(): Promise<{ applied: number }> {
    const deltas = this.pendingDeltas();
    if (!deltas.length) return { applied: 0 };

    const postBody = deltas.map(d => ({ Year: d.year, Month: d.month, to: d.to }));
    await applyArchiveChanges(postBody);

    // Merge changes into baseline and reset edits
    const baseline = new Map(this.baselineByYear());
    for (const [year, rows] of this.pendingByYear().entries()) {
      const baseMap = new Map(baseline.get(year) ?? new Map());
      for (const { month, to } of rows) {
        baseMap.set(month, to);
      }
      baseline.set(year, baseMap);
    }
    this.baselineByYear.set(baseline);
    this.editsByYear.set(new Map());

    return { applied: deltas.length };
  }

  // Helpers for UI labels
  monthLabel(m: number) { return monthName(m); }
  statusText(b: boolean) { return b ? 'Archived (Y)' : 'Not Archived (N)'; }
  statusCode(b: boolean) { return b ? 'Y' : 'N'; }
}
