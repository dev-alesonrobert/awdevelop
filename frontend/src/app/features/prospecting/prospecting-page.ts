import { Injectable, inject, signal } from '@angular/core';
import { AdminPage } from '../../core/admin-page';
import { Config, ImportForm, Location, Prospect, SearchResponse } from './prospecting.models';
import { ProspectingService } from './prospecting.service';
import { opportunity } from './opportunity';
import { Board, stages } from '../../core/commercial-models';
import { CrmStatus } from './prospecting.models';
import { Offer, ApproachMessages, ApproachResult } from './approach/approach.models';
@Injectable()
export class ProspectingPage extends AdminPage {
    private readonly service = inject(ProspectingService);
    readonly config = signal<Config>({ categories: [], webEnabled: false, osmEnabled: true, googleEnabled: false });
    readonly locations = signal<Location[]>([]);
    readonly result = signal<SearchResponse | null>(null);
    readonly selected = signal<Prospect | null>(null);
    readonly saved = signal<Record<string, string>>({});
    readonly crmStatuses = signal<Record<string, CrmStatus>>({});
    readonly board = signal<Board>({ items: [], stats: [], next: null });
    readonly boardLoaded = signal(false);
    readonly approachProspect = signal<Prospect | null>(null);
    readonly approachResult = signal<ApproachResult | null>(null);
    readonly aiEnabled = signal(false);
    openApproach(prospect: Prospect) {
        if (!this.canLeave()) return;
        this.selected.set(null);
        this.approachProspect.set(prospect);
        this.approachResult.set(null);
        this.clean();
        this.message.set('');
    }
    closeApproach() {
        if (!this.canLeave()) return;
        this.approachProspect.set(null);
        this.approachResult.set(null);
        this.clean();
    }
    async generateApproach(offer: Offer) {
        const prospect = this.approachProspect(), result = this.result();
        if (!prospect || !result) return;
        const messages = await this.request(this.service.approach(result.searchId, prospect, offer));
        if (messages) { this.approachResult.set(messages); this.changed(); }
    }
    async saveApproach(messages: ApproachMessages) {
        const prospect = this.approachProspect();
        const id = prospect ? this.saved()[prospect.key] : null;
        if (!id) return;
        const result = await this.request(this.service.saveApproach(id, messages));
        if (result) { this.clean(); this.message.set('Rascunho salvo no histórico do CRM. Nenhuma mensagem foi enviada.'); }
    }
    view: 'search' | 'pipeline' = 'search';
    radar = '';
    sort = 'priority';
    readonly opportunity = opportunity;
    stageLabel(key: string) { return stages.find(stage => stage.id === this.crmStatuses()[key]?.stage)?.label ?? 'Consultar ficha'; }
    counts() { const items = this.result()?.items ?? []; return { total: items.length, high: items.filter(x => opportunity(x).level === 'high').length, pending: items.filter(x => opportunity(x).level === 'pending').length, saved: items.filter(x => Boolean(this.saved()[x.key])).length }; }
    async refreshStatuses() {
        const keys = (this.result()?.items ?? []).filter(x => x.source !== 'Google Maps').map(x => x.key);
        const items: CrmStatus[] = [];
        for (let offset = 0; offset < keys.length; offset += 100) {
            const data = await this.request(this.service.statuses(keys.slice(offset, offset + 100)));
            if (!data)
                return;
            items.push(...data.items);
        }
        this.crmStatuses.set(Object.fromEntries(items.map(x => [x.key, x])));
        this.saved.update(current => ({ ...current, ...Object.fromEntries(items.map(x => [x.key, x.id])) }));
    }
    async showPipeline() { if (!this.canLeave())
        return; this.view = 'pipeline'; this.boardLoaded.set(false); const data = await this.request(this.service.pipeline()); if (data) {
        this.board.set(data);
        this.boardLoaded.set(true);
    } }
    openLead(id: string) { if (this.canLeave())
        void this.router.navigate(['/painel/crm'], { queryParams: { lead: id } }); }
    provider: 'osm' | 'web' | 'google' = 'osm';
    category = 'restaurant';
    locality = 'Botafogo, Rio de Janeiro';
    locationIndex = '';
    radius = 3;
    keyword = '';
    contact = '';
    site = '';
    form: ImportForm = { name: '', phone: '', email: '', website: '', service: 'Site institucional' };
    appliedDescription = '';
    async initialize() {
        const config = await this.request(this.service.config());
        if (config) this.config.set(config);
        const approach = await this.request(this.service.approachConfig());
        if (approach) this.aiEnabled.set(approach.aiEnabled);
    }
    async findLocation() {
        if (this.locality.trim().length < 3) {
            this.message.set('Informe um bairro e cidade ou uma cidade com UF.');
            return;
        }
        const data = await this.request(this.service.locations(this.locality));
        if (data) {
            this.locations.set(data.items);
            this.locationIndex = '';
            if (!data.items.length)
                this.message.set('Localidade não encontrada. Tente informar bairro, cidade e UF.');
        }
    }
    async search() {
        if (!this.canLeave())
            return;
        const location = this.locations()[Number(this.locationIndex)];
        if (this.locationIndex === '' || !location) {
            this.message.set('Localize e selecione a região antes de buscar negócios.');
            return;
        }
        const query = { provider: this.provider, category: this.category, location, radius: Number(this.radius), keyword: this.keyword };
        const data = await this.request(this.service.search(query));
        if (data) {
            this.contact = '';
            this.site = '';
            this.radar = '';
            this.result.set(data);
            this.approachProspect.set(null);
            this.approachResult.set(null);
            this.selected.set(null);
            this.clean();
            this.saved.set({});
            this.crmStatuses.set({});
            this.appliedDescription = this.config().categories.find(x => x.id === query.category)?.label + ' · ' + location.name + (query.provider === 'osm' ? ' · raio de ' + query.radius + ' km' : '');
            await this.refreshStatuses();
            if (this.message())
                return;
            this.message.set(data.items.length ? 'Busca concluída. Confira os resultados antes de salvar no CRM.' : 'Nenhum resultado nesta fonte. Tente outro segmento ou região.');
        }
    }
    visible() {
        const items = (this.result()?.items ?? []).filter(x => (!this.contact || (this.contact === 'yes' ? Boolean(x.phone || x.email) : !(x.source === 'Google Maps' && !x.detailsLoaded) && !x.phone && !x.email)) &&
            (!this.site || (this.site === 'yes' ? Boolean(x.website) : !(x.source === 'Google Maps' && !x.detailsLoaded) && !x.website)) &&
            (!this.radar || (this.radar === 'saved' ? Boolean(this.saved()[x.key]) : this.radar === 'new' ? !this.saved()[x.key] : opportunity(x).level === this.radar)));
        return [...items].sort((a, b) => this.sort === 'name' ? a.name.localeCompare(b.name, 'pt-BR') : this.sort === 'source' ? a.source.localeCompare(b.source) : ((opportunity(b).score ?? -1) - (opportunity(a).score ?? -1)) || a.name.localeCompare(b.name, 'pt-BR'));
    }
    async details(prospect: Prospect) {
        if (!prospect.detailToken || prospect.detailsLoaded)
            return;
        const data = await this.request(this.service.googleDetails(prospect.detailToken));
        if (data) {
            this.result.update(result => result ? { ...result, items: result.items.map(item => item.key === prospect.key ? data.item : item) } : null);
            this.message.set('Detalhes consultados no Google Maps. E-mail não é fornecido por esta fonte.');
        }
    }
    review(prospect: Prospect) {
        if (prospect.source === 'Google Maps')
            return;
        if (!this.canLeave())
            return;
        this.approachProspect.set(null);
        this.approachResult.set(null);
        this.selected.set(prospect);
        this.form = { name: prospect.name, phone: prospect.phone, email: prospect.email, website: prospect.website, service: 'Site institucional' };
        this.clean();
    }
    close() { if (this.canLeave()) {
        this.selected.set(null);
        this.clean();
    } }
    async save() {
        const selected = this.selected(), result = this.result();
        if (!selected || !result)
            return;
        const data = await this.request(this.service.save(result.searchId, selected.key, this.form));
        if (data) {
            this.saved.update(x => ({ ...x, [selected.key]: data.id }));
            await this.refreshStatuses();
            this.boardLoaded.set(false);
            this.clean();
            this.selected.set(null);
            this.message.set(data.duplicate ? 'Este negócio já estava no CRM. Use Abrir no CRM para acessar a ficha.' : 'Novo lead salvo no CRM.');
        }
    }
}
