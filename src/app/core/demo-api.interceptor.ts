import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

const customers = [{ id: 'customer-1', name: 'PT Nusantara Teknik', isActive: true, address: 'Jakarta', contact: 'procurement@example.test' }];
const vendors = [
  { id: 'vendor-1', name: 'PT Baja Sentosa', isActive: true },
  { id: 'vendor-2', name: 'CV Mekar Elektrik', isActive: true },
];
const categories = [
  { id: 'cat-material', name: 'Material', type: 'ProjectExpense', isActive: true },
  { id: 'cat-labour', name: 'Tenaga Kerja', type: 'ProjectExpense', isActive: true },
  { id: 'cat-transport', name: 'Transportasi', type: 'ProjectExpense', isActive: true },
  { id: 'cat-office', name: 'Operasional Kantor', type: 'CompanyOverhead', isActive: true },
];
const subcategories = [
  { id: 'sub-steel', categoryId: 'cat-material', name: 'Baja', isActive: true },
  { id: 'sub-electrical', categoryId: 'cat-material', name: 'Komponen elektrik', isActive: true },
  { id: 'sub-technician', categoryId: 'cat-labour', name: 'Teknisi', isActive: true },
  { id: 'sub-travel', categoryId: 'cat-transport', name: 'Perjalanan proyek', isActive: true },
  { id: 'sub-rent', categoryId: 'cat-office', name: 'Sewa kantor', isActive: true },
];
const projects: any[] = [
  { id: 'demo-project-001', code: 'BG-2026-001', name: 'Mesin Pengemas Otomatis', customerId: 'customer-1', contractValue: 1250000000, status: 'InProgress', contractDate: '2026-01-10', contractNumber: 'PO-NT-26018', startDate: '2026-02-01', estimatedCompletionDate: '2026-11-30', initialBudgetAvailable: true },
  { id: 'demo-project-002', code: 'BG-2026-002', name: 'Conveyor Line B', customerId: 'customer-1', contractValue: 780000000, status: 'Active', contractDate: '2026-04-15', contractNumber: 'PO-NT-26042', startDate: '2026-09-01', estimatedCompletionDate: '2027-02-28', initialBudgetAvailable: true },
  { id: 'demo-project-003', code: 'BG-2026-003', name: 'Upgrade Panel Produksi', customerId: 'customer-1', contractValue: 465000000, status: 'OnHold', contractDate: '2025-11-04', contractNumber: 'PO-NT-25491', startDate: '2025-12-01', estimatedCompletionDate: '2026-09-15', initialBudgetAvailable: false },
  { id: 'demo-project-004', code: 'BG-2025-018', name: 'Sistem Sortir Produk', customerId: 'customer-1', contractValue: 0, status: 'Completed', contractDate: '2025-08-20', contractNumber: 'PO-NT-25112', startDate: '2025-09-01', estimatedCompletionDate: '2026-01-31', actualCompletionDate: '2026-02-12', initialBudgetAvailable: true },
  { id: 'demo-project-005', code: 'BG-2025-009', name: 'Fixture Perakitan', customerId: 'customer-1', contractValue: 210000000, status: 'Closed', initialBudgetAvailable: true },
  { id: 'demo-project-006', code: 'BG-2026-004', name: 'Unit Uji Tekanan', customerId: 'customer-1', contractValue: 350000000, status: 'Draft', initialBudgetAvailable: null },
  { id: 'demo-project-007', code: 'BG-2025-022', name: 'Modifikasi Mesin Potong', customerId: 'customer-1', contractValue: 0, status: 'Cancelled', initialBudgetAvailable: true },
];
const terms: Record<string, any[]> = {
  'demo-project-001': [
    { id: 'term-001-dp', projectId: 'demo-project-001', name: 'Down Payment 30%', amount: 375000000, dueDate: '2026-02-15', sortOrder: 1, allocatedAmount: 375000000, outstandingAmount: 0, status: 'Paid' },
    { id: 'term-001-progress', projectId: 'demo-project-001', name: 'Progress 40%', amount: 500000000, dueDate: '2026-07-15', sortOrder: 2, allocatedAmount: 300000000, outstandingAmount: 200000000, status: 'Partial' },
    { id: 'term-001-fat', projectId: 'demo-project-001', name: 'Factory Acceptance Test', amount: 250000000, dueDate: '2026-10-30', sortOrder: 3, allocatedAmount: 125000000, outstandingAmount: 125000000, status: 'Partial' },
    { id: 'term-001-final', projectId: 'demo-project-001', name: 'Final Acceptance', amount: 125000000, dueDate: '2026-11-30', sortOrder: 4, allocatedAmount: 0, outstandingAmount: 125000000, status: 'Planned' },
  ],
  'demo-project-002': [{ id: 'term-002-dp', projectId: 'demo-project-002', name: 'Down Payment 40%', amount: 312000000, dueDate: '2026-09-15', sortOrder: 1, allocatedAmount: 0, outstandingAmount: 312000000, status: 'Overdue' }],
  'demo-project-003': [{ id: 'term-003-progress', projectId: 'demo-project-003', name: 'Progress 50%', amount: 232500000, dueDate: '2026-08-01', sortOrder: 1, allocatedAmount: 100000000, outstandingAmount: 132500000, status: 'Overdue' }],
  'demo-project-004': [], 'demo-project-005': [], 'demo-project-006': [], 'demo-project-007': [],
};
const budgets: Record<string, any> = {
  'demo-project-001': { lines: [{ id: 'budget-1', projectId: 'demo-project-001', categoryId: 'cat-material', subcategoryId: 'sub-steel', amount: 320000000, description: 'Material fabrikasi' }, { id: 'budget-2', projectId: 'demo-project-001', categoryId: 'cat-labour', subcategoryId: 'sub-technician', amount: 180000000, description: 'Tim teknisi' }], initialBaselineAvailable: true, baseline: [{ categoryId: 'cat-material', subcategoryId: 'sub-steel', amount: 300000000 }, { categoryId: 'cat-labour', subcategoryId: 'sub-technician', amount: 180000000 }] },
  'demo-project-002': { lines: [{ id: 'budget-3', projectId: 'demo-project-002', categoryId: 'cat-material', subcategoryId: 'sub-electrical', amount: 250000000, description: 'Panel dan komponen' }], initialBaselineAvailable: true, baseline: [{ categoryId: 'cat-material', subcategoryId: 'sub-electrical', amount: 250000000 }] },
  'demo-project-003': { lines: [], initialBaselineAvailable: false, baseline: [] },
};
const receipts: any[] = [
  { id: 'receipt-001', projectId: 'demo-project-001', amount: 375000000, receiptDate: '2026-02-15', reference: 'TRF-NT-001', isVoided: false, allocations: [{ id: 'alloc-001', receiptId: 'receipt-001', paymentTermId: 'term-001-dp', amount: 375000000, originalAmount: 375000000, reversedAmount: 0 }], allocatedAmount: 375000000, refundedAmount: 0, unallocatedAmount: 0, refunds: [] },
  { id: 'receipt-002', projectId: 'demo-project-001', amount: 320000000, receiptDate: '2026-07-16', reference: 'TRF-NT-018', isVoided: false, allocations: [{ id: 'alloc-002', receiptId: 'receipt-002', paymentTermId: 'term-001-progress', amount: 300000000, originalAmount: 300000000, reversedAmount: 0 }], allocatedAmount: 300000000, refundedAmount: 0, unallocatedAmount: 20000000, refunds: [] },
  { id: 'receipt-003', projectId: 'demo-project-003', amount: 100000000, receiptDate: '2026-07-20', reference: 'TRF-NT-014', isVoided: false, allocations: [{ id: 'alloc-003', receiptId: 'receipt-003', paymentTermId: 'term-003-progress', amount: 100000000, originalAmount: 100000000, reversedAmount: 0 }], allocatedAmount: 100000000, refundedAmount: 0, unallocatedAmount: 0, refunds: [] },
  { id: 'receipt-004', projectId: 'demo-project-001', amount: 125000000, receiptDate: '2026-10-03', reference: 'TRF-NT-024', isVoided: false, allocations: [{ id: 'alloc-004', receiptId: 'receipt-004', paymentTermId: 'term-001-fat', amount: 125000000, originalAmount: 125000000, reversedAmount: 0 }], allocatedAmount: 125000000, refundedAmount: 0, unallocatedAmount: 0, refunds: [] },
];
const bills: any[] = [
  { id: 'bill-001', kind: 'ProjectExpense', projectId: 'demo-project-001', vendorId: 'vendor-1', invoiceDate: '2026-06-10', dueDate: '2026-06-30', amount: 185000000, reference: 'INV-BS-2644', description: 'Material rangka utama', isVoided: false, allocatedAmount: 150000000, outstandingAmount: 35000000, status: 'Partial', lines: [{ categoryId: 'cat-material', subcategoryId: 'sub-steel', amount: 185000000, description: 'Baja struktur' }] },
  { id: 'bill-002', kind: 'ProjectExpense', projectId: 'demo-project-001', vendorId: 'vendor-2', invoiceDate: '2026-09-28', dueDate: '2026-10-20', amount: 92000000, reference: 'INV-ME-0981', description: 'Komponen panel kontrol', isVoided: false, allocatedAmount: 0, outstandingAmount: 92000000, status: 'Unpaid', lines: [{ categoryId: 'cat-material', subcategoryId: 'sub-electrical', amount: 92000000, description: 'PLC dan sensor' }] },
  { id: 'bill-003', kind: 'ProjectExpense', projectId: 'demo-project-003', vendorId: 'vendor-1', invoiceDate: '2026-07-01', dueDate: '2026-08-01', amount: 64000000, reference: 'INV-BS-2501', description: 'Material panel', isVoided: false, allocatedAmount: 0, outstandingAmount: 64000000, status: 'Overdue', lines: [{ categoryId: 'cat-material', subcategoryId: 'sub-steel', amount: 64000000, description: 'Material panel' }] },
  { id: 'bill-004', kind: 'CompanyOverhead', projectId: null, vendorId: null, invoiceDate: '2026-10-01', dueDate: '2026-10-31', amount: 18500000, reference: 'OFFICE-1026', description: 'Sewa kantor Oktober', isVoided: false, allocatedAmount: 0, outstandingAmount: 18500000, status: 'Unpaid', lines: [{ categoryId: 'cat-office', subcategoryId: 'sub-rent', amount: 18500000, description: 'Sewa kantor' }] },
];
const payments: any[] = [
  { id: 'payment-001', payee: 'PT Baja Sentosa', amount: 150000000, paymentDate: '2026-07-02', reference: 'TRF-OUT-1002', isVoided: false, allocations: [{ id: 'pay-alloc-1', expenseBillId: 'bill-001', amount: 150000000 }], destinations: [], allocatedAmount: 150000000, unallocatedAmount: 0 },
  { id: 'payment-002', payee: 'CV Mekar Elektrik', amount: 12000000, paymentDate: '2026-10-05', reference: 'TRF-OUT-1044', isVoided: false, allocations: [], destinations: [], allocatedAmount: 0, unallocatedAmount: 12000000 },
];
const settlements: Record<string, any[]> = {};
const attachments: Record<string, any[]> = {};
const audit: any[] = [
  { id: 'audit-001', occurredAtUtc: '2026-10-12T08:20:00Z', actorUserName: 'demo.owner', action: 'CREATE', entityType: 'ExpenseBill', entityId: 'bill-001', reason: 'Seed data demo', outcome: 'Success' },
  { id: 'audit-002', occurredAtUtc: '2026-10-10T05:10:00Z', actorUserName: 'demo.staff', action: 'CREATE', entityType: 'CustomerReceipt', entityId: 'receipt-002', reason: 'Pembayaran progress', outcome: 'Success' },
];
const demoUsers: any[] = [
  { id: 'user-demo-owner', userName: 'demo.owner', role: 'OWNER', isActive: true, mustChangePassword: false },
  { id: 'user-demo-staff', userName: 'demo.staff', role: 'ADMIN_STAFF', isActive: true, mustChangePassword: false },
];

