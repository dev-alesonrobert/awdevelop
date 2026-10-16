import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {meetingConfig,meetingToken,isRoom} from '../server/meetings.js';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const appId='vpaas-magic-cookie-'+'a'.repeat(32);
const env={JAAS_APP_ID:appId,JAAS_API_KEY_ID:appId+'/test',JAAS_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'})};
const room='c3263f71-d475-43c1-8f1e-672a22dd2f83';

test('JaaS exige configuração RSA válida e nunca habilita conexão parcial',()=>{
 assert.equal(meetingConfig({}),null);
 assert.equal(meetingConfig({...env,JAAS_APP_ID:'https://other.example'}),null);
 assert.equal(meetingConfig({...env,JAAS_API_KEY_ID:'other/key'}),null);
 assert.equal(meetingConfig({...env,JAAS_PRIVATE_KEY:'invalid'}),null);
 assert.ok(meetingConfig({...env,JAAS_PRIVATE_KEY:env.JAAS_PRIVATE_KEY.replaceAll('\n','\\n')}));
});
test('Token RS256 limita sala, validade e permissões pagas',()=>{
 const result=meetingToken(meetingConfig(env),room,{id:'u1',name:'Aleson',role:'owner'},1000);
 const [header,body,signature]=result.jwt.split('.');
 const payload=JSON.parse(Buffer.from(body,'base64url'));
 assert.equal(verify('RSA-SHA256',Buffer.from(header+'.'+body),publicKey,Buffer.from(signature,'base64url')),true);
 assert.equal(payload.room,room);assert.equal(payload.context.room.regex,false);assert.equal(payload.exp,4600);assert.equal(payload.nbf,970);
 assert.equal(payload.context.user.moderator,'true');assert.equal(payload.context.user.name,'Aleson');assert.notEqual(payload.context.user.id,'u1');
 for(const value of Object.values(payload.context.features))assert.equal(value,false);
 assert.equal(payload.context.user.email,undefined);assert.doesNotMatch(JSON.stringify(result),/PRIVATE KEY/);
 const editor=meetingToken(meetingConfig(env),room,{id:'u1',name:'Editor',role:'editor'},1000);
 const editorPayload=JSON.parse(Buffer.from(editor.jwt.split('.')[1],'base64url'));
 assert.equal(editorPayload.context.user.moderator,'false');assert.equal(editorPayload.context.user.id,payload.context.user.id);
});
test('Convite não aceita curingas, arrays, regex ou endereços externos',()=>{
 for(const value of ['*','.*','https://evil.example',room+'x',[room],null,{}]){
  assert.equal(isRoom(value),false);assert.throws(()=>meetingToken(meetingConfig(env),value,{id:'x'}));
 }
});
