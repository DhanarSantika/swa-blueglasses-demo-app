import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, Observable, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReportResult {
  title: string;
  generatedAtUtc: string;
  filters: Record<string, unknown>;
  rows: Record<string, unknown>[];
}

export interface DashboardSummary {
  period: { from: string; to: string };
  month: { cashInflow: number; cashOutflow: number; incurredExpense: number; cashSurplus: number };
   current: { activeContractValue: number; receivable: number; payable: number; companyOverhead: number; cashSurplus: number; unknownPaymentBalance: number };
  projects: { id: string; code: string; name: string; status: string; initialBaselineAvailable: boolean | null; baseline: number; latestBudget: number; incurredExpense: number; overBudget: boolean; unbudgeted: boolean }[];
   dueSoon: { terms: { id: string; projectId: string; name: string; dueDate: string; outstanding: number }[]; bills: { id: string; projectId: string | null; kind: string; dueDate: string; outstanding: number }[]; overdueTerms: { id: string; projectId: string; name: string; dueDate: string; outstanding: number }[]; overdueBills: { id: string; projectId: string | null; kind: string; dueDate: string; outstanding: number }[] };
  unallocated: { receipts: number; payments: number };
}

@Injectable({ providedIn: 'root' })
export class ReportingService {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcSecurityService);
  private readonly endpoint = `${environment.apiAuthority}/api/reports`;

  dashboard(): Observable<DashboardSummary> { return this.request(headers => this.http.get<DashboardSummary>(`${this.endpoint}/dashboard`, { headers })); }
  report(name: string, filters: { projectId?: string; from?: string; to?: string; categoryId?: string }): Observable<ReportResult> {
    return this.request(headers => this.http.get<ReportResult>(`${this.endpoint}/${name}`, { headers, params: this.params(filters) }));
  }
  export(name: string, filters: { projectId?: string; from?: string; to?: string; categoryId?: string }): Observable<Blob> {
    return this.request(headers => this.http.get(`${this.endpoint}/${name}/export`, { headers, params: this.params(filters), responseType: 'blob' }));
  }

  private params(filters: Record<string, string | undefined>): HttpParams {
    return Object.entries(filters).reduce((params, [key, value]) => value ? params.set(key, value) : params, new HttpParams());
  }
  private request<T>(send: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.oidc.getAccessToken().pipe(take(1), switchMap(token => token ? send(new HttpHeaders({ Authorization: `Bearer ${token}` })) : throwError(() => new Error('Sesi Identity tidak tersedia. Masuk kembali.'))),
      catchError((error: unknown) => throwError(() => error instanceof Error ? error : new Error('Laporan tidak dapat dimuat.'))));
  }
}
