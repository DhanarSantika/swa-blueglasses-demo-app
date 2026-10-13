import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-metric-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<article class="metric-card"><span>{{ label() }}</span><strong><ng-content /></strong>@if (detail()) { <small>{{ detail() }}</small> }</article>`,
  styles: [`
    :host { display: block; min-width: 0; }
    .metric-card { display: grid; min-width: 0; gap: 8px; height: 100%; padding: 16px; border: 1px solid var(--sikap-line); border-radius: var(--sikap-radius-md); background: var(--sikap-surface); }
    span, small { color: var(--sikap-muted); font-size: 13px; }
    strong { overflow-wrap: anywhere; color: var(--sikap-ink); font-size: clamp(18px, 2vw, 24px); font-weight: 600; font-variant-numeric: tabular-nums; }
  `],
})
export class MetricCard {
  readonly label = input.required<string>();
  readonly detail = input('');
}
