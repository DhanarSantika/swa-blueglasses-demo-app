import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IdentityUsersService } from './identity-users.service';

describe('IdentityUsersService', () => {
  let service: IdentityUsersService;
  let http: HttpTestingController;
  const oidc = { getAccessToken: vi.fn(() => of('access-token-test')) };
  const endpoint = `${environment.identityAuthority.replace(/\/+$/, '')}/api/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        IdentityUsersService,
        { provide: OidcSecurityService, useValue: oidc },
      ],
    });
    service = TestBed.inject(IdentityUsersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists accounts with the OIDC access token', () => {
    service.list().subscribe(users => expect(users).toEqual([]));
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token-test');
    request.flush([]);
  });

  it('creates an ADMIN_STAFF account without sending email or role fields', () => {
    const body = {
      userName: 'staff.01',
      temporaryPassword: 'Temporary-password-1A!',
      confirmTemporaryPassword: 'Temporary-password-1A!',
    };
    service.create(body).subscribe();
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ id: 'user-id', userName: 'staff.01', role: 'ADMIN_STAFF', isActive: true, mustChangePassword: true });
  });

  it('maps deletion to account deactivation endpoint', () => {
    service.deactivate('user-id').subscribe();
    const request = http.expectOne(`${endpoint}/user-id`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('uses a separate endpoint for permanent account deletion', () => {
    service.hardDelete('user-id').subscribe();
    const request = http.expectOne(`${endpoint}/user-id/permanent`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('updates status through the status resource', () => {
    service.setActive('user-id', true).subscribe();
    const request = http.expectOne(`${endpoint}/user-id/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ isActive: true });
    request.flush({ id: 'user-id', userName: 'staff.01', role: 'ADMIN_STAFF', isActive: true, mustChangePassword: false });
  });

  it('resets a password without sending a username or role change', () => {
    const body = {
      temporaryPassword: 'Temporary-password-1A!',
      confirmTemporaryPassword: 'Temporary-password-1A!',
    };
    service.resetPassword('user-id', body).subscribe();
    const request = http.expectOne(`${endpoint}/user-id/password-reset`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ id: 'user-id', userName: 'staff.01', role: 'ADMIN_STAFF', isActive: true, mustChangePassword: true });
  });
});
