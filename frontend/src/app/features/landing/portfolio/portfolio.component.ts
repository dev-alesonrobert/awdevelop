import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { LandingContent } from '../../../core/content-models';
import { Project } from '../../../core/content-models';
import { DestroyRef, inject, viewChild, ElementRef } from '@angular/core';
@Component({ selector: 'aw-portfolio', imports: [], templateUrl: './portfolio.component.html', styleUrl: './portfolio.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class PortfolioComponent {
    readonly content = input.required<LandingContent>();
    readonly contactAvailable = input(true);
    readonly index = signal(0);
    readonly paused = signal(false);
    readonly hovering = signal(false);
    readonly chosen = signal<Project | null>(null);
    readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
    private readonly destroyRef = inject(DestroyRef);
    private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
    constructor() { this.paused.set(this.reduced.matches); const motion = (e: MediaQueryListEvent) => this.paused.set(e.matches); this.reduced.addEventListener('change', motion); let last = Date.now(); const rotation = setInterval(() => { if (Date.now() - last >= this.content().settings.rotationSeconds * 1000) {
        last = Date.now();
        if (!this.paused() && !this.hovering() && !this.chosen() && !document.hidden)
            this.move(1);
    } }, 1000); this.destroyRef.onDestroy(() => { clearInterval(rotation); this.reduced.removeEventListener('change', motion); }); }
    move(step: number) { const count = this.content().portfolio.projects.length; this.index.set((this.index() + step + count) % count); }
    open(project: Project) { this.chosen.set(project); this.dialog().nativeElement.showModal(); }
    close() { this.dialog().nativeElement.close(); this.chosen.set(null); }
}
