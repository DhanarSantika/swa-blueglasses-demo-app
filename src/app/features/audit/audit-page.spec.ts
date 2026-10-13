import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditPage } from './audit-page';

describe('AuditPage', () => {
  let http: HttpTestingController;
  const oidc = {
    getAccessToken: vi.fn(() => of('audit-token')),
    getUserData: vi.fn(() => of({ role: ['OWNER'] })),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuditPage],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: OidcSecurityService, useValue: oidc },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads business and identity audit tabs with bearer authentication and OWNER export', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(AuditPage);
    fixture.detectChanges();
    const business = http.expectOne(request => request.url === `${environment.apiAuthority}/api/audit/business`);
    expect(business.request.headers.get('Authorization')).toBe('Bearer audit-token');
    business.flush({ items: [], page: 1, pageSize: 50, total: 0, totalPages: 0 });

    fixture.componentInstance['selectTab']('identity');
    const identity = http.expectOne(request => request.url === `${environment.identityAuthority}/api/audit`);
    expect(identity.request.headers.get('Authorization')).toBe('Bearer audit-token');
    identity.flush({ items: [], page: 1, pageSize: 50, total: 0, totalPages: 0 });
    fixture.componentInstance['selectTab']('business');
    http.expectOne(request => request.url === `${environment.apiAuthority}/api/audit/business`)
      .flush({ items: [], page: 1, pageSize: 50, total: 0, totalPages: 0 });

    fixture.componentInstance['export']();
    const exportRequest = http.expectOne(request => request.url === `${environment.apiAuthority}/api/audit/business/export`);
    expect(exportRequest.request.method).toBe('GET');
    exportRequest.flush(new Blob(['xlsx']));
  });
});
