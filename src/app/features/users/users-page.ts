import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map, take } from 'rxjs';
import { IdentityUserSummary, IdentityUsersService } from './identity-users.service';
import { PageHeader } from '../../shared/components/page-header';
import { Alert } from '../../shared/components/alert';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';

@Component({
  selector: 'app-users-page',
  imports: [CommonModule, ReactiveFormsModule, PageHeader, Alert, MatDialogModule],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements OnInit {
  private readonly forms = inject(FormBuilder).nonNullable;
  private readonly usersService = inject(IdentityUsersService);
  private readonly oidc = inject(OidcSecurityService);
  private readonly dialog = inject(MatDialog);

  protected readonly accounts = signal<IdentityUserSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly showCreate = signal(false);
  protected readonly resetTarget = signal<IdentityUserSummary | null>(null);
  protected readonly deleteTarget = signal<IdentityUserSummary | null>(null);
  protected readonly isOwner = signal(false);
  protected readonly isSuperAdmin = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly createForm = this.forms.group({
    userName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(256)]],
    temporaryPassword: ['', [Validators.required, Validators.minLength(12)]],
    confirmTemporaryPassword: ['', [Validators.required]],
  });

  protected readonly resetForm = this.forms.group({
    temporaryPassword: ['', [Validators.required, Validators.minLength(12)]],
    confirmTemporaryPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.oidc.getUserData().pipe(take(1)).subscribe(result => {
      const claims = result as Record<string, unknown> | null;
      const rawRole = claims?.['role'];
      const roles = Array.isArray(rawRole) ? rawRole.map(String) : typeof rawRole === 'string' ? [rawRole] : [];
      this.isOwner.set(roles.includes('OWNER'));
      this.isSuperAdmin.set(roles.includes('SUPER_ADMIN'));
      this.loadAccounts();
    });
  }

  protected loadAccounts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.usersService.list().pipe(take(1)).subscribe({
      next: accounts => {
        this.accounts.set(accounts);
        this.isLoading.set(false);
      },
      error: error => this.handleError(error),
    });
  }

  protected createAccount(): void {
    this.notice.set(null);
    this.errorMessage.set(null);
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();
    if (value.temporaryPassword !== value.confirmTemporaryPassword) {
      this.errorMessage.set('Kata sandi sementara tidak cocok.');
      return;
    }

    this.isSaving.set(true);
    this.usersService.create(value).pipe(take(1)).subscribe({
      next: account => {
        this.isSaving.set(false);
        this.createForm.reset();
        this.showCreate.set(false);
        this.notice.set(`Akun ${account.userName} dibuat. Pengguna wajib mengganti kata sandi saat login pertama.`);
        this.loadAccounts();
      },
      error: error => this.handleError(error),
    });
  }

  protected changeStatus(account: IdentityUserSummary): void {
    this.errorMessage.set(null);
    this.notice.set(null);
    this.isSaving.set(true);
    const request = account.isActive
      ? this.usersService.deactivate(account.id)
      : this.usersService.setActive(account.id, true).pipe(map(() => undefined));

    request.pipe(take(1)).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notice.set(account.isActive
          ? `Akun ${account.userName} dinonaktifkan; sesi dan token akses dicabut.`
          : `Akun ${account.userName} diaktifkan kembali.`);
        this.loadAccounts();
      },
      error: error => this.handleError(error),
    });
  }

  protected openPasswordReset(account: IdentityUserSummary): void {
    this.resetForm.reset();
    this.resetTarget.set(account);
    this.errorMessage.set(null);
    this.notice.set(null);
  }

  protected confirmHardDelete(account: IdentityUserSummary): void {
    this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Hapus akun permanen?',
        message: `Akun ${account.userName} akan dihapus. Tindakan ini tidak dapat dibatalkan; riwayat audit tetap tersimpan.`,
        confirmLabel: 'Hapus permanen',
        destructive: true,
      },
      ariaLabelledBy: 'mat-dialog-title-0',
      autoFocus: 'first-tabbable',
    }).afterClosed().pipe(take(1)).subscribe(confirmed => {
      if (confirmed) this.deleteAccount(account);
    });
  }

  private deleteAccount(account: IdentityUserSummary): void {
    this.errorMessage.set(null);
    this.notice.set(null);
    this.isSaving.set(true);
    this.usersService.hardDelete(account.id).pipe(take(1)).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notice.set(`Akun ${account.userName} dihapus permanen. Riwayat audit tetap tersimpan.`);
        this.loadAccounts();
      },
      error: error => this.handleError(error),
    });
  }

  protected closePasswordReset(): void {
    this.resetTarget.set(null);
    this.resetForm.reset();
  }

  protected resetPassword(): void {
    const target = this.resetTarget();
    if (!target) return;
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const value = this.resetForm.getRawValue();
    if (value.temporaryPassword !== value.confirmTemporaryPassword) {
      this.errorMessage.set('Kata sandi sementara tidak cocok.');
      return;
    }

    this.errorMessage.set(null);
    this.isSaving.set(true);
    this.usersService.resetPassword(target.id, value).pipe(take(1)).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closePasswordReset();
        this.notice.set(`Kata sandi ${target.userName} direset. Pengguna wajib menggantinya saat login berikutnya.`);
        this.loadAccounts();
      },
      error: error => this.handleError(error),
    });
  }

  protected passwordError(control: AbstractControl): string | null {
    if (!control.touched) return null;
    if (control.hasError('required')) return 'Kata sandi wajib diisi.';
    if (control.hasError('minlength')) return 'Kata sandi minimal 12 karakter.';
    return null;
  }

  private handleError(error: unknown): void {
    this.isLoading.set(false);
    this.isSaving.set(false);
    this.errorMessage.set(error instanceof Error ? error.message : 'Permintaan gagal. Coba lagi.');
  }
}
