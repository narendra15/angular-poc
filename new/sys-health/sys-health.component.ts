import { Component } from '@angular/core';
import dummyData from '../dummyData.json'; // adjust if your path differs
import { ShRaw, IsoDate, Row, MappingColumn } from '../models';
import { buildDateList, buildMappingColumns, buildTimelineRows } from '../ingest';
import { TimelineGridComponent } from '../components/timeline-grid/timeline-grid.component'; 
import { MappingFilesComponent } from '../components/mapping-files/mapping-files.component';

@Component({
  selector: 'app-sys-health',
  standalone: true,
  imports: [TimelineGridComponent, MappingFilesComponent],
  templateUrl: './sys-health.component.html',
  styleUrl: './sys-health.component.scss'
})
export class SysHealthComponent {
// You can change this reporting period freely:
reportingYear  = 2025;
reportingMonth = 6; // 1..12 (June)

// Built at construction
dates: IsoDate[] = [];
axiomRows: Row[] = [];
sourceRows: Row[] = [];
mappingColumns: MappingColumn[] = [];

constructor() {
  const raw = dummyData as ShRaw[];

  // Build list of dates for the month we want to show
  this.dates = buildDateList(this.reportingYear, this.reportingMonth);

  // Build rows for AXIOM and Source Systems timelines
  this.axiomRows   = buildTimelineRows(raw, this.dates, 'A');
  this.sourceRows  = buildTimelineRows(raw, this.dates, 'S');

  // Build columns for Mapping/Lookup monthly status
  this.mappingColumns = buildMappingColumns(raw, this.reportingYear, this.reportingMonth);
}
}
