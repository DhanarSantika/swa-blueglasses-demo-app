import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, Observable, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AttachmentView {
  id: string;
  targetType: string;
  targetId: string;
  documentType: string;
  originalFileName: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAtUtc: string;
  supersedesAttachmentId?: string | null;
  deletedAtUtc?: string | null;
  deleteReason?: string | null;
  isSuperseded: boolean;
  retentionEligibleAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcSecurityService);
  private readonly endpoint = `${environment.apiAuthority}/api/attachments`;

  list(targetType: string, targetId: string): Observable<AttachmentView[]> {
    const params = new HttpParams().set('targetType', targetType).set('targetId', targetId);
    return this.request(headers => this.http.get<AttachmentView[]>(this.endpoint, { headers, params }));
  }
  upload(targetType: string, targetId: string, documentType: string, file: File, reason: string, supersedesAttachmentId?: string): Observable<AttachmentView> {
    const form = new FormData(); form.set('targetType', targetType); form.set('targetId', targetId); form.set('documentType', documentType); form.set('reason', reason); form.set('file', file);
    if (supersedesAttachmentId) form.set('supersedesAttachmentId', supersedesAttachmentId);
    return this.request(headers => this.http.post<AttachmentView>(this.endpoint, form, { headers }));
  }
  download(id: string): Observable<Blob> { return this.request(headers => this.http.get(`${this.endpoint}/${id}`, { headers, responseType: 'blob' })); }
  remove(id: string, reason: string): Observable<void> { return this.request(headers => this.http.delete<void>(`${this.endpoint}/${id}`, { headers, body: { reason } })); }

  private request<T>(send: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.oidc.getAccessToken().pipe(take(1), switchMap(token => token ? send(new HttpHeaders({ Authorization: `Bearer ${token}` })) : throwError(() => new Error('Sesi Identity tidak tersedia. Masuk kembali.'))),
      catchError((error: unknown) => throwError(() => error instanceof Error ? error : new Error('Attachment tidak dapat diproses.'))));
  }
}
