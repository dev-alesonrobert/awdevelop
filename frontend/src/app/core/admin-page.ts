import { Directive, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { Auth } from './auth';
import { DraftState } from './draft-state';
import { apiMessage } from './api';
/** Shared request lifecycle; each feature owns its own forms and data. */
@Directive()
export abstract class AdminPage {
    protected readonly http = inject(HttpClient);
    protected readonly destroyRef = inject(DestroyRef);
    protected readonly router = inject(Router);
    readonly auth = inject(Auth);
    readonly draftState = inject(DraftState);
    readonly busy = signal(false);
    readonly message = signal('');
    readonly dirty = signal(false);
    constructor() {
        this.destroyRef.onDestroy(() => {
            this.draftState.pending.set(false);
            this.draftState.working.set(false);
        });
    }
    changed() { this.dirty.set(true); this.draftState.pending.set(true); }
    clean() { this.dirty.set(false); this.draftState.pending.set(false); }
    async request<T>(operation: Observable<T>): Promise<T | undefined> {
        if (this.busy() || this.destroyRef.destroyed)
            return;
        this.busy.set(true);
        this.draftState.working.set(true);
        this.message.set('');
        try {
            const result = await firstValueFrom(operation);
            return this.destroyRef.destroyed ? undefined : result;
        }
        catch (error) {
            if (this.destroyRef.destroyed)
                return;
            if (error instanceof HttpErrorResponse && error.status === 401) {
                this.auth.profile.set(null);
                this.clean();
                void this.router.navigateByUrl('/painel/login');
            }
            else {
                const fields = error instanceof HttpErrorResponse && Array.isArray(error.error?.fields)
                    ? error.error.fields.map((x: {
                        path: string;
                        message: string;
                    }) => `${x.path}: ${x.message}`).join(' · ') : '';
                this.message.set(apiMessage(error) + (fields ? ' ' + fields : ''));
            }
            return undefined;
        }
        finally {
            if (!this.destroyRef.destroyed) {
                this.busy.set(false);
                this.draftState.working.set(false);
            }
        }
    }
    canLeave() {
        return !this.auth.profile() || (!this.busy() && (!this.dirty() || window.confirm('Descartar as alterações não salvas desta tela?')));
    }
    @HostListener('window:beforeunload', ['$event'])
    beforeUnload(event: BeforeUnloadEvent) {
        if (this.dirty() || this.busy()) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
