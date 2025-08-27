import { Component, Input } from '@angular/core';
import { CellKind } from '../../models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-indicator.component.html',
  styleUrl: './status-indicator.component.scss'
})
export class StatusIndicatorComponent {
  @Input() kind: CellKind = 'Blank';

  get cssClass(): string | null {
    if (this.kind === 'Success') return 'dot dot-green';
    if (this.kind === 'Warning') return 'dot dot-amber';
    if (this.kind === 'Error') return 'dot dot-red';
    if (this.kind === 'NotReceived' || this.kind === 'NotGenerated') return 'ring-red';
    return null; // Blank -> render nothing
  }
}
