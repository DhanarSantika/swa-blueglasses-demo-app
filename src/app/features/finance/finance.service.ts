import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, forkJoin, Observable, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExpenseCategory, ExpenseSubcategory } from '../business/business.service';

export interface ReceiptAllocationInput { paymentTermId: string; amount: number; }
export interface CustomerReceiptView {
  id: string; projectId: string; amount: number; receiptDate: string; reference: string | null; isVoided: boolean; voidReason: string | null;
  allocations: { id: string; receiptId: string; paymentTermId: string; amount: number; originalAmount: number; reversedAmount: number }[]; allocatedAmount: number; refundedAmount: number; unallocatedAmount: number;
  refunds: { id: string; receiptId: string; amount: number; refundDate: string; reference: string | null; isVoided: boolean; voidReason: string | null }[];
}
export interface ExpenseLineView { id?: string; categoryId: string; subcategoryId: string; amount: number; description: string | null; }
export interface ExpenseBillView {
  id: string; kind: 'ProjectExpense' | 'CompanyOverhead'; projectId: string | null; vendorId: string | null; invoiceDate: string; dueDate: string | null;
  amount: number; reference: string | null; description: string | null; isVoided: boolean; allocatedAmount: number; outstandingAmount: number; status: string; lines: ExpenseLineView[];
}
export interface ExpensePaymentView {
  id: string; payee: string; amount: number; paymentDate: string; reference: string | null; isVoided: boolean;
  allocations: { id: string; expenseBillId: string; amount: number }[]; destinations: { id: string; projectId: string | null; isCompanyOverhead: boolean; amount: number }[]; allocatedAmount: number; unallocatedAmount: number;
}
export interface FinanceMasters { categories: ExpenseCategory[]; subcategories: ExpenseSubcategory[]; vendors: { id: string; name: string; isActive: boolean }[]; }

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcSecurityService);
  private readonly endpoint = `${environment.apiAuthority}/api`;

  listMasters(): Observable<FinanceMasters> {
    return this.request(headers => forkJoin({
      categories: this.http.get<ExpenseCategory[]>(`${this.endpoint}/expense-categories`, { headers }),
      subcategories: this.http.get<ExpenseSubcategory[]>(`${this.endpoint}/expense-subcategories`, { headers }),
      vendors: this.http.get<FinanceMasters['vendors']>(`${this.endpoint}/vendors`, { headers }),
    }));
  }

  listReceipts(projectId: string): Observable<CustomerReceiptView[]> { return this.request(headers => this.http.get<CustomerReceiptView[]>(`${this.endpoint}/projects/${projectId}/receipts`, { headers })); }
  createReceipt(projectId: string, input: { amount: number; receiptDate: string; reference: string | null; allocations: ReceiptAllocationInput[] }): Observable<CustomerReceiptView> { return this.request(headers => this.http.post<CustomerReceiptView>(`${this.endpoint}/projects/${projectId}/receipts`, input, { headers })); }
  correctReceipt(id: string, input: { amount: number; receiptDate: string; reference: string | null; reason: string }): Observable<CustomerReceiptView> { return this.request(headers => this.http.put<CustomerReceiptView>(`${this.endpoint}/customer-receipts/${id}`, input, { headers })); }
  settleProjectCancellation(projectId: string, input: { receiptId: string; paymentTermId: string; amountRefunded: number; amountRetained: number; agreementDate: string; agreementReference: string; reason: string }): Observable<{ settlement: { id: string } }> { return this.request(headers => this.http.post<{ settlement: { id: string } }>(`${this.endpoint}/projects/${projectId}/cancellation-settlements`, input, { headers })); }
  listCancellationSettlements(projectId: string): Observable<{ id: string; agreementReference: string; agreementDate: string }[]> { return this.request(headers => this.http.get<{ id: string; agreementReference: string; agreementDate: string }[]>(`${this.endpoint}/projects/${projectId}/cancellation-settlements`, { headers })); }
  allocateReceipt(id: string, allocations: ReceiptAllocationInput[], reason: string): Observable<unknown> { return this.request(headers => this.http.post(`${this.endpoint}/customer-receipts/${id}/allocations`, { allocations, reason }, { headers })); }
  refundReceipt(id: string, input: { amount: number; refundDate: string; reference: string | null; reason: string; allocationReversals: { receiptAllocationId: string; amount: number }[] }): Observable<unknown> { return this.request(headers => this.http.post(`${this.endpoint}/customer-receipts/${id}/refunds`, input, { headers })); }
  voidReceipt(id: string, reason: string): Observable<unknown> { return this.request(headers => this.http.patch(`${this.endpoint}/customer-receipts/${id}/void`, { reason }, { headers })); }
  voidRefund(id: string, reason: string): Observable<unknown> { return this.request(headers => this.http.patch(`${this.endpoint}/customer-refunds/${id}/void`, { reason }, { headers })); }

  listProjectExpenses(projectId: string): Observable<ExpenseBillView[]> { return this.request(headers => this.http.get<ExpenseBillView[]>(`${this.endpoint}/projects/${projectId}/expense-bills`, { headers })); }
  listOverhead(): Observable<ExpenseBillView[]> { return this.request(headers => this.http.get<ExpenseBillView[]>(`${this.endpoint}/overhead/expense-bills`, { headers })); }
  listAllExpenses(): Observable<ExpenseBillView[]> { return this.request(headers => this.http.get<ExpenseBillView[]>(`${this.endpoint}/expense-bills`, { headers })); }
  createExpense(input: { kind: 'ProjectExpense' | 'CompanyOverhead'; projectId: string | null; vendorId: string | null; invoiceDate: string; dueDate: string | null; reference: string | null; description: string | null; lines: ExpenseLineView[] }): Observable<unknown> { return this.request(headers => this.http.post(`${this.endpoint}/expense-bills`, input, { headers })); }
  createCashPurchase(input: { bill: { kind: 'ProjectExpense' | 'CompanyOverhead'; projectId: string | null; vendorId: string | null; invoiceDate: string; dueDate: string | null; reference: string | null; description: string | null; lines: ExpenseLineView[] }; payee: string; paymentAmount: number; paymentDate: string; paymentReference: string | null }): Observable<unknown> { return this.request(headers => this.http.post(`${this.endpoint}/expense-bills/cash-purchase`, input, { headers })); }
  updateExpense(id: string, input: { kind: 'ProjectExpense' | 'CompanyOverhead'; projectId: string | null; vendorId: string | null; invoiceDate: string; dueDate: string | null; reference: string | null; description: string | null; lines: ExpenseLineView[]; reason: string | null }): Observable<unknown> { return this.request(headers => this.http.put(`${this.endpoint}/expense-bills/${id}`, input, { headers })); }
  voidExpense(id: string, reason: string): Observable<unknown> { return this.request(headers => this.http.patch(`${this.endpoint}/expense-bills/${id}/void`, { reason }, { headers })); }

  listPayments(): Observable<ExpensePaymentView[]> { return this.request(headers => this.http.get<ExpensePaymentView[]>(`${this.endpoint}/expense-payments`, { headers })); }
  createPayment(input: { payee: string; amount: number; paymentDate: string; reference: string | null; allocations: { expenseBillId: string; amount: number }[] }): Observable<unknown> { return this.request(headers => this.http.post(`${this.endpoint}/expense-payments`, input, { headers })); }
  allocatePayment(id: string, allocations: { expenseBillId: string; amount: number }[], reason: string): Observable<unknown> { return this.request(headers => this.http.post(`${this.endpoint}/expense-payments/${id}/allocations`, { allocations, reason }, { headers })); }
  assignPaymentDestinations(id: string, destinations: { projectId: string | null; isCompanyOverhead: boolean; amount: number }[], reason: string): Observable<unknown> { return this.request(headers => this.http.post(`${this.endpoint}/expense-payments/${id}/destinations`, { destinations, reason }, { headers })); }
  voidPayment(id: string, reason: string): Observable<unknown> { return this.request(headers => this.http.patch(`${this.endpoint}/expense-payments/${id}/void`, { reason }, { headers })); }

  private request<T>(send: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.oidc.getAccessToken().pipe(
      take(1),
      switchMap(token => token ? send(new HttpHeaders({ Authorization: `Bearer ${token}` })) : throwError(() => new Error('Sesi Identity tidak tersedia. Masuk kembali.'))),
      catchError((error: unknown) => throwError(() => this.message(error))),
    );
  }

  private message(error: unknown): Error {
    const detail = (error as { error?: { detail?: string; title?: string } })?.error;
    return new Error(detail?.detail ?? detail?.title ?? (error instanceof Error ? error.message : 'Permintaan API gagal.'));
  }
}
