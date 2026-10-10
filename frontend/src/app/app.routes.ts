import { Routes } from '@angular/router';
import { sessionGuard } from './core/auth';
export const routes: Routes = [
    {
        path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: '', canActivate: [sessionGuard], loadComponent: () => import('./features/dashboard/shell/shell.component').then(m => m.ShellComponent), children: [
            {
                path: 'sections', canDeactivate: [(component: {
                        canLeave: () => boolean;
                    }) => component.canLeave()], loadComponent: () => import('./features/sections/sections.component').then(m => m.SectionsComponent)
            },
            {
                path: 'overview', loadComponent: () => import('./features/dashboard/overview/overview.component').then(m => m.OverviewComponent)
            },
            {
                path: '', pathMatch: 'full', redirectTo: 'overview'
            },
        ]
    },
    {
        path: '**', redirectTo: 'overview'
    },
];
