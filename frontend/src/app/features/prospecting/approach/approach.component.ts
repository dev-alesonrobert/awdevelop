import { ChangeDetectionStrategy, AfterViewInit, Component, ElementRef, OnDestroy, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Prospect } from '../prospecting.models';
import { ApproachMessages, ApproachResult, Offer } from './approach.models';
import { whatsapp } from '../../../core/commercial-models';

@Component({
  selector: 'aw-approach-editor',
  imports: [FormsModule],
  templateUrl: './approach.component.html',
  styleUrl: './approach.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApproachComponent implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private previousOverflow = '';
  readonly status = input('');

  ngAfterViewInit() {
    this.previousOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.dialog().nativeElement.showModal();
  }
  ngOnDestroy() { this.document.body.style.overflow = this.previousOverflow; }
  cancel(event: Event) {
    event.preventDefault();
    if (!this.busy()) this.closed.emit();
  }

  private offerBody(value: string) {
    // The model can still return a greeting despite the body-only instruction.
    return value.trim()
      .replace(/^(?:olá|oi|bom dia|boa tarde|boa noite)(?=[\s,!?.])[^.!?\n]*[.!?]\s*/iu, '')
      .replace(/^(?:eu\s+)?sou\s+[^.!?\n]{1,160}?\bAWDevelop[.!?]\s*/iu, '');
  }
  readonly prospect = input.required<Prospect>();
  readonly sender = input('Aleson Roberto');
  readonly aiEnabled = input(false);
  readonly busy = input(false);
  readonly canSave = input(false);
  readonly result = input<ApproachResult | null>(null);
  readonly generated = output<Offer>();
  readonly saved = output<ApproachMessages>();
  readonly changed = output<void>();
  readonly closed = output<void>();
  readonly feedback = signal('');
  form: Offer = { sender: '', service: 'sites e landing pages', benefit: 'apresentar seus serviços e facilitar novos contatos', objective: 'conversation', tone: 'natural', mode: 'template' };
  message = '';
  followup = '';

  constructor() {
    effect(() => { this.form.sender = this.sender(); });
    effect(() => {
      const result = this.result();
      const googleAI = result?.method === 'ai' && this.prospect().source === 'Google Maps';
      const company = this.prospect().name.replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
      this.message = googleAI
        ? `Olá, equipe da ${company}! Sou ${this.form.sender}, da AWDevelop.\n\n${this.offerBody(result.message)}`
        : result?.message ?? '';
      this.followup = googleAI
        ? `Olá, equipe da ${company}!\n\n${this.offerBody(result.followup)}`
        : result?.followup ?? '';
      this.feedback.set('');
    });
  }
  generate() { this.feedback.set(''); this.generated.emit({ ...this.form }); }
  async copy(kind: 'message' | 'followup') {
    try {
      await navigator.clipboard.writeText(this[kind]);
      this.feedback.set('Mensagem copiada. Revise antes de enviar.');
    } catch {
      this.feedback.set('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  }
  whatsappUrl() {
    const url = whatsapp(this.prospect().phone);
    return url ? url + '?text=' + encodeURIComponent(this.message) : '';
  }
}
