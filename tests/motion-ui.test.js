import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import defaults from '../dist/content-default.json' with {type:'json'};
const require = createRequire(import.meta.url);
const output = buildSync({entryPoints:['frontend/motion/App.jsx'],bundle:true,platform:'node',format:'cjs',packages:'external',write:false}).outputFiles[0].text;
const module = {exports:{}};
new Function('require','module','exports',output)(require,module,module.exports);
const App = module.exports.default;
const render = (content,preview=false) => renderToStaticMarkup(React.createElement(App,{content,preview}));

test('O site exibe o conteúdo do administrador sem interpretar texto como HTML', () => {
  const content = structuredClone(defaults);
  content.hero.title = '<img src=x onerror=alert(1)>';
  content.portfolio.projects[0].title = 'Projeto publicado pelo painel';
  const html = render(content);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('Projeto publicado pelo painel'));
  assert.ok(html.includes('href="/painel/login"'));
  assert.ok(html.includes('name="consent"'));
  assert.ok(!html.includes('Preparar meu contato'));
});
test('O site respeita ordem e exclusão de seções e oferece prévia sem envio', () => {
  const content = structuredClone(defaults);
  content.sections = [{id:'portfolio',type:'builtin'},{id:'custom-demo',type:'custom',title:'Uma seção da equipe',description:'Conteúdo do administrador',image:'',alt:'',button:'',url:''}];
  const html = render(content, true);
  assert.ok(!html.includes('id="inicio"'));
  assert.ok(!html.includes('id="contato"'));
  assert.ok(html.indexOf('id="portfolio"') < html.indexOf('id="custom-demo"'));
  assert.ok(html.includes('PRÉVIA'));
  assert.ok(html.includes('Uma seção da equipe'));
});
