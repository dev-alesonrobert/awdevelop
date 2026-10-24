import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeContent } from '../server/content-normalizer.js';
import { contentSchema } from '../server/content-schema.js';
import defaults from '../dist/content-default.json' with {type:'json'};
import legacy from '../dist/content-legacy.json' with {type:'json'};

test('A nova página e os documentos normalizados continuam editáveis pelo painel', () => {
  assert.ok(contentSchema.safeParse(defaults).success);
  const upgraded = normalizeContent(legacy);
  assert.ok(contentSchema.safeParse(upgraded).success);
  assert.deepEqual(upgraded.hero, defaults.hero);
  assert.deepEqual(upgraded.portfolio.projects, defaults.portfolio.projects);
  assert.deepEqual(normalizeContent(upgraded), upgraded);
  assert.deepEqual(legacy.hero.title, 'Seu próximo site.\nSeu próprio sistema.');
});
test('A atualização preserva textos, projetos e ordem personalizados pelo administrador', () => {
  const custom = structuredClone(legacy);
  custom.hero.title = 'Título escolhido pela equipe';
  custom.portfolio.projects[0].summary = 'Projeto editado pelo administrador';
  custom.sections = [{id:'portfolio',type:'builtin'}, {id:'contato',type:'builtin'}];
  custom.blocks['motion-service-0-title'] = 'Uma solução personalizada';
  const upgraded = normalizeContent(custom);
  assert.equal(upgraded.hero.title, custom.hero.title);
  assert.deepEqual(upgraded.portfolio.projects, custom.portfolio.projects);
  assert.deepEqual(upgraded.sections, custom.sections);
  assert.equal(upgraded.blocks['motion-service-0-title'], custom.blocks['motion-service-0-title']);
});
