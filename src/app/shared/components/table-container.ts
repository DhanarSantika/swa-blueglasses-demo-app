import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-table-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="table-scroll" role="region" [attr.aria-label]="label()" tabindex="0"><ng-content /></div>`,
  styles: [`
    :host { display: block; width: 100%; min-width: 0; max-width: 100%; }
    .table-scroll { width: 100%; max-width: 100%; max-height: 70vh; overflow-x: scroll; overflow-y: auto; overscroll-behavior-inline: contain; scrollbar-width: thin; scrollbar-color: #98a6b3 #edf1f4; }
    .table-scroll::-webkit-scrollbar { height: 10px; }
    .table-scroll::-webkit-scrollbar-track { background: #edf1f4; border-radius: 5px; }
    .table-scroll::-webkit-scrollbar-thumb { background: #98a6b3; border: 2px solid #edf1f4; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
    th, td { padding: 11px 12px; border-bottom: 1px solid var(--sikap-line); vertical-align: middle; }
    th { position: sticky; top: 0; color: var(--sikap-muted); background: #f4f7f9; font-size: 13px; font-weight: 600; white-space: nowrap; }
    td { color: #344b5d; }
    th.numeric, td.numeric { text-align: right; font-variant-numeric: tabular-nums; }
    @media (max-width: 600px) { th, td { padding: 10px; } }
  `],
})
export class TableContainer {
  readonly label = input.required<string>();
}
