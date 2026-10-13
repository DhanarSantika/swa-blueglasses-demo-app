import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="empty-state" [attr.aria-label]="label()"><p>{{ message() }}</p><ng-content /></section>`,
  styles: [`
    :host { display: block; }
    .empty-state { display: grid; justify-items: center; gap: 12px; padding: 28px 18px; color: var(--sikap-muted); text-align: center; }
    p { margin: 0; font-size: 14px; line-height: 1.5; }
  `],
})
export class EmptyState {
  readonly message = input.required<string>();
  readonly label = input('Data kosong');
}
