import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, Observable, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BusinessMaster {
  id: string;
  name: string;
  isActive: boolean;
  address?: string | null;
  contact?: string | null;
  identityNumber?: string | null;
  similarNameWarning?: boolean;
}

export interface ExpenseCategory extends BusinessMaster {
  type: 'ProjectExpense' | 'CompanyOverhead';
}

export interface ExpenseSubcategory extends BusinessMaster {
  categoryId: string;
}

export interface BusinessProject {
  id: string;
  code: string;
  name: string;
  customerId: string;
  contractValue: number | null;
  status: string;
  contractDate?: string | null;
  contractNumber?: string | null;
  startDate?: string | null;
  estimatedCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  bastNumber?: string | null;
  bastDate?: string | null;
  initialBudgetAvailable?: boolean | null;
}

export type ProjectLifecycleAction = 'Start' | 'Hold' | 'Resume' | 'Complete' | 'Reopen';

export interface PaymentTerm { id?: string; projectId?: string; name: string; amount: number; dueDate: string; sortOrder?: number; isCancelled?: boolean; allocatedAmount?: number; outstandingAmount?: number; status?: string; }
export interface ProjectBudgetLine { id?: string; projectId?: string; categoryId: string; subcategoryId: string; amount: number; description?: string | null; }
export interface ProjectBudget { lines: ProjectBudgetLine[]; initialBaselineAvailable: boolean | null; baseline: ProjectBudgetLine[]; }
export interface ProjectFinancialBalances { receivable: number; payable: number; unallocatedReceipts: number; unallocatedPayments: number; }

