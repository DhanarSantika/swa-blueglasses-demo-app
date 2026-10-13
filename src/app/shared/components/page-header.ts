import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-heading">
      <div class="page-heading-copy">
        @if (eyebrow()) { <p class="eyebrow">{{ eyebrow() }}</p> }
        <h1>{{ title() }}</h1>
        @if (description()) { <p class="intro-copy">{{ description() }}</p> }
      </div>
      <div class="page-heading-actions"><ng-content select="[page-actions]" /></div>
    </header>
  `,
  styles: [`
    :host { display: block; }
    .page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
    .page-heading-copy { min-width: 0; }
    .page-heading-actions:empty { display: none; }
    .page-heading-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    h1 { margin: 0; color: var(--sikap-ink); font-size: clamp(28px, 3vw, 32px); font-weight: 600; letter-spacing: -.03em; line-height: 1.2; }
    .eyebrow { margin: 0 0 9px; color: var(--sikap-muted); font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
    .intro-copy { max-width: 720px; margin: 9px 0 0; color: var(--sikap-muted); font-size: 14px; line-height: 1.55; }
    @media (max-width: 700px) { .page-heading { align-items: flex-start; flex-direction: column; } .page-heading-actions { width: 100%; } }
  `],
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
  readonly description = input('');
}
