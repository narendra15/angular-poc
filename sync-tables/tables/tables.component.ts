import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncTablesService } from '../sync-tables.service';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.scss'
})
export class TablesComponent {
  protected svc = inject(SyncTablesService);

  // Fixed dropdown years
  yearsToShow = [2025, 2024, 2023, 2022, 2021, 2020];

  // For sorting right-panel groups by year descending
  yearDesc = (a: any, b: any) => b.key - a.key;

  // 🔑 Role flag → true = Preparer (read-only), false = Reviewer (editable)
  readonlyMode = false; // set to true for Preparer

  ngOnInit(): void {
    this.svc.load();
  }

  // Event handlers (Reviewer only)
  onYearChange(val: string) {  this.svc.setYear(Number(val)); }
  toggle(month: number) {  this.svc.toggleMonth(month); }
  clearAll() {  this.svc.clearAll(); }
  async apply() {  await this.svc.applyChanges(); }
}
