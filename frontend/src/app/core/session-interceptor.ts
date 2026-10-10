import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Auth } from './auth';
import { DraftState } from './draft-state';
export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
    const auth = inject(Auth), router = inject(Router), draft = inject(DraftState);
    return next(request.clone({ withCredentials: true })).pipe(catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401 && request.url.startsWith('/api/admin/') && router.url.startsWith('/painel')) {
            auth.profile.set(null);
            draft.pending.set(false);
            draft.working.set(false);
            void router.navigateByUrl('/painel/login');
        }
        return throwError(() => error);
    }));
};
