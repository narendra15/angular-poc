import { Component, Input, Output, EventEmitter, OnChanges, ViewChild, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatDatepickerToggle } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';
import { MatCalendar } from '@angular/material/datepicker';


export const MONTH_YEAR_FORMATS = {
  parse:   { dateInput: { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions },
  display: {
    dateInput: { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions, // "August, 2025"
    monthYearLabel: { month: 'short', year: 'numeric' } as Intl.DateTimeFormatOptions,
    dateA11yLabel: { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions,
    monthYearA11yLabel: { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions,
  },
};

class MonthYearAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Intl.DateTimeFormatOptions): string {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    return d.toLocaleDateString(this.locale, displayFormat); // "August, 2025"
  }
}


@Component({
  selector: 'app-month-picker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDatepickerToggle,
  ],
  providers: [
    { provide: DateAdapter, useClass: MonthYearAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MONTH_YEAR_FORMATS },
  ],
  templateUrl: './month-picker.component.html',
  styleUrl: './month-picker.component.scss'
})
export class MonthPickerComponent {
  /** e.g., 6 => only last 6 months incl current are enabled */
  @Input() monthsBack = 6;

  /** Optional default in 'YYYY-MM-DD' format; we use its month/year. */
  @Input() defaultDateYMD?: string;

  /** Emits 'YYYY-MM-DD' where DD = last day of selected month */
  @Output() valueChange = new EventEmitter<string | null>();

  @ViewChild('picker') picker!: MatDatepicker<Date>;

  control = new FormControl<Date | null>(null);
  minDate!: Date;   // first day of earliest allowed month
  maxDate!: Date;   // last day of current month
  startAt!: Date;   // where the popup focuses (default month)

  ngOnInit(): void {
    this.computeBounds();
    this.applyDefault();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['monthsBack']) {
      this.computeBounds();
    }
    if (changes['defaultDateYMD'] || changes['monthsBack']) {
      this.applyDefault(false); // don't emit twice unless value changed
    }
  }

  onOpened() {
    // ensure it always opens on the YEARS grid
    queueMicrotask(() => {
      const cal = (this.picker as any)?._popupRef?.instance?._calendar as MatCalendar<Date> | undefined;
      if (cal) cal.currentView = 'multi-year';
    });
  }

  onMonthSelected(month: Date, picker: MatDatepicker<Date>) {
    const eom = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    if (eom < this.minDate || eom > this.maxDate) return;

    this.control.setValue(eom);
    this.valueChange.emit(this.toYYYYMMDD(eom));
    picker.close(); // never show days
  }

  // ---- helpers ----
  private computeBounds(): void {
    const today = new Date();
    const n = Math.max(1, this.monthsBack);
    this.minDate = new Date(today.getFullYear(), today.getMonth() - (n - 1), 1);
    this.maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

  private applyDefault(emit = true): void {
    const parsed = this.parseYMD(this.defaultDateYMD);
    const base = parsed ?? new Date(); // if invalid/missing, use today
    const eom = new Date(base.getFullYear(), base.getMonth() + 1, 0);

    // clamp within window
    let final = eom;
    if (final < this.minDate) final = this.minDate;
    if (final > this.maxDate) final = this.maxDate;

    // update control/startAt
    const prev = this.control.value?.getTime();
    this.control.setValue(final);
    this.startAt = final;

    if (emit && prev !== final.getTime()) {
      this.valueChange.emit(this.toYYYYMMDD(final));
    }
  }

  private parseYMD(ymd?: string): Date | null {
    if (!ymd) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!m) return null;
    const y = +m[1], monIdx = +m[2] - 1;
    if (monIdx < 0 || monIdx > 11) return null;
    // Use day=1; we only care about month/year
    return new Date(y, monIdx, 1);
  }

  private toYYYYMMDD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
