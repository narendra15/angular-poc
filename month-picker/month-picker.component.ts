import { Component, Input, Output, EventEmitter, OnChanges, ViewChild, AfterViewInit } from '@angular/core';
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
    // What the <input matInput> shows
    dateInput: { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions,
    // Header label above the months grid
    monthYearLabel: { month: 'short', year: 'numeric' } as Intl.DateTimeFormatOptions,
    dateA11yLabel: { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions,
    monthYearA11yLabel: { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions,
  },
};

/** Force day=1 for display and render "August, 2025" */
class MonthYearAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Intl.DateTimeFormatOptions): string {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    const month = d.toLocaleString(this.locale, { month: 'long' });
    return `${month}, ${d.getFullYear()}`; // <-- "August, 2025"
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
  /** e.g., 6 => only last 6 months incl. current month are enabled */
  @Input() monthsBack = 6;

  /** Emits YYYY-MM-DD where DD is last day of selected month */
  @Output() valueChange = new EventEmitter<string | null>();

  control = new FormControl<Date | null>(null);

  minDate!: Date; // first day of the earliest allowed month
  maxDate!: Date; // last day of the current month
  @ViewChild('picker', { static: true }) picker!: MatDatepicker<Date>;
  constructor() { this.computeBounds(); }

  ngOnChanges(): void {
    this.computeBounds();
    const v = this.control.value;
    if (v && (v < this.minDate || v > this.maxDate)) {
      this.control.setValue(null);
      this.valueChange.emit(null);
    }
  }

  onOpened() {
    // After the panel is rendered, force the YEARS grid (multi-year)
    queueMicrotask(() => {
      const cal = (this.picker as any)?._popupRef?.instance?._calendar as MatCalendar<Date> | undefined;
      if (cal) cal.currentView = 'multi-year';
    });
  }
  
  onMonthSelected(month: Date, picker: MatDatepicker<Date>) {
    const eom = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    if (eom < this.minDate || eom > this.maxDate) return;
  
    this.control.setValue(eom);
    this.valueChange.emit(
      `${eom.getFullYear()}-${String(eom.getMonth() + 1).padStart(2, '0')}-${String(eom.getDate()).padStart(2, '0')}`
    );
  
    // Close immediately so the day grid never appears
    picker.close();
  }

  private computeBounds(): void {
    const today = new Date();
    const n = Math.max(1, this.monthsBack);
    this.minDate = new Date(today.getFullYear(), today.getMonth() - (n - 1), 1);
    this.maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }
}

function thisfmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`; // YYYY-MM-DD
}
