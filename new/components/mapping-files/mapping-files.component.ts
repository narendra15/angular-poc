import { Component, Input } from '@angular/core';
import { NgFor, NgIf, NgClass, CommonModule } from '@angular/common';
import { MappingColumn, CellTooltip, CellKind } from '../../models';
@Component({
  selector: 'app-mapping-files',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapping-files.component.html',
  styleUrl: './mapping-files.component.scss'
})
export class MappingFilesComponent {
  @Input() columns: MappingColumn[] = [];

  // tooltip state
  tipOpen = false;
  tipData: CellTooltip | null = null;
  tipXY = { x: 0, y: 0 };

  dotClass(kind: CellKind): string {
    if (kind === 'Success') return 'dot dot-green';
    if (kind === 'Warning') return 'dot dot-amber';
    if (kind === 'Error')   return 'dot dot-red';
    return 'ring-red'; // blank/missing
  }

  openTooltip(ev: MouseEvent, data?: CellTooltip) {
    if (!data) return;
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.tipXY = { x: rect.left + rect.width + window.scrollX + 8, y: rect.top + window.scrollY };
    this.tipData = data;
    this.tipOpen = true;
  }

  goTo(cmd?: string) {
    if (!cmd) return;
    console.log('Navigate to:', cmd);
    this.tipOpen = false;
  }

  closeTooltip() { this.tipOpen = false; }
}
