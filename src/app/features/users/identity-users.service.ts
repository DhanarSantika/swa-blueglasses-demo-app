import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, Observable, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IdentityUserSummary {
  id: string;
  userName: string;
  role: 'OWNER' | 'ADMIN_STAFF' | 'SUPER_ADMIN';
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface CreateIdentityUserRequest {
  userName: string;
  temporaryPassword: string;
  confirmTemporaryPassword: string;
}

export interface ResetIdentityUserPasswordRequest {
  temporaryPassword: string;
  confirmTemporaryPassword: string;
}

@Injectable({ providedIn: 'root' })
export class IdentityUsersService {
  private readonly http = inject(HttpClient);
  private readonly oidc = inject(OidcSecurityService);
  private readonly endpoint = `${environment.identityAuthority.replace(/\/+$/, '')}/api/users`;

  list(): Observable<IdentityUserSummary[]> {
    return this.withAccessToken(headers => this.http.get<IdentityUserSummary[]>(this.endpoint, { headers }));
  }

  create(request: CreateIdentityUserRequest): Observable<IdentityUserSummary> {
    return this.withAccessToken(headers => this.http.post<IdentityUserSummary>(this.endpoint, request, { headers }));
  }

  setActive(id: string, isActive: boolean): Observable<IdentityUserSummary> {
    return this.withAccessToken(headers => this.http.patch<IdentityUserSummary>(
      `${this.endpoint}/${encodeURIComponent(id)}/status`,
      { isActive },
      { headers },
    ));
  }

  deactivate(id: string): Observable<void> {
    return this.withAccessToken(headers => this.http.delete<void>(`${this.endpoint}/${encodeURIComponent(id)}`, { headers }));
  }

  hardDelete(id: string): Observable<void> {
    return this.withAccessToken(headers => this.http.delete<void>(`${this.endpoint}/${encodeURIComponent(id)}/permanent`, { headers }));
  }

  resetPassword(id: string, request: ResetIdentityUserPasswordRequest): Observable<IdentityUserSummary> {
    return this.withAccessToken(headers => this.http.post<IdentityUserSummary>(
      `${this.endpoint}/${encodeURIComponent(id)}/password-reset`,
      request,
      { headers },
    ));
  }

  private withAccessToken<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    return this.oidc.getAccessToken().pipe(
      take(1),
      switchMap(accessToken => {
        if (!accessToken) {
          return throwError(() => new Error('Sesi Identity tidak tersedia. Masuk kembali.'));
        }

        return request(new HttpHeaders({ Authorization: `Bearer ${accessToken}` }));
      }),
      catchError((error: unknown) => throwError(() => this.toUserMessage(error))),
    );
  }

  private toUserMessage(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return new Error('Sesi berakhir. Masuk kembali melalui Identity.');
      if (error.status === 403) return new Error('Role akun tidak diizinkan untuk tindakan ini.');
      if (error.status === 409) return new Error('Username sudah digunakan. Pilih username lain.');

      const message = typeof error.error?.error === 'string' ? error.error.error : null;
      if (message) return new Error(message);
    }

    if (error instanceof Error) return error;
    return new Error('Tindakan akun gagal. Coba lagi.');
  }
}
