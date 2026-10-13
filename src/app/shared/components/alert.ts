import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AlertTone = 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'app-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="alert" [class]="'alert alert-' + tone()" [attr.role]="tone() === 'error' ? 'alert' : 'status'"><ng-content /></p>`,
  styles: [`
    :host { display: block; }
    .alert { margin: 0; padding: 12px 14px; border: 1px solid var(--sikap-line); border-radius: var(--sikap-radius-sm); font-size: 14px; line-height: 1.5; }
    .alert-success { border-color: #d6e4d9; background: #edf5ef; color: var(--sikap-success); }
    .alert-warning { border-color: #e8d7ae; background: #fbf5e8; color: var(--sikap-warning); }
    .alert-error { border-color: #e7c9c6; background: #faf0ef; color: var(--sikap-danger); }
    .alert-info { border-color: #d8e3e9; background: #f1f6f8; color: var(--sikap-primary-dark); }
  `],
})
export class Alert {
  readonly tone = input<AlertTone>('info');
}
