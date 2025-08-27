import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CellTooltip } from '../../models';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tool-tip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tool-tip.component.html',
  styleUrl: './tool-tip.component.scss'
})
export class ToolTipComponent {
  @Input() open = false;
  @Input() data: CellTooltip | null = null;
  @Input() x = 0;
  @Input() y = 0;

  @Output() close = new EventEmitter<void>();
}
