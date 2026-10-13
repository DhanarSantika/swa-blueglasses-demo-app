import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusinessService } from './business.service';

describe('BusinessService', () => {
  let service: BusinessService;
  let http: HttpTestingController;
  const oidc = { getAccessToken: vi.fn(() => of('business-access-token')) };
  const api = `${environment.apiAuthority}/api`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), BusinessService, { provide: OidcSecurityService, useValue: oidc }],
    });
    service = TestBed.inject(BusinessService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends business requests with OIDC bearer token', () => {
    service.listCustomers().subscribe(result => expect(result).toEqual([]));
    const req = http.expectOne(`${api}/customers`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer business-access-token');
    req.flush([]);
  });

  it('creates Draft project with required customer and no fabricated contract amount', () => {
    const input = { code: 'PRJ-001', name: 'Installasi mesin', customerId: 'customer-1', contractValue: null };
    service.createProject(input).subscribe();
    const req = http.expectOne(`${api}/projects`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 'project-1', ...input, status: 'Draft' });
  });

  it('does not send immutable project number when editing a Draft project', () => {
    const input = { name: 'Installasi mesin', customerId: 'customer-1', contractValue: null };
    service.updateProject('project-1', input).subscribe();
    const req = http.expectOne(`${api}/projects/project-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 'project-1', code: 'PRJ-001', ...input, status: 'Draft' });
  });

  it('uses status PATCH to deactivate customer without deleting it', () => {
    service.setCustomerActive('customer-1', false).subscribe();
    const req = http.expectOne(`${api}/customers/customer-1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ isActive: false });
    req.flush({ id: 'customer-1', name: 'Acme', isActive: false });
  });

  it('sends category kind separately for project expense and overhead', () => {
    service.createCategory('Administrasi', 'CompanyOverhead').subscribe();
    const req = http.expectOne(`${api}/expense-categories`);
    expect(req.request.body).toEqual({ name: 'Administrasi', type: 'CompanyOverhead' });
    req.flush({ id: 'category-1', name: 'Administrasi', type: 'CompanyOverhead', isActive: true });
  });
});
