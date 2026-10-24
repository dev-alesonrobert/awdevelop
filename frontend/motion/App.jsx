import React, { useId, useState, useRef, useMemo } from "react";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";

const SERVICES = [
  { n: "01", icon: "cursor", image: "landing", alt: "Exemplo de landing page de arquitetura com oferta e botão de contato", title: "Landing pages", short: "Landing page", text: "Apresente sua oferta. Conquiste novos clientes.", tags: ["Estratégia de conversão", "Design responsivo"], label: "Converter mais" },
  { n: "02", icon: "window", image: "platform", alt: "Exemplo de plataforma com painel de projetos e clientes", title: "Sites & plataformas", short: "Site ou plataforma web", text: "Sua empresa online, com tudo o que precisa.", tags: ["SEO técnico", "Desenvolvimento sob medida"], label: "Fortalecer minha presença" },
  { n: "03", icon: "nodes", image: "automation", alt: "Fluxo ilustrativo que conecta contato no site, CRM e resposta ao cliente", title: "Automações & integrações", short: "Automação e integração", text: "Conecte ferramentas e simplifique sua rotina.", tags: ["APIs & Webhooks", "Chatbots & CRM"], label: "Automatizar minha operação" },
];
const STEPS = [
  ["Alinhamento & estratégia", "Entendemos o que você precisa."],
  ["Design UI/UX", "Você visualiza e aprova a ideia."],
  ["Desenvolvimento & automação", "Construímos e conectamos tudo."],
  ["Entrega & otimização", "Seu projeto pronto para evoluir."],
];


