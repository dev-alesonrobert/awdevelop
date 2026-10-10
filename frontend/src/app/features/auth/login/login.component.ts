import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../../core/auth';
import { apiMessage } from '../../../core/api';
import { BrandComponent } from '../../../shared/brand/brand.component';
@Component({
    selector: 'aw-login', imports: [ReactiveFormsModule, BrandComponent], templateUrl: './login.component.html', styleUrl: './login.component.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
    private readonly auth = inject(Auth);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);
    readonly busy = signal(false);
    readonly message = signal('');
    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]], password: ['', Validators.required]
    });
    async submit() {
        if (this.busy() || this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.busy.set(true);
        this.message.set('');
        try {
            const { email, password } = this.form.getRawValue();
            const profile = await this.auth.signIn(email.trim(), password);
            this.form.controls.password.reset('');
            if (profile)
                await this.router.navigateByUrl('/painel/overview');
            else
                this.message.set('Sua conta não possui acesso ativo.');
        }
        catch (e) {
            this.form.controls.password.reset('');
            this.message.set(apiMessage(e));
        }
        finally {
            this.busy.set(false);
        }
    }
}
