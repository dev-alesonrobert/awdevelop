const $=selector=>document.querySelector(selector);
let model, revision=0, publishedRevision=0, dirty=false, busy=false, uploads=0;
const names={home:'Início',portfolio:'Portfólio',contact:'Contato',settings:'Configurações',history:'Histórico',media:'Imagens',quotes:'Orçamentos',members:'Administradores',crm:'CRM'};
let profile,autoTimer,autoPaused=false;const tabId=crypto.randomUUID();let presenceTimer,notificationTimer,notificationPending=false,notificationData={count:0,latest:"0",items:[]},notificationGeneration=0;
async function api(path,options={}){
  const response=await fetch(path,{credentials:'same-origin',...options});
  const body=await response.json().catch(()=>({error:'O servidor não respondeu. Tente novamente.'}));
  if(!response.ok){if(response.status===401&&path.includes('/admin/'))showLogin();const error=new Error(body.error||'Não foi possível concluir.');error.fields=body.fields;throw error;}
  return body;
}
function notice(message,error=false){$('#notice').textContent=message;$('#notice').classList.toggle('error',error);}
function updateStatus(){
  $('#editor-form').inert=busy;
  $('#logout').disabled=busy||uploads>0;
  $('#save-state').textContent=dirty?'Alterações não salvas':'Rascunho salvo';
  $('#revision-label').textContent=revision===publishedRevision?'O rascunho corresponde ao site publicado':`Rascunho ${revision} · Site publicado na revisão ${publishedRevision}`;
  for(const id of ['save','publish','add-project'])$('#'+id).disabled=busy||uploads>0;
  $('#publish').disabled ||= dirty||revision===publishedRevision;
}
function markDirty(){dirty=true;updateStatus();clearTimeout(autoTimer);if($('#autosave').checked&&!autoPaused)autoTimer=setTimeout(()=>{if(dirty&&!busy&&!uploads&&$('#workspace').hidden===false)$('#save').click();},3000);}
function showTab(tab){document.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!==tab);document.querySelectorAll('[data-tab]').forEach(button=>{button.classList.toggle('active',button.dataset.tab===tab);button.setAttribute('aria-current',button.dataset.tab===tab?'page':'false');});$('#page-title').textContent=names[tab];document.querySelector('.toolbar').hidden=!['home','portfolio','contact','settings'].includes(tab);if(tab==='crm')window.crmLoad?.();if(['history','media','quotes','members'].includes(tab))loadManagement(tab).catch(e=>notice(e.message,true));}
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>showTab(button.dataset.tab)));
function showLogin(){window.crmClear?.();stopNotifications();clearTimeout(autoTimer);clearInterval(presenceTimer);for(const id of ['quote-items','member-items','history-items','media-items'])$('#'+id).replaceChildren();$('#invite-url').value='';$('#invite-result').hidden=true;$('#workspace').hidden=true;$('#login').hidden=false;}
function getPath(path){return path.split('.').reduce((value,key)=>value[key],model);}
function setPath(path,value){const keys=path.split('.');const last=keys.pop();const parent=keys.reduce((v,k)=>v[k],model);parent[last]=value;}
function readFields(){document.querySelectorAll('[data-path]').forEach(field=>setPath(field.dataset.path,field.type==='checkbox'?field.checked:field.type==='number'?Number(field.value):field.value));}
function bindFields(){document.querySelectorAll('[data-path]').forEach(field=>{const value=getPath(field.dataset.path);if(field.type==='checkbox')field.checked=value;else field.value=value;});}
function input(label,path,{textarea=false,type='text',required=false,limit=4000}={}){
  const wrap=document.createElement('label');wrap.append(document.createTextNode(label));
  const field=document.createElement(textarea?'textarea':'input');if(!textarea)field.type=type;else field.rows=3;
  field.dataset.path=path;field.required=required;field.maxLength=limit;wrap.append(field);return wrap;
}
function imageField(path,label){
  const row=document.createElement('div');row.className='image-row';const image=document.createElement('img');image.src=getPath(path).startsWith('assets/')?'/'+getPath(path):getPath(path);image.alt=label;
  const controls=document.createElement('div');controls.append(input('URL da imagem',path,{required:true,limit:2048}));
  const uploadLabel=document.createElement('label');uploadLabel.textContent='Enviar imagem · PNG, JPG ou WebP, até 4 MB';const file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';uploadLabel.append(file);controls.append(uploadLabel);const choose=document.createElement('button');choose.type='button';choose.className='secondary';choose.textContent='Escolher da biblioteca';choose.addEventListener('click',()=>openMediaPicker(url=>{setPath(path,url);controls.querySelector('[data-path]').value=url;image.src=assetURL(url);markDirty();}));controls.append(choose);
  controls.querySelector('[data-path]').addEventListener('change',event=>{const url=event.target.value;if(/^assets\/[a-zA-Z0-9_.-]+$/.test(url)||/^https:\/\//.test(url))image.src=url.startsWith('assets/')?'/'+url:url;});
  file.addEventListener('change',async()=>{
    const selected=file.files[0];if(!selected)return;
    if(!['image/png','image/jpeg','image/webp'].includes(selected.type)||selected.size>4*1024*1024){notice('Escolha uma imagem PNG, JPG ou WebP de até 4 MB.',true);file.value='';return;}
    uploads++;updateStatus();file.disabled=true;notice('Enviando imagem…');
    try{const {url}=await api('/api/admin/upload',{method:'POST',headers:{'Content-Type':selected.type},body:selected});setPath(path,url);controls.querySelector('[data-path]').value=url;image.src=url.startsWith('assets/')?'/'+url:url;markDirty();notice('Imagem enviada. Salve o rascunho para incluir a alteração.');}
    catch(error){notice(error.message,true);}finally{uploads--;file.disabled=false;file.value='';updateStatus();}
  });row.append(image,controls);return row;
}
function renderProjects(){
  $('#projects').replaceChildren();
  model.portfolio.projects.forEach((project,index)=>{
    const base=`portfolio.projects.${index}`;const card=document.createElement('article');card.className='card';
    const top=document.createElement('div');top.className='project-top';const title=document.createElement('h3');title.textContent=`${String(index+1).padStart(2,'0')} / ${project.title}`;
    const controls=document.createElement('div');controls.className='project-controls';
    for(const [label,action,disabled] of [['↑',()=>moveProject(index,-1),index===0],['↓',()=>moveProject(index,1),index===model.portfolio.projects.length-1],['Remover',()=>removeProject(index),model.portfolio.projects.length===1]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=disabled;button.setAttribute('aria-label',label==='↑'?'Mover projeto para cima':label==='↓'?'Mover projeto para baixo':'Remover '+project.title);button.addEventListener('click',action);controls.append(button);}
    top.append(title,controls);card.append(top,imageField(base+'.image',project.title));
    for(const [label,key,options] of [['Nome do projeto','title',{required:true,limit:200}],['Categoria','category',{required:true,limit:200}],['Resumo do banner','summary',{textarea:true}],['Descrição completa','description',{textarea:true}],['Descrição da imagem (acessibilidade)','alt',{required:true,limit:200}],['Link do projeto (opcional)','url',{type:'url',limit:2048}]])card.append(input(label,base+'.'+key,options));
    const tagLabel=document.createElement('label');tagLabel.textContent='Tags, separadas por vírgula';const tags=document.createElement('input');tags.value=project.tags.join(', ');tags.maxLength=800;tags.dataset.tags=String(index);tagLabel.append(tags);card.append(tagLabel);
    const check=document.createElement('label');check.className='check';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.dataset.path=base+'.concept';check.append(checkbox,document.createTextNode('Projeto conceitual / marca fictícia'));card.append(check);$('#projects').append(card);
  });bindFields();
}
function readAll(){readFields();document.querySelectorAll('[data-tags]').forEach(field=>{model.portfolio.projects[Number(field.dataset.tags)].tags=field.value.split(',').map(x=>x.trim()).filter(Boolean);});}
function moveProject(index,direction){if(uploads)return;readAll();const to=index+direction;[model.portfolio.projects[index],model.portfolio.projects[to]]=[model.portfolio.projects[to],model.portfolio.projects[index]];renderProjects();markDirty();}
function removeProject(index){if(uploads)return;readAll();if(!confirm(`Remover “${model.portfolio.projects[index].title}” do rascunho? A alteração só irá ao site depois de publicar.`))return;model.portfolio.projects.splice(index,1);renderProjects();markDirty();}
$('#add-project').addEventListener('click',()=>{
  readAll();if(model.portfolio.projects.length>=20)return notice('O portfólio pode ter até 20 projetos.',true);
  model.portfolio.projects.push({id:crypto.randomUUID(),title:'Novo projeto',category:'SITE INSTITUCIONAL',summary:'',description:'',image:'assets/forma.webp',alt:'Prévia do novo projeto',tags:[],concept:true,url:''});renderProjects();markDirty();$('#projects').lastElementChild.scrollIntoView({behavior:'smooth',block:'start'});
});
function renderBlocks(){
  $('#blocks').replaceChildren();
  const groups=new Map();
  for(const [key,value] of Object.entries(model.blocks)){
    const group=key.split('-')[0];let details=groups.get(group);
    if(!details){details=document.createElement('details');details.className='block-group';const summary=document.createElement('summary');summary.textContent={metodo:'Método',solucoes:'Soluções',sobre:'Sobre a empresa',duvidas:'Dúvidas frequentes',globo:'Globo e conexões',convite:'Convite para contato'}[group]||group;details.append(summary);groups.set(group,details);$('#blocks').append(details);}
    details.append(input(key.replaceAll('-',' '),'blocks.'+key,{textarea:true}));
  }
}
async function loadEditor(){
  profile=await api('/api/admin/me');document.querySelectorAll('[data-owner]').forEach(el=>el.hidden=profile.role!=='owner');document.querySelectorAll('[data-publisher]').forEach(el=>el.hidden=profile.role==='editor');$('#publish').hidden=profile.role==='editor';
  const data=await api('/api/admin/content');model=data.draft;revision=data.revision;publishedRevision=data.published_revision;
  renderBlocks();renderProjects();$('#logo-field').replaceChildren(imageField('settings.logo','Logo da empresa'));bindFields();dirty=false;autoPaused=false;updateStatus();$('#login').hidden=true;$('#workspace').hidden=false;clearInterval(presenceTimer);const requested=new URLSearchParams(location.search).get('section');showTab(requested&&names[requested]&&!(profile.role==='editor'&&['crm','quotes'].includes(requested))&&!(profile.role!=='owner'&&requested==='members')?requested:'home');presencePing();presenceTimer=setInterval(presencePing,25000);startNotifications();
}
$('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const formElement=event.currentTarget;const button=formElement.querySelector('button');button.disabled=true;$('#login-status').textContent='';
  try{const form=new FormData(formElement);await api('/api/auth/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})});formElement.reset();await loadEditor();}
  catch{$('#login-status').textContent='Não foi possível entrar. Confira seus dados e tente novamente.';}finally{button.disabled=false;}
});
$('#logout').addEventListener('click',async()=>{if(dirty&&!confirm('Sair e descartar as alterações que ainda não foram salvas?'))return;try{await api('/api/admin/presence/'+tabId,{method:'DELETE'}).catch(()=>{});await api('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});dirty=false;model=null;$('#editor-form').reset();$('#projects').replaceChildren();$('#quote-items').replaceChildren();$('#invite-url').value='';showLogin();}catch(error){notice(error.message,true);}});
$('#editor-form').addEventListener('input',markDirty);$('#editor-form').addEventListener('submit',event=>event.preventDefault());
function validate(){const invalid=[...$('#editor-form').querySelectorAll('input,textarea')].find(field=>!field.checkValidity());if(invalid){showTab(invalid.closest('[data-panel]').dataset.panel);const details=invalid.closest('details');if(details)details.open=true;invalid.reportValidity();return false;}return true;}
$('#save').addEventListener('click',async()=>{
  if(busy||uploads)return;clearTimeout(autoTimer);if(!validate()){autoPaused=true;notice('Confira os campos obrigatórios. O salvamento automático está pausado.',true);return;}readAll();busy=true;updateStatus();notice('Salvando rascunho…');
  try{const data=await api('/api/admin/content',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,content:model})});revision=data.revision;publishedRevision=data.published_revision;dirty=false;autoPaused=false;notice('Rascunho salvo. Você já pode abrir a prévia.');}
  catch(error){autoPaused=true;notice('Salvamento automático pausado. '+error.message+(error.fields?.length?' '+error.fields.map(x=>x.path+': '+x.message).join(' · '):''),true);}finally{busy=false;updateStatus();}
});
$('#preview').addEventListener('click',event=>{if(dirty||uploads||busy){event.preventDefault();notice('Salve o rascunho antes de abrir a prévia.',true);}});
$('#publish').addEventListener('click',()=>{if(dirty||busy||uploads)return;$('#publish-dialog').showModal();});
$('#cancel-publish').addEventListener('click',()=>$('#publish-dialog').close());
$('#confirm-publish').addEventListener('click',async()=>{
  busy=true;$('#confirm-publish').disabled=true;updateStatus();
  try{const data=await api('/api/admin/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision})});publishedRevision=data.published_revision;$('#publish-dialog').close();notice('Alterações publicadas. O site já exibe o novo conteúdo.');}
  catch(error){$('#publish-dialog').close();notice(error.message,true);}finally{busy=false;$('#confirm-publish').disabled=false;updateStatus();}
});
window.addEventListener('beforeunload',event=>{if(dirty||uploads){event.preventDefault();event.returnValue='';}});

const assetURL=url=>url.startsWith('assets/')?'/'+url:url;
const dateLabel=value=>new Date(value).toLocaleString('pt-BR');
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function action(label,fn){const b=node('button',label,'secondary');b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await fn();}catch(e){notice(e.message,true);}finally{b.disabled=false;}});return b;}
let historyCursor=null,quoteCursor=null,pickImage;
async function loadManagement(tab,append=false){
 if(tab==='history'){
  const data=await api('/api/admin/history'+(append&&historyCursor?'?before='+historyCursor:''));if(!append)$('#history-items').replaceChildren();historyCursor=data.next;$('#more-history').hidden=!data.next;
  for(const item of data.items){const card=node('article',undefined,'card');card.append(node('h3','Revisão '+item.revision),node('p',dateLabel(item.created_at)+' · '+item.editor_name));
   const details=document.createElement('details');details.append(node('summary','Consultar conteúdo'));details.addEventListener('toggle',async()=>{if(!details.open||details.dataset.loaded)return;try{const version=await api('/api/admin/history/'+item.id);details.append(node('h4',version.content.hero.title),node('p',version.content.hero.description),node('p','Portfólio: '+version.content.portfolio.projects.map(p=>p.title).join(', ')));details.dataset.loaded='1';}catch(e){notice(e.message,true);}});
   card.append(details,action('Restaurar como rascunho',async()=>{if(busy||uploads)return;if(!confirm('Restaurar esta versão no rascunho? As alterações atuais do rascunho serão substituídas. O site publicado não muda.'))return;clearTimeout(autoTimer);busy=true;updateStatus();try{await api('/api/admin/history/'+item.id+'/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision})});dirty=false;await loadEditor();showTab('home');notice('Versão restaurada como rascunho. Revise antes de publicar.');}finally{busy=false;updateStatus();}}));$('#history-items').append(card);
  }if(!data.items.length&&!append)$('#history-items').append(node('p','Nenhuma publicação registrada.'));
 }
 if(tab==='media'){const data=await api('/api/admin/media');renderMedia($('#media-items'),data.items);}
 if(tab==='quotes'){
  const params=new URLSearchParams({status:$('#quote-status').value,search:$('#quote-search').value});if(append&&quoteCursor)params.set('before',quoteCursor);
  const data=await api('/api/admin/quotes?'+params);if(!append)$('#quote-items').replaceChildren();quoteCursor=data.next;$('#more-quotes').hidden=!data.next;
  for(const q of data.items){const card=node('article',undefined,'card');card.append(node('h3',q.name+' · '+q.service),node('p',dateLabel(q.created_at)+(q.company?' · '+q.company:'')),node('p',q.idea),node('p',[q.stage,q.timeline].filter(Boolean).join(' · ')));
   const links=node('div',undefined,'filters');const mail=node('a',q.email,'secondary');mail.href='mailto:'+q.email;links.append(mail);if(q.phone){const digits=q.phone.replace(/\D/g,'');if(digits.length>=10){const wa=node('a','Conversar no WhatsApp','secondary');wa.href='https://wa.me/'+(digits.length<=11?'55':'')+digits;wa.target='_blank';wa.rel='noopener';links.append(wa);}else links.append(node('span',q.phone));}card.append(links);
   const status=document.createElement('select');for(const [value,label] of [['new','Novo'],['talking','Em conversa'],['proposal','Proposta enviada'],['won','Fechado'],['lost','Não avançou']]){const o=node('option',label);o.value=value;status.append(o);}status.value=q.status;const label=node('label','Status');label.append(status);const notes=document.createElement('textarea');notes.rows=3;notes.maxLength=5000;notes.value=q.notes;const notesLabel=node('label','Anotações internas');notesLabel.append(notes);
   card.append(label,notesLabel,action('Salvar acompanhamento',async()=>{const result=await api('/api/admin/quotes/'+q.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:status.value,notes:notes.value,revision:q.revision})});q.revision=result.revision;notice('Acompanhamento salvo.');}));$('#quote-items').append(card);
  }if(!data.items.length&&!append)$('#quote-items').append(node('p','Nenhum orçamento encontrado.'));
 }
 if(tab==='members'){
  const {items}=await api('/api/admin/members');$('#member-items').replaceChildren();
  for(const m of items){const card=node('article',undefined,'card');card.append(node('h3',m.name),node('p',m.email+' · '+(m.registered?'Conta criada':'Aguardando primeiro acesso')));
   if(m.role==='owner'){card.append(node('p','Proprietário · acesso protegido'));}else{
    const select=document.createElement('select');for(const [value,label] of [['admin','Administrador'],['editor','Editor']]){const o=node('option',label);o.value=value;select.append(o);}select.value=m.role;select.setAttribute('aria-label','Permissão de '+m.name);
    card.append(select,action('Salvar permissão',async()=>{await api('/api/admin/members',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:m.email,role:select.value,active:m.active})});notice('Permissão atualizada.');}),action(m.active?'Desativar acesso':'Reativar acesso',async()=>{if(!confirm((m.active?'Desativar':'Reativar')+' o acesso de '+m.name+'?'))return;await api('/api/admin/members',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:m.email,role:m.role,active:!m.active})});await loadManagement('members');}));
   }$('#member-items').append(card);
  }
 }
}
function renderMedia(container,items,choose){container.replaceChildren();for(const item of items){const card=node('article',undefined,'media-card');const img=document.createElement('img');img.src=assetURL(item.url);img.alt=item.label;img.loading='lazy';card.append(img,node('p',item.label));card.append(action(choose?'Usar imagem':'Copiar URL',async()=>{if(choose)choose(item.url);else{await navigator.clipboard.writeText(assetURL(item.url));notice('URL copiada.');}}));container.append(card);}if(!items.length)container.append(node('p','Nenhuma imagem enviada.'));}
async function openMediaPicker(choose){try{const {items}=await api('/api/admin/media');pickImage=choose;renderMedia($('#picker-items'),items,url=>{pickImage(url);$('#media-picker').close();});$('#media-picker').showModal();}catch(e){notice(e.message,true);}}
$('#close-media-picker').addEventListener('click',()=>$('#media-picker').close());
$('#refresh-history').addEventListener('click',()=>loadManagement('history').catch(e=>notice(e.message,true)));
$('#more-history').addEventListener('click',()=>loadManagement('history',true).catch(e=>notice(e.message,true)));
$('#refresh-quotes').addEventListener('click',()=>loadManagement('quotes').catch(e=>notice(e.message,true)));
$('#more-quotes').addEventListener('click',()=>loadManagement('quotes',true).catch(e=>notice(e.message,true)));
$('#media-upload').addEventListener('change',async e=>{const input=e.target,file=input.files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>4*1024*1024)return notice('Envie PNG, JPG ou WebP de até 4 MB.',true);input.disabled=true;uploads++;updateStatus();try{await api('/api/admin/upload',{method:'POST',headers:{'Content-Type':file.type},body:file});await loadManagement('media');notice('Imagem adicionada à biblioteca.');}catch(e){notice(e.message,true);}finally{input.disabled=false;input.value='';uploads--;updateStatus();}});
$('#invite-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;$('#invite-result').hidden=true;$('#invite-status').textContent='';try{const data=Object.fromEntries(new FormData(form));const result=await api('/api/admin/invites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});$('#invite-url').value=result.url;$('#invite-result').hidden=false;$('#invite-status').textContent='Convite criado. Compartilhe somente com a pessoa convidada. Nenhum e-mail foi enviado automaticamente.';form.reset();await loadManagement('members');}catch(e){$('#invite-status').textContent=e.message;}finally{button.disabled=false;}});
$('#copy-invite').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#invite-url').value);$('#invite-status').textContent='Convite copiado.';}catch{$('#invite-url').select();$('#invite-status').textContent='Selecione e copie o convite.';}});
async function presencePing(){if(document.hidden||$('#workspace').hidden)return;try{const {items}=await api('/api/admin/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tabId})});$('#presence').textContent=items.length?'Editando também: '+[...new Set(items.map(x=>x.name))].join(', '):'Somente esta aba está editando.';}catch{}}
$('#autosave').addEventListener('change',()=>{clearTimeout(autoTimer);if($('#autosave').checked){autoPaused=false;if(dirty)markDirty();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){presencePing();refreshNotifications();}});
function closeNotifications(){ $('#notification-panel').hidden=true;$('#notification-bell').setAttribute('aria-expanded','false'); }
function stopNotifications(){clearInterval(notificationTimer);notificationGeneration++;notificationPending=false;notificationData={count:0,latest:'0',items:[]};closeNotifications();$('#notification-items').replaceChildren();$('#notification-badge').hidden=true;$('#notification-badge').textContent='';$('#notification-summary').textContent='Verificando solicitações…';$('#notification-announcement').textContent='';$('#notification-bell').setAttribute('aria-label','Notificações de orçamentos');}
function startNotifications(){stopNotifications();if(profile.role==='editor')return;refreshNotifications();notificationTimer=setInterval(refreshNotifications,20000);}
async function refreshNotifications(){
 if(document.hidden||$('#workspace').hidden||profile?.role==='editor'||notificationPending)return;
 notificationPending=true;const generation=notificationGeneration;
 try{
  const data=await api('/api/admin/notifications');if(generation!==notificationGeneration||$('#workspace').hidden)return;
  const total=data.count+(data.taskCount||0),increased=total>notificationData.count+(notificationData.taskCount||0);notificationData=data;
  $('#notification-badge').hidden=!total;$('#notification-badge').textContent=total>99?'99+':String(total);
  $('#notification-bell').setAttribute('aria-label',total?`${total} notificações comerciais`:'Notificações de orçamentos: nenhuma não lida');
  $('#notification-summary').textContent=data.count?`${data.count} ${data.count===1?'solicitação não lida':'solicitações não lidas'}`:'Nenhuma nova solicitação.';if(data.taskCount)$('#notification-summary').textContent+=` · ${data.taskCount} tarefas com prazo vencido ou atingido.`;
  $('#notification-items').replaceChildren();for(const item of data.items){const card=node('article',undefined,'notification-item');const date=node('time',dateLabel(item.created_at));date.dateTime=item.created_at;card.append(node('strong',item.name),node('p',item.service),date);$('#notification-items').append(card);}
  for(const task of data.tasks||[]){const card=node('article',undefined,'notification-item');card.append(node('strong',task.title),node('p',task.name),action('Abrir oportunidade',()=>{closeNotifications();showTab('crm');return window.crmOpen?.(task.quote_id);}));$('#notification-items').append(card);}
  $('#notification-read').disabled=!data.count;
  if(increased)$('#notification-announcement').textContent=`Você tem ${total} notificações comerciais.`;
 }catch{if(generation===notificationGeneration&&!$('#workspace').hidden)$('#notification-summary').textContent='Não foi possível atualizar. Abra os orçamentos ou tente novamente.';}
 finally{if(generation===notificationGeneration)notificationPending=false;}
}
async function readNotifications(){if(!notificationData.count)return;await api('/api/admin/notifications/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({through:notificationData.latest})});await refreshNotifications();}
$('#notification-bell').addEventListener('click',()=>{const panel=$('#notification-panel');panel.hidden=!panel.hidden;$('#notification-bell').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)refreshNotifications();});
$('#notification-read').addEventListener('click',async()=>{const button=$('#notification-read');button.disabled=true;try{await readNotifications();}catch(e){notice(e.message,true);}finally{button.disabled=!notificationData.count;}});
$('#notification-view').addEventListener('click',async()=>{closeNotifications();$('#quote-search').value='';$('#quote-status').value='all';showTab('quotes');try{await readNotifications();}catch(e){notice(e.message,true);}});
document.addEventListener('click',event=>{if(!event.target.closest('.notifications'))closeNotifications();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#notification-panel').hidden){closeNotifications();$('#notification-bell').focus();}});
window.awCRM={api,node,action,notice,getProfile:()=>profile};
try{const session=await api('/api/auth/get-session');if(session?.user)await loadEditor();}catch{showLogin();}