const CSS = `
.aw{--bg:#14161c;--purple:#6d28ff;--muted:#a9a3c4;--silver:#cbd5e1;background:var(--bg);color:#fff;font-family:'Outfit',ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;isolation:isolate;overflow-x:clip}
.aw *{box-sizing:border-box}.aw a{color:inherit;text-decoration:none}.aw button,.aw input,.aw select,.aw textarea{font:inherit}.aw button,.aw a{-webkit-tap-highlight-color:transparent}.aw button{cursor:pointer}.aw h1,.aw h2,.aw h3,.aw p{margin:0}.aw a:focus-visible,.aw button:focus-visible,.aw input:focus-visible,.aw select:focus-visible,.aw textarea:focus-visible{outline:3px solid #b69aff;outline-offset:5px}.aw ::selection{background:#6d28ff;color:#fff}
.aw .wrap{width:min(1160px,calc(100% - 40px));margin-inline:auto}.aw .section{padding-block:100px;scroll-margin-top:90px}.aw .muted{color:var(--muted)}.aw .eyebrow{display:flex;align-items:center;gap:10px;color:#c1a9ff;text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:700;margin-bottom:18px}.aw .eyebrow:before{content:'';width:22px;height:1px;background:var(--purple)}
.aw .header{position:sticky;top:0;z-index:30;background:rgba(20,22,28,.88);backdrop-filter:blur(20px);border-bottom:1px solid #ffffff0d}.aw .nav{min-height:80px;display:flex;align-items:center;justify-content:space-between;gap:24px}.aw .brand{display:inline-flex;align-items:center;gap:10px;font-size:21px;letter-spacing:-1px;font-weight:700}.aw .navlinks{display:flex;align-items:center;gap:30px;font-size:13px;color:var(--silver)}.aw .navlinks a:hover,.aw .footer a:hover{color:#bc9aff}.aw .button{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:50px;padding:13px 22px;border-radius:12px;border:1px solid #ffffff20;background:transparent;color:#fff;font-size:13px;font-weight:650;transition:transform .25s,box-shadow .25s,background .25s}.aw .button:hover{transform:translateY(-3px);background:#ffffff08}.aw .primary{background:var(--purple);border-color:var(--purple);box-shadow:0 5px 28px #6d28ff30}.aw .primary:hover{background:#7c40ff;box-shadow:0 10px 35px #6d28ff55}.aw .menu{display:none}.aw .mobile-nav{padding:10px 20px 22px;display:grid;gap:18px;font-size:14px}
.aw .hero{position:relative;padding:64px 0 78px;text-align:center}.aw .grid-bg{position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:linear-gradient(#ffffff05 1px,transparent 1px),linear-gradient(90deg,#ffffff05 1px,transparent 1px);background-size:52px 52px;mask-image:radial-gradient(ellipse at 50% 25%,#000 5%,transparent 72%)}.aw .hero-glow{position:absolute;pointer-events:none;z-index:-2;left:10%;top:-160px;width:80%;height:800px;background:radial-gradient(ellipse,#6d28ff24,transparent 67%)}
.aw .motion-stage{position:relative;margin:auto auto 32px;min-height:154px;display:flex;align-items:center;flex-direction:column;justify-content:center}.aw .motion-logo{display:flex;align-items:center;justify-content:center;max-width:100%}.aw .motion-icon{width:clamp(50px,8.8vw,91px);height:auto;flex:none;filter:drop-shadow(0 0 22px #6d28ff35)}.aw .motion-word{position:relative;overflow:hidden;white-space:nowrap;display:flex;align-items:center;font-size:clamp(32px,6.5vw,68px);font-weight:650;letter-spacing:-.055em;line-height:1.35}.aw .letters{display:flex;padding-left:clamp(10px,2vw,22px)}.aw .motion-tag{margin-top:20px;color:var(--muted);font-size:10px;letter-spacing:.32em;text-transform:uppercase}.aw .motion-line{margin-top:13px;width:120px;height:2px;background:linear-gradient(90deg,transparent,#6d28ff,transparent)}.aw .sweep{position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,#ffffff45 50%,transparent 70%);mix-blend-mode:overlay;pointer-events:none}.aw .replay{position:absolute;right:0;bottom:0;background:none;color:var(--muted);border:0;padding:8px;display:flex;align-items:center;gap:6px;font-size:10px}
.aw .badge{display:inline-flex;align-items:center;gap:9px;padding:6px 12px;border:1px solid #ffffff13;border-radius:50px;color:var(--silver);font-size:11px;letter-spacing:.03em;margin-bottom:23px}.aw .badge i{height:5px;width:5px;border-radius:50%;background:#a078ff;box-shadow:0 0 10px #6d28ff}.aw h1{font-size:clamp(38px,5.5vw,66px);line-height:1.08;letter-spacing:-.052em;font-weight:600;max-width:920px;margin-inline:auto}.aw .accent{color:#ad8aff}.aw .hero-copy{max-width:580px;margin:24px auto 28px;color:var(--silver);font-size:16px;line-height:1.8}.aw .actions{display:flex;justify-content:center;flex-wrap:wrap;gap:12px}.aw .micro{font-size:11px;color:var(--muted);margin-top:17px}.aw .scroll-hint{margin-top:43px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.2em;display:flex;align-items:center;justify-content:center;gap:12px}.aw .scroll-hint span{height:27px;width:1px;background:linear-gradient(#6d28ff,transparent)}
.aw .pillars{border-block:1px solid #ffffff0d;background:#ffffff02}.aw .pillar-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding-block:27px}.aw .pillar{display:flex;gap:13px;align-items:center;justify-content:center}.aw .pillar svg{color:#ad8aff;flex-shrink:0}.aw .pillar strong{font-size:12px;font-weight:550}.aw .pillar p{font-size:10px;color:var(--muted);margin-top:3px}.aw .section-head{display:flex;justify-content:space-between;align-items:end;gap:36px;margin-bottom:36px}.aw h2{font-size:clamp(30px,3.6vw,43px);font-weight:550;letter-spacing:-.04em;line-height:1.16}.aw .section-head>p{max-width:320px;color:var(--muted);font-size:13px}.aw .service-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.aw .card{position:relative;display:flex;flex-direction:column;padding:29px 25px;background:linear-gradient(145deg,#20212c77,#171920);border:1px solid #ffffff12;border-radius:20px;transition:border-color .3s,box-shadow .3s}.aw .card:hover{border-color:#6d28ff88;box-shadow:0 15px 65px #6d28ff16}.aw .card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:37px}.aw .icon-box{display:grid;place-items:center;width:48px;height:48px;background:#6d28ff18;border:1px solid #6d28ff44;border-radius:13px;color:#b396ff}.aw .index{font-size:11px;color:#a9a3c477;font-family:monospace}.aw h3{font-size:21px;line-height:1.35;letter-spacing:-.025em;font-weight:550}.aw .card>p{color:var(--muted);font-size:12px;line-height:1.85;margin:17px 0 23px}.aw .tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;margin-bottom:26px}.aw .tags span{border:1px solid #ffffff10;border-radius:5px;padding:4px 7px;font-size:9px;color:var(--silver)}.aw .card-cta{padding-top:20px;border-top:1px solid #ffffff0d;display:flex;justify-content:space-between;align-items:center;color:#d6c4ff!important;font-size:11px}.aw .process{background:#ffffff02;border-block:1px solid #ffffff0a}.aw .step-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:28px;margin-top:45px}.aw .step-number{position:relative;border-top:1px solid #ffffff1a;padding-top:20px;color:#b699ff;font:12px monospace;margin-bottom:20px}.aw .step-number:before{content:'';position:absolute;top:-4px;left:0;width:7px;height:7px;border-radius:50%;background:#6d28ff;box-shadow:0 0 14px #6d28ff66}.aw .step h3{font-size:16px;min-height:44px}.aw .step p{font-size:12px;color:var(--muted);margin-top:12px;line-height:1.85}
.aw .contact-panel{position:relative;overflow:hidden;border:1px solid #6d28ff55;border-radius:28px;padding:50px;display:grid;grid-template-columns:1fr 1fr;gap:65px;background:radial-gradient(ellipse at 0 0,#6d28ff22,transparent 65%),#191b23}.aw .contact-copy>p{font-size:13px;color:var(--silver);margin-top:22px;max-width:350px}.aw .contact-note{margin-top:35px;color:var(--muted);font-size:11px;display:flex;gap:9px;align-items:center}.aw .form{display:grid;gap:15px}.aw label{display:grid;gap:7px;color:var(--silver);font-size:11px}.aw input,.aw select,.aw textarea{width:100%;min-height:46px;border:1px solid #ffffff1a;border-radius:9px;background:#14161c;color:#fff;padding:11px 13px;font-size:12px}.aw input::placeholder,.aw textarea::placeholder{color:#8b879c}.aw textarea{resize:vertical;min-height:85px}.aw .form .button{width:100%}.aw .form-info{font-size:10px;color:var(--muted);line-height:1.7}.aw .status{font-size:12px;color:#d6c4ff}.aw .fallback{font-size:11px;color:var(--muted);word-break:break-word}.aw .fallback a{text-decoration:underline}.aw .footer{border-top:1px solid #ffffff10;padding:32px 0}.aw .footer-row{display:flex;justify-content:space-between;align-items:center;gap:22px;flex-wrap:wrap}.aw .footer p{font-size:10px;color:var(--muted)}.aw .footer-links{display:flex;gap:21px;font-size:11px;color:var(--silver)}.aw .skip{position:fixed;left:15px;top:-100px;z-index:100;background:#6d28ff;padding:12px}.aw .skip:focus{top:10px}
@media(min-width:1000px){.aw .hero{padding-top:65px}.aw .hero .wrap{max-width:1040px}}
@media(max-width:760px){.aw .section{padding-block:65px}.aw .nav{min-height:68px}.aw .navlinks{display:none}.aw .menu{display:inline-flex;min-height:40px;padding:8px 12px}.aw .hero{padding:36px 0 48px}.aw .motion-stage{min-height:145px;margin-bottom:20px}.aw .replay{bottom:-5px;right:0}.aw .hero-copy{font-size:14px}.aw .pillar-grid{grid-template-columns:1fr;padding-block:23px;gap:22px}.aw .pillar{justify-content:start;padding-left:12px}.aw .section-head{display:block}.aw .section-head>p{margin-top:20px}.aw .service-grid{grid-template-columns:1fr}.aw .card{padding:26px}.aw .card-top{margin-bottom:25px}.aw .step-grid{grid-template-columns:repeat(2,1fr);gap:28px 20px}.aw .contact-panel{grid-template-columns:1fr;padding:28px 22px;gap:30px}.aw .contact-note{margin-top:20px}.aw .footer-row{align-items:start;flex-direction:column}.aw .micro{font-size:10px}.aw .badge{font-size:10px}.aw .scroll-hint{margin-top:28px}}
@media(prefers-reduced-motion:reduce){.aw *,.aw *:before,.aw *:after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}

.aw .hero{padding-top:34px;padding-bottom:45px}.aw .motion-stage{min-height:135px;margin-bottom:18px}.aw .badge{margin-bottom:18px}.aw h1{font-size:clamp(41px,5.8vw,70px)}.aw .hero-copy{margin:18px auto 24px}.aw .visual-showcase{display:grid;grid-template-columns:1fr 1.3fr 1fr;align-items:center;gap:16px;margin:48px auto 0;max-width:1100px;perspective:1000px}.aw .preview-tile{position:relative;display:block;overflow:hidden;border:1px solid #ffffff20;border-radius:15px;background:#222330;box-shadow:0 24px 65px #0005;transition:transform .3s,border-color .3s}.aw .preview-tile:first-child{transform:rotate(-5deg) translateX(10px)}.aw .preview-tile:last-child{transform:rotate(5deg) translateX(-10px)}.aw .preview-tile:hover{transform:translateY(-6px);border-color:#9d77ff}.aw .main-preview{z-index:2;box-shadow:0 14px 70px #6d28ff25}.aw .preview-tile img{display:block;width:100%;height:auto}.aw .preview-tile span{display:block;font-size:11px;color:#cbd5e1;padding:11px 8px;text-align:center;background:#191b25}.aw .example-note{font-size:10px;color:var(--muted);margin-top:21px}.aw .scroll-hint{margin-top:22px}.aw .section{padding-block:75px}.aw .card{padding:0 0 24px;overflow:hidden}.aw .service-image{position:relative;margin-bottom:23px;overflow:hidden;border-bottom:1px solid #ffffff10}.aw .service-image img{display:block;width:100%;height:auto;transition:transform .5s}.aw .card:hover .service-image img{transform:scale(1.035)}.aw .image-caption{position:absolute;bottom:9px;right:10px;background:#14161ce8;padding:3px 7px;border:1px solid #ffffff15;border-radius:5px;font-size:8px;color:#cbd5e1}.aw .card h3,.aw .card>p,.aw .card-cta{margin-inline:24px}.aw .card h3{font-size:22px}.aw .card>p{font-size:13px;margin-block:12px 22px}.aw .card-cta{margin-top:auto}.aw .step-grid{margin-top:30px}.aw .step h3{min-height:0;font-size:15px}.aw .step p{margin-top:8px}.aw .contact-panel{gap:50px}.aw .contact-copy{display:flex;flex-direction:column;justify-content:center}.aw .contact-copy:after{content:'';display:block;width:100%;aspect-ratio:900/620;margin-top:25px;background:url('/assets/automation.svg') center/contain no-repeat;border:1px solid #ffffff10;border-radius:16px}.aw .contact-note{margin-top:20px}
@media(max-width:760px){.aw .hero{padding-top:22px}.aw .visual-showcase{grid-template-columns:1fr 1fr;gap:12px;margin-top:32px}.aw .main-preview{grid-column:1/-1;grid-row:1}.aw .preview-tile:first-child,.aw .preview-tile:last-child{transform:none}.aw .preview-tile span{font-size:10px;padding:9px 5px}.aw .example-note{margin-top:14px}.aw .section{padding-block:52px}.aw .service-grid{gap:22px}.aw .card{padding:0 0 24px}.aw .contact-copy:after{display:none}.aw .contact-panel{gap:25px}.aw .pillar-grid{grid-template-columns:repeat(3,1fr);gap:8px;padding-block:20px}.aw .pillar{flex-direction:column;justify-content:center;text-align:center;padding:0;gap:8px}.aw .pillar strong{font-size:10px}.aw .step-grid{gap:24px 18px}.aw .step h3{font-size:14px}}


.aw .portfolio-section{background:radial-gradient(ellipse at 90% 10%,#6d28ff0a,transparent 55%),#11131a;border-top:1px solid #ffffff0b}.aw .portfolio-filters{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:28px}.aw .filter-button{border:1px solid #ffffff18;border-radius:50px;color:#a9a3c4;background:transparent;padding:8px 17px;font-size:12px;transition:background .2s,color .2s,border-color .2s;min-height:40px}.aw .filter-button:hover{border-color:#9d77ff;color:#fff}.aw .filter-button.active{background:#6d28ff;color:#fff;border-color:#6d28ff}.aw .portfolio-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.aw .project-card{overflow:hidden;border:1px solid #ffffff14;border-radius:18px;background:#191b23;display:flex;flex-direction:column}.aw .project-image{position:relative;display:block;overflow:hidden;background:#252332}.aw .project-browser{display:flex;align-items:center;gap:5px;height:32px;padding:0 12px;color:#a9a3c4;background:#22242f;border-bottom:1px solid #ffffff0b}.aw .project-browser i{width:5px;height:5px;border-radius:50%;background:#635d77}.aw .project-browser i:first-child{background:#b48af5}.aw .project-browser span{font-size:9px;margin-left:8px;flex:1}.aw .project-image img{width:100%;height:auto;aspect-ratio:1200/750;object-fit:cover;display:block;transition:transform .5s}.aw .project-image:hover img{transform:scale(1.035)}.aw .project-open{position:absolute;inset:auto 12px 12px auto;display:flex;align-items:center;gap:9px;background:#14161ceb;border:1px solid #ffffff30;padding:7px 12px;border-radius:30px;font-size:10px;opacity:0;transform:translateY(5px);transition:opacity .25s,transform .25s}.aw .project-image:hover .project-open,.aw .project-image:focus-visible .project-open{opacity:1;transform:none}.aw .project-info{padding:24px;display:flex;flex-direction:column;flex:1}.aw .project-type{font-size:10px;color:#ba9bff;margin-bottom:9px}.aw .project-info h3{font-size:24px}.aw .project-info p{color:#a9a3c4;font-size:12px;margin:12px 0 23px;line-height:1.8}.aw .project-link{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#e1d4ff!important;border-top:1px solid #ffffff0e;padding-top:17px;margin-top:auto}.aw .portfolio-bottom{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:32px;font-size:12px}.aw .portfolio-bottom p{color:#a9a3c4}.aw .portfolio-bottom a{display:flex;align-items:center;gap:8px;color:#cdb6ff}
@media(max-width:900px){.aw .portfolio-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.aw .navlinks{gap:18px}}
@media(max-width:760px){.aw .portfolio-grid{grid-template-columns:1fr}.aw .project-info{padding:22px}.aw .portfolio-bottom{flex-direction:column;gap:10px}.aw .project-open{opacity:1;transform:none}.aw .portfolio-filters{gap:8px}.aw .filter-button{padding:8px 15px}.aw .footer-links{flex-wrap:wrap}}

.aw .service-symbol{padding:25px 24px 20px}.aw .service-grid .card{padding-bottom:24px}

.aw .carousel-controls{display:none}
@media(max-width:760px){
.aw .service-grid.mobile-carousel,.aw .portfolio-grid.mobile-carousel{display:flex;position:relative;gap:14px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-padding-inline:0;overscroll-behavior-x:contain;scrollbar-width:none;padding:4px 0 12px;-webkit-overflow-scrolling:touch}
.aw .mobile-carousel::-webkit-scrollbar{display:none}.aw .mobile-carousel>.card,.aw .mobile-carousel>.project-card{flex:0 0 92%;min-width:0;scroll-snap-align:start;scroll-snap-stop:always}.aw .mobile-carousel>.card:last-child,.aw .mobile-carousel>.project-card:last-child{margin-right:8%}.aw .mobile-carousel>.card:only-child,.aw .mobile-carousel>.project-card:only-child{flex-basis:100%;margin-right:0}
.aw .carousel-controls{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;min-height:44px}.aw .swipe-hint{font-size:10px;color:#a9a3c4}.aw .carousel-dots{display:flex;align-items:center;gap:0}.aw .carousel-dots button{width:28px;height:40px;padding:0;border:0;background:transparent;position:relative}.aw .carousel-dots button:after{content:'';display:block;width:6px;height:6px;border-radius:9px;margin:auto;background:#ffffff30;transition:width .2s,background .2s}.aw .carousel-dots button.selected:after{width:20px;background:#8c59ff}.aw .carousel-arrows{display:flex;gap:7px}.aw .carousel-arrows button{width:40px;height:40px;display:grid;place-items:center;border:1px solid #ffffff20;background:#ffffff04;color:#fff;border-radius:50%;font-size:24px;line-height:1}.aw .carousel-arrows button:disabled{opacity:.25;cursor:default}.aw .mobile-carousel>.card:hover{transform:none!important}.aw .mobile-carousel:focus-visible{outline-offset:3px}
}


.aw .mobile-cta-label{display:none}
@media(max-width:760px){
.aw .hero{padding-top:20px;padding-bottom:32px}.aw .hero .motion-stage{min-height:111px;margin-bottom:20px}.aw .hero .motion-icon{width:48px}.aw .hero .motion-word{font-size:clamp(29px,7.6vw,42px)}.aw .hero .motion-tag{font-size:8px;letter-spacing:.24em;margin-top:13px}.aw .hero .motion-line{width:90px;margin-top:9px}.aw .hero .replay{bottom:-7px;font-size:9px;padding:5px}.aw .hero .badge{display:none}.aw .hero h1{font-size:clamp(27px,8vw,36px);line-height:1.15;letter-spacing:-.045em}.aw .hero h1 .accent{white-space:nowrap}.aw .hero .hero-copy{font-size:13px;line-height:1.65;max-width:330px;margin:16px auto 21px}.aw .hero .actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;width:100%;max-width:390px;margin-inline:auto}.aw .hero .actions .button{min-height:46px;padding:11px 10px;font-size:11px;gap:7px;border-radius:11px;white-space:nowrap}.aw .hero .actions svg{width:14px;height:14px;flex-shrink:0}.aw .hero .desktop-cta-label{display:none}.aw .hero .mobile-cta-label{display:inline}.aw .hero .visual-showcase{margin-top:29px}.aw .hero .scroll-hint{margin-top:17px;font-size:8px}
}


.aw .hero-leading{display:contents}
@media(max-width:760px){
.aw .hero{padding-top:28px}.aw .hero-leading{display:grid;grid-template-columns:minmax(0,.94fr) minmax(0,1.06fr);gap:18px;align-items:center;margin-bottom:23px;min-height:164px}.aw .hero .motion-stage{min-width:0;width:100%;min-height:154px;margin:0;padding:8px 0 18px}.aw .hero .motion-logo{flex-direction:column;gap:6px}.aw .hero .motion-icon{width:47px}.aw .hero .motion-word{font-size:clamp(19px,5.6vw,28px);letter-spacing:-.055em;max-width:100%}.aw .hero .letters{padding-left:0}.aw .hero .motion-tag{font-size:6px;letter-spacing:.12em;margin-top:9px;white-space:nowrap}.aw .hero .motion-line{margin-top:7px;width:70px}.aw .hero .replay{bottom:-1px;left:0;right:0;margin:auto;justify-content:center;font-size:8px}.aw .hero .hero-message{text-align:left;min-width:0}.aw .hero h1{font-size:clamp(22px,6.1vw,30px);line-height:1.12;letter-spacing:-.045em}.aw .hero h1 .accent{white-space:normal}.aw .hero .hero-copy{font-size:11px;line-height:1.6;margin:12px 0 0;max-width:none}.aw .hero .actions{margin-top:0}
}


@media(min-width:761px){
.aw .hero{padding-top:52px}.aw .hero-leading{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);align-items:center;gap:50px;margin-bottom:32px;min-height:275px}.aw .hero .motion-stage{width:100%;min-width:0;min-height:240px;margin:0;padding-bottom:22px}.aw .hero .motion-icon{width:clamp(56px,5.8vw,76px)}.aw .hero .motion-word{font-size:clamp(33px,4.1vw,51px)}.aw .hero .letters{padding-left:14px}.aw .hero .motion-tag{font-size:9px;letter-spacing:.25em;margin-top:22px}.aw .hero .replay{bottom:7px;left:0;right:0;justify-content:center}.aw .hero .hero-message{text-align:left;min-width:0}.aw .hero .badge{font-size:10px;margin-bottom:19px}.aw .hero h1{font-size:clamp(38px,4.5vw,58px);line-height:1.08;letter-spacing:-.05em;margin:0}.aw .hero .hero-copy{font-size:15px;line-height:1.75;margin:19px 0 0;max-width:440px}.aw .hero .actions{margin:0 auto}.aw .hero .visual-showcase{margin-top:42px}
}
@media(min-width:761px) and (max-width:1000px){.aw .hero-leading{gap:30px}.aw .hero .motion-logo{flex-direction:column;gap:10px}.aw .hero .letters{padding-left:0}.aw .hero .motion-stage{min-height:240px}.aw .hero .badge{font-size:9px;padding:6px 9px}.aw .hero .hero-copy{font-size:13px}}


.aw label{margin-top:0}.aw a:hover{text-decoration:none}.aw button{font-weight:inherit}.aw fieldset{border:0;margin:0;padding:0;display:grid;gap:15px;min-width:0}.aw .quote-consent{display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:11px}.aw .quote-consent input{width:16px;min-height:16px;margin:0}.aw .quote-consent a{text-decoration:underline}.aw .quote-honeypot{position:absolute;left:-9999px;opacity:0;pointer-events:none}.aw .preview-notice{padding:12px 20px;background:#422279;color:#fff;font-size:12px;text-align:center}.aw .preview-notice a{margin-left:12px;text-decoration:underline}.aw .admin-link{font-size:11px;color:#a9a3c4}.aw .button:disabled{opacity:.6;cursor:default}

.aw .faq-item{margin-top:20px;padding:20px;border:1px solid #ffffff15;border-radius:12px}.aw .faq-item summary{cursor:pointer}.aw .faq-item p{margin-top:12px;color:#a9a3c4}
`;

  function CarouselControls({ track, active, items, label, goToSlide }) {
    return <div className="carousel-controls" aria-label={`Navegação: ${label}`}>
      <span className="swipe-hint">Deslize para explorar</span>
      <div className="carousel-dots">{items.map((item, index) => <button key={index} type="button" className={index === active ? "selected" : ""} aria-label={`Mostrar ${item}`} aria-current={index === active ? "true" : undefined} onClick={() => goToSlide(track, index)} />)}</div>
      <div className="carousel-arrows"><button type="button" disabled={active === 0} aria-label={`${label}: anterior`} onClick={() => goToSlide(track, active - 1)}>‹</button><button type="button" disabled={active >= items.length - 1} aria-label={`${label}: próximo`} onClick={() => goToSlide(track, active + 1)}>›</button></div>
    </div>;
  }

