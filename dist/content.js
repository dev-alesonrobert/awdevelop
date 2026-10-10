function applySections(content) {
  if (!content?.sections) return;
  const main=document.querySelector('main');
  const originals=new Map([...main.children].filter(n=>n.id).map(n=>[n.id,n]));
  const active=new Set();
  const make=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
  for(const section of content.sections){
    let element;
    if(section.type==='builtin'){
      element=originals.get(section.id);if(!element)continue;
      element.hidden=section.id==='conexoes'&&!content.settings.globe;
    }else if(section.type==='custom'){
      element=make('section',undefined,'section custom-section');element.id=section.id;
      const copy=make('div',undefined,'custom-copy');copy.append(make('h2',section.title),make('p',section.description));
      if(section.button&&section.url){const a=make('a',section.button,'button purple');a.href=section.url;copy.append(a);}
      element.append(copy);
      if(section.image){const image=make('img');image.src=section.image;image.alt=section.alt;image.loading='lazy';image.width=1200;image.height=800;element.append(image);}
    }else continue;
    main.append(element);if(!element.hidden)active.add(section.id);
  }
  // Keep dormant widgets in the DOM so their existing event bindings remain safe.
  for(const [id,element] of originals){if(!content.sections.some(s=>s.id===id&&s.type==='builtin')){element.hidden=true;main.append(element);}}
  for(const anchor of document.querySelectorAll('a[href^="#"]')){
    const id=anchor.getAttribute('href').slice(1),target=document.getElementById(id);
    if(target?.closest('main')){if(anchor.classList.contains('brand')&&!active.has(id))anchor.href='/';else anchor.hidden=!active.has(id);}
  }
  const nav=document.querySelector('#navigation');
  if(nav)for(const section of content.sections){const anchor=[...nav.querySelectorAll('a')].find(a=>a.getAttribute('href')==='#'+section.id);if(anchor)nav.append(anchor);}
  const h1=main.querySelector('h1');if(!h1||h1.closest('[hidden]')){const first=[...main.children].find(n=>!n.hidden);const h2=first?.querySelector('h2');if(h2){const heading=make('h1',h2.textContent,'section-page-title');if(h2.id)heading.id=h2.id;h2.replaceWith(heading);}}
}
(async () => {
  let content;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const preview = new URLSearchParams(location.search).get('preview') === '1';
    const response = await fetch(preview ? '/api/admin/content' : '/api/content', { signal:controller.signal, cache:'no-store' });
    if (!response.ok) throw new Error('Content unavailable');
    const body = await response.json(); content = preview ? body.draft : body.content;
    if (preview) {
      const notice = document.createElement('div'); notice.className = 'preview-notice';
      notice.textContent = 'PRÉVIA DO RASCUNHO — estas alterações ainda não estão publicadas.';
      document.body.prepend(notice);
    }
  } catch {
    // Public fallback preserves the original landing page during a service outage.
    if (new URLSearchParams(location.search).get('preview') === '1') {
      document.body.replaceChildren(); const message = document.createElement('p');
      message.textContent='Não foi possível abrir o rascunho. Entre no painel e tente novamente.';
      document.body.append(message); return;
    }
  } finally { clearTimeout(timeout); }
  if (content) {
    window.awContent=content;
    const set=(selector,value)=>{const node=document.querySelector(selector);if(node)node.textContent=value;};
    document.title=content.settings.title;
    document.querySelector('meta[name="description"]').content=content.settings.description;
    document.documentElement.style.setProperty('--accent',content.settings.accent);
    document.documentElement.style.setProperty('--bg',content.settings.background);
    document.querySelectorAll('.brand img').forEach(image=>{image.src=content.settings.logo;image.alt=content.settings.brand;});
    document.querySelector('.globe-section').hidden=!content.settings.globe;
    const heading=document.querySelector('.hero h1'); heading.textContent=content.hero.title+'\n';
    const accent=document.createElement('span');accent.textContent=content.hero.accent;heading.append(accent);
    set('.hero-lead',content.hero.description);set('.hero-actions .button',content.hero.button);
    set('#portfolio h2',content.portfolio.title);set('#portfolio .section-heading > p',content.portfolio.description);set('.demo-note',content.portfolio.note);
    const stage=document.querySelector('.banner-stage'),dots=document.querySelector('.carousel-dots');stage.replaceChildren();dots.replaceChildren();
    content.portfolio.projects.forEach((project,i)=>{
      const article=document.createElement('article');article.className='portfolio-banner';article.setAttribute('role','group');article.setAttribute('aria-roledescription','slide');article.setAttribute('aria-label',`${i+1} de ${content.portfolio.projects.length}: ${project.title}`);article.hidden=i!==0;
      const art=document.createElement('div');art.className='banner-art';const image=document.createElement('img');image.src=project.image;image.alt=project.alt;image.width=1536;image.height=1024;image.loading=i?'lazy':'eager';art.append(image);
      const info=document.createElement('div');info.className='banner-info';
      for(const [tag,cls,value] of [['span','eyebrow',project.category],['h3','',project.title],['p','',project.summary],['span','banner-concept',project.concept?'PROJETO CONCEITUAL':'PROJETO DO PORTFÓLIO']]){const node=document.createElement(tag);node.className=cls;node.textContent=value;info.append(node);}
      const button=document.createElement('button');button.className='button purple';button.dataset.project=project.id;button.textContent='Ver projeto';info.append(button);article.append(art,info);stage.append(article);
      const dot=document.createElement('button');dot.dataset.slide=String(i);dot.setAttribute('aria-label','Mostrar '+project.title);dot.setAttribute('aria-pressed',String(i===0));dot.classList.toggle('selected',i===0);dots.append(dot);
    });
    set('#contato h2',content.contact.title);set('#contato > div > p',content.contact.description);
    const links=document.createElement('div');links.className='contact-channels';
    const email=document.createElement('a');email.href='mailto:'+content.contact.email;email.textContent=content.contact.email;links.append(email);
    for(const [label,href] of [['WhatsApp',content.contact.whatsapp?'https://wa.me/'+content.contact.whatsapp:''],['Instagram',content.contact.instagram],['LinkedIn',content.contact.linkedin]]){if(!href)continue;const a=document.createElement('a');a.href=href;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
    document.querySelector('#contato > div').append(links);
    document.querySelectorAll('[data-edit-key]').forEach(node=>{const value=content.blocks[node.dataset.editKey];if(value!==undefined)node.textContent=value;});
  }
  applySections(content);
  for(const src of ['/app.js','/globe.js']) { await new Promise(resolve=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=resolve;document.body.append(script);}); }
})();
