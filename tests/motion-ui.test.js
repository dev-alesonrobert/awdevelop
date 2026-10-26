import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";
import { constructorParametersDownlevelTransform } from "@angular/compiler-cli/private/tooling";
import "@angular/compiler";
import { Injector, runInInjectionContext } from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
import {
  provideHttpClientTesting,
  HttpTestingController,
} from "@angular/common/http/testing";
import { Router, ActivatedRoute } from "@angular/router";
import { TestBed } from "@angular/core/testing";
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from "@angular/platform-browser/testing";
import { parseHTML } from "linkedom";
const { document } = parseHTML("<html><body></body></html>");
document.cookie = "";
globalThis.document = document;
globalThis.window = document.defaultView;
globalThis.Node = window.Node;
globalThis.HTMLElement = window.HTMLElement;
window.confirm = () => true;
globalThis.location = {
  hash: "#test-invite-token-not-real",
  pathname: "/painel/setup",
  search: "",
};
globalThis.history = { replaceState: () => {} };
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
  configurable: true,
  get() {
    return [...this.options].find((x) => x.selected)?.value ?? "";
  },
  set(value) {
    for (const x of this.options) x.selected = x.value === value;
  },
});
const create = document.createElement.bind(document);
document.createElement = (name, ...args) => {
  const el = create(name, ...args);
  if (name === "fieldset")
    Object.defineProperty(el, "disabled", {
      get() {
        return this.hasAttribute("disabled");
      },
      set(v) {
        this.toggleAttribute("disabled", !!v);
      },
    });
  return el;
};
TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
const names = [
  "core/api",
  "features/sections/models",
  "features/motion-landing/landing-api.service",
  "features/motion-landing/carousel",
  "features/motion-landing/motion-landing.component",
  "features/motion-landing/logo/logo.component",
  "features/motion-landing/icon/icon.component",
  "features/motion-landing/contact/contact.component",
  "features/motion-landing/carousel-controls/carousel-controls.component",
  "features/motion-landing/header/header.component",
  "features/motion-landing/hero/hero.component",
  "features/motion-landing/portfolio/portfolio.component",
  "features/motion-landing/footer/footer.component",
  "features/motion-landing/process/process.component",
  "features/motion-landing/services/services.component",
  "features/motion-landing/extra-section/extra-section.component",
];
const directory = new URL("../.angular/motion-tests/", import.meta.url);
await mkdir(directory, { recursive: true });
const sources = new Map();
for (const name of names) {
  const sourcePath = fileURLToPath(
    new URL("../frontend/src/app/" + name + ".ts", import.meta.url),
  );
  let text = await readFile(sourcePath, "utf8");
  const template = text.match(/templateUrl\s*:\s*['"]([^'"]+)['"]/);
  if (template)
    text = text.replace(
      template[0],
      "template:" +
        JSON.stringify(
          await readFile(
            path.resolve(path.dirname(sourcePath), template[1]),
            "utf8",
          ),
        ),
    );
  text = text.replace(/styleUrl\s*:\s*['"][^'"]+['"]/g, "styles:[]");
  sources.set(sourcePath, text);
}
const options = {
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  experimentalDecorators: true,
  skipLibCheck: true,
  resolveJsonModule: true,
  esModuleInterop: true,
};
const host = ts.createCompilerHost(options),
  originalRead = host.readFile;
