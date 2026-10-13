import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { take } from 'rxjs';
import { BusinessProject, BusinessService } from '../business/business.service';
import { ReportResult, ReportingService } from './reporting.service';
import { PageHeader } from '../../shared/components/page-header';
import { Alert } from '../../shared/components/alert';
import { TableContainer } from '../../shared/components/table-container';
import { EmptyState } from '../../shared/components/empty-state';

interface ReportOption { id: string; label: string; ownerOnly?: boolean; }

@Component({
  selector: 'app-reports-page',
  imports: [CommonModule, FormsModule, PageHeader, Alert, TableContainer, EmptyState],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
})
export class ReportsPage implements OnInit {
  private readonly reporting = inject(ReportingService);
  private readonly business = inject(BusinessService);
  private readonly oidc = inject(OidcSecurityService);
  protected readonly options: ReportOption[] = [
    { id: 'project-financial-summary', label: 'Project Financial Summary' },
    { id: 'budget-vs-expense', label: 'Budget vs Incurred Expense' },
    { id: 'project-expense-detail', label: 'Project Expense Detail' },
    { id: 'payment-schedule', label: 'Payment Schedule dan Outstanding Receivable' },
    { id: 'outstanding-payable', label: 'Outstanding Payable' },
    { id: 'company-cash-flow', label: 'Company Cash Flow' },
    { id: 'company-overhead-detail', label: 'Company Overhead Detail' },
  ];
  protected readonly projects = signal<BusinessProject[]>([]);
  protected readonly isOwner = signal(false);
  protected readonly reportName = signal('project-financial-summary');
  protected readonly projectId = signal('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly result = signal<ReportResult | null>(null);
  protected readonly loading = signal(false);
  protected readonly exporting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly appliedFilters = signal<{ projectId?: string; from?: string; to?: string; reportName: string } | null>(null);

  ngOnInit(): void {
    this.business.listProjects().subscribe({ next: value => this.projects.set(value), error: () => this.projects.set([]) });
    this.oidc.getUserData().pipe(take(1)).subscribe(data => {
      const role = (data as Record<string, unknown> | null)?.['role'];
      const roles = Array.isArray(role) ? role.map(String) : typeof role === 'string' ? [role] : [];
      this.isOwner.set(roles.includes('OWNER'));
      this.load();
    });
  }

  protected load(): void {
    const filters = this.filters();
    const reportName = this.reportName();
    this.loading.set(true); this.error.set(null);
    this.reporting.report(reportName, filters).subscribe({
      next: value => { this.result.set(value); this.appliedFilters.set({ ...filters, reportName }); this.loading.set(false); },
      error: () => { this.error.set('Laporan tidak dapat dimuat. Periksa filter dan coba lagi.'); this.loading.set(false); },
    });
  }

  protected export(): void {
    const applied = this.appliedFilters();
    if (!applied) return;
    this.exporting.set(true); this.error.set(null);
    this.reporting.export(applied.reportName, { projectId: applied.projectId, from: applied.from, to: applied.to }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob); const link = document.createElement('a');
          link.href = url; link.download = `sikap-${applied.reportName}.xlsx`; link.click(); URL.revokeObjectURL(url); this.exporting.set(false);
      },
      error: () => { this.error.set('Export gagal. Coba lagi.'); this.exporting.set(false); },
    });
  }

  protected columns(): string[] { return [...new Set(this.result()?.rows.flatMap(row => Object.keys(row)) ?? [])]; }
  protected columnLabel(key: string): string {
    const labels: Record<string, string> = { Project: 'Nomor proyek', Name: 'Nama proyek', Status: 'Status', ContractValue: 'Nilai kontrak', BaselineAvailable: 'Baseline tersedia', Baseline: 'Budget awal', LatestBudget: 'Budget terbaru', IncurredExpense: 'Biaya tercatat', BudgetVariance: 'Selisih budget', EstimatedProjectMargin: 'Estimasi margin proyek', Received: 'Penerimaan', Refunded: 'Refund', Receivable: 'Piutang', Category: 'Kategori', Variance: 'Selisih', Amount: 'Nominal', Date: 'Tanggal', DueDate: 'Jatuh tempo', Vendor: 'Vendor', Reference: 'Referensi' };
    return labels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  protected filtersDirty(): boolean {
    const applied = this.appliedFilters();
    if (!applied) return false;
    return applied.reportName !== this.reportName() || applied.projectId !== (this.projectId() || undefined) || applied.from !== (this.from() || undefined) || applied.to !== (this.to() || undefined);
  }
  protected reportCurrency(key: string): boolean { return /value|budget|expense|margin|received|refunded|receivable|payable|amount|variance|cash|surplus/i.test(key); }
  protected display(value: unknown, key = ''): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'number') return new Intl.NumberFormat('id-ID', { ...(this.reportCurrency(key) ? { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 } : { maximumFractionDigits: 2 }) }).format(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private filters(): { projectId?: string; from?: string; to?: string } {
    return { projectId: this.projectId() || undefined, from: this.from() || undefined, to: this.to() || undefined };
  }
}
