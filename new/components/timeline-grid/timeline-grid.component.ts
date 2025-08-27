import { Component, Input, OnChanges, OnInit, } from '@angular/core';
import { NgFor, NgIf, NgClass, CommonModule } from '@angular/common';
import { IsoDate, Row, CellKind, CellTooltip } from '../../models';

@Component({
  selector: 'app-timeline-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeline-grid.component.html',
  styleUrl: './timeline-grid.component.scss'
})
export class TimelineGridComponent implements OnInit{
  /** Show header only for AXIOM table */
  @Input() showHeader = false;
  /** Dates for the month ("YYYY-MM-DD") */
  @Input() dates: IsoDate[] = [];
  /** Rows shaped by ingest.ts */
  @Input() rows: Row[] = [];
  
  month: string = '';

  ngOnInit(): void {
    console.log('dates for month', this.dates)
    this.getDate(this.dates[0])
  }

  getDate(dateStr: string) {
    const date = new Date(dateStr);
    
    const months = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL",
      "MAY", "JUNE", "JULY", "AUGUST",
      "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];
    
    const month = months[date.getMonth()]; // getMonth gives 0-11
    const year = date.getFullYear().toString().slice(-2); // last two digits
    
    this.month =  `${month}' ${year}`;
  }

  // weekend/highlight helpers
  isWeekend: boolean[] = [];
  colHasRecord: boolean[] = [];

  // tooltip state
  tipOpen = false;
  tipData: CellTooltip | null = null;
  tipXY = { x: 0, y: 0 };

  ngOnChanges() {
    this.computeWeekendFlags();
    this.computeColumnHasRecord();
  }

  /* Header label: "01, Sun" */
  headerLabel(i: number): string {
    const d = this.dates[i];
    if (!d) return '';
    const [y, m, dd] = d.split('-').map(Number);
    const dow = new Date(y, m - 1, dd).getDay(); // 0..6
    const short = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow];
    return `${String(dd).padStart(2, '0')}, ${short}`;
  }

  isMonthlyRow(r: Row): boolean {
    return r.cells.length === 1 && !!r.cells[0].colSpan && r.cells[0].colSpan > 1;
  }

  private computeWeekendFlags(): void {
    this.isWeekend = this.dates.map(d => {
      const [y, m, dd] = d.split('-').map(Number);
      const day = new Date(y, m - 1, dd).getDay();
      return day === 0 || day === 6;
    });
  }

  private computeColumnHasRecord(): void {
    const has = new Array(this.dates.length).fill(false);
    const realKinds = new Set<CellKind>(['Success', 'Warning', 'Error']);
    for (const r of this.rows) {
      if (this.isMonthlyRow(r)) continue;
      r.cells.forEach((c, i) => { if (realKinds.has(c.kind)) has[i] = true; });
    }
    this.colHasRecord = has;
  }

  dotClass(kind: CellKind): string {
    if (kind === 'Success') return 'dot dot-green';
    if (kind === 'Warning') return 'dot dot-amber';
    if (kind === 'Error')   return 'dot dot-red';
    if (kind === 'NotReceived' || kind === 'NotGenerated') return 'ring-red';
    return ''; // Blank → nothing
  }

  /** Open tooltip beside the clicked cell, if it has tooltip data */
  openTooltip(ev: MouseEvent, data?: CellTooltip) {
    if (!data) return;
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.tipXY = { x: rect.left + rect.width + window.scrollX + 8,
                   y: rect.top + window.scrollY };
    this.tipData = data;
    this.tipOpen = true;
  }

  /** Optional action inside tooltip (e.g., Validation Checks) */
  goTo(cmd?: string) {
    if (!cmd) return;
    // Stub for now; replace with router navigation if needed
    console.log('Navigate to:', cmd);
    this.tipOpen = false;
  }

  closeTooltip() { this.tipOpen = false; }
}
