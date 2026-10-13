import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardSummary, ReportingService } from '../reports/reporting.service';
import { PageHeader } from '../../shared/components/page-header';
import { MetricCard } from '../../shared/components/metric-card';
import { Alert } from '../../shared/components/alert';
import { Panel } from '../../shared/components/panel';
import { EmptyState } from '../../shared/components/empty-state';

@Component({
  selector: 'app-dashboard-placeholder',
  imports: [CommonModule, RouterLink, PageHeader, MetricCard, Alert, Panel, EmptyState],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPlaceholder implements OnInit {
  private readonly reports = inject(ReportingService);
  protected readonly dashboard = signal<DashboardSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.reports.dashboard().subscribe({
      next: data => { this.dashboard.set(data); this.loading.set(false); },
      error: () => { this.error.set('Ringkasan belum dapat dimuat. Coba muat ulang halaman.'); this.loading.set(false); },
    });
  }

  protected currency(value: unknown): string { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value ?? 0)); }
  protected projectName(id: string | null): string { const project = this.dashboard()?.projects.find(item => item.id === id); return project ? `${project.code} · ${project.name}` : 'Company overhead'; }
  protected hasProjectWarnings(): boolean { return this.dashboard()?.projects.some(project => project.overBudget || project.unbudgeted) ?? false; }
}
