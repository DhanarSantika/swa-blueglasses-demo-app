import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">{{ data.cancelLabel ?? 'Batal' }}</button>
      <button mat-flat-button type="button" [class.confirm-danger]="data.destructive" [mat-dialog-close]="true">{{ data.confirmLabel ?? 'Konfirmasi' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; min-width: min(360px, calc(100vw - 48px)); }
    h2 { margin: 0; font: 600 20px/1.3 var(--sikap-font-sans); }
    mat-dialog-content { padding-top: 8px; color: var(--sikap-muted); font: 400 14px/1.55 var(--sikap-font-sans); }
    mat-dialog-actions { gap: 8px; padding: 12px 24px 20px; }
    .confirm-danger { --mat-sys-primary: var(--sikap-danger); --mat-sys-on-primary: #fff; }
  `],
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
