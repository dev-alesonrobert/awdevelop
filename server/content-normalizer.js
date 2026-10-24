import defaults from '../dist/content-default.json' with { type: 'json' };
import legacy from '../dist/content-legacy.json' with { type: 'json' };
import catalog from '../dist/section-catalog.json' with { type: 'json' };

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

// Upgrade only unchanged reference values. Content edited by the team takes precedence.
export function normalizeContent(content) {
  if (!content || typeof content !== 'object') return content;
  const next = structuredClone(content);
  for (const group of ['hero', 'contact', 'settings']) {
    if (!next[group]) continue;
    for (const [key, oldValue] of Object.entries(legacy[group])) {
      if (next[group][key] === oldValue) next[group][key] = defaults[group][key];
    }
  }
  if (next.portfolio) {
    for (const key of ['title', 'description', 'note']) {
      if (next.portfolio[key] === legacy.portfolio[key]) next.portfolio[key] = defaults.portfolio[key];
    }
    if (same(next.portfolio.projects, legacy.portfolio.projects)) next.portfolio.projects = structuredClone(defaults.portfolio.projects);
  }
  next.blocks = { ...defaults.blocks, ...next.blocks };
  const referenceIds = catalog.map(section => section.id);
  if (!next.sections || (next.sections.length === referenceIds.length && next.sections.every((section, index) => section.type === 'builtin' && section.id === referenceIds[index]))) next.sections = structuredClone(defaults.sections);
  return next;
}
