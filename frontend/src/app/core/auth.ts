import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Profile, Session } from './models';
@Injectable({
    providedIn: 'root'
})
export class Auth {
    private readonly http = inject(HttpClient);
    readonly profile = signal<Profile | null>(null);
    async refresh() {
        try {
            const session = await firstValueFrom(this.http.get<Session | null>('/api/auth/get-session'));
            if (!session?.user) {
                this.profile.set(null);
                return null;
            }
            const profile = await firstValueFrom(this.http.get<Profile>('/api/admin/me'));
            this.profile.set(profile);
            return profile;
        }
        catch (e) {
            this.profile.set(null);
            throw e;
        }
    }
    async signIn(email: string, password: string) {
        await firstValueFrom(this.http.post('/api/auth/sign-in/email', {
            email, password
        }));
        return this.refresh();
    }
    async signOut() {
        await firstValueFrom(this.http.post('/api/auth/sign-out', {}));
        this.profile.set(null);
    }
}
export const sessionGuard: CanActivateFn = async () => {
    const auth = inject(Auth), router = inject(Router);
    try {
        return await auth.refresh() ? true : router.createUrlTree(['/painel/login']);
    }
    catch {
        return router.createUrlTree(['/painel/login'], {
            queryParams: {
                reason: 'session'
            }
        });
    }
};
