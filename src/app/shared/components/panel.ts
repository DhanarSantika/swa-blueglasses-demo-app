import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" [attr.aria-label]="ariaLabel() || null">
      @if (title() || eyebrow()) {
        <header class="panel-heading">
          <div>@if (eyebrow()) { <p class="eyebrow">{{ eyebrow() }}</p> } @if (title()) { <h2>{{ title() }}</h2> }</div>
        </header>
      }
      <div class="panel-content"><ng-content /></div>
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .panel { min-width: 0; padding: 20px; border: 1px solid var(--sikap-line); border-radius: var(--sikap-radius-lg); background: var(--sikap-surface); }
    .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
    .panel-heading h2 { margin: 0; color: var(--sikap-ink); font-size: 18px; font-weight: 600; }
    .eyebrow { margin: 0 0 6px; color: var(--sikap-muted); font-size: 12px; font-weight: 600; }
    .panel-content { min-width: 0; }
    @media (max-width: 700px) { .panel { padding: 16px; } }
  `],
})
export class Panel {
  readonly title = input('');
  readonly eyebrow = input('');
  readonly ariaLabel = input('');
}
