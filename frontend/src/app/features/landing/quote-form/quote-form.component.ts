import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { LandingContent } from '../../../core/content-models';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { inject, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiMessage } from '../../../core/api';
@Component({ selector: 'aw-quote-form', imports: [ReactiveFormsModule], templateUrl: './quote-form.component.html', styleUrl: './quote-form.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class QuoteFormComponent {
    readonly content = input.required<LandingContent>();
    private readonly http = inject(HttpClient);
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    readonly step = signal(0);
    readonly reviewing = signal(false);
    readonly busy = signal(false);
    readonly message = signal('');
    private requestId = crypto.randomUUID();
    private submitted: Record<string, unknown> | null = null;
    readonly form = this.fb.nonNullable.group({ service: ['', Validators.required], idea: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]], stage: ['', Validators.required], timeline: ['Ainda estou planejando'], company: ['', Validators.maxLength(200)], name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]], email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]], phone: ['', Validators.maxLength(40)], consent: [false, Validators.requiredTrue], website: ['', Validators.maxLength(200)] });
    readonly services = ['Site institucional', 'Landing page', 'Loja virtual', 'Sistema sob medida', 'Integração ou automação', 'Ainda quero entender as opções'];
    readonly situations = ['Quero começar do zero', 'Já tenho um layout ou protótipo', 'Quero melhorar um site ou sistema existente', 'Ainda estou avaliando a ideia'];
    next() { const keys = this.step() === 0 ? ['service', 'idea'] : ['stage', 'timeline', 'company']; if (keys.some(key => this.form.get(key)?.invalid)) {
        keys.forEach(key => this.form.get(key)?.markAsTouched());
        this.message.set('Preencha os campos desta etapa.');
        return;
    } this.message.set(''); this.step.update(x => Math.min(2, x + 1)); }
    review() { if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.message.set('Confira seus dados e a autorização de contato.');
        return;
    } this.reviewing.set(true); this.message.set(''); }
    back() { if (this.submitted)
        return; this.reviewing.set(false); }
    get canEdit() { return !this.submitted; }
    async send() { if (this.busy() || !this.reviewing() || this.form.invalid)
        return; this.busy.set(true); this.submitted ??= { ...this.form.getRawValue(), requestId: this.requestId }; try {
        await firstValueFrom(this.http.post('/api/quotes', this.submitted));
        if (this.destroyRef.destroyed)
            return;
        this.form.reset();
        this.requestId = crypto.randomUUID();
        this.submitted = null;
        this.step.set(0);
        this.reviewing.set(false);
        this.message.set('Solicitação recebida! Nossa equipe entrará em contato.');
    }
    catch (e) {
        if (!this.destroyRef.destroyed)
            this.message.set(apiMessage(e));
    }
    finally {
        this.busy.set(false);
    } }
}