host.readFile = (p) => sources.get(p) ?? originalRead(p);
const program = ts.createProgram([...sources.keys()], options, host);
for (const name of names) {
  let result = "";
  const sourcePath = fileURLToPath(
    new URL("../frontend/src/app/" + name + ".ts", import.meta.url),
  );
  program.emit(
    program.getSourceFile(sourcePath),
    (_p, text) => {
      result = text;
    },
    undefined,
    false,
    { before: [constructorParametersDownlevelTransform(program)] },
  );
  result = result.replace(
    /from ['"]((?:\.\.\/|\.\/)[^'"]+)['"]/g,
    (_, value) =>
      value.endsWith(".json")
        ? "from " +
          JSON.stringify(
            pathToFileURL(path.resolve(path.dirname(sourcePath), value)).href,
          ) +
          ' with {type:"json"}'
        : 'from "./' + value.split("/").at(-1) + '.mjs"',
  );
  await writeFile(new URL(name.split("/").at(-1) + ".mjs", directory), result);
}
const { MotionLandingComponent } = await import(
  "../.angular/motion-tests/motion-landing.component.mjs"
);
const { ContactComponent } = await import(
  "../.angular/motion-tests/contact.component.mjs"
);
const { LandingApiService } = await import(
  "../.angular/motion-tests/landing-api.service.mjs"
);
const defaults = JSON.parse(
  await readFile(
    new URL("../dist/content-default.json", import.meta.url),
    "utf8",
  ),
);
const tick = () => new Promise((resolve) => setImmediate(resolve));
function setup(t) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const http = TestBed.inject(HttpTestingController);
  t.after(() => {
    TestBed.resetTestingModule();
    http.verify();
  });
  return http;
}
test("Angular renderiza conteúdo do painel como texto e respeita seções e ordem", async (t) => {
  const http = setup(t);
  const fixture = TestBed.createComponent(MotionLandingComponent);
  fixture.detectChanges();
  const content = structuredClone(defaults);
  content.hero.title = "<img src=x onerror=alert(1)>";
  content.sections = [
    { id: "inicio", type: "builtin" },
    {
      id: "custom-demo",
      type: "custom",
      title: "Seção da equipe",
      description: "Texto do painel",
      image: "",
      alt: "",
      url: "",
      button: "",
    },
  ];
  http.expectOne("/api/content").flush({ content });
  await tick();
  fixture.detectChanges();
  const element = fixture.nativeElement;
  assert.equal(
    element.querySelector("h1").firstChild.textContent.trim(),
    content.hero.title,
  );
  assert.equal(element.querySelector('img[src="x"]'), null);
  assert.equal(element.querySelector("#contato"), null);
  assert.ok(element.textContent.includes("Seção da equipe"));
  assert.ok(element.querySelector('a[href="/painel/login"]'));
  fixture.destroy();
});
test("Prévia privada não cai no conteúdo público quando a sessão falha", async (t) => {
  const http = setup(t);
  location.search = "?preview=1";
  t.after(() => (location.search = ""));
  const fixture = TestBed.createComponent(MotionLandingComponent);
  fixture.detectChanges();
  http
    .expectOne("/api/admin/content")
    .flush(
      { error: "Sessão necessária" },
      { status: 401, statusText: "Unauthorized" },
    );
  await tick();
  fixture.detectChanges();
  assert.equal(fixture.componentInstance.content(), null);
  assert.ok(fixture.nativeElement.textContent.includes("Entre no painel"));
  http.expectNone("/api/content");
  fixture.destroy();
});
test("Orçamento Angular bloqueia envio na prévia e conserva payload após erro de rede", async (t) => {
  const http = setup(t);
  const fixture = TestBed.createComponent(ContactComponent);
  fixture.componentRef.setInput("content", defaults);
  fixture.componentRef.setInput("preview", true);
  fixture.detectChanges();
  const c = fixture.componentInstance;
  c.form.setValue({
    name: "Cliente",
    email: "cliente@example.com",
    company: "Empresa",
    phone: "",
    service: "Landing page",
    idea: "Site para minha empresa",
    consent: true,
    website: "",
  });
  await c.send();
  http.expectNone("/api/quotes");
  fixture.componentRef.setInput("preview", false);
  fixture.detectChanges();
  let sending = c.send();
  const request = http.expectOne("/api/quotes");
  const payload = request.request.body;
  assert.equal(payload.service, "Landing page");
  assert.equal(payload.consent, true);
  request.error(new Event("error"));
  await sending;
  c.chooseService("Automação e integração");
  assert.equal(c.form.controls.service.value, "Landing page");
  sending = c.send();
  const retry = http.expectOne("/api/quotes");
  assert.deepEqual(retry.request.body, payload);
  retry.flush({ ok: true });
  await sending;
  assert.equal(c.sent(), true);
  await c.send();
  http.expectNone("/api/quotes");
  fixture.destroy();
});
test("Prévia de histórico usa a revisão solicitada", (t) => {
  const http = setup(t);
  const api = TestBed.inject(LandingApiService);
  api.load(true, "17").subscribe();
  http.expectOne("/api/admin/history/17").flush({ content: defaults });
});

test('Página Angular completa conecta escolha de serviço ao formulário e filtra portfólio', async t => {
  const http = setup(t);
  const fixture = TestBed.createComponent(MotionLandingComponent);
  fixture.detectChanges();
  http.expectOne('/api/content').flush({content: structuredClone(defaults)});
  await tick();
  fixture.detectChanges();
  const element = fixture.nativeElement;
  const serviceLink = element.querySelector('#servicos .card-cta');
  serviceLink.dispatchEvent(new window.Event('click', {bubbles:true}));
  fixture.detectChanges();
  assert.equal(fixture.componentInstance.contact().form.controls.service.value, 'Landing page');
  const track = element.querySelector('.portfolio-grid');
  track.scrollTo = () => {};
  const filters = element.querySelectorAll('.filter-button');
  if(filters.length > 1) {
    filters[1].dispatchEvent(new window.Event('click', {bubbles:true}));
    fixture.detectChanges();
    const category = filters[1].textContent.trim();
    assert.equal(element.querySelectorAll('.project-card').length, defaults.portfolio.projects.filter(project => project.category === category).length);
  }
  const menu = element.querySelector('.menu');
  menu.dispatchEvent(new window.Event('click', {bubbles:true}));
  fixture.detectChanges();
  assert.equal(menu.getAttribute('aria-expanded'), 'true');
  assert.ok(element.querySelector('#motion-mobile-nav'));
  fixture.destroy();
});
