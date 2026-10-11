import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';
import { LandingContent } from '../../core/content-models';
import defaults from '../../../../../dist/content-default.json';
@Component({
    selector: 'aw-brand', templateUrl: './brand.component.html', styleUrl: './brand.component.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandComponent {
    readonly logo = signal(defaults.settings.logo);
    readonly brand = signal(defaults.settings.brand);

    constructor() {
        inject(HttpClient).get<{ content: LandingContent }>('/api/content')
            .pipe(timeout(5000), takeUntilDestroyed())
            .subscribe({
                next: ({ content }) => {
                    if (content?.settings.logo) this.logo.set(content.settings.logo);
                    if (content?.settings.brand) this.brand.set(content.settings.brand);
                },
                error: () => { /* Keep the same reference logo as the public site. */ }
            });
    }
}
