import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BusinessService } from '../business/business.service';
import { FinanceService } from '../finance/finance.service';
import { ProjectDetailPage } from './project-detail-page';

describe('ProjectDetailPage', () => {
  it('keeps project summary and four working tab links in the shared layout', () => {
    const project = { id: 'project-1', code: 'PRJ-001', name: 'Workshop', customerId: 'customer-1', contractValue: 1000, status: 'Active' };
    TestBed.configureTestingModule({
      imports: [ProjectDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: (key: string) => key === 'projectId' ? project.id : null }) } },
        { provide: BusinessService, useValue: {
          listProjects: () => of([project]),
          listCustomers: () => of([{ id: 'customer-1', name: 'PT Contoh', isActive: true }]),
          getProjectBudget: () => of({ lines: [], initialBaselineAvailable: true, baseline: [] }),
          getProjectBalances: () => of({ receivable: 300, payable: 100, unallocatedReceipts: 0, unallocatedPayments: 0 }),
        } },
        { provide: FinanceService, useValue: {
          listProjectExpenses: () => of([]),
          listCancellationSettlements: () => of([]),
        } },
      ],
    });

    const fixture = TestBed.createComponent(ProjectDetailPage);
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Workshop');
    expect(content).toContain('PT Contoh');
    expect(content).toContain('300.00 IDR');
    const tabs = [...fixture.nativeElement.querySelectorAll('.project-detail-tabs a')] as HTMLAnchorElement[];
    expect(tabs.map(tab => tab.textContent?.trim())).toEqual(['Ringkasan & pengaturan', 'Penerimaan', 'Biaya & tagihan', 'Dokumen']);
    expect(tabs.map(tab => tab.getAttribute('href'))).toEqual([
      '/sikap/projects/project-1',
      '/sikap/projects/project-1/receipts',
      '/sikap/projects/project-1/expenses',
      '/sikap/projects/project-1/documents',
    ]);
  });
});