const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const response = (body: unknown, status = 200) => of(new HttpResponse({ body, status }));

export const demoApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/demo-api/')) return next(req);
  const path = req.url.split('?')[0].replace(/^\/demo-api\/api\/?/, '');
  const method = req.method;
  const body: any = req.body ?? {};
  const route = (pattern: RegExp) => path.match(pattern);
  let match: RegExpMatchArray | null;

  if (method === 'GET' && path === 'customers') return response(customers);
  if (method === 'GET' && path === 'vendors') return response(vendors);
  if (method === 'GET' && path === 'expense-categories') return response(categories);
  if (method === 'GET' && path === 'expense-subcategories') return response(subcategories);
  if (method === 'GET' && path === 'projects') return response(projects);
  if (method === 'GET' && path === 'expense-bills') return response(bills);
  if (method === 'GET' && path === 'overhead/expense-bills') return response(bills.filter(x => x.kind === 'CompanyOverhead'));
  if (method === 'GET' && path === 'expense-payments') return response(payments);
  if (method === 'GET' && path === 'reports/dashboard') return response(dashboard());
  if (method === 'GET' && path.startsWith('reports/')) return response(report(path.split('/')[1]));
  if (method === 'GET' && (path === 'audit' || path.startsWith('audit/'))) return response({ items: audit, page: 1, pageSize: 50, total: audit.length, totalPages: 1 });
  if (method === 'GET' && path === 'attachments') { const targetId = new URLSearchParams(req.urlWithParams.split('?')[1] ?? '').get('targetId'); return response(targetId ? (attachments[targetId] ?? []) : Object.values(attachments).flat()); }
  if (method === 'GET' && path === 'users') return response(demoUsers);
  if (method === 'POST' && path === 'users') { const item = { id: id('user'), userName: body.userName, role: 'ADMIN_STAFF', isActive: true, mustChangePassword: true }; demoUsers.push(item); audit.unshift(auditEvent('CREATE', 'User', item.id)); return response(item, 201); }
  match = route(/^users\/([^/]+)(?:\/(status|password-reset|permanent))?$/);
  if (match && method === 'PATCH') { const item = demoUsers.find(x => x.id === match![1]); if (item) item.isActive = !!body.isActive; return response(item ?? {}); }
  if (match && method === 'DELETE') { const index = demoUsers.findIndex(x => x.id === match![1]); const [item] = demoUsers.splice(index, 1); return response(item ?? null, 204); }
  if (match && method === 'POST' && match[2] === 'password-reset') { const item = demoUsers.find(x => x.id === match![1]); if (item) item.mustChangePassword = true; return response(item ?? {}); }

  for (const [resource, collection] of [['customers', customers], ['vendors', vendors], ['expense-categories', categories], ['expense-subcategories', subcategories]] as const) {
    if (path === resource && method === 'POST') { const item: any = { id: id(resource.slice(0, -1)), isActive: true, ...body }; collection.unshift(item); audit.unshift(auditEvent('CREATE', resource, item.id)); return response(item, 201); }
    const entity = route(new RegExp(`^${resource}/([^/]+)(?:/status)?$`));
    if (entity && (method === 'PUT' || method === 'PATCH')) { const item: any = collection.find(x => x.id === entity[1]); if (item) Object.assign(item, body); audit.unshift(auditEvent('UPDATE', resource, entity[1])); return response(item ?? {}); }
  }

  match = route(/^projects\/([^/]+)\/payment-terms$/);
  if (match && method === 'GET') return response(terms[match[1]] ?? []);
  if (match && method === 'PUT') { terms[match[1]] = (body.terms ?? []).map((x: any, i: number) => ({ ...x, id: x.id ?? id('term'), projectId: match![1], sortOrder: i + 1, allocatedAmount: 0, outstandingAmount: x.amount, status: 'Planned' })); return response(terms[match[1]]); }
  match = route(/^projects\/([^/]+)\/budget$/);
  if (match && method === 'GET') return response(budgets[match[1]] ?? { lines: [], baseline: [], initialBaselineAvailable: null });
  if (match && method === 'PUT') { const prior = budgets[match[1]] ?? { baseline: [], initialBaselineAvailable: null }; budgets[match[1]] = { ...prior, lines: body.lines ?? [] }; return response(budgets[match[1]].lines); }
  match = route(/^projects\/([^/]+)\/balances$/);
  if (match && method === 'GET') return response(balances(match[1]));
  match = route(/^projects\/([^/]+)\/receipts$/);
  if (match && method === 'GET') return response(receipts.filter(x => x.projectId === match![1]));
  if (match && method === 'POST') { const item = createReceipt(match[1], body); receipts.unshift(item); return response(item, 201); }
  match = route(/^projects\/([^/]+)\/expense-bills$/);
  if (match && method === 'GET') return response(bills.filter(x => x.projectId === match![1]));
  match = route(/^projects\/([^/]+)\/(activate|lifecycle|close|cancel|cancellation-settlements)$/);
  if (match && method === 'GET') return response(settlements[match[1]] ?? []);
  if (match && method === 'POST') return projectAction(match[1], match[2], body);
  match = route(/^projects\/([^/]+)$/);
  if (match && method === 'POST') { const project = { id: id('project'), ...body, status: 'Draft', initialBudgetAvailable: null }; projects.unshift(project); terms[project.id] = []; return response(project, 201); }
  if (match && method === 'PUT') { const p = projects.find(x => x.id === match![1]); if (p) Object.assign(p, body); return response(p ?? {}); }
  match = route(/^projects\/([^/]+)\/contract$/);
  if (match && method === 'PUT') { const p = projects.find(x => x.id === match![1]); if (p) Object.assign(p, body); return response(p ?? {}); }
  if (match && method === 'DELETE') return response(null, 204);

  match = route(/^expense-bills\/([^/]+)\/void$/);
  if (match && method === 'PATCH') { const bill = bills.find(x => x.id === match![1]); if (bill) { bill.isVoided = true; bill.status = 'Void'; } return response(bill ?? {}); }
  match = route(/^expense-bills\/([^/]+)$/);
  if (match && method === 'PUT') { const bill = bills.find(x => x.id === match![1]); if (bill) Object.assign(bill, body, { amount: body.lines.reduce((sum: number, line: any) => sum + line.amount, 0) }); return response(bill ?? {}); }
  if (method === 'POST' && (path === 'expense-bills' || path === 'expense-bills/cash-purchase')) return createBill(path.endsWith('cash-purchase') ? body.bill : body, path.endsWith('cash-purchase') ? body : null);
  if (method === 'POST' && path === 'expense-payments') return createPayment(body);
  match = route(/^expense-payments\/([^/]+)\/allocations$/);
  if (match && method === 'POST') return allocatePayment(match[1], body.allocations ?? []);
  match = route(/^expense-payments\/([^/]+)\/void$/);
  if (match && method === 'PATCH') { const item = payments.find(x => x.id === match![1]); if (item) item.isVoided = true; return response(item ?? {}); }
  match = route(/^expense-payments\/([^/]+)\/destinations$/);
  if (match && method === 'POST') { const item = payments.find(x => x.id === match![1]); if (item) item.destinations = (body.destinations ?? []).map((x: any) => ({ id: id('destination'), ...x })); return response(item ?? {}); }
  match = route(/^customer-receipts\/([^/]+)\/(allocations|refunds|void)$/);
  if (match && method === 'POST') return match[2] === 'allocations' ? allocateReceipt(match[1], body.allocations ?? []) : refundReceipt(match[1], body);
  if (match && method === 'PATCH') { const item = receipts.find(x => x.id === match![1]); if (item) item.isVoided = true; return response(item ?? {}); }
  match = route(/^customer-receipts\/([^/]+)$/);
  if (match && method === 'PUT') { const item = receipts.find(x => x.id === match![1]); if (item) Object.assign(item, body); return response(item ?? {}); }
  match = route(/^customer-refunds\/([^/]+)\/void$/);
  if (match && method === 'PATCH') { const refund = receipts.flatMap(x => x.refunds).find(x => x.id === match![1]); if (refund) refund.isVoided = true; return response(refund ?? {}); }
  if (method === 'POST' && path.endsWith('/cancellation-settlements')) { const projectId = path.split('/')[1]; settlements[projectId] ??= []; const result = { settlement: { id: id('settlement') } }; settlements[projectId].push({ id: result.settlement.id, agreementReference: body.agreementReference, agreementDate: body.agreementDate }); return response(result, 201); }

  if (method === 'POST' && path.startsWith('attachments')) { const item = { id: id('attachment'), targetType: body.get?.('targetType') ?? 'Project', targetId: body.get?.('targetId') ?? '', documentType: body.get?.('documentType') ?? 'Other', originalFileName: body.get?.('file')?.name ?? 'demo-document.pdf', contentType: 'application/pdf', size: 0, uploadedBy: 'demo.owner', uploadedAtUtc: new Date().toISOString(), isSuperseded: false }; attachments[item.targetId] ??= []; attachments[item.targetId].push(item); return response(item, 201); }
  if (method === 'DELETE' && path.startsWith('attachments/')) return response(null, 204);
  if (method === 'GET' && path.startsWith('attachments/')) return response(new Blob(['Demo attachment preview'], { type: 'text/plain' }));

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') return response({ id: id('demo'), ...body }, 200);
  return response([], 200);
};

