import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title, Meta } from '@angular/platform-browser';
import { firstValueFrom, timeout } from 'rxjs';
import { LandingContent } from '../../core/content-models';
import { initialSections } from '../sections/models';
import defaults from '../../../../../dist/content-default.json';
import { HeroComponent } from './hero/hero.component';
import { FocusStripComponent } from './focus-strip/focus-strip.component';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { ProcessComponent } from './process/process.component';
import { ServicesComponent } from './services/services.component';
import { GlobeComponent } from './globe/globe.component';
import { InvitationComponent } from './invitation/invitation.component';
import { AboutComponent } from './about/about.component';
import { FaqComponent } from './faq/faq.component';
import { QuoteFormComponent } from './quote-form/quote-form.component';
@Component({ selector: 'aw-landing', imports: [HeroComponent, FocusStripComponent, PortfolioComponent, ProcessComponent, ServicesComponent, GlobeComponent, InvitationComponent, AboutComponent, FaqComponent, QuoteFormComponent], templateUrl: './landing.component.html', styleUrl: './landing.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class LandingComponent {
    private readonly http = inject(HttpClient);
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    readonly content = signal<LandingContent | null>(null);
    readonly message = signal('');
    readonly preview = signal(false);
    readonly menu = signal(false);
    readonly year = new Date().getFullYear();
    constructor() { void this.load(); }
    sections() { return this.content()?.sections ?? initialSections(); }
    active(id: string) { return this.sections().some(x => x.id === id) && (id !== 'conexoes' || Boolean(this.content()?.settings.globe)); }
    navigation() { const labels: Record<string, string> = { portfolio: 'Projetos', processo: 'Método', servicos: 'Soluções', sobre: 'Sobre', contato: 'Vamos conversar' }; return this.sections().filter(x => Boolean(labels[x.id])).map(x => ({ id: x.id, label: labels[x.id] })); }
    private async load() { const query = new URLSearchParams(location.search), historyId = query.get('history'); this.preview.set(query.get('preview') === '1' || Boolean(historyId)); try {
        const endpoint = historyId && /^\d+$/.test(historyId) ? '/api/admin/history/' + historyId : this.preview() ? '/api/admin/content' : '/api/content';
        const data = await firstValueFrom(this.http.get<{
            content?: LandingContent;
            draft?: LandingContent;
        }>(endpoint).pipe(timeout(5000)));
        const content = data.draft ?? data.content;
        if (!content)
            throw new Error('Conteúdo indisponível');
        this.apply(content);
    }
    catch {
        if (this.preview())
            this.message.set('Não foi possível abrir esta prévia. Entre no painel e tente novamente.');
        else {
            this.apply(defaults as LandingContent);
            this.message.set('Exibindo a versão de referência enquanto o conteúdo está indisponível.');
        }
    } }
    private apply(content: LandingContent) {
        // Correct legacy imported copy without changing text edited by the team.
        const legacyCopy: Record<string, string> = {
            'Um processo claro,do escopo à publicação.': 'Do planejamento à publicação.',
            'Cada etapa tem uma entrega.Cada entrega passa pela sua revisão.': 'Etapas definidas, com revisão em cada entrega.',
            'O que seu negócioprecisa fazer melhor?': 'Soluções para sua empresa.',
            'A solução depende da sua operação.Estas são algumas possibilidades.': 'Sites, sistemas e integrações para o dia a dia do negócio.',
            'Seu negócio.Sem fronteiras.': 'Seu negócio. Sem fronteiras.',
            'Vamos definir o quevale a pena construir.': 'Vamos planejar seu projeto.',
            'Exemplos visuais do que podemos desenvolver.Escolha um projeto para conhecer a proposta.': 'Explore as propostas de design e as funcionalidades de cada conceito.',
        };
        const displayContent: LandingContent = {
            ...content,
            blocks: Object.fromEntries(Object.entries(content.blocks).map(([key, value]) => [key, legacyCopy[value] ?? value])),
            portfolio: { ...content.portfolio, description: legacyCopy[content.portfolio.description] ?? content.portfolio.description },
        };
        this.content.set(displayContent); this.title.setTitle(content.settings.title); this.meta.updateTag({ name: 'description', content: content.settings.description }); }
}
