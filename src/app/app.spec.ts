import { OidcSecurityService } from 'angular-auth-oidc-client';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';
import { TestBed } from '@angular/core/testing';

describe('App shell', () => {
  let oidc: {
    checkAuth: ReturnType<typeof vi.fn>;
    authorize: ReturnType<typeof vi.fn>;
    logoff: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    oidc = {
      checkAuth: vi.fn().mockReturnValue(of({ isAuthenticated: false, userData: null, errorMessage: undefined })),
      authorize: vi.fn(),
      logoff: vi.fn().mockReturnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: OidcSecurityService, useValue: oidc },
      ],
    }).compileComponents();
  });

  it('creates the shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows Identity login when no authenticated session exists', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Masuk ke SIKAP');
    fixture.nativeElement.querySelector('button').click();
    expect(oidc.authorize).toHaveBeenCalledOnce();
  });

  it('renders username and role claims from Identity in an empty shell', () => {
    oidc.checkAuth.mockReturnValue(of({
      isAuthenticated: true,
      userData: { preferred_username: 'owner.ops', role: 'OWNER' },
      errorMessage: undefined,
    }));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('owner.ops');
    expect(content).toContain('OWNER');
    expect(content).toContain('Ringkasan');
    expect(content).toContain('Project');
    expect(content).not.toContain('Rp');
  });

  it('keeps SUPER_ADMIN away from business navigation', () => {
    oidc.checkAuth.mockReturnValue(of({
      isAuthenticated: true,
      userData: { preferred_username: 'support.ops', role: 'SUPER_ADMIN' },
      errorMessage: undefined,
    }));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('SUPER_ADMIN');
    expect(content).toContain('Akun dan pemulihan');
    expect(content).not.toContain('Penerimaan');
    expect(content).not.toContain('Pengeluaran');
  });

  it('logs out through Identity end-session endpoint', () => {
    oidc.checkAuth.mockReturnValue(of({
      isAuthenticated: true,
      userData: { preferred_username: 'staff.ops', role: 'ADMIN_STAFF' },
      errorMessage: undefined,
    }));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.profile-trigger').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[role="menu"] button').click();

    expect(oidc.logoff).toHaveBeenCalledOnce();
  });

  it('shows password and logout actions inside the profile dropdown', () => {
    oidc.checkAuth.mockReturnValue(of({
      isAuthenticated: true,
      userData: { preferred_username: 'owner', role: 'OWNER' },
      errorMessage: undefined,
    }));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Ganti kata sandi');
    fixture.nativeElement.querySelector('.profile-trigger').click();
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector('[role="menu"]') as HTMLElement;
    expect(menu.textContent).toContain('Ganti kata sandi');
    expect(menu.textContent).toContain('Keluar');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();
  });
});
