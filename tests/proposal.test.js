import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import ts from 'typescript';
import {PDFDocument,StandardFonts} from 'pdf-lib';

const directory=new URL('../.angular/proposal-tests/',import.meta.url);
await mkdir(directory,{recursive:true});
for(const name of ['proposal.models','proposal-document']) {
 const source=await readFile(new URL('../frontend/src/app/features/quotes/proposal/'+name+'.ts',import.meta.url),'utf8');
 const result=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replaceAll("'./proposal.models'","'./proposal.models.mjs'");
 await writeFile(new URL(name+'.mjs',directory),result);
}
const {initialProposal,proposalError}=await import('../.angular/proposal-tests/proposal.models.mjs');
const {createProposalPdf,wrapText}=await import('../.angular/proposal-tests/proposal-document.mjs');
const draft={client:'João da Silva',company:'Clínica Estética',title:'Site institucional',scope:'Criação de cinco páginas.\nIntegração com WhatsApp e formulário de contato.',deadline:'30 dias úteis após aprovação e recebimento dos materiais.',amount:4500.5,conditions:'50% na aprovação e 50% na entrega.',validUntil:'2099-12-31'};

test('Proposta preenche só dados públicos do orçamento e exige decisões comerciais',()=>{
 const initial=initialProposal({name:'João',company:'Cliente',service:'Site',idea:'Projeto',notes:'SEGREDO INTERNO',status:'new'});
 assert.equal(initial.scope,'Projeto'); assert.equal(initial.amount,null);assert.equal(initial.deadline,'');assert.equal(initial.conditions,'');assert.equal(initial.validUntil,'');
 assert.doesNotMatch(JSON.stringify(initial),/SEGREDO|status/);
 assert.match(proposalError(initial),/prazo/);assert.equal(proposalError(draft),'');
});
test('Validação impede preço inválido, datas vencidas e textos excessivos',()=>{
 for(const amount of [0,-1,NaN,Infinity,1.234,100000000])assert.match(proposalError({...draft,amount}),/investimento/);
 for(const validUntil of ['2020-01-01','2099-02-31','x'])assert.match(proposalError({...draft,validUntil}),/validade/);
 assert.match(proposalError({...draft,scope:'x'.repeat(6001)}),/6000/);
 assert.match(proposalError({...draft,conditions:'  '}),/pagamento/);
});
test('PDF mantém acentos, metadados comerciais e quebra páginas em textos longos',async()=>{
 const bytes=await createProposalPdf(draft,'17',new Date('2026-10-15T12:00:00Z'));
 const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getAuthor(),'AW Develop');assert.equal(pdf.getTitle(),'Proposta comercial - Site institucional');assert.equal(pdf.getPageCount(),1);
 const long=await PDFDocument.load(await createProposalPdf({...draft,scope:('Entrega revisada e documentada.\n').repeat(180)},'17'));
 assert.ok(long.getPageCount()>3);
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const lines=wrapText('https://example.com/'+ 'a'.repeat(400),font,11,499);
 assert.ok(lines.length>3);for(const line of lines)assert.ok(font.widthOfTextAtSize(line,11)<=499);
});
test('Caracteres incompatíveis retornam erro explícito sem alterar o texto fornecido',async()=>{
 const input={...draft,title:'Site 🚀'};
 await assert.rejects(createProposalPdf(input,'17'),/caractere não suportado/);
 assert.equal(input.title,'Site 🚀');
});
