import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { take } from 'rxjs';
import { AttachmentPanel } from '../documents/attachment-panel';
import { ProjectDetailContext } from './project-detail-context';

@Component({
  selector: 'app-project-documents-page',
  imports: [CommonModule, AttachmentPanel],
  templateUrl: './project-documents-page.html',
  styleUrl: './project-documents-page.scss',
})
export class ProjectDocumentsPage implements OnInit {
  protected readonly context = inject(ProjectDetailContext);
  protected readonly isOwner = signal(false);
  private readonly oidc = inject(OidcSecurityService);

  ngOnInit(): void {
    this.oidc.getUserData().pipe(take(1)).subscribe(data => {
      const role = (data as Record<string, unknown> | null)?.['role'];
      this.isOwner.set(Array.isArray(role) ? role.includes('OWNER') : role === 'OWNER');
    });
  }
}
