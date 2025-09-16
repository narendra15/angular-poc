import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncTablesService } from '../sync-tables.service';
import { ArchiveItem } from '../model';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.scss'
})
export class TablesComponent {
  protected svc = inject(SyncTablesService);

  // 🔒 Role flag: true = Preparer (read-only), false = Reviewer (editable)
  readonlyMode = false;

  // Simple sort helper for right-panel keyvalue pipe (years desc)
  yearDesc = (a: any, b: any) => b.key - a.key;

  // Optional: tiny loading/empty state for UX
  loading = false;
  loadError = '';

  ngOnInit(): void {
    this.loadData();
  }

  /** Call your API here and seed the service baseline */
  loadData() {
    this.loading = true;
    this.loadError = '';
    const data: ArchiveItem[] = [
      { year: 2025, month: '01', isIncluded: 'Y', ts: '2025-02-01T10:20:20' },
      { year: 2025, month: '02', isIncluded: 'Y', ts: '2025-02-01T10:22:20' },
      { year: 2024, month: '12', isIncluded: 'N', ts: '2024-12-31T09:10:00' },
      { year: 2024, month: '11', isIncluded: 'N', ts: '2024-11-30T08:00:00' },
    ];

    this.svc.setBaselineFromResponse(data);

  }

  // ---- Event handlers (respect readonlyMode) ----
  onYearChange(val: string) { if (!this.readonlyMode) this.svc.setYear(Number(val)); }
  toggle(month: number) { if (!this.readonlyMode) this.svc.toggleMonth(month); }
  clearAll() { if (!this.readonlyMode) this.svc.clearAll(); }
  async apply() {
    if (this.readonlyMode) return;

    // Build payload ONLY from user-changed items
    const payload = this.svc.pendingDeltas().map(d => ({
      report_date: this.lastDayISO(d.year, d.month),
      status: d.to === 'Y' ? 'I' as const : 'R' as const,
    }));

    if (payload.length === 0) return; // nothing to do (button should already be disabled)

    // TODO: POST to your endpoint
    // await this.http.post('/api/apply-sync-tables', payload).toPromise();

    console.log('APPLY DELTA PAYLOAD:', payload);
    await this.svc.applyChanges();
  }

  /** Right-panel “Remove” = revert this pending edit (also toggles left) */
  removePending(year: number, month: number) {
    if (this.readonlyMode) return;
    const prev = this.svc.currentYear();
    if (prev !== year) this.svc.setYear(year);
    this.svc.toggleMonth(month);
    if (prev !== year) this.svc.setYear(prev);
  }

  private lastDayISO(year: number, month: number): string {
    const d = new Date(Date.UTC(year, month, 0));   // 0th day of next month
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
