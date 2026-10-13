import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { of } from 'rxjs';
import { BusinessService } from '../business/business.service';
import { FinanceService } from './finance.service';
import { FinancePage } from './finance-page';

describe('FinancePage', () => {
  const closedProject = { id: 'closed-id', code: 'CLOSED', name: 'Closed project', customerId: 'customer', contractValue: 100, status: 'Closed' };
  const activeProject = { id: 'active-id', code: 'ACTIVE', name: 'Active project', customerId: 'customer', contractValue: 100, status: 'Active' };
  const closedBill = { id: 'closed-bill', kind: 'ProjectExpense' as const, projectId: 'closed-id', vendorId: null, invoiceDate: '2026-10-09', dueDate: null, amount: 100, reference: 'CLOSED-BILL', description: null, isVoided: false, allocatedAmount: 100, outstandingAmount: 0, status: 'Paid', lines: [] };
  const activeBill = { ...closedBill, id: 'active-bill', projectId: 'active-id', reference: 'ACTIVE-BILL', allocatedAmount: 0, outstandingAmount: 100, status: 'Unpaid' };
  const mixedPayment = { id: 'mixed-payment', payee: 'Supplier', amount: 150, paymentDate: '2026-10-09', reference: 'MIXED', isVoided: false, allocations: [{ id: 'allocation', expenseBillId: 'closed-bill', amount: 100 }], destinations: [{ id: 'destination', projectId: 'active-id', isCompanyOverhead: false, amount: 50 }], allocatedAmount: 100, unallocatedAmount: 50 };

  function createPage(view: string, routePath = 'finance/:view', overheadBills: import('./finance.service').ExpenseBillView[] = []) {
    const finance = {
      listMasters: vi.fn(() => of({ categories: [], subcategories: [], vendors: [] })),
      listProjectExpenses: vi.fn(() => of([closedBill])),
       listOverhead: vi.fn(() => of(overheadBills)),
      listPayments: vi.fn(() => of([mixedPayment])),
      listAllExpenses: vi.fn(() => of([closedBill, activeBill])),
    };
    const business = { listProjects: vi.fn(() => of([closedProject, activeProject])) };
    TestBed.configureTestingModule({
      imports: [FinancePage],
      providers: [
        { provide: FinanceService, useValue: finance },
        { provide: BusinessService, useValue: business },
        { provide: OidcSecurityService, useValue: { getUserData: () => of({ role: ['OWNER'] }) } },
        { provide: ActivatedRoute, useValue: {
          paramMap: of({ get: (name: string) => name === 'view' ? view || null : name === 'expenseBillId' ? 'overhead-bill' : null }),
          queryParamMap: of({ get: () => null }),
          snapshot: { routeConfig: { path: routePath }, data: routePath.startsWith('projects/') ? { projectView: routePath.endsWith('/expenses') ? 'expenses' : 'receipts' } : {} },
          parent: { paramMap: of({ get: (name: string) => name === 'projectId' ? 'active-id' : null }), snapshot: { paramMap: { get: () => 'active-id' } } },
        } },
      ],
    });
    const fixture = TestBed.createComponent(FinancePage);
    fixture.detectChanges();
    return { fixture, finance };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('shows Closed project expense history without mutation controls', () => {
    const { fixture } = createPage('expenses');
    fixture.componentInstance['selectProject']('closed-id');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Project tidak menerima perubahan transaksi pada status Closed.');
    expect(text).toContain('CLOSED-BILL');
    expect([...fixture.nativeElement.querySelectorAll('button')].map((button: HTMLButtonElement) => button.textContent?.trim()))
      .not.toContain('Simpan expense');
    expect(text).not.toContain('Ubah');
    expect(text).not.toContain('Void');
  });

  it('renders project expenses without a duplicate finance header or project navigation', () => {
    const { fixture } = createPage('expenses', 'projects/:projectId/expenses');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('CLOSED-BILL');
    expect(text).not.toContain('Arus kas dan kewajiban');
    expect(fixture.nativeElement.querySelector('.project-finance-context')).toBeNull();
    expect(fixture.nativeElement.querySelector('.project-picker')).toBeNull();
  });

  it('provides global payment entry and locks mutation for mixed payment linked to Closed project', () => {
    const { fixture } = createPage('payments');
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      canVoidPayment: (payment: typeof mixedPayment) => boolean;
      isPaymentAttachmentLocked: (payment: typeof mixedPayment) => boolean;
      availableBills: () => { id: string }[];
    };
    expect(component.canVoidPayment(mixedPayment)).toBe(false);
    expect(component.isPaymentAttachmentLocked(mixedPayment)).toBe(true);
    expect(component.availableBills().map(bill => bill.id)).toEqual(['active-bill']);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Catat pembayaran');
    expect(text).not.toContain('Simpan pembayaran');
    expect(text).not.toContain('Void');
  });

  it('shows standalone overhead creation form and back link', () => {
    const { fixture } = createPage('', 'finance/overhead/new');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Catat Company Overhead');
    expect(text).toContain('Rincian kategori');
    expect(text).not.toContain('Company overhead</h2>');
    expect(text).not.toContain('Batal koreksi');
    expect(text).not.toContain('Hapus');
    expect(fixture.nativeElement.querySelector('details')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/sikap/finance/overhead"]')).not.toBeNull();
  });

  it('loads overhead into standalone edit route', () => {
    const overheadBill = { ...closedBill, id: 'overhead-bill', kind: 'CompanyOverhead' as const, projectId: null, reference: 'OFF-001' };
    const { fixture } = createPage('', 'finance/overhead/:expenseBillId/edit', [overheadBill]);
    fixture.detectChanges();

    const reference = fixture.nativeElement.querySelector('#expense-reference') as HTMLInputElement;
    expect(fixture.nativeElement.textContent).toContain('Ubah Company Overhead');
    expect(reference.value).toBe('OFF-001');
    expect(fixture.nativeElement.textContent).not.toContain('Batal koreksi');
    expect(fixture.nativeElement.textContent).not.toContain('Hapus');
    expect(fixture.nativeElement.querySelector('details')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Company overhead</h2>');
  });

  it('links overhead list actions to standalone create and edit routes', () => {
    const overheadBill = { ...closedBill, id: 'overhead-bill', kind: 'CompanyOverhead' as const, projectId: null, reference: 'OFF-001' };
    const { fixture } = createPage('overhead', 'finance/:view', [overheadBill]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[href="/sikap/finance/overhead/new"]')).not.toBeNull();
    const editLink = [...fixture.nativeElement.querySelectorAll('a')].find((link: HTMLAnchorElement) => link.textContent?.trim() === 'Ubah') as HTMLAnchorElement | undefined;
    expect(editLink?.getAttribute('href')).toBe('/sikap/finance/overhead/overhead-bill/edit');
  });
});
