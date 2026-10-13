import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge badge-' + tone()"><ng-content /></span>`,
  styles: [`
    :host { display: inline-flex; vertical-align: middle; }
    .badge { display: inline-flex; align-items: center; min-height: 24px; padding: 3px 9px; border-radius: 999px; background: #edf2f5; color: #526477; font-size: 12px; font-weight: 600; line-height: 1.2; white-space: nowrap; }
    .badge-success { background: #edf5ef; color: var(--sikap-success); }
    .badge-warning { background: #fbf5e8; color: var(--sikap-warning); }
    .badge-danger { background: #faf0ef; color: var(--sikap-danger); }
    .badge-info { background: #ebf3f7; color: var(--sikap-primary); }
  `],
})
export class StatusBadge {
  readonly tone = input<'neutral' | 'success' | 'warning' | 'danger' | 'info'>('neutral');
}