export default function AWDevelopLanding({ content: c, preview = false }) {
  const projects = c.portfolio.projects.map(project => ({ name: project.title, category: project.category, type: project.concept ? "Projeto conceito" : project.category, image: project.image, alt: project.alt, description: project.summary || project.description, url: project.url }));
  const categories = ["Todos", ...new Set(projects.map(project => project.category))];
  const blocks = c.blocks || {};
  const enabled = new Set((c.sections || []).map(section => section.id));
  const show = id => !c.sections || enabled.has(id);

  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [replay, setReplay] = useState(0);
  const serviceTrack = useRef(null);
  const projectTrack = useRef(null);
  const [serviceSlide, setServiceSlide] = useState(0);
  const [projectSlide, setProjectSlide] = useState(0);
  const [portfolioFilter, setPortfolioFilter] = useState("Todos");
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const pendingQuote = useRef(null);
  const reveal = { initial: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.12 }, transition: { duration: reduce ? 0 : 0.65 } };
  const visibleProjects = projects.filter(project => portfolioFilter === "Todos" || project.category === portfolioFilter);
  function goToSlide(ref, index) {
    const track = ref.current;
    if (!track || !track.children[index]) return;
    track.scrollTo({ left: track.children[index].offsetLeft - track.children[0].offsetLeft, behavior: reduce ? "instant" : "smooth" });
  }
  function trackSlide(event, setSlide) {
    const track = event.currentTarget;
    const cards = Array.from(track.children);
    if (!cards.length) return;
    const first = cards[0].offsetLeft;
    let nearest = 0;
    cards.forEach((card, i) => { if (Math.abs(card.offsetLeft - first - track.scrollLeft) < Math.abs(cards[nearest].offsetLeft - first - track.scrollLeft)) nearest = i; });
    setSlide(nearest);
  }
  const intro = (delay, duration = 0.8) => ({ delay: reduce ? 0 : delay, duration: reduce ? 0 : duration });

  function Icon({ type, size = 20 }) {
    const paths = {
      arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
      cursor: <><path d="m5 3 14 9-7 1-3 7-4-17Z" /><path d="m13 14 5 6" /></>,
      window: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01m-2 6-2 2 2 2m8-4 2 2-2 2"/></>,
      nodes: <><rect x="9" y="3" width="6" height="6" rx="1.5"/><rect x="2" y="15" width="6" height="6" rx="1.5"/><rect x="16" y="15" width="6" height="6" rx="1.5"/><path d="M12 9v3H5v3m7-3h7v3"/></>,
      bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>,
      check: <><path d="m8 12 3 3 5-6"/><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/></>,
      replay: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></>,
      menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
      close: <path d="m6 6 12 12M18 6 6 18"/>,
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type] || paths.arrow}</svg>;
  }

  const Logo = useMemo(() => function Logo({ animated = false, idSuffix = "brand" }) {
    const clipId = `${uid}-${idSuffix}`;
    if (c.settings.logo && c.settings.logo !== "assets/logo-dark.png") return <img className={animated ? "motion-icon" : ""} src={c.settings.logo} alt="" width="32" height="32"/>;
    return <svg className={animated ? "motion-icon" : ""} width="32" height="32" viewBox="158 160 940 930" fill="none" aria-hidden="true">
      <defs><clipPath id={clipId}><rect x="158" y="160" width="940" height="930" rx="190"/></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="158" y="160" width="940" height="930" fill="#6d28ff"/>
        <motion.path initial={animated && !reduce ? { x: -420, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={intro(.7)} fill="#fff" d="M150 868L375 482Q436 410 497 480L660 782Q672 805 650 825L568 830Q550 830 545 815L436 617L290 880Q280 893 262 893L150 893Z"/>
        <motion.path initial={animated && !reduce ? { x: 420, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={intro(.9)} fill="#fff" d="M565 505Q560 480 585 478L682 478Q692 478 697 488L790 660L962 370Q972 351 995 351L1100 351L1100 375L850 795Q825 833 790 833Q750 833 725 795Z"/>
      </g>
    </svg>;
  }, [c.settings.logo, uid, reduce]);

  async function prepareEmail(event) {
    event.preventDefault();
    if (busy || sent || preview) return;
    const data = new FormData(event.currentTarget);
    pendingQuote.current ??= { requestId: requestId.current, name: data.get("name"), email: data.get("email"), company: data.get("company") || "", phone: data.get("phone") || "", service, idea: data.get("message"), stage: "Primeiro contato pelo site", timeline: "A definir", consent: data.get("consent") === "on", website: data.get("website") || "" };
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/quotes", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(pendingQuote.current) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar agora.");
      setSent(true); setStatus("Solicitação recebida! Nossa equipe entrará em contato.");
    } catch (error) { setStatus(error.message || "Não foi possível enviar. Tente novamente."); }
    finally { setBusy(false); }
  }


  const sectionViews = {
    sobre: (<section id="sobre" className="section wrap"><span className="eyebrow">Sobre</span><h2>{blocks["sobre-01"]}</h2><p className="hero-copy">{blocks["sobre-03"]}</p></section>),
    convite: (<section id="convite" className="section wrap"><h2>{blocks["convite-01"]}</h2><p className="hero-copy">{blocks["convite-02"]}</p>{show("contato") && <a className="button primary" href="#contato">Vamos conversar</a>}</section>),
    conexoes: c.settings.globe ? (<section id="conexoes" className="section wrap"><h2>{blocks["globo-01"]}</h2><p className="hero-copy">{blocks["globo-02"]}</p><img src="/assets/automation.svg" alt="Fluxo de integração entre ferramentas" style={{width:"100%",maxWidth:700,borderRadius:20}}/></section>) : null,
    duvidas: (<section id="duvidas" className="section wrap"><h2>{blocks["duvidas-01"]}</h2>{[2,4,6,8].map(index => <details className="faq-item" key={index}><summary>{blocks[`duvidas-${String(index).padStart(2,"0")}`]}</summary><p>{blocks[`duvidas-${String(index+1).padStart(2,"0")}`]}</p></details>)}</section>),
    inicio: (<section className="hero" id="inicio" aria-labelledby={`${uid}-title`}>
        <div className="grid-bg"/>
        <motion.div className="hero-glow" initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1, scale: reduce ? 1 : [1, 1.07, 1] }} transition={intro(.1, 7)}/>
        <div className="wrap">
          <div className="hero-leading">
          <div className="motion-stage" key={replay} role="img" aria-label="awdevelop — Soluções em tecnologia">
            <div className="motion-logo" aria-hidden="true">
              <motion.div style={{ display: "flex", flexShrink: 0 }} initial={reduce ? false : { scale: .5, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ ...intro(.3, 1), type: reduce ? "tween" : "spring", bounce: .35 }}><Logo animated idSuffix="hero"/></motion.div>
              <motion.div className="motion-word" initial={reduce ? false : { maxWidth: 0 }} animate={{ maxWidth: 650 }} transition={{ ...intro(2.2, 1.2), ease: [.7, 0, .2, 1] }}>
                <div className="letters">{"awdevelop".split("").map((letter, i) => <motion.span key={i} initial={reduce ? false : { y: "110%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={intro(2.45 + i * .07, .7)}>{letter}</motion.span>)}</div>
                <motion.div className="sweep" initial={{ x: "-130%" }} animate={{ x: "130%" }} transition={intro(5, 1.1)}/>
              </motion.div>
            </div>
            <motion.p className="motion-tag" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={intro(3.9, .9)} aria-hidden="true">Soluções em tecnologia</motion.p>
            <motion.div className="motion-line" initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={intro(4.1, .9)}/>
            {!reduce && <button className="replay" onClick={() => setReplay(replay + 1)} aria-label="Repetir animação da marca"><Icon type="replay" size={12}/>Rever motion</button>}
          </div>
          <motion.div className="hero-message" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={intro(.25, .8)}>
            <span className="badge"><i/>Sites · Plataformas · Automações</span>
            <h1 id={`${uid}-title`}>{c.hero.title}<br/><span className="accent">{c.hero.accent}</span></h1>
            <p className="hero-copy">{c.hero.description}</p>

            
          </motion.div>
          </div>
            <div className="actions"><a className="button primary" href="#contato"><span className="desktop-cta-label">{c.hero.button}</span><span className="mobile-cta-label">Iniciar projeto</span> <Icon type="arrow" size={17}/></a><a className="button" href="#portfolio">Ver nossos projetos</a></div>
          <motion.div {...reveal} className="visual-showcase" aria-label="Exemplos visuais das nossas soluções">
            <a href="#servicos" className="preview-tile side"><img src="/assets/landing.svg" alt="Prévia ilustrativa de uma landing page" width="900" height="620"/><span>Seu negócio em destaque</span></a>
            <a href="#servicos" className="preview-tile main-preview"><img src="/assets/platform.svg" alt="Prévia ilustrativa de uma plataforma de gestão" width="900" height="620"/><span>Seu dia a dia mais simples</span></a>
            <a href="#servicos" className="preview-tile side"><img src="/assets/automation.svg" alt="Prévia ilustrativa de uma automação" width="900" height="620"/><span>Suas ferramentas conectadas</span></a>
          </motion.div>
          <p className="example-note">Prévias ilustrativas de soluções sob medida.</p>
          <a href="#servicos" className="scroll-hint"><span/>Veja nossas soluções</a>
        </div>
      </section>),
    faixa: (<section className="pillars" aria-label="Diferenciais awdevelop"><div className="wrap pillar-grid">{[["window", "Desenvolvimento sob medida", "Sua necessidade orienta cada escolha."], ["bolt", "SEO & performance", "Boas práticas desde a primeira linha."], ["nodes", "Automação de processos", "Ferramentas conectadas. Rotinas mais leves."]].map(([icon, title, text]) => <div className="pillar" key={title}><Icon type={icon} size={23}/><div><strong>{title}</strong></div></div>)}</div></section>),
    servicos: (<section className="section wrap" id="servicos" aria-labelledby={`${uid}-services`}>
        <motion.div {...reveal} className="section-head"><div><span className="eyebrow">O que construímos</span><h2 id={`${uid}-services`}>O que seu negócio precisa?</h2></div></motion.div>
        <div className="service-grid mobile-carousel" ref={serviceTrack} id={`${uid}-services-track`} tabIndex={0} aria-label="Serviços — deslize no celular para explorar" onScroll={event => trackSlide(event, setServiceSlide)}>{SERVICES.map((original, index) => { const item = {...original, title: blocks[`motion-service-${index}-title`] || original.title, text: blocks[`motion-service-${index}-copy`] || original.text}; return ( <motion.article {...reveal} whileHover={reduce ? undefined : { y: -7 }} className="card" key={item.n}>
          <div className="service-symbol"><span className="icon-box"><Icon type={item.icon} size={25}/></span></div><h3>{item.title}</h3><p>{item.text}</p><a className="card-cta" href="#contato" onClick={() => setService(item.short)}>{item.label}<Icon type="arrow" size={16}/></a>
        </motion.article>); })}</div>
        <CarouselControls goToSlide={goToSlide} track={serviceTrack} active={serviceSlide} items={SERVICES.map(item => item.title)} label="Serviços"/>
      </section>),
    portfolio: (<section className="section portfolio-section" id="portfolio" aria-labelledby={`${uid}-portfolio`}><div className="wrap">
        <motion.div {...reveal} className="section-head">
          <div><span className="eyebrow">Nosso portfólio</span><h2 id={`${uid}-portfolio`}>{c.portfolio.title}</h2></div>
          <p>{c.portfolio.description}</p>
        </motion.div>
        <div className="portfolio-filters" role="group" aria-label="Filtrar projetos por categoria">
          {categories.map(category => <button key={category} className={`filter-button ${portfolioFilter === category ? "active" : ""}`} aria-pressed={portfolioFilter === category} onClick={() => { setPortfolioFilter(category); setProjectSlide(0); projectTrack.current?.scrollTo({left: 0, behavior: "instant"}); }}>{category}</button>)}
        </div>
        <div className="portfolio-grid mobile-carousel" ref={projectTrack} key={portfolioFilter} tabIndex={0} aria-label="Projetos — deslize no celular para explorar" onScroll={event => trackSlide(event, setProjectSlide)}>
          {visibleProjects.map(project => <motion.article {...reveal} className="project-card" key={project.name}>
            <a className="project-image" href={project.url || "#contato"} target="_blank" rel="noopener noreferrer" aria-label={`Visitar ${project.name} (abre em nova aba)`}>
              <div className="project-browser" aria-hidden="true"><i/><i/><i/><span>{project.name}</span><Icon type="arrow" size={13}/></div>
              <img src={project.image} alt={project.alt} width="1200" height="750" loading="lazy"/>
              <span className="project-open" aria-hidden="true">Explorar projeto <Icon type="arrow" size={16}/></span>
            </a>
            <div className="project-info"><span className="project-type">{project.type}</span><h3>{project.name}</h3><p>{project.description}</p><a className="project-link" href={project.url || "#contato"} target="_blank" rel="noopener noreferrer" aria-label={`Conhecer projeto ${project.name} (abre em nova aba)`}>Conhecer projeto <Icon type="arrow" size={16}/></a></div>
          </motion.article>)}
        </div>
        {visibleProjects.length > 1 && <CarouselControls goToSlide={goToSlide} track={projectTrack} active={projectSlide} items={visibleProjects.map(item => item.name)} label="Portfólio"/>}
        {c.portfolio.note && <p className="example-note">{c.portfolio.note}</p>}
        <div className="portfolio-bottom"><p>O próximo projeto pode ser o seu.</p><a href="#contato">Vamos conversar <Icon type="arrow" size={15}/></a></div>
      </div></section>),
    processo: (<section className="section process" id="processo" aria-labelledby={`${uid}-process`}><div className="wrap">
        <motion.div {...reveal} className="section-head"><div><span className="eyebrow">Da ideia à evolução</span><h2 id={`${uid}-process`}>Da ideia ao ar, em 4 passos.</h2></div></motion.div>
        <div className="step-grid">{STEPS.map(([originalTitle, originalText], i) => { const title = blocks[`motion-step-${i}-title`] || originalTitle, text = blocks[`motion-step-${i}-copy`] || originalText; return ( <motion.div {...reveal} className="step" key={title}><div className="step-number">0{i + 1}</div><h3>{title}</h3><p>{text}</p></motion.div>); })}</div>
      </div></section>),
    contato: (<section className="section wrap" id="contato" aria-labelledby={`${uid}-contact`}>
        <motion.div {...reveal} className="contact-panel">
          <div className="contact-copy"><span className="eyebrow">Vamos construir juntos</span><h2 id={`${uid}-contact`}>{c.contact.title}</h2><p>{c.contact.description}</p><div className="contact-note"><Icon type="check" size={18}/>Primeiro contato, sem compromisso.</div></div>
          <form className="form" onSubmit={prepareEmail}><fieldset disabled={busy || sent || preview || !!pendingQuote.current}>
            <label>Seu nome<input name="name" autoComplete="name" placeholder="Como podemos chamar você?" required minLength={2} maxLength={100}/></label>
            <label>Empresa <span className="sr-only">(opcional)</span><input name="company" autoComplete="organization" placeholder="Nome da sua empresa (opcional)" maxLength={120}/></label>
            <label>E-mail profissional<input name="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" required maxLength={200}/></label>
            <label>O que você quer construir?<select required value={service} onChange={e => setService(e.target.value)}><option value="" disabled>Selecione uma solução</option>{SERVICES.map(s => <option key={s.n}>{s.short}</option>)}<option>Quero ajuda para definir</option></select></label>
            <label>WhatsApp (opcional)<input name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="DDD + número"/></label>
            <label>Sobre seu projeto<textarea name="message" required minLength={10} placeholder="Qual desafio podemos resolver juntos?" maxLength={2000}/></label>
            <label className="quote-consent"><input type="checkbox" name="consent" required/>Autorizo o contato sobre meu projeto. <a href="/privacidade">Privacidade</a></label>
            <label className="quote-honeypot" aria-hidden="true">Site<input name="website" tabIndex={-1} autoComplete="off" maxLength={200}/></label>
            </fieldset>
            <button type="submit" disabled={busy || sent || preview} className="button primary">{sent ? "Solicitação enviada" : busy ? "Enviando…" : "Solicitar contato"} <Icon type="arrow" size={16}/></button>
            <p className="form-info">{pendingQuote.current && !sent && !busy ? "Não enviado. Tente novamente para reenviar a mesma solicitação." : "Seus dados serão usados para responder à sua solicitação."}</p>
            <p className="status" role="status" aria-live="polite">{status}</p>
            <p className="fallback">Prefere escrever diretamente? <a href={`mailto:${c.contact.email}`}>{c.contact.email}</a></p>
          </form>
        </motion.div>
      </section>)
  };

  return <MotionConfig reducedMotion="user"><div className="aw min-h-screen bg-[#14161c] text-white">
    <style>{CSS.replaceAll("#6d28ff", c.settings.accent).replaceAll("#14161c", c.settings.background)}</style>
    {preview && <div className="preview-notice" role="status">PRÉVIA — conteúdo ainda não publicado. <a href="/painel/content">Voltar ao painel</a></div>}
    <a href="#principal" className="skip">Pular para o conteúdo</a>
    <header className="header">
      <div className="wrap nav">
        <a className="brand" href="#inicio" aria-label="awdevelop — início"><Logo idSuffix="header"/>{c.settings.brand}<span style={{ color: "#8c59ff" }}>.</span></a>
        <nav className="navlinks" aria-label="Navegação principal">{show("servicos") && <a href="#servicos">Soluções</a>}{show("portfolio") && <a href="#portfolio">Portfólio</a>}{show("processo") && <a href="#processo">Como trabalhamos</a>}<a className="button" href="#contato">Vamos conversar <Icon type="arrow" size={15}/></a></nav>
        <button className="button menu" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} aria-controls={`${uid}-nav`} onClick={() => setMenuOpen(!menuOpen)}><Icon type={menuOpen ? "close" : "menu"}/></button>
      </div>
      {menuOpen && <nav className="mobile-nav" id={`${uid}-nav`} aria-label="Navegação mobile">{[["Soluções", "servicos"], ["Portfólio", "portfolio"], ["Como trabalhamos", "processo"], ["Vamos conversar", "contato"]].filter(([, id]) => show(id)).map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>}
    </header>

    <main id="principal">{(c.sections || Object.keys(sectionViews).map(id => ({id, type:"builtin"}))).map(section => section.type === "custom" ? <section className="section wrap" key={section.id} id={section.id}><h2>{section.title}</h2><p className="hero-copy">{section.description}</p>{section.image && <img src={section.image} alt={section.alt} loading="lazy" style={{maxWidth:"100%",borderRadius:20}}/>}{section.url && <a className="button primary" href={section.url}>{section.button}</a>}</section> : sectionViews[section.id] ? <React.Fragment key={section.id}>{sectionViews[section.id]}</React.Fragment> : null)}    </main>
    <footer className="footer"><div className="wrap footer-row"><a className="brand" href="#inicio" aria-label="awdevelop — voltar ao início"><Logo idSuffix="footer"/>{c.settings.brand}<span style={{ color: "#8c59ff" }}>.</span></a><a className="admin-link" href="/painel/login">Área administrativa</a><nav className="footer-links" aria-label="Navegação do rodapé">{show("servicos") && <a href="#servicos">Soluções</a>}{show("portfolio") && <a href="#portfolio">Portfólio</a>}<a href="#processo">Processo</a><a href="#contato">Contato</a></nav><p>© {new Date().getFullYear()} awdevelop. Todos os direitos reservados.</p></div></footer>
  </div></MotionConfig>;
}
