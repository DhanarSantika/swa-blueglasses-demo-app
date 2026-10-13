import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { forkJoin, take } from 'rxjs';
import { BusinessProject, BusinessService, ExpenseCategory, ExpenseSubcategory, PaymentTerm } from '../business/business.service';
import { CustomerReceiptView, ExpenseBillView, ExpensePaymentView, FinanceMasters, FinanceService } from './finance.service';
import { AttachmentPanel } from '../documents/attachment-panel';
import { PageHeader } from '../../shared/components/page-header';
import { Alert } from '../../shared/components/alert';
import { ProjectDetailContext } from '../projects/project-detail-context';

type FinanceView = 'receipts' | 'expenses' | 'payments' | 'overhead';
type VoidKind = 'receipt' | 'refund' | 'expense' | 'payment';

@Component({
  selector: 'app-finance-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AttachmentPanel, PageHeader, Alert],
  templateUrl: './finance-page.html',
  styleUrl: './finance-page.scss',
})
export class FinancePage implements OnInit {
  private readonly forms = inject(FormBuilder).nonNullable;
  private readonly business = inject(BusinessService);
  private readonly finance = inject(FinanceService);
  private readonly oidc = inject(OidcSecurityService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectDetail = inject(ProjectDetailContext, { optional: true });

  protected readonly view = signal<FinanceView>('receipts');
  protected readonly projects = signal<BusinessProject[]>([]);
  protected readonly categories = signal<ExpenseCategory[]>([]);
  protected readonly subcategories = signal<ExpenseSubcategory[]>([]);
  protected readonly vendors = signal<FinanceMasters['vendors']>([]);
  protected readonly projectId = signal('');
  protected readonly projectContextLocked = signal(false);
  protected readonly paymentMode = signal<'list' | 'new' | 'detail'>('list');
  protected readonly overheadFormMode = signal<'list' | 'new' | 'edit'>('list');
  protected readonly selectedOverheadId = signal('');
  protected readonly selectedPaymentId = signal('');
  protected readonly terms = signal<PaymentTerm[]>([]);
  protected readonly receiptAllocationAmounts = signal<Record<string, string>>({});
  protected readonly receipts = signal<CustomerReceiptView[]>([]);
  protected readonly expenses = signal<ExpenseBillView[]>([]);
  protected readonly allExpenses = signal<ExpenseBillView[]>([]);
  protected readonly payments = signal<ExpensePaymentView[]>([]);
  protected readonly selectedReceipt = signal<CustomerReceiptView | null>(null);
  protected readonly selectedRefund = signal<CustomerReceiptView | null>(null);
  protected readonly editingReceipt = signal<CustomerReceiptView | null>(null);
  protected readonly selectedPayment = signal<ExpensePaymentView | null>(null);
  protected readonly selectedDestinationPayment = signal<ExpensePaymentView | null>(null);
  protected readonly editingExpense = signal<ExpenseBillView | null>(null);
  protected readonly voidTarget = signal<{ kind: VoidKind; id: string } | null>(null);
  protected readonly isOwner = signal(false);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly attachmentTarget = signal<{ type: string; id: string; label: string; finalized: boolean; locked: boolean; closedPayment: boolean } | null>(null);

  protected readonly receiptForm = this.forms.group({ amount: ['', this.positiveValidator()], receiptDate: [this.today()], reference: [''] });
  protected readonly receiptCorrectionForm = this.forms.group({ amount: ['', this.positiveValidator()], receiptDate: [this.today()], reference: [''], reason: [''] });
  protected readonly allocationForm = this.forms.group({ allocations: this.forms.array([this.newTermAllocation()]), reason: [''] });
  protected readonly refundReversals = this.forms.array([this.newRefundReversal()]);
  protected readonly refundForm = this.forms.group({ amount: ['', this.positiveValidator()], refundDate: [this.today()], reference: [''], reason: [''], allocations: this.refundReversals });
  protected readonly destinationForm = this.forms.group({ destinations: this.forms.array([this.newDestination()]), reason: [''] });
  protected readonly expenseForm = this.forms.group({
    vendorId: [''], invoiceDate: [this.today()], dueDate: [''], reference: [''], description: [''],
    lines: this.forms.array([this.newExpenseLine()]), reason: [''], paidImmediately: [false],
    cashPayee: [''], cashPaymentAmount: [''], cashPaymentDate: [this.today()], cashPaymentReference: [''],
  });
  protected readonly paymentForm = this.forms.group({ payee: ['', [Validators.required, Validators.maxLength(200)]], amount: ['', this.positiveValidator()], paymentDate: [this.today()], reference: [''], allocations: this.forms.array([this.newPaymentAllocation()]) });
  protected readonly addPaymentAllocationForm = this.forms.group({ allocations: this.forms.array([this.newPaymentAllocation()]), reason: [''] });
  protected readonly voidForm = this.forms.group({ reason: [''] });

  protected get allocations(): FormArray { return this.allocationForm.controls.allocations; }
  protected get expenseLines(): FormArray { return this.expenseForm.controls.lines; }
  protected get paymentAllocations(): FormArray { return this.paymentForm.controls.allocations; }
  protected get addPaymentAllocations(): FormArray { return this.addPaymentAllocationForm.controls.allocations; }
  protected get destinations(): FormArray { return this.destinationForm.controls.destinations; }

  ngOnInit(): void {
    if (this.route.snapshot.data?.['projectView']) {
      this.route.parent?.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
        const id = params.get('projectId') ?? '';
        if (id !== this.projectId()) {
          this.projectId.set(id);
          this.selectedReceipt.set(null); this.selectedRefund.set(null); this.editingReceipt.set(null); this.editingExpense.set(null);
          this.receipts.set([]); this.terms.set([]); this.expenses.set([]);
          if (this.projects().length) this.loadView();
        }
      });
    }
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const routePath = this.route.snapshot?.routeConfig?.path;
      const projectId = params.get('projectId') ?? this.route.parent?.snapshot.paramMap.get('projectId') ?? null;
      const isOverheadNew = routePath === 'finance/overhead/new';
      const isOverheadEdit = routePath === 'finance/overhead/:expenseBillId/edit';
      const candidate = this.route.snapshot.data?.['projectView'] ?? params.get('view') ?? (isOverheadNew || isOverheadEdit ? 'overhead' : routePath?.endsWith('/receipts') ? 'receipts' : routePath?.endsWith('/expenses') ? 'expenses' : routePath?.startsWith('finance/payments') ? 'payments' : null);
      if (candidate === 'receipts' || candidate === 'expenses' || candidate === 'payments' || candidate === 'overhead') {
        this.view.set(candidate);
        this.overheadFormMode.set(isOverheadNew ? 'new' : isOverheadEdit ? 'edit' : 'list');
        this.selectedOverheadId.set(isOverheadEdit ? params.get('expenseBillId') ?? '' : '');
        if (!isOverheadEdit) this.editingExpense.set(null);
        this.paymentMode.set(routePath === 'finance/payments/new' ? 'new' : params.get('paymentId') ? 'detail' : 'list');
        this.selectedPaymentId.set(params.get('paymentId') ?? '');
        this.projectContextLocked.set(!!projectId && (candidate === 'receipts' || candidate === 'expenses'));
        if (projectId) this.projectId.set(projectId);
        this.loadView();
      }
    });
    this.route.queryParamMap?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const billId = params.get('expenseBillId');
      if (billId) {
        this.paymentForm.setControl('allocations', this.forms.array([this.newPaymentAllocation(billId)]));
        this.paymentMode.set('new');
        this.view.set('payments');
      }
    });
    this.oidc.getUserData().pipe(take(1)).subscribe(data => {
      const role = (data as Record<string, unknown> | null)?.['role'];
      this.isOwner.set(Array.isArray(role) ? role.includes('OWNER') : role === 'OWNER');
    });
    forkJoin({ projects: this.business.listProjects(), masters: this.finance.listMasters() }).pipe(take(1)).subscribe({
      next: data => {
        this.projects.set(data.projects); this.categories.set(data.masters.categories); this.subcategories.set(data.masters.subcategories); this.vendors.set(data.masters.vendors); this.loading.set(false);
        this.loadView();
      }, error: error => this.fail(error),
    });
  }

  protected selectProject(id: string): void {
    this.projectId.set(id);
    this.selectedReceipt.set(null); this.selectedRefund.set(null); this.editingReceipt.set(null);
    this.selectedPayment.set(null); this.selectedDestinationPayment.set(null); this.editingExpense.set(null);
    this.voidTarget.set(null); this.attachmentTarget.set(null);
    this.receiptAllocationAmounts.set({}); this.receipts.set([]); this.terms.set([]); this.expenses.set([]);
    this.loadView();
  }
  protected setReceiptAllocation(termId: string, amount: string): void { this.receiptAllocationAmounts.update(values => ({ ...values, [termId]: amount })); }
  protected addReceiptAllocation(): void { this.allocations.push(this.newTermAllocation()); }
  protected removeReceiptAllocation(index: number): void { if (this.allocations.length > 1) this.allocations.removeAt(index); else this.allocations.at(0).reset({ paymentTermId: '', amount: '' }); }
  protected addExpenseLine(): void { this.expenseLines.push(this.newExpenseLine()); }
  protected removeExpenseLine(index: number): void { if (this.expenseLines.length > 1) this.expenseLines.removeAt(index); else this.expenseLines.at(0).reset({ categoryId: '', subcategoryId: '', amount: '', description: '' }); }
  protected addPaymentLine(): void { this.paymentAllocations.push(this.newPaymentAllocation()); }
  protected removePaymentLine(index: number): void { if (this.paymentAllocations.length > 1) this.paymentAllocations.removeAt(index); else this.paymentAllocations.at(0).reset({ expenseBillId: '', amount: '' }); }
  protected addExistingPaymentLine(): void { this.addPaymentAllocations.push(this.newPaymentAllocation()); }
  protected removeExistingPaymentLine(index: number): void { if (this.addPaymentAllocations.length > 1) this.addPaymentAllocations.removeAt(index); else this.addPaymentAllocations.at(0).reset({ expenseBillId: '', amount: '' }); }
  protected addRefundReversal(): void { this.refundReversals.push(this.newRefundReversal()); }
  protected removeRefundReversal(index: number): void { if (this.refundReversals.length > 1) this.refundReversals.removeAt(index); else this.refundReversals.at(0).reset({ receiptAllocationId: '', amount: '' }); }
  protected addDestination(): void { this.destinations.push(this.newDestination()); }
  protected removeDestination(index: number): void { if (this.destinations.length > 1) this.destinations.removeAt(index); else this.destinations.at(0).reset({ projectId: '', isCompanyOverhead: false, amount: '' }); }

  protected createReceipt(): void {
    const projectId = this.projectId(); if (!projectId) return;
    if (!this.canRecordProjectFinancials(projectId)) { this.error.set('Project tidak menerima transaksi pada status ini.'); return; }
    if (this.receiptForm.invalid) { this.receiptForm.markAllAsTouched(); return; }
    const value = this.receiptForm.getRawValue();
    const mapped = this.terms().filter(term => this.receiptAllocationAmounts()[term.id!] && Number(this.receiptAllocationAmounts()[term.id!]) > 0)
      .map(term => ({ paymentTermId: term.id!, amount: Number(this.receiptAllocationAmounts()[term.id!]) }));
    this.busy.set(true); this.clearMessages();
    this.finance.createReceipt(projectId, { amount: Number(value.amount), receiptDate: value.receiptDate, reference: value.reference || null, allocations: mapped }).pipe(take(1)).subscribe({
      next: () => { this.busy.set(false); this.receiptForm.reset({ amount: '', receiptDate: this.today(), reference: '' }); this.receiptAllocationAmounts.set({}); this.notice.set('Penerimaan tersimpan.'); this.loadView(); }, error: error => this.fail(error),
    });
  }

  protected openReceiptAllocation(receipt: CustomerReceiptView): void {
    this.selectedReceipt.set(receipt); this.allocationForm.controls.reason.reset('');
    this.allocationForm.setControl('allocations', this.forms.array(this.terms().filter(term => !term.isCancelled && (term.outstandingAmount ?? term.amount) > 0).map(term => this.newTermAllocation(term.id))));
    if (!this.allocations.length) this.allocations.push(this.newTermAllocation());
  }

  protected allocateReceipt(): void {
    const receipt = this.selectedReceipt(); if (!receipt || !this.isOwner()) return;
    if (!this.canRecordProjectFinancials(receipt.projectId)) { this.error.set('Project tidak menerima transaksi pada status ini.'); return; }
    const reason = this.allocationForm.controls.reason.value.trim();
    if (!reason) { this.error.set('Alasan wajib saat mengalokasikan saldo penerimaan.'); return; }
    const allocations = (this.allocations.getRawValue() as { paymentTermId: string; amount: string }[]).filter(x => x.paymentTermId && x.amount).map(x => ({ paymentTermId: x.paymentTermId, amount: Number(x.amount) }));
    if (!allocations.length) { this.error.set('Pilih termin dan nominal alokasi.'); return; }
    this.busy.set(true); this.clearMessages();
    this.finance.allocateReceipt(receipt.id, allocations, reason).pipe(take(1)).subscribe({ next: () => { this.busy.set(false); this.selectedReceipt.set(null); this.notice.set('Saldo penerimaan dialokasikan.'); this.loadView(); }, error: error => this.fail(error) });
  }

  protected refundReceipt(receipt: CustomerReceiptView): void {
    if (!this.canRecordProjectFinancials(receipt.projectId)) { this.error.set('Project tidak menerima transaksi pada status ini.'); return; }
    if (this.refundForm.invalid) { this.refundForm.markAllAsTouched(); return; }
    const value = this.refundForm.getRawValue();
    if (!value.reason.trim()) { this.error.set('Alasan wajib untuk refund.'); return; }
    const allocationReversals = (this.refundReversals.getRawValue() as { receiptAllocationId: string; amount: string }[]).filter(x => x.receiptAllocationId && x.amount).map(x => ({ receiptAllocationId: x.receiptAllocationId, amount: Number(x.amount) }));
    if (allocationReversals.reduce((sum, row) => sum + row.amount, 0) > Number(value.amount)) { this.error.set('Total alokasi yang dibalik tidak boleh melebihi refund.'); return; }
    this.busy.set(true); this.clearMessages();
    this.finance.refundReceipt(receipt.id, { amount: Number(value.amount), refundDate: value.refundDate, reference: value.reference || null, reason: value.reason, allocationReversals }).pipe(take(1)).subscribe({
      next: () => { this.busy.set(false); this.selectedRefund.set(null); this.refundForm.reset({ amount: '', refundDate: this.today(), reference: '', reason: '' }); this.notice.set('Pengembalian dana tersimpan sebagai cash outflow.'); this.loadView(); }, error: error => this.fail(error),
    });
  }

  protected selectRefund(receipt: CustomerReceiptView): void { this.selectedRefund.set(receipt); this.refundForm.reset({ amount: '', refundDate: this.today(), reference: '', reason: '' }); this.refundReversals.clear(); this.refundReversals.push(this.newRefundReversal()); }

  protected openAttachments(type: string, id: string, label: string, finalized = false, locked = false, closedPayment = false): void {
    this.attachmentTarget.set({ type, id, label, finalized, locked, closedPayment });
  }

  protected editReceipt(receipt: CustomerReceiptView): void {
    this.editingReceipt.set(receipt);
    this.receiptCorrectionForm.reset({ amount: String(receipt.amount), receiptDate: receipt.receiptDate, reference: receipt.reference ?? '', reason: '' });
  }

  protected correctReceipt(): void {
    const receipt = this.editingReceipt(); if (!receipt || !this.isOwner()) return;
    if (!this.canRecordProjectFinancials(receipt.projectId)) { this.error.set('Project tidak menerima transaksi pada status ini.'); return; }
    if (this.receiptCorrectionForm.invalid) { this.receiptCorrectionForm.markAllAsTouched(); return; }
    const value = this.receiptCorrectionForm.getRawValue();
    if (!value.reason.trim()) { this.error.set('Alasan wajib untuk koreksi receipt.'); return; }
    this.busy.set(true); this.clearMessages();
    this.finance.correctReceipt(receipt.id, { amount: Number(value.amount), receiptDate: value.receiptDate, reference: value.reference || null, reason: value.reason }).pipe(take(1)).subscribe({
      next: () => { this.busy.set(false); this.editingReceipt.set(null); this.notice.set('Receipt dikoreksi dan diaudit.'); this.loadView(); }, error: error => this.fail(error),
    });
  }

  protected createExpense(): void {
    const kind: 'ProjectExpense' | 'CompanyOverhead' = this.view() === 'overhead' ? 'CompanyOverhead' : 'ProjectExpense';
    if (kind === 'ProjectExpense' && !this.projectId()) { this.error.set('Pilih project terlebih dahulu.'); return; }
    if (kind === 'ProjectExpense' && !this.canRecordProjectFinancials(this.projectId())) { this.error.set('Project tidak menerima transaksi pada status ini.'); return; }
    const raw = this.expenseForm.getRawValue();
    const lines = (this.expenseLines.getRawValue() as { categoryId: string; subcategoryId: string; amount: string; description: string }[])
      .filter(x => x.categoryId || x.subcategoryId || x.amount || x.description)
      .map(x => ({ categoryId: x.categoryId, subcategoryId: x.subcategoryId, amount: Number(x.amount), description: x.description || null }));
    if (!lines.length || lines.some(x => !x.categoryId || !x.subcategoryId || !Number.isFinite(x.amount) || x.amount <= 0)) { this.error.set('Lengkapi kategori, subkategori, dan nominal setiap rincian.'); return; }
    if (!raw.invoiceDate) { this.error.set('Tanggal invoice wajib diisi.'); return; }
    const bill = { kind, projectId: kind === 'ProjectExpense' ? this.projectId() : null, vendorId: raw.vendorId || null, invoiceDate: raw.invoiceDate, dueDate: raw.dueDate || null, reference: raw.reference || null, description: raw.description || null, lines };
    if (raw.paidImmediately && (!raw.cashPayee.trim() || !raw.cashPaymentDate || !Number.isFinite(Number(raw.cashPaymentAmount)) || Number(raw.cashPaymentAmount) <= 0)) {
      this.error.set('Pembelian tunai memerlukan penerima, nominal pembayaran, dan tanggal pembayaran.'); return;
    }
    this.busy.set(true); this.clearMessages();
    const operation = raw.paidImmediately
      ? this.finance.createCashPurchase({ bill, payee: raw.cashPayee.trim(), paymentAmount: Number(raw.cashPaymentAmount), paymentDate: raw.cashPaymentDate, paymentReference: raw.cashPaymentReference || null })
      : this.finance.createExpense(bill);
    operation.pipe(take(1)).subscribe({ next: () => {
      this.busy.set(false);
      this.resetExpenseForm();
      const message = raw.paidImmediately ? 'Expense dan pembayaran tunai tersimpan.' : kind === 'ProjectExpense' ? 'Project expense tersimpan.' : 'Company overhead tersimpan.';
      this.notice.set(message);
      if (kind === 'CompanyOverhead') void this.router.navigate(['/sikap/finance/overhead']);
      else this.loadView();
    }, error: error => this.fail(error) });
  }

  protected editExpense(bill: ExpenseBillView): void {
    if (!this.canEditExpense(bill)) return;
    this.editingExpense.set(bill);
    this.expenseForm.reset({ vendorId: bill.vendorId ?? '', invoiceDate: bill.invoiceDate, dueDate: bill.dueDate ?? '', reference: bill.reference ?? '', description: bill.description ?? '', reason: '', paidImmediately: false, cashPayee: '', cashPaymentAmount: '', cashPaymentDate: this.today(), cashPaymentReference: '' });
    this.expenseForm.setControl('lines', this.forms.array(bill.lines.map(line => this.newExpenseLine(line))));
  }

  protected saveExpenseCorrection(): void {
    const bill = this.editingExpense(); if (!bill) return;
    if (!this.canEditExpense(bill)) { this.error.set('Project tidak menerima koreksi pada status ini.'); return; }
    const raw = this.expenseForm.getRawValue();
    const lines = (this.expenseLines.getRawValue() as { categoryId: string; subcategoryId: string; amount: string; description: string }[]).map(x => ({ categoryId: x.categoryId, subcategoryId: x.subcategoryId, amount: Number(x.amount), description: x.description || null }));
    if (!lines.length || lines.some(x => !x.categoryId || !x.subcategoryId || !Number.isFinite(x.amount) || x.amount <= 0)) { this.error.set('Lengkapi setiap rincian expense.'); return; }
    if (bill.allocatedAmount > 0 && (!this.isOwner() || !raw.reason.trim())) { this.error.set('Koreksi setelah pembayaran memerlukan role OWNER dan alasan.'); return; }
    this.busy.set(true); this.clearMessages();
    this.finance.updateExpense(bill.id, { kind: bill.kind, projectId: bill.projectId, vendorId: raw.vendorId || null, invoiceDate: raw.invoiceDate, dueDate: raw.dueDate || null, reference: raw.reference || null, description: raw.description || null, lines, reason: raw.reason || null }).pipe(take(1)).subscribe({
      next: () => {
        this.busy.set(false);
        this.editingExpense.set(null);
        this.notice.set('Expense dikoreksi. Audit menyimpan nilai sebelumnya.');
        if (bill.kind === 'CompanyOverhead') void this.router.navigate(['/sikap/finance/overhead']);
        else this.loadView();
      }, error: error => this.fail(error),
    });
  }

  protected cancelExpenseEdit(): void {
    this.editingExpense.set(null);
    this.resetExpenseForm();
    if (this.view() === 'overhead' && this.overheadFormMode() === 'edit') void this.router.navigate(['/sikap/finance/overhead']);
  }

  protected createPayment(): void {
    if (this.paymentForm.invalid) { this.paymentForm.markAllAsTouched(); return; }
    const raw = this.paymentForm.getRawValue();
    const allocations = (this.paymentAllocations.getRawValue() as { expenseBillId: string; amount: string }[]).filter(x => x.expenseBillId && x.amount).map(x => ({ expenseBillId: x.expenseBillId, amount: Number(x.amount) }));
    this.busy.set(true); this.clearMessages();
    this.finance.createPayment({ payee: raw.payee.trim(), amount: Number(raw.amount), paymentDate: raw.paymentDate, reference: raw.reference || null, allocations }).pipe(take(1)).subscribe({
      next: () => { this.busy.set(false); this.resetPaymentForm(); this.notice.set('Pembayaran expense tersimpan.'); this.loadView(); }, error: error => this.fail(error),
    });
  }

  protected openPaymentAllocation(payment: ExpensePaymentView): void {
    this.selectedPayment.set(payment); this.addPaymentAllocationForm.controls.reason.reset('');
    this.addPaymentAllocationForm.setControl('allocations', this.forms.array([this.newPaymentAllocation()]));
  }

  protected allocatePayment(): void {
    const payment = this.selectedPayment(); if (!payment || !this.isOwner()) return;
    if (payment.isVoided) { this.error.set('Pembayaran void tidak dapat dialokasikan.'); return; }
    const reason = this.addPaymentAllocationForm.controls.reason.value.trim();
    if (!reason) { this.error.set('Alasan wajib saat mengalokasikan saldo pembayaran.'); return; }
    const allocations = (this.addPaymentAllocations.getRawValue() as { expenseBillId: string; amount: string }[]).filter(x => x.expenseBillId && x.amount).map(x => ({ expenseBillId: x.expenseBillId, amount: Number(x.amount) }));
    if (!allocations.length) { this.error.set('Pilih tagihan dan nominal alokasi.'); return; }
    this.busy.set(true); this.clearMessages();
    this.finance.allocatePayment(payment.id, allocations, reason).pipe(take(1)).subscribe({ next: () => { this.busy.set(false); this.selectedPayment.set(null); this.notice.set('Saldo pembayaran dialokasikan.'); this.loadView(); }, error: error => this.fail(error) });
  }

  protected openPaymentDestinations(payment: ExpensePaymentView): void {
    this.selectedDestinationPayment.set(payment); this.destinationForm.controls.reason.reset(''); this.destinationForm.setControl('destinations', this.forms.array(payment.destinations.length ? payment.destinations.map(x => this.newDestination(x)) : [this.newDestination()]));
  }

  protected assignPaymentDestinations(): void {
    const payment = this.selectedDestinationPayment(); if (!payment || !this.isOwner()) return;
    if (payment.isVoided) { this.error.set('Pembayaran void tidak dapat diubah.'); return; }
    const raw = this.destinations.getRawValue() as { projectId: string; isCompanyOverhead: boolean; isUnknown: boolean; amount: string }[];
    const lines = raw.filter(x => x.projectId || x.isCompanyOverhead || x.isUnknown || x.amount).map(x => ({ projectId: x.isCompanyOverhead || x.isUnknown ? null : x.projectId, isCompanyOverhead: x.isCompanyOverhead, amount: Number(x.amount) }));
    if (raw.some(x => x.isCompanyOverhead && x.isUnknown || (x.isCompanyOverhead || x.isUnknown) && !!x.projectId || !x.isCompanyOverhead && !x.isUnknown && !x.projectId)) { this.error.set('Pilih satu tujuan: project, overhead, atau belum diketahui.'); return; }
    if (!lines.length || lines.some(x => !Number.isFinite(x.amount) || x.amount <= 0) || Math.abs(lines.reduce((sum, x) => sum + x.amount, 0) - payment.unallocatedAmount) > 0.001) { this.error.set('Tujuan harus berjumlah sama dengan saldo belum dialokasikan.'); return; }
    const reason = this.destinationForm.controls.reason.value.trim(); if (!reason) { this.error.set('Alasan wajib untuk menetapkan tujuan saldo.'); return; }
    this.busy.set(true); this.clearMessages();
    this.finance.assignPaymentDestinations(payment.id, lines, reason).pipe(take(1)).subscribe({ next: () => { this.busy.set(false); this.selectedDestinationPayment.set(null); this.notice.set('Tujuan saldo pembayaran tersimpan.'); this.loadView(); }, error: error => this.fail(error) });
  }

  protected selectVoid(kind: VoidKind, id: string): void { this.voidTarget.set({ kind, id }); this.voidForm.reset({ reason: '' }); }
  protected confirmVoid(): void {
    const target = this.voidTarget(); if (!target || !this.isOwner()) return;
    if (target.kind === 'expense') {
      const bill = this.expenses().find(item => item.id === target.id);
      if (!bill || !this.canVoidExpense(bill)) { this.error.set('Tagihan tidak dapat di-void pada status ini.'); this.voidTarget.set(null); return; }
    }
    if (target.kind === 'payment') {
      const payment = this.payments().find(item => item.id === target.id);
      if (!payment || !this.canVoidPayment(payment)) { this.error.set('Pembayaran terkait project Closed tidak dapat diubah.'); this.voidTarget.set(null); return; }
    }
    if ((target.kind === 'receipt' || target.kind === 'refund') && !this.canRecordProjectFinancials(this.projectId())) {
      this.error.set('Project tidak menerima transaksi pada status ini.'); this.voidTarget.set(null); return;
    }
    const reason = this.voidForm.controls.reason.value.trim();
    if (!reason) { this.error.set('Alasan wajib untuk void.'); return; }
    this.busy.set(true); this.clearMessages();
    const request = target.kind === 'receipt' ? this.finance.voidReceipt(target.id, reason) : target.kind === 'refund' ? this.finance.voidRefund(target.id, reason) : target.kind === 'expense' ? this.finance.voidExpense(target.id, reason) : this.finance.voidPayment(target.id, reason);
    request.pipe(take(1)).subscribe({ next: () => { this.busy.set(false); this.voidTarget.set(null); this.notice.set('Transaksi di-void; riwayat tidak dihapus.'); this.loadView(); }, error: error => this.fail(error) });
  }

  protected categoriesForCurrentExpense(): ExpenseCategory[] {
    const kind: 'ProjectExpense' | 'CompanyOverhead' = this.view() === 'overhead' ? 'CompanyOverhead' : 'ProjectExpense';
    return this.categories().filter(category => category.isActive && category.type === kind);
  }
  protected subcategoriesFor(categoryId: string): ExpenseSubcategory[] { return this.subcategories().filter(item => item.isActive && item.categoryId === categoryId); }
  protected availableBills(): ExpenseBillView[] { return this.allExpenses().filter(bill => !bill.isVoided && bill.outstandingAmount > 0 && (bill.kind === 'CompanyOverhead' || this.canRecordProjectFinancials(bill.projectId))); }
  protected visiblePayments(): ExpensePaymentView[] { const id = this.selectedPaymentId(); return this.payments().filter(payment => !id || payment.id === id); }
  protected paymentAllocationTotal(): number { return this.paymentAllocations.controls.reduce((sum, row) => sum + (Number(row.get('amount')?.value) || 0), 0); }
  protected paymentAmount(): number { return Number(this.paymentForm.controls.amount.value) || 0; }
  protected paymentUnallocatedAmount(): number { return (Number(this.paymentForm.controls.amount.value) || 0) - this.paymentAllocationTotal(); }
  protected canRecordSelectedProject(): boolean { return this.canRecordProjectFinancials(this.projectId()); }
  protected isSelectedProjectClosed(): boolean { return this.projectStatus(this.projectId()) === 'Closed'; }
  protected canEditExpense(bill: ExpenseBillView): boolean {
    return !bill.isVoided && (bill.projectId === null || this.canRecordProjectFinancials(bill.projectId)) && (bill.allocatedAmount === 0 || this.isOwner());
  }
  protected canVoidExpense(bill: ExpenseBillView): boolean {
    return !bill.isVoided && bill.allocatedAmount === 0 && this.isOwner() && (bill.projectId === null || this.canRecordProjectFinancials(bill.projectId));
  }
  protected canVoidPayment(payment: ExpensePaymentView): boolean {
    return !payment.isVoided && this.isOwner() && !this.paymentTouchesClosedProject(payment);
  }
  protected paymentTouchesClosedProject(payment: ExpensePaymentView): boolean {
    const linkedIds = new Set([
      ...payment.allocations.map(allocation => this.allExpenses().find(bill => bill.id === allocation.expenseBillId)?.projectId),
      ...payment.destinations.map(destination => destination.projectId),
    ].filter((id): id is string => !!id));
    return [...linkedIds].some(id => this.projectStatus(id) === 'Closed');
  }
  protected isPaymentAttachmentLocked(payment: ExpensePaymentView): boolean { return this.paymentTouchesClosedProject(payment); }
  protected destinationProjects(): BusinessProject[] { return this.projects().filter(project => !['Closed', 'Cancelled'].includes(project.status)); }
  protected projectName(id: string | null): string { return this.projects().find(project => project.id === id)?.name ?? (id ? 'Project tidak ditemukan' : 'Company overhead'); }
  protected paymentDestinationName(destination: ExpensePaymentView['destinations'][number]): string { return destination.isCompanyOverhead ? 'Company overhead' : destination.projectId ? this.projectName(destination.projectId) : 'Belum diketahui'; }
  protected termName(id: string): string { return this.terms().find(term => term.id === id)?.name ?? id; }

  private loadView(): void {
    if (!this.projects().length && this.loading()) return;
    this.loading.set(true);
    const projectId = this.projectId();
    if (this.view() === 'receipts' && projectId) {
      forkJoin({ receipts: this.finance.listReceipts(projectId), terms: this.business.listPaymentTerms(projectId) }).pipe(take(1)).subscribe({ next: data => { this.receipts.set(data.receipts); this.terms.set(data.terms); this.loading.set(false); this.projectDetail?.refresh(); }, error: error => this.fail(error) });
    } else if (this.view() === 'expenses' && projectId) {
      this.finance.listProjectExpenses(projectId).pipe(take(1)).subscribe({ next: rows => { this.expenses.set(rows); this.loading.set(false); this.projectDetail?.refresh(); }, error: error => this.fail(error) });
    } else if (this.view() === 'overhead') {
      this.finance.listOverhead().pipe(take(1)).subscribe({ next: rows => {
        this.expenses.set(rows);
        this.loading.set(false);
        if (this.overheadFormMode() === 'edit') {
          const bill = rows.find(item => item.id === this.selectedOverheadId());
          if (!bill) this.error.set('Tagihan overhead tidak ditemukan.');
          else if (!this.canEditExpense(bill)) this.error.set('Tagihan overhead tidak dapat diubah.');
          else this.editExpense(bill);
        }
      }, error: error => this.fail(error) });
    } else if (this.view() === 'payments') {
      forkJoin({ payments: this.finance.listPayments(), bills: this.finance.listAllExpenses() }).pipe(take(1)).subscribe({ next: data => { this.payments.set(data.payments); this.allExpenses.set(data.bills); this.loading.set(false); }, error: error => this.fail(error) });
    } else { this.loading.set(false); }
  }

  private resetExpenseLines(): void { this.expenseForm.setControl('lines', this.forms.array([this.newExpenseLine()])); }
  private resetExpenseForm(): void { this.expenseForm.reset({ vendorId: '', invoiceDate: this.today(), dueDate: '', reference: '', description: '', reason: '', paidImmediately: false, cashPayee: '', cashPaymentAmount: '', cashPaymentDate: this.today(), cashPaymentReference: '' }); this.resetExpenseLines(); }
  private resetPaymentForm(): void { this.paymentForm.reset({ payee: '', amount: '', paymentDate: this.today(), reference: '' }); this.paymentForm.setControl('allocations', this.forms.array([this.newPaymentAllocation()])); }
  private canRecordProjectFinancials(projectId: string | null): boolean {
    return !!projectId && ['Active', 'InProgress', 'OnHold', 'Completed'].includes(this.projectStatus(projectId) ?? '');
  }
  private projectStatus(projectId: string | null): string | null { return this.projects().find(project => project.id === projectId)?.status ?? null; }
  private newTermAllocation(paymentTermId = '') { return this.forms.group({ paymentTermId: [paymentTermId], amount: [''] }); }
  private newExpenseLine(line?: { categoryId: string; subcategoryId: string; amount: number; description?: string | null }) { return this.forms.group({ categoryId: [line?.categoryId ?? ''], subcategoryId: [line?.subcategoryId ?? ''], amount: [line ? String(line.amount) : ''], description: [line?.description ?? ''] }); }
  private newPaymentAllocation(expenseBillId = '') { return this.forms.group({ expenseBillId: [expenseBillId], amount: [''] }); }
  private newRefundReversal() { return this.forms.group({ receiptAllocationId: [''], amount: [''] }); }
  private newDestination(destination?: { projectId: string | null; isCompanyOverhead: boolean; amount: number }) { return this.forms.group({ projectId: [destination?.projectId ?? ''], isCompanyOverhead: [destination?.isCompanyOverhead ?? false], isUnknown: [!!destination && !destination.projectId && !destination.isCompanyOverhead], amount: [destination ? String(destination.amount) : ''] }); }
  private positiveValidator() { return (control: { value: unknown }) => control.value === '' || Number(control.value) > 0 ? null : { positive: true }; }
  private today(): string { return new Date().toISOString().slice(0, 10); }
  private clearMessages(): void { this.error.set(null); this.notice.set(null); }
  private fail(error: unknown): void { this.busy.set(false); this.loading.set(false); this.error.set(error instanceof Error ? error.message : 'Permintaan gagal. Coba lagi.'); }
}
