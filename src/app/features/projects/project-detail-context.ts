import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, take } from 'rxjs';
import { BusinessMaster, BusinessProject, BusinessService, ProjectBudget, ProjectFinancialBalances } from '../business/business.service';
import { ExpenseBillView, FinanceService } from '../finance/finance.service';

export interface ProjectDetailSummary {
  balances: ProjectFinancialBalances;
  baselineAvailable: boolean | null;
  baselineBudgetTotal: number;
  latestBudgetTotal: number;
  incurredExpenseTotal: number;
  settlementIds: string[];
}

@Injectable()
export class ProjectDetailContext {
  private readonly business = inject(BusinessService);
  private readonly finance = inject(FinanceService);

  readonly project = signal<BusinessProject | null>(null);
  readonly customer = signal<BusinessMaster | null>(null);
  readonly summary = signal<ProjectDetailSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  private projectId = '';
  private loadVersion = 0;

  load(projectId: string): void {
    const projectChanged = this.projectId !== projectId;
    this.projectId = projectId;
    const version = ++this.loadVersion;
    if (projectChanged || !this.project()) this.loading.set(true);
    this.error.set(null);
    forkJoin({ projects: this.business.listProjects(), customers: this.business.listCustomers() }).pipe(take(1)).subscribe({
      next: data => {
        if (version !== this.loadVersion) return;
        const project = data.projects.find(item => item.id === projectId);
        if (!project) {
          this.project.set(null);
          this.customer.set(null);
          this.summary.set(null);
          this.error.set('Proyek tidak ditemukan atau tidak dapat diakses.');
          this.loading.set(false);
          return;
        }
        forkJoin({
          budget: this.business.getProjectBudget(projectId),
          balances: this.business.getProjectBalances(projectId),
          expenses: this.finance.listProjectExpenses(projectId),
          settlements: this.finance.listCancellationSettlements(projectId),
        }).pipe(take(1)).subscribe({
          next: detail => {
            if (version !== this.loadVersion) return;
            this.project.set(project);
            this.customer.set(data.customers.find(item => item.id === project.customerId) ?? null);
            this.summary.set(this.toSummary(detail.budget, detail.balances, detail.expenses, detail.settlements.map(item => item.id)));
            this.loading.set(false);
          },
          error: error => this.fail(error, version),
        });
      },
      error: error => this.fail(error, version),
    });
  }

  refresh(): void { if (this.projectId) this.load(this.projectId); }

  setProject(project: BusinessProject): void { this.project.set(project); }

  updateProject(project: BusinessProject): void {
    this.setProject(project);
    this.refresh();
  }

  private toSummary(budget: ProjectBudget, balances: ProjectFinancialBalances, expenses: ExpenseBillView[], settlementIds: string[]): ProjectDetailSummary {
    return {
      balances,
      baselineAvailable: budget.initialBaselineAvailable,
      baselineBudgetTotal: budget.baseline.reduce((sum, line) => sum + line.amount, 0),
      latestBudgetTotal: budget.lines.reduce((sum, line) => sum + line.amount, 0),
      incurredExpenseTotal: expenses.filter(bill => !bill.isVoided).reduce((sum, bill) => sum + bill.amount, 0),
      settlementIds,
    };
  }

  private fail(error: unknown, version: number): void {
    if (version !== this.loadVersion) return;
    this.error.set(error instanceof Error ? error.message : 'Data proyek tidak dapat dimuat.');
    this.loading.set(false);
  }
}
