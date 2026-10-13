import { Injectable, inject, signal } from '@angular/core';
import { AdminPage } from '../../core/admin-page';
import { Config, ImportForm, Location, Prospect, SearchResponse } from './prospecting.models';
import { ProspectingService } from './prospecting.service';

@Injectable()
export class ProspectingPage extends AdminPage {
  private readonly service = inject(ProspectingService);
  readonly config = signal<Config>({categories:[],webEnabled:false,osmEnabled:true,googleEnabled:false});
  readonly locations = signal<Location[]>([]);
  readonly result = signal<SearchResponse|null>(null);
  readonly selected = signal<Prospect|null>(null);
  readonly saved = signal<Record<string,string>>({});
  provider: 'osm'|'web'|'google' = 'osm'; category = 'restaurant'; locality = 'Botafogo, Rio de Janeiro';
  locationIndex = ''; radius = 3; keyword = ''; contact = ''; site = '';
  form: ImportForm = {name:'',phone:'',email:'',website:'',service:'Site institucional'};
  appliedDescription = '';
  async initialize() { const config=await this.request(this.service.config());if(config)this.config.set(config); }
  async findLocation() {
    if(this.locality.trim().length<3){this.message.set('Informe um bairro e cidade ou uma cidade com UF.');return;}
    const data=await this.request(this.service.locations(this.locality));
    if(data){this.locations.set(data.items);this.locationIndex='';if(!data.items.length)this.message.set('Localidade não encontrada. Tente informar bairro, cidade e UF.');}
  }
  async search() {
    if(!this.canLeave())return;
    const location=this.locations()[Number(this.locationIndex)];
    if(this.locationIndex===''||!location){this.message.set('Localize e selecione a região antes de buscar negócios.');return;}
    const query={provider:this.provider,category:this.category,location,radius:Number(this.radius),keyword:this.keyword};
    const data=await this.request(this.service.search(query));
    if(data){this.contact='';this.site='';this.result.set(data);this.selected.set(null);this.clean();this.saved.set({});this.appliedDescription=this.config().categories.find(x=>x.id===query.category)?.label+' · '+location.name+(query.provider==='osm'?' · raio de '+query.radius+' km':'');this.message.set(data.items.length?'Busca concluída. Confira os resultados antes de salvar no CRM.':'Nenhum resultado nesta fonte. Tente outro segmento ou região.');}
  }
  visible() { return this.result()?.items.filter(x=>(!this.contact||(this.contact==='yes'?Boolean(x.phone||x.email):!x.phone&&!x.email))&&(!this.site||(this.site==='yes'?Boolean(x.website):!x.website)))??[]; }
  async details(prospect:Prospect) {
    if(!prospect.detailToken||prospect.detailsLoaded)return;
    const data=await this.request(this.service.googleDetails(prospect.detailToken));
    if(data){this.result.update(result=>result?{...result,items:result.items.map(item=>item.key===prospect.key?data.item:item)}:null);this.message.set('Detalhes consultados no Google Maps. E-mail não é fornecido por esta fonte.');}
  }
  review(prospect:Prospect) {
    if(prospect.source==='Google Maps')return;
    if(!this.canLeave())return;
    this.selected.set(prospect);this.form={name:prospect.name,phone:prospect.phone,email:prospect.email,website:prospect.website,service:'Site institucional'};this.clean();
  }
  close() {if(this.canLeave()){this.selected.set(null);this.clean();}}
  async save() {
    const selected=this.selected(),result=this.result();if(!selected||!result)return;
    const data=await this.request(this.service.save(result.searchId,selected.key,this.form));
    if(data){this.saved.update(x=>({...x,[selected.key]:data.id}));this.clean();this.selected.set(null);this.message.set(data.duplicate?'Este negócio já estava no CRM. Use Abrir no CRM para acessar a ficha.':'Novo lead salvo no CRM.');}
  }
}
