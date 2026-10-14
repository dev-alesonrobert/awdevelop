import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
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
export class ApproachComponent {
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
      this.message = result?.message ?? '';
      this.followup = result?.followup ?? '';
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