function createReceipt(projectId: string, input: any) {
  const idValue = id('receipt');
  const allocations = (input.allocations ?? []).map((item: any) => ({ id: id('alloc'), receiptId: idValue, paymentTermId: item.paymentTermId, amount: Number(item.amount), originalAmount: Number(item.amount), reversedAmount: 0 }));
  const allocatedAmount = allocations.reduce((sum: number, item: any) => sum + item.amount, 0);
  allocations.forEach((item: any) => { const term = (terms[projectId] ?? []).find(x => x.id === item.paymentTermId); if (term) { term.allocatedAmount = (term.allocatedAmount ?? 0) + item.amount; term.outstandingAmount = Math.max(0, term.amount - term.allocatedAmount); term.status = term.outstandingAmount === 0 ? 'Paid' : 'Partial'; } });
  return { id: idValue, projectId, amount: Number(input.amount), receiptDate: input.receiptDate, reference: input.reference ?? null, isVoided: false, allocations, allocatedAmount, refundedAmount: 0, unallocatedAmount: Number(input.amount) - allocatedAmount, refunds: [] };
}
function auditEvent(action: string, entityType: string, entityId: string) { return { id: id('audit'), occurredAtUtc: new Date().toISOString(), actorUserName: 'demo.owner', action, entityType, entityId, outcome: 'Success' }; }
function createBill(input: any, cash?: any) {
  const amount = (input.lines ?? []).reduce((sum: number, line: any) => sum + Number(line.amount), 0);
  const bill: any = { id: id('bill'), ...input, amount, isVoided: false, allocatedAmount: 0, outstandingAmount: amount, status: 'Unpaid' };
  bills.unshift(bill);
  if (cash) { const paid = Number(cash.paymentAmount); bill.allocatedAmount = Math.min(amount, paid); bill.outstandingAmount = Math.max(0, amount - paid); bill.status = bill.outstandingAmount ? 'Partial' : 'Paid'; payments.unshift({ id: id('payment'), payee: cash.payee, amount: paid, paymentDate: cash.paymentDate, reference: cash.paymentReference, isVoided: false, allocations: [{ id: id('pay-alloc'), expenseBillId: bill.id, amount: bill.allocatedAmount }], destinations: [], allocatedAmount: bill.allocatedAmount, unallocatedAmount: Math.max(0, paid - amount) }); }
  return response(bill, 201);
}
function createPayment(input: any) {
  const allocated = (input.allocations ?? []).reduce((sum: number, x: any) => sum + Number(x.amount), 0);
  const item = { id: id('payment'), payee: input.payee, amount: Number(input.amount), paymentDate: input.paymentDate, reference: input.reference ?? null, isVoided: false, allocations: (input.allocations ?? []).map((x: any) => ({ id: id('pay-alloc'), ...x })), destinations: [], allocatedAmount: allocated, unallocatedAmount: Math.max(0, Number(input.amount) - allocated) };
  payments.unshift(item);
  item.allocations.forEach((allocation: any) => { const bill = bills.find(x => x.id === allocation.expenseBillId); if (bill) { bill.allocatedAmount += allocation.amount; bill.outstandingAmount = Math.max(0, bill.amount - bill.allocatedAmount); bill.status = bill.outstandingAmount === 0 ? 'Paid' : 'Partial'; } });
  return response(item, 201);
}
function allocatePayment(paymentId: string, allocations: any[]) { const item = payments.find(x => x.id === paymentId); if (!item) return response({}); allocations.forEach(x => { const bill = bills.find(y => y.id === x.expenseBillId); if (bill) { bill.allocatedAmount += Number(x.amount); bill.outstandingAmount = Math.max(0, bill.amount - bill.allocatedAmount); bill.status = bill.outstandingAmount === 0 ? 'Paid' : 'Partial'; item.allocations.push({ id: id('pay-alloc'), expenseBillId: x.expenseBillId, amount: Number(x.amount) }); item.allocatedAmount += Number(x.amount); item.unallocatedAmount = Math.max(0, item.amount - item.allocatedAmount); } }); return response(item); }
function allocateReceipt(receiptId: string, allocations: any[]) { const item = receipts.find(x => x.id === receiptId); if (!item) return response({}); allocations.forEach(x => { const term = (terms[item.projectId] ?? []).find(y => y.id === x.paymentTermId); if (term) { term.allocatedAmount += Number(x.amount); term.outstandingAmount = Math.max(0, term.amount - term.allocatedAmount); term.status = term.outstandingAmount === 0 ? 'Paid' : 'Partial'; item.allocations.push({ id: id('alloc'), receiptId, paymentTermId: x.paymentTermId, amount: Number(x.amount), originalAmount: Number(x.amount), reversedAmount: 0 }); item.allocatedAmount += Number(x.amount); item.unallocatedAmount = Math.max(0, item.amount - item.allocatedAmount); } }); return response(item); }
function refundReceipt(receiptId: string, input: any) { const item = receipts.find(x => x.id === receiptId); if (item) { item.refundedAmount += Number(input.amount); item.refunds.push({ id: id('refund'), receiptId, amount: Number(input.amount), refundDate: input.refundDate, reference: input.reference ?? null, isVoided: false }); } return response(item ?? {}); }
function projectAction(projectId: string, action: string, input: any) {
  const project = projects.find(x => x.id === projectId);
  if (!project) return response({});
  if (action === 'activate') { project.status = 'Active'; project.initialBudgetAvailable = (budgets[projectId]?.lines?.length ?? 0) > 0; budgets[projectId] ??= { lines: [], baseline: [], initialBaselineAvailable: false }; budgets[projectId].initialBaselineAvailable = project.initialBudgetAvailable; budgets[projectId].baseline = project.initialBudgetAvailable ? [...budgets[projectId].lines] : []; return response({ id: projectId, status: project.status, initialBudgetAvailable: project.initialBudgetAvailable, budgetWarning: !project.initialBudgetAvailable }); }
  if (action === 'lifecycle') { project.status = ({ Start: 'InProgress', Hold: 'OnHold', Resume: 'InProgress', Complete: 'Completed', Reopen: 'InProgress' } as any)[input.action] ?? project.status; if (input.actualCompletionDate) project.actualCompletionDate = input.actualCompletionDate; return response(project); }
  if (action === 'close') { project.status = 'Closed'; return response({ id: projectId, status: 'Closed', balances: balances(projectId) }); }
  if (action === 'cancel') { project.status = 'Cancelled'; return response({ id: projectId, status: 'Cancelled', cancelledPaymentTermIds: input.cancelledPaymentTermIds ?? [] }); }
  return response({ settlement: { id: id('settlement') } });
}
function balances(projectId: string) { const projectBills = bills.filter(x => x.projectId === projectId && !x.isVoided); return { receivable: (terms[projectId] ?? []).reduce((sum, x) => sum + (x.outstandingAmount ?? x.amount), 0), payable: projectBills.reduce((sum, x) => sum + x.outstandingAmount, 0), unallocatedReceipts: receipts.filter(x => x.projectId === projectId && !x.isVoided).reduce((sum, x) => sum + x.unallocatedAmount, 0), unallocatedPayments: 0 }; }
function dashboard() {
  const today = new Date();
  const monthKey = today.toISOString().slice(0, 7);
  const todayKey = today.toISOString().slice(0, 10);
  const horizon = new Date(today); horizon.setDate(horizon.getDate() + 14);
  const horizonKey = horizon.toISOString().slice(0, 10);
  const operational = projects.filter(x => ['Active', 'InProgress', 'OnHold', 'Completed'].includes(x.status));
  const projectRows = operational.map(project => { const budget = budgets[project.id]; const baseline = (budget?.baseline ?? []).reduce((sum: number, x: any) => sum + x.amount, 0); const latestBudget = (budget?.lines ?? []).reduce((sum: number, x: any) => sum + x.amount, 0); const incurredExpense = bills.filter(x => x.projectId === project.id && !x.isVoided).reduce((sum, x) => sum + x.amount, 0); return { id: project.id, code: project.code, name: project.name, status: project.status, initialBaselineAvailable: project.initialBudgetAvailable, baseline, latestBudget, incurredExpense, overBudget: baseline > 0 && incurredExpense > baseline, unbudgeted: incurredExpense > 0 && !project.initialBudgetAvailable }; });
  const allTerms = operational.flatMap(project => (terms[project.id] ?? []).filter(x => !x.isCancelled && x.outstandingAmount > 0).map(x => ({ ...x, projectId: project.id })));
  const overdueTerms = allTerms.filter(x => x.dueDate < todayKey).map(x => ({ id: x.id, projectId: x.projectId, name: x.name, dueDate: x.dueDate, outstanding: x.outstandingAmount }));
  const overdueBills = bills.filter(x => x.status === 'Overdue').map(x => ({ id: x.id, projectId: x.projectId, kind: x.kind, dueDate: x.dueDate, outstanding: x.outstandingAmount }));
  const dueSoonTerms = allTerms.filter(x => x.dueDate >= todayKey && x.dueDate <= horizonKey).map(x => ({ id: x.id, projectId: x.projectId, name: x.name, dueDate: x.dueDate, outstanding: x.outstandingAmount }));
  const dueSoonBills = bills.filter(x => !x.isVoided && x.outstandingAmount > 0 && x.dueDate && x.dueDate >= todayKey && x.dueDate <= horizonKey).map(x => ({ id: x.id, projectId: x.projectId, kind: x.kind, dueDate: x.dueDate, outstanding: x.outstandingAmount }));
  const receivable = operational.reduce((sum, project) => sum + (terms[project.id] ?? []).reduce((subtotal, x) => subtotal + (x.outstandingAmount ?? x.amount), 0), 0);
  const payable = bills.reduce((sum, x) => sum + (!x.isVoided ? x.outstandingAmount : 0), 0);
  const monthInflow = receipts.reduce((sum, x) => sum + (!x.isVoided && x.receiptDate.startsWith(monthKey) ? x.amount : 0), 0);
  const monthOutflow = payments.reduce((sum, x) => sum + (!x.isVoided && x.paymentDate.startsWith(monthKey) ? x.amount : 0), 0) + receipts.reduce((sum, x) => sum + (!x.isVoided ? x.refunds.filter((refund: any) => !refund.isVoided && refund.refundDate.startsWith(monthKey)).reduce((subtotal: number, refund: any) => subtotal + refund.amount, 0) : 0), 0);
  const monthExpense = bills.reduce((sum, x) => sum + (!x.isVoided && x.invoiceDate.startsWith(monthKey) ? x.amount : 0), 0);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { period: { from: `${monthKey}-01`, to: endOfMonth }, month: { cashInflow: monthInflow, cashOutflow: monthOutflow, incurredExpense: monthExpense, cashSurplus: monthInflow - monthOutflow }, current: { activeContractValue: operational.filter(x => ['Active', 'InProgress', 'OnHold'].includes(x.status)).reduce((sum, x) => sum + (x.contractValue ?? 0), 0), receivable, payable, companyOverhead: bills.filter(x => x.kind === 'CompanyOverhead' && !x.isVoided).reduce((sum, x) => sum + x.amount, 0), cashSurplus: receipts.reduce((sum, x) => sum + (!x.isVoided ? x.amount - x.refundedAmount : 0), 0) - payments.reduce((sum, x) => sum + (!x.isVoided ? x.amount : 0), 0), unknownPaymentBalance: payments.reduce((sum, x) => sum + (!x.isVoided ? x.unallocatedAmount : 0), 0) }, projects: projectRows, dueSoon: { terms: dueSoonTerms, bills: dueSoonBills, overdueTerms, overdueBills }, unallocated: { receipts: receipts.reduce((sum, x) => sum + (!x.isVoided ? x.unallocatedAmount : 0), 0), payments: payments.reduce((sum, x) => sum + (!x.isVoided ? x.unallocatedAmount : 0), 0) } };
}
function report(name: string) {
  let rows: any[];
  if (name === 'budget-vs-expense') rows = projects.map(p => { const b = budgets[p.id]; const baseline = (b?.baseline ?? []).reduce((s: number, x: any) => s + x.amount, 0); const incurred = bills.filter(x => x.projectId === p.id && !x.isVoided).reduce((s, x) => s + x.amount, 0); return { Project: p.code, Name: p.name, Status: p.status, BaselineAvailable: !!p.initialBudgetAvailable, Baseline: baseline, LatestBudget: (b?.lines ?? []).reduce((s: number, x: any) => s + x.amount, 0), IncurredExpense: incurred, BudgetVariance: baseline - incurred }; });
  else if (name === 'payment-schedule') rows = projects.flatMap(p => (terms[p.id] ?? []).map(t => ({ Project: p.code, Name: t.name, Status: t.status, DueDate: t.dueDate, Amount: t.amount, Received: t.allocatedAmount, Receivable: t.outstandingAmount })));
  else if (name === 'outstanding-payable') rows = bills.map(x => ({ Project: projects.find(p => p.id === x.projectId)?.code ?? 'Company overhead', Vendor: vendors.find(v => v.id === x.vendorId)?.name ?? '—', Date: x.invoiceDate, DueDate: x.dueDate, Amount: x.amount, Payable: x.outstandingAmount, Status: x.status }));
  else if (name === 'project-expense-detail' || name === 'company-overhead-detail') rows = bills.filter(x => name === 'project-expense-detail' ? x.kind === 'ProjectExpense' : x.kind === 'CompanyOverhead').map(x => ({ Project: projects.find(p => p.id === x.projectId)?.code ?? 'Company overhead', Date: x.invoiceDate, DueDate: x.dueDate, Vendor: vendors.find(v => v.id === x.vendorId)?.name ?? '—', Category: x.lines[0]?.categoryId, Amount: x.amount, Reference: x.reference }));
  else if (name === 'company-cash-flow') rows = [{ Date: '2026-10-01', Type: 'Cash inflow', Amount: 320000000 }, { Date: '2026-10-02', Type: 'Cash outflow', Amount: 150000000 }];
  else rows = projects.map(p => ({ Project: p.code, Name: p.name, Status: p.status, ContractValue: p.contractValue, BaselineAvailable: !!p.initialBudgetAvailable, Baseline: (budgets[p.id]?.baseline ?? []).reduce((s: number, x: any) => s + x.amount, 0), IncurredExpense: bills.filter(x => x.projectId === p.id && !x.isVoided).reduce((s, x) => s + x.amount, 0), Received: receipts.filter(x => x.projectId === p.id && !x.isVoided).reduce((s, x) => s + x.allocatedAmount, 0), Receivable: (terms[p.id] ?? []).reduce((s, x) => s + x.outstandingAmount, 0) }));
  return { title: name, generatedAtUtc: new Date().toISOString(), filters: {}, rows };
}
