import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, Observable, take } from 'rxjs';
import { BusinessMaster, BusinessService, ExpenseCategory, ExpenseSubcategory } from './business.service';
import { PageHeader } from '../../shared/components/page-header';
import { Alert } from '../../shared/components/alert';
import { StatusBadge } from '../../shared/components/status-badge';

type Tab = 'customers' | 'vendors' | 'categories';
type MasterType = 'customer' | 'vendor' | 'category' | 'subcategory';

@Component({
  selector: 'app-business-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeader, Alert, StatusBadge],
  templateUrl: './business-page.html',
  styleUrl: './business-page.scss',
})
export class BusinessPage implements OnInit {
  private readonly forms = inject(FormBuilder).nonNullable;
  private readonly service = inject(BusinessService);

  protected readonly tab = signal<Tab>('customers');
  protected readonly customers = signal<BusinessMaster[]>([]);
  protected readonly vendors = signal<BusinessMaster[]>([]);
  protected readonly categories = signal<ExpenseCategory[]>([]);
  protected readonly subcategories = signal<ExpenseSubcategory[]>([]);
  protected readonly editing = signal<{ type: MasterType; id: string } | null>(null);
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly form = this.forms.group({
    code: [''], name: ['', [Validators.required, Validators.maxLength(200)]], customerId: [''],
    contractValue: [''], address: [''], contact: [''], identityNumber: [''],
    type: ['ProjectExpense' as 'ProjectExpense' | 'CompanyOverhead'], categoryId: [''],
  });

  ngOnInit(): void { this.load(); }

  protected selectTab(tab: Tab): void { this.tab.set(tab); this.cancelEdit(); }

  protected load(): void {
    this.loading.set(true);
    forkJoin({
      customers: this.service.listCustomers(), vendors: this.service.listVendors(),
      categories: this.service.listCategories(), subcategories: this.service.listSubcategories(),
    }).pipe(take(1)).subscribe({
      next: data => {
        this.customers.set(data.customers); this.vendors.set(data.vendors);
        this.categories.set(data.categories); this.subcategories.set(data.subcategories); this.loading.set(false);
      }, error: error => this.fail(error),
    });
  }

  protected startCreate(type: MasterType): void {
    this.editing.set({ type, id: '' });
    this.form.reset({ code: '', name: '', customerId: '', contractValue: '', address: '', contact: '', identityNumber: '', type: 'ProjectExpense', categoryId: '' });
    this.form.controls.categoryId.setValidators(type === 'subcategory' ? [Validators.required] : []);
    if (type === 'customer') this.tab.set('customers');
    if (type === 'vendor') this.tab.set('vendors');
    if (type === 'category' || type === 'subcategory') this.tab.set('categories');
  }

  protected editCustomer(item: BusinessMaster): void { this.startEdit('customer', item.id, item); }
  protected editVendor(item: BusinessMaster): void { this.startEdit('vendor', item.id, item); }
  protected editCategory(item: ExpenseCategory): void { this.startEdit('category', item.id, item); }
  protected editSubcategory(item: ExpenseSubcategory): void { this.startEdit('subcategory', item.id, item); }
  protected save(): void {
    const target = this.editing();
    if (!target) return;
    this.error.set(null); this.notice.set(null);
    if (this.form.controls.name.invalid) {
      this.form.markAllAsTouched(); this.error.set('Lengkapi data wajib sebelum menyimpan.'); return;
    }
    const value = this.form.getRawValue();
    this.busy.set(true);
    let request: Observable<unknown>;
    if (target.type === 'customer' || target.type === 'vendor') {
      const input = { name: value.name, address: value.address || null, contact: value.contact || null, identityNumber: value.identityNumber || null };
      request = target.type === 'customer'
        ? target.id ? this.service.updateCustomer(target.id, input) : this.service.createCustomer(input)
        : target.id ? this.service.updateVendor(target.id, input) : this.service.createVendor(input);
    } else if (target.type === 'category') {
      request = target.id ? this.service.updateCategory(target.id, value.name, true) : this.service.createCategory(value.name, value.type);
    } else {
      request = target.id ? this.service.updateSubcategory(target.id, value.name, true) : this.service.createSubcategory(value.categoryId, value.name);
    }
    request.pipe(take(1)).subscribe({
      next: result => {
        this.busy.set(false);
        const hasSimilarName = typeof result === 'object' && result !== null && 'similarNameWarning' in result && result.similarNameWarning === true;
        this.notice.set(hasSimilarName ? 'Data tersimpan. Nama serupa sudah ada; periksa kemungkinan duplikasi.' : 'Data berhasil disimpan.');
        this.cancelEdit(); this.load();
      },
      error: error => this.fail(error),
    });
  }

  protected changeActive(type: 'customer' | 'vendor' | 'category' | 'subcategory', item: BusinessMaster | ExpenseCategory | ExpenseSubcategory): void {
    this.busy.set(true); this.error.set(null); this.notice.set(null);
    const active = !item.isActive;
    const request: Observable<unknown> = type === 'customer' ? this.service.setCustomerActive(item.id, active)
      : type === 'vendor' ? this.service.setVendorActive(item.id, active)
      : type === 'category' ? this.service.updateCategory(item.id, item.name, active)
      : this.service.updateSubcategory(item.id, item.name, active);
    request.pipe(take(1)).subscribe({ next: () => { this.busy.set(false); this.notice.set('Status master data diperbarui.'); this.load(); }, error: error => this.fail(error) });
  }

  protected cancelEdit(): void { this.editing.set(null); this.form.reset(); }
  protected categoryName(id: string): string { return this.categories().find(item => item.id === id)?.name ?? 'Kategori tidak ditemukan'; }
  protected customerName(id: string): string { return this.customers().find(item => item.id === id)?.name ?? 'Customer tidak ditemukan'; }

  private startEdit(type: MasterType, id: string, item: BusinessMaster | ExpenseCategory | ExpenseSubcategory): void {
    this.editing.set({ type, id });
    this.form.controls.categoryId.setValidators(type === 'subcategory' ? [Validators.required] : []);
    this.form.reset({ code: '', name: item.name, customerId: '', contractValue: '', address: 'address' in item ? item.address ?? '' : '', contact: 'contact' in item ? item.contact ?? '' : '', identityNumber: 'identityNumber' in item ? item.identityNumber ?? '' : '', type: 'type' in item ? item.type : 'ProjectExpense', categoryId: 'categoryId' in item ? item.categoryId : '' });
  }

  private fail(error: unknown): void {
    this.busy.set(false); this.loading.set(false);
    this.error.set(error instanceof Error ? error.message : 'Permintaan gagal. Coba lagi.');
  }
}
