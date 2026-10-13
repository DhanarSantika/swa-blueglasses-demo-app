import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { forkJoin, take } from 'rxjs';
import { BusinessMaster, BusinessProject, BusinessService, ExpenseCategory, ExpenseSubcategory, PaymentTerm, ProjectBudgetLine, ProjectFinancialBalances, ProjectLifecycleAction } from '../business/business.service';
import { CustomerReceiptView, FinanceService } from '../finance/finance.service';
import { PageHeader } from '../../shared/components/page-header';
import { Alert } from '../../shared/components/alert';
import { StatusBadge } from '../../shared/components/status-badge';
import { ProjectDetailContext } from './project-detail-context';

@Component({
  selector: 'app-projects-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeader, Alert, StatusBadge],
  templateUrl: './projects-page.html',
  styleUrl: './projects-page.scss',
})
export class ProjectsPage implements OnInit {
  private readonly forms = inject(FormBuilder).nonNullable;
  private readonly service = inject(BusinessService);
  private readonly finance = inject(FinanceService);
  private readonly oidc = inject(OidcSecurityService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly detailContext = inject(ProjectDetailContext, { optional: true });

  protected readonly projects = signal<BusinessProject[]>([]);
  protected readonly customers = signal<BusinessMaster[]>([]);
  protected readonly categories = signal<ExpenseCategory[]>([]);
  protected readonly subcategories = signal<ExpenseSubcategory[]>([]);
  protected readonly selected = signal<BusinessProject | null>(null);
  protected readonly isOwner = signal(false);
  protected readonly showCreate = signal(false);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly baselineAvailable = signal<boolean | null>(null);
  protected readonly paymentTerms = signal<PaymentTerm[]>([]);
  protected readonly receipts = signal<CustomerReceiptView[]>([]);
  protected readonly balances = signal<ProjectFinancialBalances | null>(null);
  protected readonly cancelledTermIds = signal<string[]>([]);
  protected readonly showCancellation = signal(false);
  protected readonly detailRoute = signal(false);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('');

  protected readonly createForm = this.forms.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    customerId: ['', Validators.required],
    contractValue: [''],
  });
  protected readonly draftForm = this.forms.group({ name: ['', [Validators.required, Validators.maxLength(200)]], customerId: ['', Validators.required] });
  protected readonly contractForm = this.forms.group({
    contractValue: ['', [Validators.min(0.01)]], contractDate: [''], contractNumber: [''],
    startDate: [''], estimatedCompletionDate: [''], reason: [''],
  });
  protected readonly termForm = this.forms.group({ terms: this.forms.array([this.newTerm()]), reason: [''] });
  protected readonly budgetForm = this.forms.group({ lines: this.forms.array([this.newBudgetLine()]), reason: [''] });
  protected readonly lifecycleForm = this.forms.group({ reason: [''], actualCompletionDate: [''], bastNumber: [''], bastDate: [''] });
  protected readonly cancellationForm = this.forms.group({ reason: [''] });
  protected readonly settlementForm = this.forms.group({ receiptId: [''], paymentTermId: [''], amountRefunded: [''], amountRetained: [''], agreementDate: [this.today()], agreementReference: [''], reason: [''] });

  protected get terms(): FormArray { return this.termForm.controls.terms; }
  protected get budgetLines(): FormArray { return this.budgetForm.controls.lines; }
  private requestedProjectId = '';
  private projectsLoaded = false;

  ngOnInit(): void {
    const routePath = this.route.snapshot.routeConfig?.path;
    this.detailRoute.set(this.route.snapshot.data?.['projectView'] === 'summary' || routePath === 'projects/new');
    this.showCreate.set(routePath === 'projects/new');
    if (this.detailRoute() && !this.showCreate()) {
      this.route.parent?.paramMap.subscribe(params => {
        this.requestedProjectId = params.get('projectId') ?? '';
        if (this.projectsLoaded) this.openRequestedProject();
      });
    }
    this.oidc.getUserData().pipe(take(1)).subscribe(data => {
      const role = (data as Record<string, unknown> | null)?.['role'];
      this.isOwner.set(Array.isArray(role) ? role.includes('OWNER') : role === 'OWNER');
    });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    forkJoin({ projects: this.service.listProjects(), customers: this.service.listCustomers(), categories: this.service.listCategories(), subcategories: this.service.listSubcategories() })
      .pipe(take(1)).subscribe({
        next: data => {
          this.projects.set(data.projects); this.customers.set(data.customers); this.categories.set(data.categories); this.subcategories.set(data.subcategories); this.loading.set(false);
          this.projectsLoaded = true;
          if (this.detailRoute() && !this.showCreate()) this.openRequestedProject();
        },
        error: error => this.fail(error),
      });
  }

  private openRequestedProject(): void {
    const project = this.projects().find(item => item.id === this.requestedProjectId);
    if (project) this.open(project);
    else { this.selected.set(null); this.error.set('Proyek tidak ditemukan atau tidak dapat diakses.'); }
  }

  protected create(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    const value = this.createForm.getRawValue();
    const contractValue = value.contractValue === '' ? null : Number(value.contractValue);
    if (contractValue !== null && (!Number.isFinite(contractValue) || contractValue < 0)) { this.error.set('Nilai kontrak harus berupa angka nol atau lebih.'); return; }
    this.busy.set(true); this.clearMessages();
    this.service.createProject({ code: value.code.trim(), name: value.name.trim(), customerId: value.customerId, contractValue }).pipe(take(1)).subscribe({
      next: project => { this.busy.set(false); this.showCreate.set(false); this.createForm.reset(); void this.router.navigate(['/sikap/projects', project.id]); this.notice.set('Project Draft berhasil dibuat.'); },
      error: error => this.fail(error),
    });
  }

  protected open(project: BusinessProject, refreshContext = false): void {
    this.selected.set(project); this.clearMessages();
    if (refreshContext) this.detailContext?.updateProject(project);
    else this.detailContext?.setProject(project);
    this.showCancellation.set(false); this.cancelledTermIds.set([]);
    this.draftForm.reset({ name: project.name, customerId: project.customerId });
    this.contractForm.reset({ contractValue: project.contractValue === null ? '' : String(project.contractValue), contractDate: project.contractDate ?? '', contractNumber: project.contractNumber ?? '', startDate: project.startDate ?? '', estimatedCompletionDate: project.estimatedCompletionDate ?? '', reason: '' });
    this.lifecycleForm.reset({ reason: '', actualCompletionDate: '', bastNumber: '', bastDate: '' });
    this.termForm.setControl('terms', this.forms.array([this.newTerm()]));
    this.budgetForm.setControl('lines', this.forms.array([this.newBudgetLine()]));
    forkJoin({ terms: this.service.listPaymentTerms(project.id), budget: this.service.getProjectBudget(project.id), balances: this.service.getProjectBalances(project.id), receipts: this.finance.listReceipts(project.id) }).pipe(take(1)).subscribe({
      next: data => {
        this.paymentTerms.set(data.terms);
        this.termForm.setControl('terms', this.forms.array(data.terms.length ? data.terms.map(term => this.newTerm(term)) : [this.newTerm()]));
        this.budgetForm.setControl('lines', this.forms.array(data.budget.lines.length ? data.budget.lines.map(line => this.newBudgetLine(line)) : [this.newBudgetLine()]));
        this.baselineAvailable.set(data.budget.initialBaselineAvailable);
        this.balances.set(data.balances);
        this.receipts.set(data.receipts);
      }, error: error => this.fail(error),
    });
  }

  protected toggleCancelledTerm(id: string, checked: boolean): void { this.cancelledTermIds.update(ids => checked ? [...new Set([...ids, id])] : ids.filter(value => value !== id)); }

  protected saveDraftDetails(): void {
    const project = this.selected(); if (!project || project.status !== 'Draft') return;
    if (this.draftForm.invalid) { this.draftForm.markAllAsTouched(); return; }
    const value = this.draftForm.getRawValue(); this.busy.set(true); this.clearMessages();
    this.service.updateProject(project.id, { name: value.name.trim(), customerId: value.customerId, contractValue: project.contractValue }).pipe(take(1)).subscribe({
      next: updated => { this.busy.set(false); this.refreshProject(updated); this.notice.set('Data project Draft tersimpan.'); }, error: error => this.fail(error),
    });
  }
  protected addTerm(): void { this.terms.push(this.newTerm()); }
  protected removeTerm(index: number): void { if (this.terms.length > 1) this.terms.removeAt(index); else this.terms.at(0).reset({ id: null, name: '', amount: '', dueDate: '', isCancelled: false }); }
  protected addBudgetLine(): void { this.budgetLines.push(this.newBudgetLine()); }
  protected removeBudgetLine(index: number): void { if (this.budgetLines.length > 1) this.budgetLines.removeAt(index); else this.budgetLines.at(0).reset({ categoryId: '', subcategoryId: '', amount: '', description: '' }); }

  protected saveContract(): void {
    const project = this.selected(); if (!project) return;
    const value = this.contractForm.getRawValue();
    const changingStartDate = ['Active', 'InProgress', 'OnHold', 'Completed'].includes(project.status);
    if (changingStartDate && (!this.isOwner() || !value.reason.trim())) { this.error.set('Perubahan start date memerlukan role OWNER dan alasan.'); return; }
    this.busy.set(true); this.clearMessages();
    this.service.updateProjectContract(project.id, { contractValue: value.contractValue === '' ? null : Number(value.contractValue), contractDate: value.contractDate || null, contractNumber: value.contractNumber || null, startDate: value.startDate || null, estimatedCompletionDate: value.estimatedCompletionDate || null, reason: changingStartDate ? value.reason : null }).pipe(take(1)).subscribe({
      next: updated => { this.busy.set(false); this.notice.set(changingStartDate ? 'Start date diperbarui.' : 'Data kontrak tersimpan.'); this.refreshProject(updated); }, error: error => this.fail(error),
    });
  }

  protected saveTerms(): void {
    const project = this.selected(); if (!project) return;
    const raw = this.terms.getRawValue() as { id: string | null; name: string; amount: string; dueDate: string; isCancelled: boolean }[];
    if (raw.some(term => !term.name.trim() || !term.dueDate || !Number.isFinite(Number(term.amount)) || Number(term.amount) <= 0)) { this.error.set('Lengkapi nama, nominal, dan due date setiap termin.'); return; }
    if (project.status !== 'Draft' && !this.isOwner()) { this.error.set('Perubahan termin setelah Active hanya untuk OWNER.'); return; }
    this.busy.set(true); this.clearMessages();
    this.service.savePaymentTerms(project.id, raw.map(term => ({ id: term.id ?? undefined, name: term.name.trim(), amount: Number(term.amount), dueDate: term.dueDate, isCancelled: term.isCancelled })), this.termForm.controls.reason.value || null).pipe(take(1)).subscribe({
      next: () => { this.busy.set(false); this.open(project, true); this.notice.set('Payment schedule tersimpan.'); }, error: error => this.fail(error),
    });
  }

  protected saveBudget(): void {
    const project = this.selected(); if (!project) return;
    const raw = this.budgetLines.getRawValue() as { categoryId: string; subcategoryId: string; amount: string; description: string }[];
    const lines = raw.filter(line => line.categoryId || line.subcategoryId || line.amount || line.description);
    if (lines.some(line => !line.categoryId || !line.subcategoryId || !Number.isFinite(Number(line.amount)) || Number(line.amount) <= 0)) { this.error.set('Lengkapi kategori, subkategori, dan nominal budget setiap baris.'); return; }
    if (!this.canEditBudget(project)) { this.error.set('Budget tidak dapat diubah pada status project ini.'); return; }
    this.busy.set(true); this.clearMessages();
    this.service.saveProjectBudget(project.id, lines.map(line => ({ categoryId: line.categoryId, subcategoryId: line.subcategoryId, amount: Number(line.amount), description: line.description || null })), this.budgetForm.controls.reason.value || null).pipe(take(1)).subscribe({
      next: () => { this.busy.set(false); this.open(project, true); this.notice.set('Budget tersimpan.'); }, error: error => this.fail(error),
    });
  }

  protected activate(): void {
    const project = this.selected(); if (!project || !this.isOwner()) return;
    this.busy.set(true); this.clearMessages();
    this.service.activateProject(project.id).pipe(take(1)).subscribe({
      next: result => { this.busy.set(false); this.load(); this.open({ ...project, status: result.status, initialBudgetAvailable: result.initialBudgetAvailable }, true); this.notice.set(result.budgetWarning ? 'Project aktif. Baseline budget belum tersedia.' : 'Project berhasil diaktifkan.'); }, error: error => this.fail(error),
    });
  }

  protected transition(action: ProjectLifecycleAction): void {
    const project = this.selected(); if (!project || !this.isOwner()) return;
    const value = this.lifecycleForm.getRawValue();
    if (action === 'Hold' && !value.reason.trim()) { this.error.set('Alasan wajib saat menahan project.'); return; }
    if (action === 'Reopen' && !value.reason.trim()) { this.error.set('Alasan wajib saat membuka kembali project.'); return; }
    if (action === 'Complete' && !value.actualCompletionDate) { this.error.set('Actual completion date wajib diisi.'); return; }
    this.busy.set(true); this.clearMessages();
    this.service.transitionProject(project.id, action, { reason: value.reason || null, actualCompletionDate: value.actualCompletionDate || null, bastNumber: value.bastNumber || null, bastDate: value.bastDate || null }).pipe(take(1)).subscribe({
      next: updated => { this.busy.set(false); this.notice.set(`Status project berubah menjadi ${updated.status}.`); this.refreshProject(updated); this.lifecycleForm.reset({ reason: '', actualCompletionDate: '', bastNumber: '', bastDate: '' }); }, error: error => this.fail(error),
    });
  }

  protected closeProject(): void {
    const project = this.selected(); if (!project || !this.isOwner()) return;
    this.busy.set(true); this.clearMessages();
    this.service.closeProject(project.id).pipe(take(1)).subscribe({
      next: result => { this.busy.set(false); this.open({ ...project, status: result.status }, true); this.notice.set('Project ditutup dan menjadi hanya-baca.'); },
      error: error => this.fail(error),
    });
  }

  protected cancelProject(): void {
    const project = this.selected(); if (!project || !this.isOwner()) return;
    const reason = this.cancellationForm.controls.reason.value.trim();
    if (!reason) { this.error.set('Alasan wajib untuk membatalkan project.'); return; }
    this.busy.set(true); this.clearMessages();
    this.service.cancelProject(project.id, reason, this.cancelledTermIds()).pipe(take(1)).subscribe({
      next: result => { this.busy.set(false); this.showCancellation.set(false); this.cancelledTermIds.set([]); this.open({ ...project, status: result.status }, true); this.notice.set('Project dibatalkan; riwayat transaksi dipertahankan.'); },
      error: error => this.fail(error),
    });
  }

  protected settlementAllocations(): CustomerReceiptView['allocations'] {
    const receipt = this.receipts().find(x => x.id === this.settlementForm.controls.receiptId.value);
    return receipt?.allocations.filter(x => x.amount > 0) ?? [];
  }
  protected settlementTermName(termId: string): string { return this.paymentTerms().find(term => term.id === termId)?.name ?? termId; }
  protected settlementTermAllocation(termId: string): number { return this.settlementAllocations().filter(x => x.paymentTermId === termId).reduce((sum, x) => sum + x.amount, 0); }

  protected recordCancellationSettlement(): void {
    const project = this.selected(); if (!project || !this.isOwner()) return;
    const value = this.settlementForm.getRawValue();
    const amountRefunded = Number(value.amountRefunded); const amountRetained = Number(value.amountRetained);
    if (!value.receiptId || !value.paymentTermId || !Number.isFinite(amountRefunded) || amountRefunded < 0 || !Number.isFinite(amountRetained) || amountRetained < 0 || amountRefunded + amountRetained <= 0 || !value.agreementDate || !value.agreementReference.trim() || !value.reason.trim()) {
      this.error.set('Lengkapi receipt, termin, nominal refund/ditahan, tanggal dan referensi kesepakatan, serta alasan.'); return;
    }
    const termAllocated = this.settlementAllocations().filter(x => x.paymentTermId === value.paymentTermId).reduce((sum, x) => sum + x.amount, 0);
    if (Math.abs(amountRefunded + amountRetained - termAllocated) > 0.001) { this.error.set('Nominal refund dan ditahan harus sama dengan seluruh alokasi aktif pada termin terpilih.'); return; }
    this.busy.set(true); this.clearMessages();
    this.finance.settleProjectCancellation(project.id, { receiptId: value.receiptId, paymentTermId: value.paymentTermId, amountRefunded, amountRetained, agreementDate: value.agreementDate, agreementReference: value.agreementReference.trim(), reason: value.reason.trim() }).pipe(take(1)).subscribe({
      next: () => { this.busy.set(false); this.open(project, true); this.notice.set('Penyelesaian DP tersimpan dan diaudit. Lampiran kesepakatan bersifat opsional.'); }, error: error => this.fail(error),
    });
  }

  protected canEditBudget(project: BusinessProject): boolean { return project.status === 'Draft' || (this.isOwner() && ['Active', 'InProgress', 'OnHold'].includes(project.status)); }
  protected canEditTerms(project: BusinessProject): boolean { return !['Closed', 'Cancelled'].includes(project.status) && (project.status === 'Draft' || this.isOwner()); }
  protected categoriesForBudget(): ExpenseCategory[] { return this.categories().filter(category => category.isActive && category.type === 'ProjectExpense'); }
  protected subcategoriesFor(categoryId: string): ExpenseSubcategory[] { return this.subcategories().filter(item => item.isActive && item.categoryId === categoryId); }
  protected customerName(id: string): string { return this.customers().find(customer => customer.id === id)?.name ?? 'Customer tidak ditemukan'; }
  protected visibleProjects(): BusinessProject[] {
    const query = this.search().trim().toLocaleLowerCase('id-ID');
    return this.projects().filter(project => (!this.statusFilter() || project.status === this.statusFilter()) && (!query || `${project.code} ${project.name} ${this.customerName(project.customerId)}`.toLocaleLowerCase('id-ID').includes(query)));
  }
  protected plannedTotal(): number { return this.terms.controls.reduce((total, row) => total + (row.get('isCancelled')?.value ? 0 : Number(row.get('amount')?.value) || 0), 0); }
  protected contractTotal(): number { return Number(this.contractForm.controls.contractValue.value) || 0; }
  protected hasOutstandingBalances(): boolean { const value = this.balances(); return !value || value.receivable > 0 || value.payable > 0 || value.unallocatedReceipts > 0 || value.unallocatedPayments > 0; }
  protected cancellableTerms(): PaymentTerm[] { return this.paymentTerms().filter(term => !term.isCancelled && (term.allocatedAmount ?? 0) === 0 && (term.outstandingAmount ?? term.amount) > 0); }
  protected isBeforeStartDate(project: BusinessProject): boolean { return !!project.startDate && new Date(`${project.startDate}T00:00:00Z`) > new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`); }
  protected allocatedReceipts(): CustomerReceiptView[] { return this.receipts().filter(x => !x.isVoided && x.allocations.some(a => a.amount > 0)); }

  private refreshProject(project: BusinessProject): void {
    this.selected.set(project);
    this.projects.update(items => items.map(item => item.id === project.id ? project : item));
    this.detailContext?.updateProject(project);
    this.contractForm.reset({ contractValue: project.contractValue === null ? '' : String(project.contractValue), contractDate: project.contractDate ?? '', contractNumber: project.contractNumber ?? '', startDate: project.startDate ?? '', estimatedCompletionDate: project.estimatedCompletionDate ?? '', reason: '' });
    this.load();
  }

  private clearMessages(): void { this.error.set(null); this.notice.set(null); }
  private today(): string { return new Date().toISOString().slice(0, 10); }
  private newTerm(term?: PaymentTerm) { return this.forms.group({ id: [term?.id ?? null], name: [term?.name ?? ''], amount: [term?.amount === undefined ? '' : String(term.amount)], dueDate: [term?.dueDate ?? ''], isCancelled: [term?.isCancelled ?? false] }); }
  private newBudgetLine(line?: ProjectBudgetLine) { return this.forms.group({ categoryId: [line?.categoryId ?? ''], subcategoryId: [line?.subcategoryId ?? ''], amount: [line?.amount === undefined ? '' : String(line.amount)], description: [line?.description ?? ''] }); }
  private fail(error: unknown): void { this.busy.set(false); this.loading.set(false); this.error.set(error instanceof Error ? error.message : 'Permintaan gagal. Coba lagi.'); }
}
