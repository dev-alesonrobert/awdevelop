import {createPrivateKey,createHash,randomUUID,sign} from 'node:crypto';

export const roomPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const isRoom=value=>typeof value==='string'&&roomPattern.test(value);
const moderators=new Set(['owner','admin']);
export function meetingConfig(env=process.env) {
 const appId=env.JAAS_APP_ID?.trim(),keyId=env.JAAS_API_KEY_ID?.trim();
 if(!/^vpaas-magic-cookie-[a-f0-9]{32}$/.test(appId||'') || !keyId?.startsWith(appId+'/') || !/^[a-zA-Z0-9_./-]{1,200}$/.test(keyId))return null;
 try {
  const key=createPrivateKey((env.JAAS_PRIVATE_KEY||'').replace(/\\n/g,'\n'));
  if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<2048)return null;
  return{appId,keyId,key};
 }catch{return null;}
}

export function meetingToken(config,room,user,now=Math.floor(Date.now()/1000)) {
 if(!isRoom(room))throw new Error('Invalid meeting room');
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const expiresAt=now+3600;
 const header=encode({alg:'RS256',typ:'JWT',kid:config.keyId});
 const payload=encode({aud:'jitsi',iss:'chat',sub:config.appId,room,iat:now,nbf:now-30,exp:expiresAt,
  context:{room:{regex:false},user:{id:createHash('sha256').update(config.appId+':'+user.id).digest('hex'),name:String(user.name||'Equipe AW Develop').slice(0,100),moderator:moderators.has(user.role)?'true':'false'},
   features:Object.fromEntries(['recording','livestreaming','transcription','sip-inbound-call','sip-outbound-call','inbound-call','outbound-call','file-upload','list-visitors'].map(key=>[key,false]))}});
 const data=header+'.'+payload;
 return{appId:config.appId,room,jwt:data+'.'+sign('RSA-SHA256',Buffer.from(data),config.key).toString('base64url'),expiresAt};
}

// Installed after the existing /api/admin authentication and same-origin middleware.
export function installMeetings(app,{env=process.env}={}) {
 app.get('/api/admin/meetings/status',(req,res)=>res.json({configured:Boolean(meetingConfig(env)),canCreate:moderators.has(req.role),provider:'JaaS',paidFeatures:false}));
 app.post('/api/admin/meetings',(req,res)=>{
  if(!moderators.has(req.role))return res.status(403).json({error:'Somente administradores podem criar reuniões.'});
  if(!meetingConfig(env))return res.status(503).json({error:'A integração JaaS ainda não foi configurada.'});
  res.status(201).json({room:randomUUID()});
 });
 app.post('/api/admin/meetings/token',(req,res)=>{
  if(!isRoom(req.body?.room))return res.status(400).json({error:'O convite da reunião é inválido.'});
  const config=meetingConfig(env);
  if(!config)return res.status(503).json({error:'A integração JaaS ainda não foi configurada.'});
  res.json(meetingToken(config,req.body.room,{id:req.editor,name:req.editorName,role:req.role}));
 });
}
