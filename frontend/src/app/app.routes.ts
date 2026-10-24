import { Routes, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, sessionGuard } from './core/auth';
const commercialGuard: CanActivateFn = () => inject(Auth).profile()?.role !== 'editor' || inject(Router).createUrlTree(['/painel/overview']);
const ownerGuard: CanActivateFn = () => inject(Auth).profile()?.role === 'owner' || inject(Router).createUrlTree(['/painel/overview']);
const unsaved = (component: {
    canLeave: () => boolean;
}) => component.canLeave();
export const routes: Routes = [
    { path: 'termos', loadComponent: () => import('./features/legal/legal.component').then(m => m.LegalComponent) },
    { path: 'privacidade', data: {privacy:true}, loadComponent: () => import('./features/legal/legal.component').then(m => m.LegalComponent) },
    { path: '', pathMatch: 'full', loadComponent: () => import('./features/motion-landing/motion-landing.component').then(m => m.MotionLandingComponent) },
    { path: 'painel/login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
    { path: 'painel/setup', loadComponent: () => import('./features/auth/setup/setup.component').then(m => m.SetupComponent) },
    { path: 'admin/setup.html', loadComponent: () => import('./features/auth/setup/setup.component').then(m => m.SetupComponent) },
    { path: 'painel', canActivate: [sessionGuard], loadComponent: () => import('./features/dashboard/shell/shell.component').then(m => m.ShellComponent), children: [
            { path: 'meetings', canDeactivate: [unsaved], loadComponent: () => import('./features/meetings/meetings.component').then(m => m.MeetingsComponent) },
            { path: 'overview', loadComponent: () => import('./features/dashboard/overview/overview.component').then(m => m.OverviewComponent) },
            { path: 'sections', canDeactivate: [unsaved], loadComponent: () => import('./features/sections/sections.component').then(m => m.SectionsComponent) },
            { path: 'content', canDeactivate: [unsaved], loadComponent: () => import('./features/content/content/content.component').then(m => m.ContentComponent) },
            { path: 'media', canDeactivate: [unsaved], loadComponent: () => import('./features/media/media/media.component').then(m => m.MediaComponent) },
            { path: 'history', canDeactivate: [unsaved], loadComponent: () => import('./features/history/history/history.component').then(m => m.HistoryComponent) },
            { path: 'quotes', canActivate: [commercialGuard], canDeactivate: [unsaved], loadComponent: () => import('./features/quotes/quotes/quotes.component').then(m => m.QuotesComponent) },
            { path: 'prospecting', canActivate: [commercialGuard], canDeactivate: [unsaved], loadComponent: () => import('./features/prospecting/prospecting.component').then(m => m.ProspectingComponent) },
            { path: 'crm', canActivate: [commercialGuard], canDeactivate: [unsaved], loadComponent: () => import('./features/crm/crm/crm.component').then(m => m.CrmComponent) },
            { path: 'members', canActivate: [ownerGuard], canDeactivate: [unsaved], loadComponent: () => import('./features/members/members/members.component').then(m => m.MembersComponent) },
            { path: '', pathMatch: 'full', redirectTo: 'overview' }
        ] },
    { path: 'admin', redirectTo: 'painel/overview', pathMatch: 'full' },
    { path: 'login', redirectTo: 'painel/login' },
    { path: 'overview', redirectTo: 'painel/overview' },
    { path: 'sections', redirectTo: 'painel/sections' },
    { path: '**', redirectTo: '' }
];