export interface MasterInput {
  name: string;
  address?: string | null;
  contact?: string | null;
  identityNumber?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcSecurityService);
  private readonly endpoint = `${environment.apiAuthority}/api`;

  listCustomers(): Observable<BusinessMaster[]> { return this.request(headers => this.http.get<BusinessMaster[]>(`${this.endpoint}/customers`, { headers })); }
  createCustomer(input: MasterInput): Observable<BusinessMaster> { return this.request(headers => this.http.post<BusinessMaster>(`${this.endpoint}/customers`, input, { headers })); }
  updateCustomer(id: string, input: MasterInput): Observable<BusinessMaster> { return this.request(headers => this.http.put<BusinessMaster>(`${this.endpoint}/customers/${id}`, input, { headers })); }
  setCustomerActive(id: string, isActive: boolean): Observable<BusinessMaster> { return this.request(headers => this.http.patch<BusinessMaster>(`${this.endpoint}/customers/${id}/status`, { isActive }, { headers })); }

  listVendors(): Observable<BusinessMaster[]> { return this.request(headers => this.http.get<BusinessMaster[]>(`${this.endpoint}/vendors`, { headers })); }
  createVendor(input: MasterInput): Observable<BusinessMaster> { return this.request(headers => this.http.post<BusinessMaster>(`${this.endpoint}/vendors`, input, { headers })); }
  updateVendor(id: string, input: MasterInput): Observable<BusinessMaster> { return this.request(headers => this.http.put<BusinessMaster>(`${this.endpoint}/vendors/${id}`, input, { headers })); }
  setVendorActive(id: string, isActive: boolean): Observable<BusinessMaster> { return this.request(headers => this.http.patch<BusinessMaster>(`${this.endpoint}/vendors/${id}/status`, { isActive }, { headers })); }

  listCategories(): Observable<ExpenseCategory[]> { return this.request(headers => this.http.get<ExpenseCategory[]>(`${this.endpoint}/expense-categories`, { headers })); }
  createCategory(name: string, type: ExpenseCategory['type']): Observable<ExpenseCategory> { return this.request(headers => this.http.post<ExpenseCategory>(`${this.endpoint}/expense-categories`, { name, type }, { headers })); }
  updateCategory(id: string, name: string, isActive: boolean): Observable<ExpenseCategory> { return this.request(headers => this.http.put<ExpenseCategory>(`${this.endpoint}/expense-categories/${id}`, { name, isActive }, { headers })); }
  listSubcategories(): Observable<ExpenseSubcategory[]> { return this.request(headers => this.http.get<ExpenseSubcategory[]>(`${this.endpoint}/expense-subcategories`, { headers })); }
  createSubcategory(categoryId: string, name: string): Observable<ExpenseSubcategory> { return this.request(headers => this.http.post<ExpenseSubcategory>(`${this.endpoint}/expense-subcategories`, { categoryId, name }, { headers })); }
  updateSubcategory(id: string, name: string, isActive: boolean): Observable<ExpenseSubcategory> { return this.request(headers => this.http.put<ExpenseSubcategory>(`${this.endpoint}/expense-subcategories/${id}`, { name, isActive }, { headers })); }

  listProjects(): Observable<BusinessProject[]> { return this.request(headers => this.http.get<BusinessProject[]>(`${this.endpoint}/projects`, { headers })); }
  createProject(input: { code: string; name: string; customerId: string; contractValue: number | null }): Observable<BusinessProject> { return this.request(headers => this.http.post<BusinessProject>(`${this.endpoint}/projects`, input, { headers })); }
  updateProject(id: string, input: { name: string; customerId: string; contractValue: number | null }): Observable<BusinessProject> { return this.request(headers => this.http.put<BusinessProject>(`${this.endpoint}/projects/${id}`, input, { headers })); }
  updateProjectContract(id: string, input: { contractValue: number | null; contractDate: string | null; contractNumber: string | null; startDate: string | null; estimatedCompletionDate: string | null; reason?: string | null }): Observable<BusinessProject> { return this.request(headers => this.http.put<BusinessProject>(`${this.endpoint}/projects/${id}/contract`, input, { headers })); }
  listPaymentTerms(id: string): Observable<PaymentTerm[]> { return this.request(headers => this.http.get<PaymentTerm[]>(`${this.endpoint}/projects/${id}/payment-terms`, { headers })); }
  savePaymentTerms(id: string, terms: PaymentTerm[], reason: string | null = null): Observable<PaymentTerm[]> { return this.request(headers => this.http.put<PaymentTerm[]>(`${this.endpoint}/projects/${id}/payment-terms`, { terms, reason }, { headers })); }
  getProjectBudget(id: string): Observable<ProjectBudget> { return this.request(headers => this.http.get<ProjectBudget>(`${this.endpoint}/projects/${id}/budget`, { headers })); }
  saveProjectBudget(id: string, lines: ProjectBudgetLine[], reason: string | null = null): Observable<ProjectBudgetLine[]> { return this.request(headers => this.http.put<ProjectBudgetLine[]>(`${this.endpoint}/projects/${id}/budget`, { lines, reason }, { headers })); }
  activateProject(id: string): Observable<{ id: string; status: string; initialBudgetAvailable: boolean; budgetWarning: boolean }> { return this.request(headers => this.http.post<{ id: string; status: string; initialBudgetAvailable: boolean; budgetWarning: boolean }>(`${this.endpoint}/projects/${id}/activate`, {}, { headers })); }
  transitionProject(id: string, action: ProjectLifecycleAction, input: { reason?: string | null; actualCompletionDate?: string | null; bastNumber?: string | null; bastDate?: string | null } = {}): Observable<BusinessProject> { return this.request(headers => this.http.post<BusinessProject>(`${this.endpoint}/projects/${id}/lifecycle`, { action, ...input }, { headers })); }
  getProjectBalances(id: string): Observable<ProjectFinancialBalances> { return this.request(headers => this.http.get<ProjectFinancialBalances>(`${this.endpoint}/projects/${id}/balances`, { headers })); }
  closeProject(id: string): Observable<{ id: string; status: string; balances: ProjectFinancialBalances }> { return this.request(headers => this.http.post<{ id: string; status: string; balances: ProjectFinancialBalances }>(`${this.endpoint}/projects/${id}/close`, {}, { headers })); }
  cancelProject(id: string, reason: string, cancelledPaymentTermIds: string[]): Observable<{ id: string; status: string; cancelledPaymentTermIds: string[] }> { return this.request(headers => this.http.post<{ id: string; status: string; cancelledPaymentTermIds: string[] }>(`${this.endpoint}/projects/${id}/cancel`, { reason, cancelledPaymentTermIds }, { headers })); }

  private request<T>(send: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.oidc.getAccessToken().pipe(
      take(1),
      switchMap(token => token ? send(new HttpHeaders({ Authorization: `Bearer ${token}` })) : throwError(() => new Error('Sesi Identity tidak tersedia. Masuk kembali.'))),
      catchError((error: unknown) => throwError(() => this.message(error))),
    );
  }

  private message(error: unknown): Error {
    const detail = (error as { error?: { error?: string; detail?: string } })?.error;
    return new Error(detail?.error ?? detail?.detail ?? (error instanceof Error ? error.message : 'Permintaan API gagal.'));
  }
}
