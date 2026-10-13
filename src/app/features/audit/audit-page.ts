import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageHeader } from '../../shared/components/page-header';
import { Alert } from '../../shared/components/alert';
import { TableContainer } from '../../shared/components/table-container';

interface AuditPageResult { items: AuditEvent[]; page: number; pageSize: number; total: number; totalPages: number; }
interface AuditEvent {
  id: string | number; occurredAtUtc: string; actorId?: string; actorUserName?: string; action: string;
  entityType?: string; entityId?: string; reason?: string; oldValue?: string; newValue?: string;
  outcome?: string; subjectUserName?: string;
}

@Component({
  selector: 'app-audit-page',
  imports: [CommonModule, DatePipe, FormsModule, PageHeader, Alert, TableContainer],
  templateUrl: './audit-page.html',
  styleUrl: './audit-page.scss',
})
export class AuditPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcSecurityService);
  private readonly route = inject(ActivatedRoute);
  protected readonly tab = signal<'business' | 'identity'>('business');
  protected readonly isOwner = signal(false);
  protected readonly events = signal<AuditEvent[]>([]);
  protected readonly page = signal(1);
  protected readonly pageSize = 50;
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expanded = signal<string | number | null>(null);
  protected readonly recordType = signal<string | null>(null);
  protected readonly recordId = signal<string | null>(null);
  protected from = '';
  protected to = '';
  protected actor = '';
  protected action = '';
  protected entityType = '';
  protected projectId = '';
  protected outcome = '';
  protected subject = '';

  ngOnInit(): void {
    this.recordType.set(this.route.snapshot.paramMap.get('entityType'));
    this.recordId.set(this.route.snapshot.paramMap.get('entityId'));
    this.from = this.wibDate(-29);
    this.to = this.wibDate(0);
    this.oidc.getUserData().pipe(take(1)).subscribe(data => {
      const role = (data as Record<string, unknown> | null)?.['role'];
      const roles = Array.isArray(role) ? role.map(String) : typeof role === 'string' ? [role] : [];
      this.isOwner.set(roles.includes('OWNER'));
      this.load();
    });
  }

  protected selectTab(tab: 'business' | 'identity'): void { this.tab.set(tab); this.page.set(1); this.load(); }
  protected load(): void {
    this.loading.set(true); this.error.set(null);
    this.tokenRequest(token => {
      const params = this.params().set('page', this.page()).set('pageSize', this.pageSize);
      const endpoint = this.recordType() && this.recordId()
        ? `${environment.apiAuthority}/api/audit/record/${encodeURIComponent(this.recordType()!)}/${this.recordId()}`
        : this.tab() === 'business' ? `${environment.apiAuthority}/api/audit/business` : `${environment.identityAuthority}/api/audit`;
      this.http.get<AuditPageResult>(endpoint, { headers: this.headers(token), params }).subscribe({
        next: result => { this.events.set(result.items); this.total.set(result.total); this.totalPages.set(result.totalPages); this.loading.set(false); },
        error: () => { this.error.set('Audit tidak dapat dimuat. Periksa filter dan izin.'); this.loading.set(false); },
      });
    });
  }

  protected movePage(delta: number): void { this.page.set(Math.max(1, Math.min(this.totalPages(), this.page() + delta))); this.load(); }
  protected toggle(event: AuditEvent): void { this.expanded.update(current => current === event.id ? null : event.id); }
  protected eventKey(event: AuditEvent): string | number { return event.id; }
  protected actorName(event: AuditEvent): string { return event.actorUserName ?? event.actorId ?? 'Sistem'; }
  protected isExpanded(event: AuditEvent): boolean { return this.expanded() === event.id; }

  protected export(): void {
    this.tokenRequest(token => {
      const params = this.params();
      this.http.get(`${environment.apiAuthority}/api/audit/business/export`, { headers: this.headers(token), params, responseType: 'blob' }).subscribe({
        next: blob => {
          const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'sikap-audit.xlsx'; link.click(); URL.revokeObjectURL(link.href);
        },
        error: () => this.error.set('Export gagal. Persempit filter atau coba lagi.'),
      });
    });
  }

  private params(): HttpParams {
    let params = new HttpParams();
    if (this.from) params = params.set('from', this.from);
    if (this.to) params = params.set('to', this.to);
    if (this.actor.trim()) params = params.set('actor', this.actor.trim());
    if (this.action.trim()) params = params.set('action', this.action.trim());
    if (this.outcome.trim() && this.tab() === 'identity') params = params.set('outcome', this.outcome.trim());
    if (this.subject.trim() && this.tab() === 'identity') params = params.set('subject', this.subject.trim());
    if (this.entityType.trim()) params = params.set('entityType', this.entityType.trim());
    if (this.projectId.trim()) params = params.set('projectId', this.projectId.trim());
    return params;
  }
  private wibDate(offsetDays: number): string {
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const year = Number(dateParts.find(part => part.type === 'year')?.value);
    const month = Number(dateParts.find(part => part.type === 'month')?.value);
    const day = Number(dateParts.find(part => part.type === 'day')?.value);
    return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10);
  }
  private headers(token: string): HttpHeaders { return new HttpHeaders({ Authorization: `Bearer ${token}` }); }
  private tokenRequest(action: (token: string) => void): void {
    this.oidc.getAccessToken().pipe(take(1)).subscribe(token => {
      if (token) action(token);
      else { this.loading.set(false); this.error.set('Sesi Identity tidak tersedia. Masuk kembali.'); }
    });
  }
}
