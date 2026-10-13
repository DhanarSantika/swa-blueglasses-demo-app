import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageHeader } from '../../shared/components/page-header';
import { Alert } from '../../shared/components/alert';
import { StatusBadge } from '../../shared/components/status-badge';
import { ProjectDetailContext } from './project-detail-context';

@Component({
  selector: 'app-project-detail-page',
  providers: [ProjectDetailContext],
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, PageHeader, Alert, StatusBadge],
  templateUrl: './project-detail-page.html',
  styleUrl: './project-detail-page.scss',
})
export class ProjectDetailPage implements OnInit {
  protected readonly context = inject(ProjectDetailContext);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const projectId = params.get('projectId');
      if (projectId) this.context.load(projectId);
    });
  }

  protected customerName(): string { return this.context.customer()?.name ?? 'Customer tidak ditemukan'; }
  protected statusTone(status: string): 'success' | 'danger' | 'warning' | 'info' {
    return status === 'Completed' || status === 'Closed' ? 'success' : status === 'Cancelled' ? 'danger' : status === 'OnHold' ? 'warning' : 'info';
  }
}
