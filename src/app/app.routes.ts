import { Routes } from '@angular/router';


const sikapRoutes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./features/dashboard/dashboard-placeholder').then(page => page.DashboardPlaceholder) },
  { path: 'projects/new', loadComponent: () => import('./features/projects/projects-page').then(page => page.ProjectsPage) },
  {
    path: 'projects/:projectId',
    loadComponent: () => import('./features/projects/project-detail-page').then(page => page.ProjectDetailPage),
    children: [
      { path: '', pathMatch: 'full', data: { projectView: 'summary' }, loadComponent: () => import('./features/projects/projects-page').then(page => page.ProjectsPage) },
      { path: 'receipts', data: { projectView: 'receipts' }, loadComponent: () => import('./features/finance/finance-page').then(page => page.FinancePage) },
      { path: 'expenses', data: { projectView: 'expenses' }, loadComponent: () => import('./features/finance/finance-page').then(page => page.FinancePage) },
      { path: 'documents', data: { projectView: 'documents' }, loadComponent: () => import('./features/projects/project-documents-page').then(page => page.ProjectDocumentsPage) },
    ],
  },
  { path: 'finance/payments/new', loadComponent: () => import('./features/finance/finance-page').then(page => page.FinancePage) },
  { path: 'finance/payments/:paymentId', loadComponent: () => import('./features/finance/finance-page').then(page => page.FinancePage) },
  { path: 'finance/overhead/new', loadComponent: () => import('./features/finance/finance-page').then(page => page.FinancePage) },
  { path: 'finance/overhead/:expenseBillId/edit', loadComponent: () => import('./features/finance/finance-page').then(page => page.FinancePage) },
  { path: 'users', loadComponent: () => import('./features/users/users-page').then(page => page.UsersPage) },
  { path: 'reports', loadComponent: () => import('./features/reports/reports-page').then(page => page.ReportsPage) },
  { path: 'audit', loadComponent: () => import('./features/audit/audit-page').then(page => page.AuditPage) },
  { path: 'audit/record/:entityType/:entityId', loadComponent: () => import('./features/audit/audit-page').then(page => page.AuditPage) },
  { path: 'projects', loadComponent: () => import('./features/projects/projects-page').then(page => page.ProjectsPage) },
  { path: 'business', loadComponent: () => import('./features/business/business-page').then(page => page.BusinessPage) },
  { path: 'finance/receipts', pathMatch: 'full', redirectTo: 'projects' },
  { path: 'finance/expenses', pathMatch: 'full', redirectTo: 'projects' },
  { path: 'finance/:view', loadComponent: () => import('./features/finance/finance-page').then(page => page.FinancePage) },
];

export const routes: Routes = [
  { path: 'sikap', children: sikapRoutes },
  { path: '', pathMatch: 'full', redirectTo: 'sikap' },
  { path: '**', redirectTo: 'sikap' },
];
