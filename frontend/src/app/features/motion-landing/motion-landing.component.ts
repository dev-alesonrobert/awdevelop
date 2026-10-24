import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title, Meta } from '@angular/platform-browser';
import { firstValueFrom, timeout } from 'rxjs';
import { LandingContent } from '../../core/content-models';
import defaults from '../../../../../dist/content-default.json';

type MountLanding = (element: HTMLElement, content: LandingContent, preview: boolean) => () => void;
@Component({
  selector: 'aw-motion-landing',
  template: '<div #surface></div>@if(message()){<p role="status" class="motion-status">{{message()}}</p>}',
  styles: [':host{display:block;min-height:100vh;background:#14161c}.motion-status{padding:20px;color:#fff;text-align:center}'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotionLandingComponent implements AfterViewInit {
  private readonly surface = viewChild.required<ElementRef<HTMLElement>>('surface');
  private readonly destroyRef = inject(DestroyRef);
  private readonly http = inject(HttpClient);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  readonly message = signal('');
  private unmount: (() => void) | undefined;
  constructor() { this.destroyRef.onDestroy(() => this.unmount?.()); }
  async ngAfterViewInit() {
    const query = new URLSearchParams(location.search);
    const history = query.get('history');
    const preview = query.get('preview') === '1' || !!history;
    let content: LandingContent;
    try {
      const endpoint = history && /^\d+$/.test(history) ? '/api/admin/history/' + history : preview ? '/api/admin/content' : '/api/content';
      const result = await firstValueFrom(this.http.get<{content?: LandingContent; draft?: LandingContent}>(endpoint).pipe(timeout(8000)));
      content = (result.draft ?? result.content)!;
      if (!content) throw new Error('Conteúdo indisponível');
    } catch {
      if (preview) { this.message.set('Entre no painel para visualizar este rascunho.'); return; }
      content = defaults as LandingContent;
    }
    if (this.destroyRef.destroyed) return;
    this.title.setTitle(content.settings.title);
    this.meta.updateTag({name: 'description', content: content.settings.description});
    try {
      const moduleUrl = '/assets/aw-motion.js';
      const module = await import(/* @vite-ignore */ moduleUrl) as {mountLanding: MountLanding};
      if (this.destroyRef.destroyed) return;
      this.unmount = module.mountLanding(this.surface().nativeElement, content, preview);
    } catch { this.message.set('Não foi possível abrir o site. Recarregue a página.'); }
  }
}
