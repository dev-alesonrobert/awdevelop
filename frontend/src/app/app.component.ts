import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
@Component({
    selector: 'aw-root', imports: [RouterOutlet], templateUrl: './app.component.html', styleUrl: './app.component.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
    constructor() {
        const router = inject(Router), meta = inject(Meta);
        router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed()).subscribe(event => {
            const url = event.urlAfterRedirects;
            const query = router.parseUrl(url).queryParams;
            const privatePage = url.startsWith('/painel') || url.startsWith('/admin') || query['preview'] === '1' || Boolean(query['history']);
            meta.updateTag({ name: 'robots', content: privatePage ? 'noindex,nofollow' : 'index,follow' });
        });
    }
}
