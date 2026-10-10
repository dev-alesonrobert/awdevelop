const token=location.hash.slice(1);
history.replaceState(null,'',location.pathname);
const form=document.querySelector('#setup'),status=document.querySelector('#login-status'),button=form.querySelector('button');
if(!token){button.disabled=true;status.textContent='Abra o convite de configuração fornecido para este site.';}
form.addEventListener('submit',async event=>{
  event.preventDefault();const data=new FormData(form);
  if(data.get('password')!==data.get('confirmation')){status.textContent='As senhas precisam ser iguais.';return;}
  button.disabled=true;status.textContent='Configurando seu acesso…';
  try{const response=await fetch('/api/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password:data.get('password'),confirmation:data.get('confirmation')})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível criar seu acesso.');form.reset();location.replace('/admin/');}
  catch(error){status.textContent=error.message;button.disabled=false;}
});
