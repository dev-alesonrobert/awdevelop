import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiMessage } from '../../../core/api';
import { BrandComponent } from '../../../shared/brand/brand.component';
@Component({ selector: 'aw-setup', imports: [ReactiveFormsModule, RouterLink, BrandComponent], templateUrl: './setup.component.html', styleUrl: './setup.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class SetupComponent {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);
    private token = location.hash.slice(1);
    readonly busy = signal(false);
    readonly message = signal('');
    readonly available = signal(Boolean(this.token));
    readonly form = this.fb.nonNullable.group({ password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]], confirmPassword: ['', Validators.required] });
    constructor() { history.replaceState(null, '', location.pathname + location.search); if (!this.token)
        this.message.set('Abra o link completo do convite para configurar seu acesso.'); }
    async submit() { if (!this.token || this.busy() || this.form.invalid)
        return; const data = this.form.getRawValue(); if (data.password !== data.confirmPassword) {
        this.message.set('As senhas precisam ser iguais.');
        return;
    } this.busy.set(true); try {
        await firstValueFrom(this.http.post('/api/setup', { token: this.token, password: data.password, confirmation: data.confirmPassword }));
        this.token = '';
        this.form.reset();
        this.available.set(false);
        this.message.set('Senha criada. Entre no painel com o e-mail do convite.');
    }
    catch (e) {
        this.form.reset();
        this.message.set(apiMessage(e));
    }
    finally {
        this.busy.set(false);
    } }
}
