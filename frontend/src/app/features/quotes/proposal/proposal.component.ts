import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import type { Quote } from '../../../core/commercial-models';
import { initialProposal, localDate, proposalError, type ProposalDraft } from './proposal.models';

@Component({
  selector: 'aw-proposal', imports: [FormsModule], templateUrl: './proposal.component.html',
  styleUrl: './proposal.component.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProposalComponent {
  readonly quote = input.required<Quote>();
  readonly disabled = input(false);
  readonly pendingChange = output<boolean>();
  readonly workingChange = output<boolean>();
  readonly expanded = signal(false);
  readonly generating = signal(false);
  readonly message = signal('');
  readonly preview = signal<SafeResourceUrl | null>(null);
  readonly today = localDate();
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroy = inject(DestroyRef);
  private quoteId = '';
  private url = '';
  draft: ProposalDraft = { client: '', company: '', title: '', scope: '', deadline: '', amount: null, conditions: '', validUntil: '' };

  constructor() {
    effect(() => {
      const quote = this.quote();
      if (quote.id === this.quoteId) return;
      this.quoteId = quote.id; this.draft = initialProposal(quote);
      this.expanded.set(false); this.message.set(''); this.clearPreview();
    });
    this.destroy.onDestroy(() => this.clearPreview());
  }

  changed() {
    this.clearPreview(); this.message.set(''); this.pendingChange.emit(true);
  }

  private clearPreview() {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = ''; this.preview.set(null);
  }

  async visualize() {
    if (this.disabled() || this.generating()) return;
    const error = proposalError(this.draft);
    if (error) { this.message.set(error); return; }
    this.generating.set(true); this.workingChange.emit(true); this.message.set('');
    const draft = structuredClone(this.draft);
    try {
      const { createProposalPdf } = await import('./proposal-document');
      const bytes = await createProposalPdf(draft, this.quoteId);
      if (this.destroy.destroyed) return;
      this.clearPreview();
      this.url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      this.preview.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.url));
      this.message.set('Confira a prévia e baixe o documento.');
    } catch (error) {
      if (!this.destroy.destroyed) this.message.set(error instanceof Error ? error.message : 'Não foi possível gerar a proposta. Tente novamente.');
    } finally {
      if (!this.destroy.destroyed) { this.generating.set(false); this.workingChange.emit(false); }
    }
  }

  download() {
    if (!this.url || this.generating() || this.disabled()) return;
    const link = document.createElement('a');
    link.href = this.url; link.download = `proposta-awdevelop-Q${this.quoteId}.pdf`;
    document.body.appendChild(link); link.click(); link.remove();
    this.pendingChange.emit(false); this.message.set('Download solicitado. Guarde o PDF antes de sair desta tela.');
  }
}
