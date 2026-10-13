import { Component, HostListener, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { take } from 'rxjs';

interface ShellIdentity {
  userName: string;
  roles: string[];
}

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = 'SIKAP';
  protected readonly identityPasswordUrl = '/sikap';
  protected readonly isReady = signal(false);
  protected readonly isAuthenticated = signal(false);
  protected readonly identity = signal<ShellIdentity | null>(null);
  protected readonly loginError = signal<string | null>(null);
  protected readonly isLoggingOut = signal(false);
  protected readonly isSuperAdmin = signal(false);
  protected readonly isProfileMenuOpen = signal(false);

  constructor(private readonly oidcSecurityService: OidcSecurityService, private readonly router: Router) {
    this.oidcSecurityService.checkAuth().pipe(take(1)).subscribe({
      next: result => {
        this.isReady.set(true);
        this.isAuthenticated.set(result.isAuthenticated);
        if (result.isAuthenticated) {
          const claims = result.userData as Record<string, unknown> | null;
          const username = claims?.['preferred_username'] ?? claims?.['name'];
          const rawRoles = claims?.['role'];
          const roles = Array.isArray(rawRoles)
            ? rawRoles.map(String)
            : typeof rawRoles === 'string' ? [rawRoles] : [];

          this.identity.set({
            userName: typeof username === 'string' ? username : 'Pengguna SIKAP',
            roles,
          });
          this.isSuperAdmin.set(roles.includes('SUPER_ADMIN'));
        } else if (result.errorMessage) {
          this.loginError.set('Login tidak berhasil. Coba masuk kembali.');
        }
      },
      error: () => {
        this.isReady.set(true);
        this.loginError.set('Identity Service tidak dapat dihubungi. Coba lagi nanti.');
      },
    });
  }

  protected currentPage(): string {
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    if (segments[0] === 'sikap') segments.shift();
    if (!segments.length) return 'Ringkasan';
    if (segments[0] === 'projects') return segments.length === 1 ? 'Proyek' : segments[1] === 'new' ? 'Proyek baru' : ({ receipts: 'Penerimaan proyek', expenses: 'Biaya proyek' }[segments[2]] ?? 'Detail proyek');
    if (segments[0] === 'finance') return segments[1] === 'overhead' ? 'Company Overhead' : 'Pembayaran Tagihan';
    return ({ reports: 'Laporan', business: 'Master Data', audit: 'Audit Trail', users: 'Akun internal' } as Record<string, string>)[segments[0]] ?? 'SIKAP';
  }

  protected login(): void {
    this.loginError.set(null);
    this.oidcSecurityService.authorize();
  }

  protected toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(open => !open);
  }

  protected closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.closeProfileMenu();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeProfileMenu();
  }

  protected logout(): void {
    this.isLoggingOut.set(true);
    this.oidcSecurityService.logoff().pipe(take(1)).subscribe({
      error: () => {
        this.isLoggingOut.set(false);
        this.loginError.set('Logout gagal. Coba lagi.');
      },
    });
  }
}
