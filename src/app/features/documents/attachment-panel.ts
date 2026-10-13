import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AttachmentsService, AttachmentView } from './attachments.service';

@Component({
  selector: 'app-attachment-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './attachment-panel.html',
  styleUrl: './attachment-panel.scss',
})
export class AttachmentPanel implements OnChanges {
  @Input({ required: true }) targetType = '';
  @Input({ required: true }) targetId = '';
  @Input() owner = false;
  @Input() locked = false;
  @Input() finalized = false;
  @Input() closedPayment = false;

  protected readonly files = signal<AttachmentView[]>([]);
  protected readonly documentType = signal('Other');
  protected readonly reason = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly replacing = signal<string | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly previewUrl = signal<SafeResourceUrl | null>(null);
  protected readonly previewName = signal('');

  constructor(private readonly service: AttachmentsService, private readonly sanitizer: DomSanitizer) {}

  ngOnChanges(): void { this.load(); }
  protected load(): void {
    if (!this.targetId) return;
    this.service.list(this.targetType, this.targetId).subscribe({ next: value => this.files.set(value), error: () => this.error.set('Dokumen tidak dapat dimuat.') });
  }
  protected setFile(event: Event): void { this.selectedFile.set((event.target as HTMLInputElement).files?.[0] ?? null); }
  protected upload(): void {
    const file = this.selectedFile(); if (!file) { this.error.set('Pilih file lebih dahulu.'); return; }
    const replacing = this.replacing();
    if ((this.finalized || replacing) && !this.reason().trim()) { this.error.set('Alasan wajib untuk dokumen susulan atau replacement.'); return; }
    this.busy.set(true); this.error.set(null); this.notice.set(null);
    this.service.upload(this.targetType, this.targetId, this.documentType(), file, this.reason(), replacing ?? undefined).subscribe({
      next: () => { this.busy.set(false); this.selectedFile.set(null); this.replacing.set(null); this.reason.set(''); this.notice.set('Dokumen tersimpan.'); this.load(); },
      error: () => { this.busy.set(false); this.error.set('Upload gagal. Periksa format dan batas 10 MB.'); },
    });
  }
  protected replace(file: AttachmentView): void { this.replacing.set(file.id); this.error.set(null); }
  protected cancelReplace(): void { this.replacing.set(null); this.selectedFile.set(null); }
  protected download(file: AttachmentView): void {
    this.service.download(file.id).subscribe({ next: blob => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.originalFileName; link.click(); URL.revokeObjectURL(url); }, error: () => this.error.set('File tidak dapat diunduh.') });
  }
  protected preview(file: AttachmentView): void {
    this.service.download(file.id).subscribe({
      next: blob => { this.previewName.set(file.originalFileName); this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob))); },
      error: () => this.error.set('File tidak dapat ditampilkan.'),
    });
  }
  protected remove(file: AttachmentView): void {
    const reason = this.reason().trim(); if (!reason) { this.error.set('Isi alasan sebelum menghapus dokumen.'); return; }
    this.service.remove(file.id, reason).subscribe({ next: () => { this.reason.set(''); this.notice.set('Dokumen dihapus secara soft delete.'); this.load(); }, error: () => this.error.set('Dokumen tidak dapat dihapus.') });
  }
  protected active(): AttachmentView[] { return this.files().filter(file => !file.isSuperseded && !file.deletedAtUtc); }
  protected historical(): AttachmentView[] { return this.files().filter(file => file.isSuperseded || !!file.deletedAtUtc); }
  protected formatSize(size: number): string { return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`; }
}
