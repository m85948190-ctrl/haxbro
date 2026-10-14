const $=s=>document.querySelector(s),messages=$('#messages'),input=$('#promptInput');
let kaiImageWorker=null,kaiImageRequestId=0;const kaiImagePending=new Map();
function getKaiImageWorker(){
  if(kaiImageWorker)return kaiImageWorker;
  const worker=new Worker('/kai-image-worker.js?v=3',{type:'module'});
  worker.onmessage=event=>{const data=event.data||{};if(data.type==='status'){kaiActivityStep('vision','Local image analysis',String(data.status||'Analyzing image locally'),'','running');return}if(data.type!=='result')return;const pending=kaiImagePending.get(data.id);if(!pending)return;kaiImagePending.delete(data.id);clearTimeout(pending.timer);if(data.ok)pending.resolve(String(data.caption||''));else pending.reject(new Error(data.error||'Local image analysis failed'))};
  worker.onerror=event=>{for(const [id,pending] of kaiImagePending){clearTimeout(pending.timer);pending.reject(new Error('Local image worker failed to load. '+String(event.message||'')));kaiImagePending.delete(id)}try{worker.terminate()}catch{}if(kaiImageWorker===worker)kaiImageWorker=null};
  kaiImageWorker=worker;return worker;
}
async function analyzeAttachedImage(file){
  if(!file||!/^image\//i.test(file.type||''))throw new Error('Choose a supported image file.');
  if(file.size>12*1024*1024)throw new Error('This image is larger than 12 MB. Choose a smaller image.');
  const buffer=await file.arrayBuffer(),worker=getKaiImageWorker(),id=++kaiImageRequestId;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{kaiImagePending.delete(id);reject(new Error('Local image analysis took too long. Retry in a WebGPU-capable browser or use a smaller image.'))},180000);
    kaiImagePending.set(id,{resolve,reject,timer});
    try{worker.postMessage({type:'analyze',id,buffer,mime:file.type||'image/jpeg'},[buffer])}catch(error){clearTimeout(timer);kaiImagePending.delete(id);reject(error)}
  });
}
function haxbroDevice(){const ua=navigator.userAgent||'',ios=/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),android=/Android/i.test(ua);return ios?'ios':android?'android':'desktop'}function initHaxbroDevice(){const device=haxbroDevice();document.documentElement.dataset.device=device;document.body.dataset.device=device;window.HAxBRO_DEVICE=device;return device}initHaxbroDevice();function openHaxbroFile(url){if(!url)return;const device=haxbroDevice();if(device==='ios'){window.open(url,'_blank','noopener,noreferrer');return}const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';if(device==='android')a.setAttribute('download','');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>{if(document.visibilityState==='visible')window.open(url,'_blank','noopener,noreferrer')},450)}let selectedPlugin=null;const cyberTerms=/\b(cybersecurity|cyber security|security|hacking|hacker|ethical hacking|pentest|penetration test|vulnerability|vulnerabilities|exploit|exploitation|malware|ransomware|phishing|social engineering|ctf|soc|siem|firewall|encryption|cryptography|forensics|incident response|zero[- ]day|xss|sql injection|sqli|csrf|ddos|botnet|reverse shell|payload)\b/i;const cyberAlertTerms=/\b(ransomware|malware|phishing|credential theft|steal credentials|ddos|botnet|zero[- ]day|exploit|exploitation|payload|reverse shell|shellcode|attack|breach|incident)\b/i;function applyContextTheme(text){const t=String(text||'');const cyber=cyberTerms.test(t);document.body.classList.toggle('cyber-ui',cyber);document.body.classList.toggle('cyber-alert',cyber&&cyberAlertTerms.test(t));localStorage.setItem('haxbro_context_theme',cyber?'cyber':'normal')}function updateCustomerProfile(name){const card=$('#customerProfile'),avatar=$('#customerProfileAvatar'),label=$('#customerProfileName'),role=$('#customerProfileRole'),topUser=$('#topUsername');const n=String(name||localStorage.getItem('haxbro_username')||'').trim();if(topUser){topUser.hidden=!n;const b=topUser.querySelector('b');if(b)b.textContent=n||'—'}if(!card||!avatar||!label)return;if(overdrive&&overdrive===true){avatar.textContent='A';label.textContent='A';if(role)role.textContent='ADMIN MODE · HAxBRO OWNER';card.hidden=false;avatar.style.background='linear-gradient(135deg,#7f0715,#ff1f3d)';return}if(!n){card.hidden=true;return}const first=(n.match(/[A-Za-z0-9]/)||['?'])[0].toUpperCase();let sum=0;for(let i=0;i<n.length;i++)sum+=n.charCodeAt(i)*(i+1);const colors=['linear-gradient(135deg,#315cff,#159bd8)','linear-gradient(135deg,#e23b5d,#ff7a59)','linear-gradient(135deg,#7c3aed,#21d4fd)','linear-gradient(135deg,#00a86b,#315cff)','linear-gradient(135deg,#f59e0b,#ef4444)','linear-gradient(135deg,#0ea5e9,#8b5cf6)'];avatar.textContent=first;avatar.style.background=colors[sum%colors.length];label.textContent=n;card.hidden=false}const haxbroStartupUser=(localStorage.getItem('haxbro_username')||'').trim();const haxbroUserKey=key=>{const name=(localStorage.getItem('haxbro_username')||'anonymous-device').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'_').slice(0,64)||'anonymous-device';return 'haxbro:user:'+name+':'+key};if(haxbroStartupUser){for(const pair of [['chats','haxbro_chats'],['admin_chats','haxbro_admin_chats'],['mode','haxbro_mode'],['study','haxbro_study']]){const scoped=haxbroUserKey(pair[0]);if(!localStorage.getItem(scoped)&&localStorage.getItem(pair[1])){try{localStorage.setItem(scoped,localStorage.getItem(pair[1]));localStorage.removeItem(pair[1])}catch{}}}}let mode=localStorage.getItem(haxbroUserKey('mode'))||'normal',study=localStorage.getItem(haxbroUserKey('study'))==='true',kaiMode='deep',chats=JSON.parse(localStorage.getItem(haxbroUserKey('chats'))||'[]'),current=null,adminChats=JSON.parse(localStorage.getItem(haxbroUserKey('admin_chats'))||'[]'),adminCurrent=null;const ADMIN69='admin69';let overdrive=false;let admin69Busy=false;let lastSendValue='';let lastSendAt=0;let sendInFlight=false,sendWatchdogTimer=null,sendAttemptId=0,activeChatController=null,activeRealtimeClient=null,activeStreamReader=null;function withChatTimeout(work,ms,label='KAI request'){let timer,abortHandler;const signal=activeChatController?.signal;const task=Promise.resolve().then(()=>typeof work==='function'?work():work);const races=[task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out after '+ms+'ms')),ms)})];if(signal)races.push(new Promise((_,reject)=>{abortHandler=()=>reject(new DOMException('Response stopped by user','AbortError'));if(signal.aborted)abortHandler();else signal.addEventListener('abort',abortHandler,{once:true})}));return Promise.race(races).finally(()=>{clearTimeout(timer);if(signal&&abortHandler)signal.removeEventListener('abort',abortHandler)});}function cancelChatResponse(){if(!sendInFlight)return false;sendAttemptId++;clearTimeout(sendWatchdogTimer);sendWatchdogTimer=null;try{activeChatController?.abort()}catch{}try{activeRealtimeClient?.close?.()}catch{}activeRealtimeClient=null;try{activeStreamReader?.cancel?.()}catch{}activeStreamReader=null;sendInFlight=false;setBusy(false);if(thinkingTimer){clearInterval(thinkingTimer);thinkingTimer=null}if(thinkingBubble){thinkingBubble.remove();thinkingBubble=null;thinkingSeq++}kaiActivityStart('light');kaiActivityStep('stopped','Response stopped','Stopped by you · background response delivery cancelled','', 'done');kaiActivityFinish({cancelled:true});const b=$('#sendBtn');if(b){b.classList.remove('busy','stop-mode');b.disabled=false;b.setAttribute('aria-busy','false');b.setAttribute('aria-label','Send');b.title='Send message';if(b.dataset.sendIdleHtml)b.innerHTML=b.dataset.sendIdleHtml}return true;}document.addEventListener('click',e=>{if(e.target?.closest?.('#sendBtn')&&sendInFlight){e.preventDefault();e.stopImmediatePropagation();cancelChatResponse();}},true);document.addEventListener('keydown',e=>{if(e.target===input&&e.key==='Enter'&&!e.shiftKey&&sendInFlight){e.preventDefault();e.stopImmediatePropagation();cancelChatResponse();}},true);function isExplicitWebLookup(text){return /\b(?:search (?:the )?(?:web|internet|online)|look up|latest|recent|today|news|price|cost|weather|current version|official source|verify online|check online|find sources|research current)\b/i.test(String(text||''));}function getKaiProfile(){let p;try{p=JSON.parse(localStorage.getItem(haxbroUserKey('kai_profile'))||'null')}catch(e){p=null}const username=(localStorage.getItem('haxbro_username')||'').trim();if(!username)return p;const safe=username.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32)||'User';if(!p||p.username!==username){p={id:'kai61_'+safe+'_'+uid(),username,agentName:username+' AI Agent',createdAt:Date.now(),storage:'browser-local'};localStorage.setItem(haxbroUserKey('kai_profile'),JSON.stringify(p))}return p}const modes={normal:{name:'NORMAL',desc:'Friendly, helpful, creative AI.',hint:'Normal mode is conversational'},beast:{name:'BEAST',desc:'Concise, blunt cybersecurity expert.',hint:'Beast mode: VERDICT · RISK · FIX · VERIFY'},hacking:{name:'HACKING',desc:'Ethical hacking lab and CTF assistant.',hint:'Hacking mode: authorized labs, CTFs, recon concepts and defensive testing'}};function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}function save(){localStorage.setItem(haxbroUserKey('chats'),JSON.stringify(chats));localStorage.setItem(haxbroUserKey('admin_chats'),JSON.stringify(adminChats))}function welcome(){return [{who:'bot',text:study?'Study Mode enabled. Tell me what you want to learn and I will explain it step by step.':'HAxBRO ready. What are we building today?'}]}function adminWelcome(){return [{who:'bot',text:'KAI AGENT READY. Give KAI an authorized task. Admin execution history is isolated from your normal HAxBRO chats.'}]}function newChat(){if(overdrive){adminCurrent=uid();adminChats.unshift({id:adminCurrent,title:'New KAI execution',items:adminWelcome(),updated:Date.now()});save();renderHistory();renderMessages();return}current=uid();chats.unshift({id:current,title:'New conversation',items:welcome(),updated:Date.now()});save();renderHistory();renderMessages()}function active(){return overdrive?adminChats.find(c=>c.id===adminCurrent):chats.find(c=>c.id===current)}function renderMessages(){messages.innerHTML='';(active()?.items||[]).forEach(x=>addMessage(x.text,x.who,false));messages.scrollTop=messages.scrollHeight}function renderHistory(){const boxes=[$('#chatHistory'),$('#mobileChatHistory')].filter(Boolean);boxes.forEach(box=>box.innerHTML='');const list=overdrive?adminChats:chats;const selected=overdrive?adminCurrent:current;list.sort((a,b)=>b.updated-a.updated).slice(0,30).forEach(c=>{boxes.forEach(box=>{const row=document.createElement('div');row.className='history-row'+(c.id===selected?' selected':'');const b=document.createElement('button');b.className='history-item';b.textContent=c.title;b.onclick=()=>{if(overdrive)adminCurrent=c.id;else current=c.id;renderHistory();renderMessages()};const more=document.createElement('button');more.className='history-more';more.type='button';more.textContent='⋯';more.title='Chat options';more.setAttribute('aria-label','Chat options');more.onclick=e=>{e.stopPropagation();showChatMenu(c,more)};row.append(b,more);box.appendChild(row)})})}function showChatMenu(c,anchor){document.querySelectorAll('.chat-menu-pop').forEach(x=>x.remove());const menu=document.createElement('div');menu.className='chat-menu-pop';menu.innerHTML='<button type="button">DELETE CHAT</button>';menu.firstChild.onclick=()=>{if(overdrive){adminChats=adminChats.filter(x=>x.id!==c.id);if(adminCurrent===c.id)adminCurrent=adminChats[0]?.id||null}else{chats=chats.filter(x=>x.id!==c.id);if(current===c.id)current=chats[0]?.id||null}if(overdrive){if(!adminCurrent)newChat();else{save();renderHistory();renderMessages()}}else if(!current)newChat();else{save();renderHistory();renderMessages()}menu.remove()};document.body.appendChild(menu);const r=anchor.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(window.innerWidth-150,r.right-150))+'px';menu.style.top=(r.bottom+6)+'px';setTimeout(()=>{const close=e=>{if(!menu.contains(e.target)&&e.target!==anchor){menu.remove();document.removeEventListener('click',close)}};document.addEventListener('click',close)},0)}function setMode(m){mode=m;localStorage.setItem(haxbroUserKey('mode'),m);document.body.classList.toggle('beast-ui',m==='beast');$('#modeName').textContent=modes[m].name;$('#modeDesc').textContent=modes[m].desc;$('#headMode').textContent=modes[m].name;$('#modeHint').textContent=modes[m].hint;document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));if(m==='normal'&&!overdrive){document.body.classList.remove('overdrive-ui');const h=$('#adminUltimaxHeader');if(h){h.setAttribute('aria-hidden','true');h.style.display='none'}}}function openUltimaxMode(prefill=''){if(!overdrive)return;const header=$('#adminUltimaxHeader');if(header){header.setAttribute('aria-hidden','false');header.style.removeProperty('display')}const field=$('#promptInput');if(field){field.value=prefill;field.focus();resize()}document.body.classList.remove('ultimax-open')}
function closeUltimaxMode(){const panel=$('#ultimaxMode');if(panel){panel.hidden=true;panel.setAttribute('aria-hidden','true')}const header=$('#adminUltimaxHeader');if(header){header.setAttribute('aria-hidden','true');header.style.display='none'}document.body.classList.remove('ultimax-open')}
function setOverdrive(v=true){overdrive=!!v;document.body.classList.toggle('overdrive-ui',overdrive);document.body.classList.toggle('kai69-secret-mode',overdrive);if(overdrive){document.body.classList.remove('beast-ui','cyber-ui','cyber-alert');document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.sidebar,.topbar,.chat-head,.chat-panel,.mobile-menu,.ultimax-live-rail').forEach(el=>{if(el)el.dataset.kai69Hidden='1'});if(window.HAxBROAdmin69Simulation?.open)window.HAxBROAdmin69Simulation.open();}else{document.querySelectorAll('[data-kai69-hidden]').forEach(el=>delete el.dataset.kai69Hidden);window.HAxBROAdmin69Simulation?.close?.();setMode(mode);renderHistory();renderMessages();applyContextTheme('')}}async function checkAdmin69(text){
 const v=String(text||'').trim().toLowerCase();
 // ADMIN 69 is an explicit local workspace command. It always wins before
 // App Maker, Decoder, research, normal chat, or any other router.
 const isAdmin69=/^admin\s*69$/.test(v);
 if(!isAdmin69)return false;
 admin69Busy=false;
 sessionStorage.setItem('haxbro_admin69_triggered','true');
 setOverdrive(true);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(!document.body.classList.contains('overdrive-ui'))setOverdrive(true);
   window.HAxBROAdmin69Simulation?.open?.();
 }));
 return true;
}


function ensureAdmin69Pill(){
 const wrap=document.querySelector('.input-wrap');if(!wrap)return;
 let pill=wrap.querySelector('.admin69-pill');
 if(!pill){pill=document.createElement('span');pill.className='admin69-pill';pill.textContent='ADMIN 69';pill.setAttribute('aria-label','Admin 69 mode');wrap.insertBefore(pill,wrap.firstChild)}
 pill.hidden=!overdrive;
}
function admin69IsDestructive(command){
 return /\b(?:delete|remove|destroy|drop|wipe|erase|purge|overwrite|disable|revoke|terminate|kill|shut\s*down|reset|factory\s*reset|uninstall|publish|deploy|write\s+to|modify\s+(?:production|live)|change\s+(?:production|live)|send\s+email|send\s+message|transfer|charge|purchase)\b/i.test(String(command||''));
}
async function admin69ExternalHandoff(command){
 const endpoint=String(window.HAxBROAdmin69DestructiveEndpoint||localStorage.getItem('haxbro_admin69_destructive_endpoint')||'').trim();
 if(!endpoint) return {ok:false,configured:false};
 try{
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'HAxBRO AI',agent:'KAI 51',mode:'ADMIN 69',message:String(command||''),timestamp:new Date().toISOString()})});
   const data=await r.json().catch(()=>({}));
   return {ok:r.ok,configured:true,data};
 }catch(e){return {ok:false,configured:true,error:e?.message||'handoff failed'}}
}
function resize(){if(!input)return;input.style.height='auto';input.style.height=Math.min(input.scrollHeight,180)+'px'}function setKaiMode(){kaiMode='deep'}
function esc(v){const d=document.createElement('div');d.textContent=String(v??'');return d.innerHTML}
function renderRich(text){const raw=String(text??'');const parts=raw.split(/```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g);let html='';for(let i=0;i<parts.length;i+=3){let plain=esc(parts[i]).replace(/\n/g,'<br>');plain=plain.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener" class="hax-file-link">$1 ↗</a>');plain=plain.replace(/(^|[\s>])(https?:\/\/[^\s<]+)/g,'$1<a href="$2" target="_blank" rel="noopener" class="hax-file-link">$2 ↗</a>');plain=plain.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');html+=plain;if(i+2<parts.length){const lang=(parts[i+1]||'text').toLowerCase();const code=parts[i+2];const id='code_'+uid();html+='<div class="hax-code-wrap"><div class="hax-code-bar"><span>'+esc(lang)+'</span><button type="button" data-copy-code="'+id+'">COPY</button>'+(lang==='html'||lang==='htm'?' <button type="button" data-preview-html="'+id+'">PREVIEW</button>':'')+'</div><pre class="hax-code"><code id="'+id+'">'+esc(code)+'</code></pre>'+(lang==='html'||lang==='htm'?'<iframe class="hax-html-preview" id="preview_'+id+'" sandbox="allow-scripts" hidden></iframe>':'')+'</div>'}}return html}
function bindRichControls(scope){scope.querySelectorAll('.hax-file-link').forEach(a=>{if(/^DOWNLOAD/i.test((a.textContent||'').trim()))a.onclick=e=>{e.preventDefault();openHaxbroFile(a.href)}});scope.querySelectorAll('[data-copy-code]').forEach(b=>b.onclick=async()=>{const c=document.getElementById(b.dataset.copyCode);if(c){await navigator.clipboard?.writeText(c.textContent||'');const old=b.textContent;b.textContent='COPIED ✓';setTimeout(()=>b.textContent=old,1200)}});scope.querySelectorAll('[data-preview-html]').forEach(b=>b.onclick=()=>{const id=b.dataset.previewHtml,c=document.getElementById(id),frame=document.getElementById('preview_'+id);if(!c||!frame)return;frame.hidden=!frame.hidden;if(!frame.hidden)frame.srcdoc=c.textContent||''})}
function kaiSpeechLocale(text){
 const s=String(text||'');
 if(/[\u0980-\u09FF]/.test(s))return 'bn-IN';
 if(/[\u0900-\u097F]/.test(s))return 'hi-IN';
 if(/[\u0B80-\u0BFF]/.test(s))return 'ta-IN';
 if(/[\u0C00-\u0C7F]/.test(s))return 'te-IN';
 if(/[\u0C80-\u0CFF]/.test(s))return 'kn-IN';
 if(/[\u0D00-\u0D7F]/.test(s))return 'ml-IN';
 if(/[\u0A80-\u0AFF]/.test(s))return 'gu-IN';
 if(/[\u0A00-\u0A7F]/.test(s))return 'pa-IN';
 if(/[\u0600-\u06FF]/.test(s))return 'ar-SA';
 if(/[\u0590-\u05FF]/.test(s))return 'he-IL';
 if(/[\u0400-\u04FF]/.test(s))return 'ru-RU';
 if(/[\u0370-\u03FF]/.test(s))return 'el-GR';
 if(/[\u3040-\u30FF]/.test(s))return 'ja-JP';
 if(/[\uAC00-\uD7AF]/.test(s))return 'ko-KR';
 if(/[\u3400-\u9FFF]/.test(s))return 'zh-CN';
 return 'en-US';
}
function kaiSpeechClean(text){
 return String(text||'').replace(/https?:\/\/\S+/gi,' ').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D]/gu,' ').replace(/[\\*_#~>|]/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,5000);
}
function pickKaiFemaleVoice(locale){
 const voices=window.speechSynthesis?.getVoices?.()||[]; const lang=String(locale||'en').toLowerCase(); const base=lang.split('-')[0]; const femaleHints=/female|woman|zira|samantha|victoria|karen|moira|ava|susan|heera|veena|raveena|tessa|aria|jenny/i;
 return voices.find(v=>v.lang?.toLowerCase()===lang&&femaleHints.test(v.name))||voices.find(v=>v.lang?.toLowerCase().startsWith(base+'-')&&femaleHints.test(v.name))||voices.find(v=>v.lang?.toLowerCase().startsWith(base+'-'))||voices.find(v=>femaleHints.test(v.name))||voices[0]||null;
}
function speakHaxbroText(text,button){
 if(!('speechSynthesis' in window)){if(button)button.textContent='VOICE N/A';return}
 const cleanText=kaiSpeechClean(text); if(!cleanText){if(button)button.textContent='NO TEXT';return}
 window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(cleanText); u.lang=kaiSpeechLocale(cleanText); const voice=pickKaiFemaleVoice(u.lang); if(voice)u.voice=voice; u.rate=0.96; u.pitch=1.08; u.volume=1;
 if(button){button.textContent='STOP';u.onend=()=>button.textContent='SPEAK';u.onerror=()=>button.textContent='SPEAK'} window.speechSynthesis.speak(u);
}
function addMessage(text,who='bot',saveIt=true){if(!messages)return;const wrap=document.createElement('div');const isUser=who==='user';wrap.className='message '+(isUser?'user-msg':'bot-msg')+(overdrive?' admin-chat-msg':'');const avatar=isUser?'<span>U</span>':(overdrive?'<span class="kai-chat-avatar">K</span>':'<img src="/logo-symbol.svg?v=218" alt="HAxBRO">');wrap.innerHTML='<div class="avatar message-avatar">'+avatar+'</div><div class="message-body"><div class="bubble message-copy">'+(isUser?esc(text).replace(/\n/g,'<br>'):renderRich(text))+'</div></div>';messages.appendChild(wrap);if(!isUser){bindRichControls(wrap);const speak=document.createElement('button');speak.type='button';speak.className='kai-speak-btn';speak.textContent='SPEAK';speak.setAttribute('aria-label','Speak this answer');speak.onclick=()=>speakHaxbroText(text,speak);wrap.querySelector('.message-body')?.appendChild(speak)}if(saveIt){const c=active();if(c){c.items.push({who,text});c.updated=Date.now();save();renderHistory()}}messages.scrollTop=messages.scrollHeight}
function ensureChat(){if(!current||!active()){newChat()}}
function getKaiMemory(){try{const a=JSON.parse(localStorage.getItem('haxbro_kai_memory_notes')||'[]');return Array.isArray(a)?a.slice(-12):[]}catch(e){return[]}}
function updateKaiMemory(text){try{const a=getKaiMemory();a.push({text:String(text||'').slice(0,900),at:Date.now()});localStorage.setItem('haxbro_kai_memory_notes',JSON.stringify(a.slice(-12)))}catch(e){}}
let thinkingBubble=null,thinkingTimer=null,thinkingStartedAt=0,thinkingEstimateSec=12,thinkingSeq=0;
const KAI_ACTIVITY_STAGES=[];
function kaiHostFromUrl(url){try{return new URL(url).hostname.replace(/^www\\./,'')}catch{return''}}
function kaiFavicon(url){const host=kaiHostFromUrl(url);return host?'https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=32':''}
function kaiActivityRow(label,detail='',iconUrl='',state='done',key=''){const row=document.createElement('div');row.className='kai-activity-row kai-activity-'+state;if(key)row.dataset.activityKey=key;const icon=document.createElement('span');icon.className='kai-activity-icon';const hatch=/\\bhatchable\\b/i.test(String(label||'')+' '+String(detail||''));if(hatch&&!iconUrl)iconUrl='about:blank';if(iconUrl){const img=document.createElement('img');img.alt='';img.src=iconUrl;img.dataset.fallback='google';img.onerror=()=>{try{const u=new URL(img.src);const host=u.hostname;if(img.dataset.fallback==='google'){img.dataset.fallback='duck';img.src='https://icons.duckduckgo.com/ip3/'+encodeURIComponent(host)+'.ico';return}}catch{}img.remove();icon.textContent=(String(label||'•').trim()[0]||'•').toUpperCase()};icon.appendChild(img)}else{icon.textContent=(String(label||'•').trim()[0]||'•').toUpperCase()}const copy=document.createElement('span');copy.className='kai-activity-copy';const main=document.createElement('span');main.textContent=label;copy.appendChild(main);if(detail){const sub=document.createElement('small');sub.textContent=detail;copy.appendChild(sub)}const mark=document.createElement('span');mark.className='kai-activity-state';mark.textContent=state==='running'?'':state==='error'?'!':'✓';row.append(icon,copy,mark);return row}
function kaiActivityFind(key){return thinkingBubble?.querySelector('[data-activity-key="'+CSS.escape(key)+'"]')||null}
function kaiActivitySet(key,state,detail){const row=kaiActivityFind(key);if(!row)return;row.classList.remove('kai-activity-running','kai-activity-done','kai-activity-error');row.classList.add('kai-activity-'+state);const mark=row.querySelector('.kai-activity-state');if(mark)mark.textContent=state==='running'?'':state==='error'?'!':'✓';if(detail){let sub=row.querySelector('small');if(!sub){sub=document.createElement('small');row.querySelector('.kai-activity-copy')?.appendChild(sub)}sub.textContent=detail}}
function kaiActivityStep(key,label,detail='',iconUrl='',state='running'){if(!thinkingBubble)return null;const list=thinkingBubble.querySelector('.kai-activity-list');if(!list)return null;let row=kaiActivityFind(key);if(row){kaiActivitySet(key,state,detail);return row}row=kaiActivityRow(label,detail,iconUrl,state,key);list.appendChild(row);requestAnimationFrame(()=>list.scrollTo({top:list.scrollHeight,behavior:'smooth'}));return row}
function kaiActivityDeepX(steps){if(!thinkingBubble||!Array.isArray(steps)||!steps.length)return;steps.forEach(s=>{const label=typeof s==='string'?s:(s?.label||s?.message||s?.title||'KAI step');const detail=typeof s==='string'?'':(s?.detail||s?.status||'');const key=typeof s==='string'?label.toLowerCase().replace(/[^a-z0-9]+/g,'-'):String(s?.key||label).toLowerCase().replace(/[^a-z0-9]+/g,'-');kaiActivityStep(key,label,detail,s?.url?kaiFavicon(s.url):'',s?.state||'done')});messages.scrollTop=messages.scrollHeight}
function kaiActivityStart(profile='heavy'){
 if(!messages)return;
 if(thinkingTimer){clearInterval(thinkingTimer);thinkingTimer=null}
 if(thinkingBubble){thinkingBubble.classList.remove('is-fading');thinkingBubble.remove();thinkingBubble=null}
 const token=++thinkingSeq;
 thinkingStartedAt=Date.now();
 thinkingBubble=document.createElement('div');
 const bubble=thinkingBubble;
 thinkingBubble.className='haxbro-thinking kai-activity';
 thinkingBubble.setAttribute('role','status');
 thinkingBubble.setAttribute('aria-label','KAI 51 is working');
 const label=profile==='light'?'KAI FAST · LIVE':'KAI 51 · LIVE';
 const estimate=profile==='light'?6:12; thinkingEstimateSec=estimate;
 thinkingBubble.innerHTML='<div class="kai-activity-head"><div class="kai-thinking-pill" aria-hidden="true"><span class="kai-thinking-pill-track"><i class="kai-thinking-pill-dot"></i><span class="kai-thinking-pill-label">'+label+'</span></span></div><div class="kai-timer"><span class="kai-timer-estimate"><b>'+estimate+'</b></span><span class="kai-timer-live">LIVE <b class="kai-activity-time">0s</b></span></div></div><div class="kai-activity-list"></div>';
 /* Start with only the real current state. Search/model/build rows are added by their actual pipeline events. */
 kaiActivityStep('thinking','Thinking','Understanding your request and working out the next step.','','running');
 messages.appendChild(thinkingBubble);
 thinkingTimer=setInterval(()=>{
   if(token!==thinkingSeq||thinkingBubble!==bubble){clearInterval(thinkingTimer);thinkingTimer=null;return}
   const elapsed=Math.floor((Date.now()-thinkingStartedAt)/1000);
   const clock=bubble.querySelector('.kai-activity-time');if(clock)clock.textContent=elapsed+'s';
 },250);
 messages.scrollTop=messages.scrollHeight;
}
function kaiSourceIcon(step){
 const source=String(step?.source||'').toLowerCase();
 const url=String(step?.url||step?.link||'');
 if(source.includes('hatchable')||/hatchable\\.com/i.test(url))return 'https://hatchable.com/favicon.ico';
 if(source.includes('google')||/google\\./i.test(url))return 'https://www.google.com/favicon.ico';
 if(source.includes('bing')||/bing\\.com/i.test(url))return 'https://www.bing.com/sa/simg/favicon-2x.ico';
 if(source.includes('wikipedia')||/wikipedia\\.org/i.test(url))return 'https://www.wikipedia.org/static/favicon/wikipedia.ico';
 if(source.includes('data commons')||/datacommons\\.org/i.test(url))return 'https://datacommons.org/favicon.ico';
 if(url)return kaiFavicon(url);
 return '';
}
function kaiActivityResearch(steps){
 if(!thinkingBubble||!Array.isArray(steps)||!steps.length)return;
 const list=thinkingBubble.querySelector('.kai-activity-list');if(!list)return;
 const seen=new Set();
 steps.slice(0,20).forEach(step=>{
   const obj=typeof step==='string'?{title:step}:step||{};
   const source=String(obj.source||'Web');
   const url=String(obj.url||obj.link||'');
   const label=source==='Google Web'?'Google · web search':source==='Bing Web'||source==='Web'?'Bing · web search':source==='Wikipedia'?'Wikipedia · knowledge':source==='Data Commons'?'Data Commons · public data':(obj.label||obj.title||'Web source checked');
   const detail=obj.title||obj.status||(url?'source returned by research':'research step completed');
   const key=url||source+'|'+label;if(seen.has(key))return;seen.add(key);
   list.appendChild(kaiActivityRow(label,detail,kaiSourceIcon(obj),'done',key));
 });
 requestAnimationFrame(()=>requestAnimationFrame(()=>list.scrollTo({top:list.scrollHeight,behavior:'smooth'})));
}
function kaiActivityFinish(data){
 if(!thinkingBubble)return;
 const bubble=thinkingBubble;
 const token=thinkingSeq;
 if(thinkingTimer){clearInterval(thinkingTimer);thinkingTimer=null}
 kaiActivityResearch(data?.webSteps||data?.sources||[]);
 const elapsedMs=Date.now()-thinkingStartedAt;
 const elapsed=Math.floor(elapsedMs/1000);
 const clock=bubble.querySelector('.kai-activity-time');if(clock)clock.textContent=elapsed+'s';
 const timer=bubble.querySelector('.kai-timer');if(timer){timer.classList.add(elapsed>thinkingEstimateSec?'over-estimate':'under-estimate');const live=timer.querySelector('.kai-timer-live b');if(live)live.textContent=elapsed+'s';}
 const list=bubble.querySelector('.kai-activity-list');
 if(list){const final=kaiActivityRow('Answer ready','KAI 51 synthesized the result');final.classList.add('kai-activity-final');list.appendChild(final);requestAnimationFrame(()=>requestAnimationFrame(()=>list.scrollTo({top:list.scrollHeight,behavior:'smooth'})))}
 bubble.classList.add('is-complete');
 const minimumThinkingMs=650;
 const holdAfterAnswerMs=2600;
 const waitForMinimum=Math.max(0,minimumThinkingMs-elapsedMs);
 /* Keep the completed activity visible while the answer is rendered.
    It remains in normal document flow, so the answer is laid out below it. */
 const releaseAfter=Math.max(waitForMinimum,holdAfterAnswerMs);
 setTimeout(()=>{
   if(token!==thinkingSeq||thinkingBubble!==bubble)return;
   bubble.classList.add('is-fading');
   setTimeout(()=>{
     if(token===thinkingSeq&&thinkingBubble===bubble){
       bubble.remove();
       thinkingBubble=null;
     }
   },420);
 },releaseAfter);
}
function setBusy(v,profile='heavy'){
 const b=$('#sendBtn');if(b){if(!b.dataset.sendIdleHtml)b.dataset.sendIdleHtml=b.innerHTML;b.disabled=false;b.classList.toggle('busy',v);b.classList.toggle('stop-mode',v);b.setAttribute('aria-busy',v?'true':'false');b.setAttribute('aria-label',v?'Stop response':'Send');b.title=v?'Stop generating response':'Send message';b.innerHTML=v?'<svg class="kai-stop-square" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>':b.dataset.sendIdleHtml}
 if(v)kaiActivityStart(profile);
 else if(thinkingBubble&&!thinkingBubble.classList.contains('is-complete')){
   const bubble=thinkingBubble,token=thinkingSeq;
   if(thinkingTimer){clearInterval(thinkingTimer);thinkingTimer=null}
   setTimeout(()=>{if(token!==thinkingSeq||thinkingBubble!==bubble||bubble.classList.contains('is-complete'))return;bubble.classList.add('is-fading');setTimeout(()=>{if(token===thinkingSeq&&thinkingBubble===bubble){bubble.remove();thinkingBubble=null}},260)},450);
 }
}
const BUILD_WORDS='ai|artificial intelligence|agent|assistant|bot|copilot|builder|app|application|web application|webapp|web app|website|web site|site|landing page|dashboard|portal|platform|product|software|tool|system|saas|pwa|mobile app|desktop app|frontend|front end|backend|full stack|full-stack|fullstack|interface|ui|ux|experience|page|pages|screen|screens|workspace|client|admin panel|admin dashboard|control panel|ecommerce|store|shop|marketplace|blog|portfolio|forum|community|chat app|social app|game|web game|browser app|chrome extension|extension|plugin|widget|component|template|prototype|mvp|project|repo|repository|github|git|html|css|javascript|typescript|react|nextjs|next.js|vue|svelte|angular|tailwind|node|api|database|form|login|signup|authentication|auth|profile|settings|search|upload|download|checkout|payment|stripe|analytics|chart|graph|table|calendar|booking|reservation|messaging|chat|voice|video|image|media|generator|editor|cms|crm|erp|automation|workflow|dashboard app|internal tool|customer portal|user portal|ai tool|ai website|ai app|ai assistant|personal ai|my ai|my website|my web application|my app|my application|my software|my product|make ai|build ai|create ai|develop ai|make an app|build an app|create an app|make a website|build a website|create a website|make a web application|build a web application|create a web application|make a web app|build a web app|create a web app|turn this into an app|turn this into a website|launch|deploy|publish|ship|forge|generate|create|make|build|develop|design';
const BUILD_RE=new RegExp('\\\\b(?:'+BUILD_WORDS.split('|').map(x=>x.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')).join('|')+')\\\\b','i');
function chatIntent(text){const t=String(text||'').toLowerCase();if(/\\b(powerpoint|pptx|ppt|presentation|slide deck|slides)\\b/.test(t))return'file-pptx';if(/\\b(create|make|generate|build|write|code|program|script|html|css|javascript|typescript|python|sql|bash|react|next\\.js)\\b/.test(t)&&/\\b(code|program|script|html|css|javascript|typescript|python|sql|bash|react|next|function|class|api)\\b/.test(t))return'code';if(/\\b(pdf|document|doc|report|resume|letter|worksheet)\\b/.test(t)&&/\\b(make|create|generate|write|build)\\b/.test(t))return'file-pdf';if(/\\b(zip|bundle)\\b/.test(t)&&/\\b(make|create|generate|build)\\b/.test(t))return'file-zip';if(BUILD_RE.test(t)&&/\\b(make|build|create|develop|design|generate|turn|convert|launch|deploy|publish|ship|forge)\\b/.test(t))return'app';if(/\\b(make|build|create|develop|design|generate)\\s+(?:an?\\s+)?(?:ai|assistant|agent|bot|system|product)\\b/i.test(t))return'app';if(/\\b(convert|youtube|mp4|mp3|audio|video|media)\\b/.test(t)&&/\\b(media|video|audio|youtube|mp4|mp3|convert)\\b/.test(t))return'media';return'chat'}
async function runChatTool(intent,value){if(intent==='media'){openPanel?.('mediaConverterPanel');addMessage('🎬 Media tools are ready in the chat workspace. Use the converter panel here for authorized media conversion.','bot');return true}if(intent==='code'){const bridge=window.HAxBROKaiCapabilityBridge;if(!bridge?.workspace)throw new Error('KAI 51 LOCAL runtime is unavailable. Reload HAxBRO and try again.');const request='You are HAxBRO Code Writer running through the browser-local KAI 51 neural runtime. Produce complete, runnable code for the user request. Preserve the requested language and framework, handle errors and edge cases, and include brief usage notes. Do not claim execution or testing unless performed.\n\nUSER REQUEST:\n'+value;const d=await Promise.race([bridge.workspace(request,active()?.items?.slice(-12)||[],{onStage:(stage,detail)=>kaiActivityStep(stage,'KAI 51 · '+String(stage||'working').toUpperCase(),detail||'','running')}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('KAI 51 Code Writer timed out. You can retry after checking model readiness.')),330000))]);if(!d?.response)throw new Error(d?.reason||'KAI 51 did not return code.');addMessage(d.response,'bot');return true}if(intent==='file-pptx'||intent==='file-pdf'||intent==='file-zip'){const type=intent==='file-pptx'?'pptx':intent==='file-pdf'?'pdf':'zip';let contentData=null;try{const bridge=window.HAxBROKaiCapabilityBridge;if(bridge?.workspace){const instruction=type==='pdf'?'Return ONLY valid JSON with string fields title and body. Create a complete, polished document.':type==='pptx'?'Return ONLY valid JSON with string title and slides array. Create a professional presentation with 4-8 slides; each slide has title and body strings.':'Return ONLY valid JSON with string name and files array. Create a useful ZIP bundle; each file has path and content strings.';const turn=await Promise.race([bridge.workspace('You are HAxBRO File Creator using the browser-local KAI 51 neural runtime. '+instruction+'\n\nUSER REQUEST:\n'+value,active()?.items?.slice(-12)||[],{onStage:(stage,detail)=>kaiActivityStep(stage,'KAI 51 · '+String(stage||'working').toUpperCase(),detail||'','running')}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('KAI File Maker content generation timed out')),330000))]);let raw=String(turn?.response||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');try{contentData=JSON.parse(raw)}catch{const a=raw.indexOf('{'),b=raw.lastIndexOf('}');if(a>=0&&b>a){try{contentData=JSON.parse(raw.slice(a,b+1))}catch{contentData=null}}}}}catch(e){console.warn('KAI File Maker content synthesis unavailable; starter fallback may be used',e)}const r=await fetch('/api/file-create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:value,type,contentData})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||'File creation failed');const note=d.fallback?'⚠️ Starter file created because KAI content generation did not finish.':'✅ File content generated by KAI 51 LOCAL.';addMessage(note+'\n\n[DOWNLOAD '+String(d.name||'FILE')+']('+String(d.downloadUrl||d.url||'')+')','bot');return true}if(intent==='app'){const history=active()?.items?.slice(-12)||[];if(!window.HAxBROKaiCapabilityBridge?.appMaker)throw new Error('KAI 51 capability bridge is not loaded');const d=await window.HAxBROKaiCapabilityBridge.appMaker(value,history,{onStage:(stage,detail)=>kaiActivityStep(stage,'KAI 51 · '+String(stage).toUpperCase(),detail||'','running')});const files=Array.isArray(d.files)?d.files:[];let reply='🚀 App built directly in chat with KAI 51 LOCAL + GITHUB: **'+String(d.name||'HAxBRO App')+'**\n\nFiles: '+files.map(f=>f.path).join(', ');const index=files.find(f=>f.path==='index.html')||files[0];if(index?.content)reply+='\n\n```html\n'+index.content+'\n```';addMessage(reply,'bot');return true}return false}
chatIntent=function(text){const t=String(text||'').trim();const lower=t.toLowerCase();/* App Maker must be an explicit user command, never inferred from incidental words inside pasted conversations, quotes, roasts, or normal discussion. */const explicitApp=/\b(?:make|build|create|develop|design|generate)\s+(?:me\s+)?(?:an?\s+)?(?:app|application|web\s*app|web\s*application|website|site|dashboard|portal|platform|tool|system|saas|pwa|mobile\s+app|desktop\s+app|game|chat\s+app|ai\s+(?:app|assistant|agent|bot|tool|website|system))\b/i;const explicitApp2=/\b(?:make|build|create|generate)\s+(?:an?\s+)?(?:ai|assistant|agent|bot|system|product)\b/i;const explicitMakeAI=/^\s*(?:please\s+)?make\s+ai\s*$/i;const explicitTurn=/\bturn\s+(?:this|that|it)\s+into\s+(?:an?\s+)?(?:app|application|website|web\s*app|dashboard|tool|game)\b/i;const explicitLaunch=/\b(?:launch|deploy|publish|ship)\s+(?:my|this|the)\s+(?:app|application|website|web\s*app|project|site)\b/i;if(/\b(powerpoint|pptx|ppt|presentation|slide deck|slides)\b/i.test(lower))return'file-pptx';if(/^(?:please\s+)?(?:make|build|create|generate|write)\b[\s\S]*\b(?:code|program|script|html|css|javascript|typescript|python|sql|bash|react|function|class|api)\b/i.test(t))return'code';if(/^(?:please\s+)?(?:make|create|generate|write|build)\b[\s\S]*\b(?:pdf|document|doc|report|resume|letter|worksheet)\b/i.test(t))return'file-pdf';if(/^(?:please\s+)?(?:make|create|generate|build)\b[\s\S]*\b(?:zip|bundle)\b/i.test(t))return'file-zip';if(explicitApp.test(t)||explicitApp2.test(t)||explicitMakeAI.test(t)||explicitTurn.test(t)||explicitLaunch.test(t))return'app';if(/^(?:please\s+)?(?:convert|transcode)\b[\s\S]*\b(?:youtube|mp4|mp3|audio|video|media)\b/i.test(t))return'media';return'chat'};
const KAI789_CAPABILITIES=[['visit_page','Visit public page'],['check_status','Check status'],['get_headers','Read headers'],['get_cookies','Read response cookies'],['scrape_text','Extract text'],['scrape_html','Read HTML'],['extract_links','Extract links'],['extract_images','Extract images'],['get_metadata','Read metadata'],['check_robots','Inspect robots.txt'],['check_sitemap','Inspect sitemap.xml'],['technology_detect','Detect technologies'],['check_seo','Check SEO'],['check_performance','Measure performance'],['get_page_size','Measure page size'],['generate_report','Generate report']];
function getKai789Capabilities(){try{const saved=JSON.parse(localStorage.getItem('haxbro_kai789_capabilities')||'null');if(Array.isArray(saved))return KAI789_CAPABILITIES.map(x=>x[0]).filter(x=>saved.includes(x));}catch(e){}return KAI789_CAPABILITIES.map(x=>x[0])}
function renderKai789Capabilities(){const selected=getKai789Capabilities();const render=(root)=>{if(!root)return;root.innerHTML='';KAI789_CAPABILITIES.forEach(([key,label])=>{const row=document.createElement('label');row.className='kai789-capability-item';const box=document.createElement('input');box.type='checkbox';box.checked=selected.includes(key);box.onchange=()=>{const next=getKai789Capabilities().filter(x=>x!==key);if(box.checked)next.push(key);localStorage.setItem('haxbro_kai789_capabilities',JSON.stringify(next));};const code=document.createElement('code');code.textContent=key;const span=document.createElement('span');span.textContent=label;row.append(box,span,code);root.appendChild(row)})};render($('#kai789CapabilityList'));render($('#mobileKai789CapabilityList'))}
let ultimaxRunStarted=0,ultimaxTimer=null;function fmtSecs(s){s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}function ultimaxLog(text,kind=''){const box=$('#ultimaxLiveLog');if(!box)return;const row=document.createElement('div');row.className='ultimax-log-line '+kind;row.textContent='['+new Date().toLocaleTimeString([], {hour12:false})+'] '+String(text);box.appendChild(row);box.scrollTop=box.scrollHeight}function toggleKaiLog(open){const rail=$('#ultimaxLiveRail'),btn=$('#kaiLogBtn');if(!rail)return;rail.hidden=false;rail.classList.toggle('mobile-open',!!open);if(btn)btn.setAttribute('aria-expanded',open?'true':'false')}function closeKaiLog(){const rail=$('#ultimaxLiveRail');if(rail)rail.classList.remove('mobile-open');const btn=$('#kaiLogBtn');if(btn)btn.setAttribute('aria-expanded','false')}function ultimaxStart(){const rail=$('#ultimaxLiveRail');if(rail){rail.hidden=false;rail.classList.remove('mobile-open')}const state=$('#ultimaxLiveState');if(state){state.textContent='RUNNING';state.className='ultimax-live-state running'}const log=$('#ultimaxLiveLog');if(log)log.innerHTML='';ultimaxRunStarted=Date.now();const estimate=$('#ultimaxEstimate');if(estimate)estimate.textContent='00:20';const steps=$('#ultimaxSteps');if(steps)steps.textContent='0';const path=$('#ultimaxAttackPath');if(path)path.hidden=true;ultimaxLog('KAI initialized — authorized security execution','tool');ultimaxLog('Target analysis started; collecting only evidence returned by tools','');ultimaxTimer=setInterval(()=>{const e=$('#ultimaxElapsed');if(e)e.textContent=fmtSecs((Date.now()-ultimaxRunStarted)/1000)},250)}function addFindingField(card,labelText,value){const wrap=document.createElement('div');wrap.className='kai-finding-field';const label=document.createElement('b');label.textContent=labelText;const text=document.createElement('div');text.textContent=String(value||'');wrap.append(label,text);card.appendChild(wrap)}function ultimaxFinish(data){if(ultimaxTimer){clearInterval(ultimaxTimer);ultimaxTimer=null}const elapsed=(Date.now()-ultimaxRunStarted)/1000;const state=$('#ultimaxLiveState');if(state){state.textContent='ATTACK COMPLETE';state.className='ultimax-live-state done'}const e=$('#ultimaxElapsed');if(e)e.textContent=fmtSecs(elapsed);const steps=Number(data?.steps||data?.trace?.filter?.(x=>x.type==='tool_result').length||0);const s=$('#ultimaxSteps');if(s)s.textContent=String(steps);const est=$('#ultimaxEstimate');if(est)est.textContent=fmtSecs(Math.max(1,Math.ceil(Math.max(steps,1)*4)));const trace=Array.isArray(data?.trace)?data.trace:[];(trace).forEach(x=>{if(x.type==='tool_start')ultimaxLog('KAI → '+x.tool+(x.args?.url?' · '+x.args.url:''),'tool');if(x.type==='tool_result'){const fs=Array.isArray(x.security)?x.security:[];ultimaxLog('KAI ← '+x.tool+' · '+(x.ok?'HTTP '+(x.status||'OK'):'FAILED')+(fs.length?' · '+fs.length+' findings':''),x.ok?'ok':'warn')}if(x.type==='final_synthesis_error')ultimaxLog('Final report synthesis warning: '+x.error,'warn')});const summary=data?.securitySummary||{};const findings=Array.isArray(summary.findings)?summary.findings:trace.flatMap(x=>Array.isArray(x.security)?x.security:[]);const urls=Array.isArray(summary.testedSurfaces)?summary.testedSurfaces:[...new Set(trace.map(x=>x.url).filter(Boolean))];const path=$('#ultimaxAttackPath'),out=$('#ultimaxAttackPathText');if(path&&out){out.innerHTML='';const add=(tag,text,cls='')=>{const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;out.appendChild(el)};add('div','SECURITY EXECUTIVE SUMMARY','report-heading');add('div',String(summary.status||'REVIEW FINDINGS'),'report-status');const c=summary.counts||{};add('div','CRITICAL '+(c.CRITICAL||0)+'  ·  HIGH '+(c.HIGH||0)+'  ·  MEDIUM '+(c.MEDIUM||0)+'  ·  LOW '+(c.LOW||0)+'  ·  INFO '+(c.INFO||0),'report-counts');add('div','', 'report-spacer');add('div','CONFIRMED FAULTS','report-heading');if(!findings.length)add('div','No confirmed vulnerabilities were returned by the authorized checks.','report-empty');findings.slice(0,30).forEach((f,i)=>{const card=document.createElement('article');card.className='kai-finding-card';const sev=String(f.severity||'INFO').toUpperCase();card.innerHTML='<div class="kai-finding-top"><b>#'+(f.id||i+1)+' · '+sev+'</b><span>'+String(f.type||'finding').replace(/</g,'&lt;')+'</span></div>';const body=document.createElement('div');body.className='kai-finding-evidence';body.textContent=String(f.evidence||'Evidence returned by security probe');card.appendChild(body);if(f.attackPath){addFindingField(card,'ATTACK PATH',f.attackPath)}if(f.risk){addFindingField(card,'RISK',f.risk)}if(f.fix){addFindingField(card,'FIX',f.fix)}if(f.verify){addFindingField(card,'VERIFY',f.verify)}if(f.owasp){addFindingField(card,'OWASP',f.owasp)}if(f.reference){const row=document.createElement('div');row.className='kai-finding-link';const label=document.createElement('span');label.textContent='EXACT REFERENCE · '+f.reference;const open=document.createElement('button');open.type='button';open.textContent='OPEN REFERENCE ↗';open.onclick=()=>window.open(f.reference,'_blank','noopener,noreferrer');row.append(label,open);card.appendChild(row)}if(f.url){const row=document.createElement('div');row.className='kai-finding-link';const label=document.createElement('span');label.textContent=f.url;const open=document.createElement('button');open.type='button';open.textContent='OPEN TARGET ↗';open.onclick=()=>window.open(f.url,'_blank','noopener,noreferrer');row.append(label,open);card.appendChild(row)}out.appendChild(card)});add('div','TESTED SURFACES','report-heading');if(!urls.length)add('div','No URL surfaces recorded.','report-empty');urls.slice(0,40).forEach(u=>{const row=document.createElement('div');row.className='kai-surface-row';const label=document.createElement('span');label.textContent=u;const open=document.createElement('button');open.type='button';open.textContent='OPEN ↗';open.onclick=()=>window.open(u,'_blank','noopener,noreferrer');row.append(label,open);out.appendChild(row)});add('div','ALLOWED KAI TOOLS','report-heading');add('div',(summary.allowedTools||['security_probe','browser_visit_click']).join(' · '),'report-tools');add('div','BLOCKED IN ATTACK MODE','report-heading');add('div',(summary.blockedTools||['public_web','search-engine discovery','third-party exploit/payload tool discovery']).join(' · '),'report-blocked');add('div','Scope: '+String(summary.scope||'HAxBRO only · non-destructive validation'),'report-note');path.hidden=false}ultimaxLog('Attack-mode execution finished in '+fmtSecs(elapsed)+' · organized security report ready','ok')}function ultimaxAbort(){if(ultimaxTimer){clearInterval(ultimaxTimer);ultimaxTimer=null}const state=$('#ultimaxLiveState');if(state){state.textContent='IDLE';state.className='ultimax-live-state'}const e=$('#ultimaxElapsed');if(e)e.textContent='00:00'}function kaiChoiceSearchLike(text){
  const t=String(text||'').trim();
  if(t.length<70)return false;
  const words=t.split(/\s+/).filter(Boolean);
  const clauses=(t.match(/\b(?:and|or|but|then|also|with|without|versus|vs|compare|because|while|after|before|plus)\b/gi)||[]).length;
  const asks=(t.match(/\b(?:search|look\s*(?:up|for)|find|latest|recent|news|research|evidence|sources?|compare|comparison|analy[sz]e|investigate|explain|why|how|what|which)\b/gi)||[]).length;
  return words.length>=14 && (clauses>=1 || asks>=2 || /\b(?:research|investigate|compare|deep|detailed|comprehensive|multiple|several|step[- ]by[- ]step)\b/i.test(t));
}
function removeKaiChoices(){document.querySelectorAll('.kai-choice-wrap').forEach(x=>x.remove());}
function showKaiChoice(title,options,onCancel){
  removeKaiChoices();
  if(!messages)return;
  const wrap=document.createElement('div');wrap.className='kai-choice-wrap';wrap.setAttribute('role','group');wrap.setAttribute('aria-label',title);
  const heading=document.createElement('div');heading.className='kai-choice-title';heading.textContent=title;wrap.appendChild(heading);
  const row=document.createElement('div');row.className='kai-choice-grid';
  options.slice(0,2).forEach(opt=>{
    const b=document.createElement('button');b.type='button';b.className='kai-choice-card';
    const icon=document.createElement('span');icon.className='kai-choice-icon';icon.textContent=opt.icon;
    const copy=document.createElement('span');copy.className='kai-choice-copy';
    const name=document.createElement('b');name.textContent=opt.label;
    const desc=document.createElement('small');desc.textContent=opt.detail;
    copy.append(name,desc);b.append(icon,copy);
    b.onclick=async()=>{if(b.disabled)return;row.querySelectorAll('.kai-choice-card').forEach(x=>{x.disabled=true;x.classList.remove('is-working')});b.classList.add('is-working');b.setAttribute('aria-busy','true');name.textContent='Starting KAI…';heading.textContent='KAI is starting the selected workflow';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));removeKaiChoices();try{await opt.onClick?.();}catch(e){console.error('HAxBRO choice action failed',e);showKaiChoice(title,options,onCancel);}};row.appendChild(b);
  });
  wrap.appendChild(row);messages.appendChild(wrap);messages.scrollTop=messages.scrollHeight;
}
function showSearchChoices(value){
  showKaiChoice('How would you like KAI to search?',[
    {icon:'⌕',label:'Normal Search',detail:'KAI knowledge · conversational answer',onClick:()=>sendChat(value,{skipUser:true,fromChoice:true,searchMode:'normal'})},
    {icon:'🌐',label:'Web Search',detail:'Search the live web · choose speed or depth',onClick:()=>showKaiChoice('Choose web-search depth',[
      {icon:'⚡',label:'Quick Search',detail:'Fast Google · Bing · Wikipedia · target ≤5s',onClick:()=>sendChat(value,{skipUser:true,fromChoice:true,searchMode:'quick'})},
      {icon:'🔬',label:'Deep Research',detail:'Broader investigation · target ≤1 minute',onClick:()=>sendChat(value,{skipUser:true,fromChoice:true,searchMode:'deep'})}
    ])}
  ]);
}
function showAppPlatformChoices(value){
  showKaiChoice('What should KAI build?',[
    {icon:'🌐',label:'Web App',detail:'Browser-first responsive application',onClick:async()=>{if(window.HAxBROFutureMaker?.open){await window.HAxBROFutureMaker.open(value+'\n\nSELECTED PLATFORM: Web App',true)}else window.dispatchEvent(new CustomEvent('haxbro:open-app-maker',{detail:{prompt:value+'\n\nSELECTED PLATFORM: Web App',autoBuild:true}}));}},
    {icon:'📱',label:'Mobile App',detail:'Mobile-first application experience',onClick:async()=>{if(window.HAxBROFutureMaker?.open){await window.HAxBROFutureMaker.open(value+'\n\nSELECTED PLATFORM: Mobile App',true)}else window.dispatchEvent(new CustomEvent('haxbro:open-app-maker',{detail:{prompt:value+'\n\nSELECTED PLATFORM: Mobile App',autoBuild:true}}));}}
  ]);
}
async function sendChat(text,opts={}){let value=String(text||'').trim();const attachedImage=window.HAxBROPendingImage||null;if(!value&&!attachedImage)return false;if(attachedImage&&!value)value='Please analyze the attached image in detail.';if(sendInFlight&&!opts.internalRetry)return true;const now=Date.now();if(value===lastSendValue&&now-lastSendAt<5000&&!opts.internalRetry)return true;const attemptId=opts.internalRetry?sendAttemptId:sendAttemptId+1;if(!opts.internalRetry){sendAttemptId=attemptId;activeChatController=new AbortController();window.HAxBROActiveChatSignal=activeChatController.signal;clearTimeout(sendWatchdogTimer);sendInFlight=true;lastSendValue=value;lastSendAt=now;const watchdogMs=window.HAxBROSelectedModel==='kai-largest'?600000:window.HAxBROSelectedModel==='kai-lite'?12000:360000;sendWatchdogTimer=setTimeout(()=>{if(sendInFlight&&sendAttemptId===attemptId){try{activeChatController?.abort()}catch{}try{activeRealtimeClient?.close?.()}catch{}try{activeStreamReader?.cancel?.()}catch{}sendInFlight=false;setBusy(false);addMessage('KAI did not finish within '+Math.round(watchdogMs/1000)+' seconds. The selected model run was stopped; no web-only substitute was used. You can retry or check the selected model.','bot');}},watchdogMs)}if(await checkAdmin69(value)){sendInFlight=false;return true}ensureChat();
/* Explicit model picker: KAI 51 LOCAL, KAI 51 GITHUB, or KAI LITE. */
if(!opts.internalRetry&&window.HAxBROSelectedModel==='kai-lite'&&window.HAxBROKaiLite?.respond){
  addMessage(value,'user');updateKaiMemory(value);if(input){input.value='';resize();}
  try{
    setBusy(true,'light');kaiActivityStart('light');kaiActivityStep('lite','KAI LITE · selected','Using the lightweight web intelligence lane','','running');
    const lite=await withChatTimeout(()=>window.HAxBROKaiLite.respond(value,active()?.items?.slice(-12)||[],{signal:activeChatController?.signal}),12000,'KAI LITE selected lane');
    if(lite?.response){kaiActivitySet('lite','done','KAI LITE response delivered');kaiActivityFinish(lite);addMessage(lite.response,'bot');return true;}
    throw new Error('KAI LITE returned no response');
  }catch(e){addMessage('KAI LITE could not complete this turn. Select KAI 51 LOCAL or KAI 51 GITHUB to continue.','bot');return true}
  finally{setBusy(false);sendInFlight=false;}
}
/* No hard-coded creator/identity response. Every normal question is handled by the selected KAI intelligence/fallback chain. */
if(!opts.fromChoice&&!overdrive&&(window.HAxBROSelectedModel||localStorage.getItem(haxbroUserKey('model_choice'))||'kai-local')==='kai-lite'&&kaiChoiceSearchLike(value)){
  addMessage(value,'user');updateKaiMemory(value);if(input)input.value='';resize();showSearchChoices(value);sendInFlight=false;return true;
}
if(!opts.fromChoice&&!overdrive&&value.length>0&&!kaiChoiceSearchLike(value)&&/\b(?:what|who|when|where|why|how|which|can|does|do|is|are|explain|define|meaning|latest|recent|news|search|find|look\s*(?:up|for)|price|cost|weather|version|release|update)\b/i.test(value)){
  opts.searchMode='quick';
}
let launchFromPending=false;if(overdrive){const pendingKey='haxbro_kai_pending_target';if(/^abort all$/i.test(value))sessionStorage.removeItem(pendingKey)}applyContextTheme(value);if(!launchFromPending&&opts.fromChoice===true){updateKaiMemory(value)}
else if(!launchFromPending){addMessage(value,'user');updateKaiMemory(value)}
if(input)input.value='';resize();try{if(!overdrive){
      if(attachedImage){
        setBusy(true,'heavy');kaiActivityStart('heavy');kaiActivityStep('vision','Local image analysis','Loading the on-device vision model and examining the selected image','', 'running');
        let imageDescription='';
        try{imageDescription=await analyzeAttachedImage(attachedImage)}catch(imageError){addMessage('I could not analyze that image locally: '+String(imageError?.message||imageError)+'\\n\\nYour image was not uploaded to a third-party AI service. Try a smaller image or retry after the local vision model finishes loading.','bot');return true}
        window.HAxBROPendingImage=null;const imageInput=$('#imageInput'),preview=$('#imageAttachmentPreview');if(imageInput)imageInput.value='';if(preview){preview.hidden=true;preview.replaceChildren()}
        value=value+'\\n\\nLOCAL IMAGE ANALYSIS (on-device vision model):\\n'+imageDescription+'\\n\\nUse the visual description above to answer the user. Clearly state if a detail cannot be determined from the description.';
        kaiActivityStep('vision-complete','Image analyzed locally','Passing the visual description to KAI 51 for reasoning','', 'done');
      }
      /* ONE browser intelligence contract.
         LOCAL is the first lane. GITHUB is the precision neural lane.
         LITE is independent and remains the final web-only recovery lane.
         The UI receives one ordered activity stream so stages cannot overwrite/jumble each other. */
      const selectedModel=window.HAxBROSelectedModel||localStorage.getItem(haxbroUserKey('model_choice'))||'kai-router';
      if(!opts.fromChoice && (selectedModel==='kai-router'||selectedModel==='kai-local'||selectedModel==='kai-github'||selectedModel==='kai-largest')){
        setBusy(true,selectedModel==='kai-local'?'light':'heavy');
        kaiActivityStart(selectedModel==='kai-local'?'light':'heavy');
        const history=active()?.items?.slice(-12)||[];
        const mark=(key,label,detail,state='running')=>{
          if(state==='running') kaiActivityStep(key,label,detail,'','running');
          else kaiActivitySet(key,state,detail);
        };
        const finish=payload=>{try{kaiActivityFinish(payload||{});}catch{}};
        try{
          let result=null;
          const runtimeState=window.HAxBROKai51Bootstrap?.state?.()||{};if(activeChatController?.signal.aborted||sendAttemptId!==attemptId)return true;
          /* Never substitute KAI LITE just because a neural model is not ready. Start the selected KAI 51 lane and let its bounded model loader report real progress/failure. */
          if(activeChatController?.signal.aborted)throw new DOMException('Response stopped by user','AbortError');
          if(['kai-router','kai-local','kai-github','kai-largest'].includes(selectedModel)){
            kaiActivitySet('thinking','done');
            const selectedLabel=selectedModel==='kai-largest'?'KAI 51 · Google Gemma 3 270M':selectedModel==='kai-github'?'KAI 51 GitHub 360M':selectedModel==='kai-local'?'KAI 51 LOCAL':'KAI Router · automatic selection';
            mark('router',selectedLabel,'Try the selected model first; if it fails or returns no usable answer, automatically try the backup chain.','running');
            result=await window.HAxBROKai51Bootstrap?.routerGenerate?.(value,history,{
              preferred:selectedModel,
              signal:activeChatController?.signal,
              onStage:(stage,detail)=>{
                const key=stage==='router-fallback'?'router-fallback':'router';
                mark(key,selectedLabel,detail||'Trying the selected model and ordered backups','running');
              }
            });
          }else if(selectedModel==='kai-local'){
            kaiActivitySet('thinking','done');
            kaiActivitySet('thinking','running','Reading your request and identifying the next step.');
            result=await window.HAxBROKai51Bootstrap?.unifiedGenerate?.(value,history,{
              signal:activeChatController?.signal,
              onStage:(stage,detail)=>{
                const labels={
                  understanding:'Thinking',
                  searching:'Searching the web',
                  analyzing:'Checking the gathered information',
                  composing:'Preparing an answer',
                  github:'Routing to GitHub model',
                  'local-neural':'Running KAI 51 LOCAL',
                  'local-neural-progress':'Loading local model',
                  lite:'Recovering with KAI Lite'
                };
                const isMathPrompt=/[0-9].*(?:[+*/×÷−-]|\b(?:calculate|solve|arithmetic|multiply|divide|add|subtract)\b)|\b(?:calculate|solve|arithmetic)\b/i.test(String(value||''));
                const stageDetails={
                  understanding:isMathPrompt?'Reading the numbers and operators in your expression.':'Identifying the request type and relevant context.',
                  searching:'Searching for sources relevant to your question.',
                  analyzing:isMathPrompt?'Working through the requested calculation.':'Reviewing the information gathered so far.',
                  composing:'Organizing the result into a clear response.',
                  github:'Starting the selected GitHub model lane.',
                  'local-neural':'Running local neural inference in this browser.',
                  'local-neural-progress':'Waiting for the local model to report its next progress update.',
                  lite:'Using KAI Lite as the recovery lane.'
                };
                const key=stage==='understanding'?'thinking':stage==='github'?'github':stage==='lite'?'lite':stage;
                const label=labels[stage]||'KAI 51 · '+String(stage||'working');
                const progressDetail=String(detail||stageDetails[stage]||'Processing this step.');
                if(stage==='searching'){kaiActivitySet('thinking','done');}
                if(stage==='analyzing'){kaiActivitySet('searching','done');}
                if(stage==='composing'){kaiActivitySet('analyzing','done');}
                if(stage==='github'){kaiActivitySet('thinking','done');}
                if(stage==='local-neural'||stage==='local-neural-progress'){kaiActivitySet('thinking','done');}
                mark(key,label,progressDetail,'running');
              },
              onHandoff:reason=>{
                kaiActivitySet('understanding','done','LOCAL → GITHUB handoff');
                mark('github','Routing to GitHub model',reason||'LOCAL requested deeper precision','running');
              }
            });
          }else if(selectedModel==='kai-largest'){
            kaiActivitySet('thinking','done');
            mark('largest-download','KAI 51 · Google Gemma 3 270M','Google Gemma downloads only after you select it; first use may take time.','running');
            result=await window.HAxBROKai51Bootstrap?.generate?.(value,history,{
              signal:activeChatController?.signal,
              onStage:(stage,detail)=>mark('largest-download','KAI 51 · Google Gemma 3 270M',detail||'Loading the selected Google Gemma model','running'),
              onProgress:p=>{
                const pct=Math.max(0,Math.min(100,Math.round(Number(p?.progress)||0)));
                mark('largest-download','KAI 51 · Google Gemma 3 270M',String(p?.status||'Downloading Gemma model')+(pct?' · '+pct+'%':''),'running');
              }
            },'largest');
          }else{
            kaiActivitySet('thinking','done');
            mark('github','Routing to GitHub model','Running the selected GitHub neural model','running');
            result=await window.HAxBROKai51Bootstrap?.generate?.(value,history,{signal:activeChatController?.signal},'github');
          }
          if(activeChatController?.signal.aborted||sendAttemptId!==attemptId)return true;
          if(result?.response){
            if(result.lane==='local'){
              kaiActivitySet('understanding','done','LOCAL understood the request');
              kaiActivitySet('composing','done','LOCAL response composed');
              if(result.fallbackLane==='github'){
                kaiActivitySet('github','done','GITHUB is warming in the background; LOCAL answered this turn');
                kaiActivitySet('local-neural','done','KAI 51 LOCAL generated this response while GITHUB installs');
              }else{
                kaiActivitySet('local-neural','done','KAI 51 LOCAL generated the response on this device');
              }
              kaiActivitySet('local-neural-progress','done','Local inference completed');
            }else if(result.lane==='github'){
              kaiActivitySet('github','done','GITHUB 360M produced the answer');
            }else if(result.lane==='largest'){
              kaiActivitySet('largest-download','done','Google Gemma 3 270M produced the answer locally in this browser');
            }else if(result.router){
              kaiActivitySet('router','done','KAI Router used '+(result.lane==='largest'?'Google Gemma 3 270M':result.lane==='github'?'GitHub 360M':'LOCAL recovery'));
              kaiActivitySet('router-fallback','done','Selected model answered successfully');
            }else if(result.lane==='lite'){
              kaiActivitySet('lite','done','KAI LITE response delivered');
            }
            finish({sources:result.sources||[],local:result.lane==='local',github:result.lane==='github',largest:result.lane==='largest',router:!!result.router,lite:result.lane==='lite',fallbackLane:result.fallbackLane||null,provider:result.provider||null,model:result.model||null,routerReason:result.routerReason||null});
            addMessage(result.response,'bot');
            return true;
          }
          throw new Error('Selected KAI lane returned no response');
        }catch(e){
          if(activeChatController?.signal.aborted||sendAttemptId!==attemptId)return true;
          console.warn('KAI unified lane failed',e);
          if(selectedModel==='kai-router') kaiActivitySet('router','error','No available model completed the request');
          else if(selectedModel==='kai-local') kaiActivitySet('understanding','error','LOCAL/GITHUB intelligence pipeline failed');
          else if(selectedModel==='kai-largest') kaiActivitySet('largest-download','error','Google Gemma 3 270M local lane unavailable');
          else kaiActivitySet('github','error','GITHUB 360M neural lane unavailable');
          const failureDetails=String(e?.message||e||'unknown model failure').slice(0,900);
          addMessage(selectedModel==='kai-largest'
            ? 'KAI 51 could not produce an answer. Google Gemma 3 1B, GitHub 360M, LOCAL, and KAI Lite were attempted in order, but none completed successfully. Details: '+failureDetails
            : selectedModel==='kai-github'
              ? 'KAI could not produce an answer. GitHub 360M and its configured backups were attempted in order, but none completed successfully. Details: '+failureDetails
              : 'KAI could not produce an answer. The selected model and all configured backups were attempted in order, but none completed successfully. Details: '+failureDetails,'bot');
          return true;
        }
      }
      const bootstrapState=window.HAxBROKai51Bootstrap?.state?.()||{};
      /* ONE handoff rule:
         - while KAI 51 is not verified ready, KAI Lite may bridge the turn;
         - once KAI 51 is verified, KAI Lite is never allowed to answer that turn again;
         - bootstrap.generate() is allowed to await the final engine promise, eliminating
           the tiny ready-event race that previously sent a turn back to KAI Lite. */
      const kai51Verified=bootstrapState.status==='ready' || bootstrapState.verified===true || !!bootstrapState.runtimeReady;
      /* Once KAI 51 is verified, it owns every subsequent normal turn, including turns launched from UI choice flows. */
      if(kai51Verified&&window.HAxBROKai51Bootstrap?.generate){
        setBusy(true,'heavy');
        try{
          const local=await window.HAxBROKai51Bootstrap.generate(
            value,
            active()?.items?.slice(-12)||[],
            window.HAxBROVoiceIntelligence?.snapshot?.()||window.HAxBROVoiceContext||null
          );
          if(local?.response){
            kaiActivityStep('local','KAI 51 · local','Running directly on this device','','running');
            kaiActivitySet('thinking','done','Understanding complete');
            kaiActivitySet('language','done','Language and communication mode detected');
            kaiActivitySet('local','done','Response generated locally');
            kaiActivitySet('synthesis','done','Answer synthesis completed');
            kaiActivityFinish({sources:[],local:true});
            addMessage(local.response,'bot');
            return true;
          }
          throw new Error('KAI 51 local model returned no response');
        }catch(e){
          kaiActivityFinish({sources:[]});
          console.warn('KAI 51 browser-local runtime failed after local retry; moving through the controlled recovery chain',e);
          /* Browser WASM failure must not immediately promote KAI Lite.
             /api/chat is still a KAI 51 generation lane. KAI Lite is final emergency fallback. */
          try{
            kaiActivityStart('light');
            kaiActivityStep('managed','KAI 51 · recovery','KAI 51 is active; reconnecting local execution through the managed KAI 51 lane','','running');
            const recoveryController=new AbortController();
            const recoveryTimer=setTimeout(()=>recoveryController.abort(),45000);
            const rr=await fetch('/api/chat',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              signal:recoveryController.signal,
              body:JSON.stringify({
                message:value,
                searchMode:'normal',
                kaiMode,
                prompt:'Answer the user naturally as HAxBRO. KAI 51 is the primary intelligence. Do not mention internal fallback or runtime details.',
                mode,
                study,
                username:localStorage.getItem('haxbro_username')||'',
                history:JSON.stringify(active()?.items?.slice(-20)||[]),
                kaiMemory:JSON.stringify(getKaiMemory())
              })
            });
            const managed=await rr.json().catch(()=>({}));
            clearTimeout(recoveryTimer);
            if(rr.ok&&(managed.response||managed.text||managed.message||managed.answer||managed.output)){
              kaiActivitySet('managed','done','KAI 51 response delivered');
              kaiActivityFinish(managed);
              addMessage(managed.response||managed.text||managed.message||managed.answer||managed.output,'bot');
              return true;
            }
            throw new Error(managed.error||('KAI 51 managed lane returned HTTP '+rr.status));
          }catch(managedError){
            console.warn('KAI 51 managed recovery failed; KAI Lite is now the final emergency fallback',managedError);
          }
          if(window.HAxBROKaiLite?.respond){
            try{
              kaiActivityStart('light');
              kaiActivityStep('lite','KAI Lite · emergency fallback','KAI 51 execution lanes were unavailable; using the emergency recovery lane','','running');
              const recovery=await window.HAxBROKaiLite.respond(value,active()?.items?.slice(-12)||[]);
              if(recovery?.response){
                kaiActivitySet('lite','done','Emergency response delivered');
                kaiActivityFinish(recovery);
                addMessage(recovery.response,'bot');
                return true;
              }
            }catch(fallbackError){ console.warn('KAI Lite emergency fallback also failed',fallbackError); }
          }
          addMessage('KAI 51 could not complete this turn. Please retry once.','bot');
          return true;
        }
      }
      if(!kai51Verified&&!opts.fromChoice){
        /* KAI Lite is the working bridge while the real KAI 51 neural package is
           downloading/restoring. Do NOT block the user on a 386MB browser model.
           The real model continues loading in the background and automatically
           takes over once verified. */
        try{
          window.HAxBROKai51Bootstrap?.prepare?.().catch(e=>console.warn('KAI 51 background download retry',e));
        }catch{}
        if(window.HAxBROKaiLite?.respond){
          try{
            setBusy(true,'light');
            kaiActivityStart('light');
            kaiActivityStep('lite','KAI Lite · active bridge','KAI 51 real model is downloading; KAI Lite is handling this turn','','running');
            const recovery=await window.HAxBROKaiLite.respond(value,active()?.items?.slice(-12)||[]);
            if(recovery?.response){
              kaiActivitySet('lite','done','KAI Lite response delivered');
              kaiActivityFinish(recovery);
              addMessage(recovery.response,'bot');
              return true;
            }
          }catch(e){ console.warn('KAI Lite bridge failed while KAI 51 loads',e); }
        }
        /* If Lite itself is unavailable, allow the existing managed lane below. */
      }
      setBusy(true,opts.searchMode==='quick'?'light':'heavy');
/* KAI 51 UNIFIED LOCAL ROUTER: one natural-language command can invoke any HAxBRO workspace before chat. */
async function kai51WorkspaceRoute(value){
  const t=String(value||'').trim();
  /* Casual chat must never wait on workspace intent detection. Only inspect app/developer/workspace commands. */
  if(!/\b(?:make|build|create|develop|design|generate|forge|ship|open|launch|show|decode|decrypt|decipher|encode|encrypt|expert|investigate|inspect|scan|security|analy[sz]e|code|program|script|app\s*maker|decoding)\b/i.test(t)) return false;
  const build=/\b(?:make|build|create|develop|design|generate|forge|ship)\b/i.test(t);
  const namedAiProduct=build&&/\b(?:make|build|create|develop|design|generate)\b[\s\S]{0,45}\b(?:[a-z][a-z0-9_-]*\s+){0,3}ai\b/i.test(t);
  const app=build&&(/\b(?:app|application|website|web\s*app|web\s*application|dashboard|portal|platform|saas|pwa|mobile\s+app|desktop\s+app|tool|game|assistant|agent|bot|analyzer|analyser|tracker|calculator|converter|monitor|generator)\b/i.test(t)||namedAiProduct);
  const openApp=/\b(?:open|launch|show)\b[\s,]*(?:the\s+)?app\s*maker\b/i.test(t)||(/\bapp\s*maker\b/i.test(t)&&!/^(what|why|how|tell|explain)\b/i.test(t));
  const decode=/\b(?:decode|decrypt|decipher|decoding|ciphertext|encoded|rot13|base64|hex|morse|binary|atbash|caesar|vigenere|rail\s*fence|a1z26)\b/i.test(t);
  const encode=/\b(?:encode|encrypt)\b/i.test(t);
  const xpro=/\bx\s*pro\b|\bexpert\s+mode\b|\bdeepx\b/i.test(t);
  const investigate=/\b(?:investigate|inspect|scan|security\s+audit|security\s+check|analy[sz]e)\b/i.test(t)&&/https?:\/\//i.test(t);
  const code=build&&/\b(?:code|program|script|html|css|javascript|typescript|python|sql|bash|react|function|class|api)\b/i.test(t);
  if(app||openApp){
    sessionStorage.setItem('haxbro_app_intent_context',JSON.stringify(active()?.items?.slice(-20)||[]));
    if(window.HAxBROFutureMaker?.open){await window.HAxBROFutureMaker.open(t,!openApp);return true}
    window.dispatchEvent(new CustomEvent('haxbro:open-app-maker',{detail:{prompt:t,autoBuild:!openApp}}));return true;
  }
  if(decode){
    const payload=t.replace(/^.*?\b(?:decode|decipher|decrypt|decoding)\b[:\s-]*/i,'').trim()||t;
    if(window.HAxBRODecodingPartner?.openWithInput){await window.HAxBRODecodingPartner.openWithInput(payload);return true}
    window.dispatchEvent(new CustomEvent('haxbro:open-decoder',{detail:{input:payload}}));return true;
  }
  if(encode){
    const payload=t.replace(/^.*?\b(?:encode|encrypt|encryption)\b[:\s-]*/i,'').trim();
    if(window.HAxBRODecodingPartner?.openEncrypt){await window.HAxBRODecodingPartner.openEncrypt(payload);return true}
    window.dispatchEvent(new CustomEvent('haxbro:open-decoder',{detail:{input:payload,mode:'encrypt'}}));return true;
  }
  if(xpro||investigate){
    const match=t.match(/https?:\/\/[^\s<>"']+/i);
    const url=(match?match[0]:'').replace(/[),.;!?]+$/,'');
    if(window.HAxBRODeepX?.openWithTarget){window.HAxBRODeepX.openWithTarget(url,{research:!!url});return true}
    window.dispatchEvent(new CustomEvent('haxbro:open-xpro',{detail:{target:url,research:!!url}}));return true;
  }
  if(code){
    if(window.HAxBROCodeWriter?.open){window.HAxBROCodeWriter.open(t);return true}
    document.getElementById('codeWriterBtn')?.click();return true;
  }
  return false;
}
    const priorityLower=value.toLowerCase();
    const rawDomainMatch=value.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\s*(?:dot|\.)\s*[a-z]{2,})+(?:\/[^^\s<>"']*)?/i);
    const domainLike=rawDomainMatch?.[0]||'';
    const normalizedDomain=domainLike?(()=>{let s=domainLike.trim().replace(/\s*(?:dot|\.)\s*/gi,'.').replace(/[),.;!?]+$/,'');return /^https?:\/\//i.test(s)?s:'https://'+s.replace(/^\/\//,'')})():'';
    const priorityUrl=(value.match(/https?:\/\/[^\s<>"']+/i)||[''])[0].replace(/[),.;!?]+$/,'')||normalizedDomain;
    const kaiWorkspaceHandled=await withChatTimeout(()=>kai51WorkspaceRoute(value),15000,'KAI workspace routing');if(activeChatController?.signal.aborted||sendAttemptId!==attemptId)return true;if(kaiWorkspaceHandled)return true;
    const priorityDecode=['decode','decoding','decrypt','encoded','cipher','rot13','base64','hex','morse','binary','ascii','atbash','caesar','vigenere','rail fence','a1z26','xor'].some(x=>priorityLower.includes(x));
    const priorityEncode=['encode','encoding','encrypt','encryption'].some(x=>priorityLower.includes(x));
    const priorityExpert=/\b(?:expert workspace|expert mode|expert analysis|deep analysis|advanced analysis|expert)\b/i.test(value);
    const priorityInvestigation=!!priorityUrl&&['investigate','inspect','analyze','scan','check','verify','validate','review','look into','how this link works','how this website works','x-ray','xray','source code','search google','search the web','google it','give a report','report about','report on','without adding https','without https'].some(x=>priorityLower.includes(x));
    const priorityModification=/\b(?:modify|change|update|edit|adjust|make|add|remove|fix|improve|redesign|restyle|rename)\b/i.test(value)&&/\b(?:app|application|ui|interface|button|color|red|blue|green|spacing|layout|theme|title|name|feature|screen|page|existing|current)\b/i.test(value);
    /* KAI 51 SINGLE INTENT ROUTER: one semantic gate for App Maker handoff.
       The original prompt is preserved verbatim and passed directly into App Maker.
       No App Data Miner, duplicate regex gate, or platform-choice detour is used. */
    let kaiRoute=null;
    try{
      /* Dedicated local App Intent Intelligence runs before the general router.
         It decides only whether the user is entering/building/modifying App Maker. */
      const rr=await fetch('/api/kai/app-intent',{method:'POST',headers:{'Content-Type':'application/json'},signal:activeChatController?.signal||AbortSignal.timeout(3500),body:JSON.stringify({message:value})});
      kaiRoute=await rr.json().catch(()=>null);
    }catch{}
    if(kaiRoute?.ok&&kaiRoute.destination==='app-maker'&&kaiRoute.wantsApp===true&&Number(kaiRoute.confidence||0)>=0.72){
      const appContext=JSON.stringify(active()?.items?.slice(-20)||[]);
      sessionStorage.setItem('haxbro_app_intent_context',appContext);
      const handoffPrompt=String(kaiRoute.prompt||value);
      if(kaiRoute.autoBuild&&window.HAxBROFutureMaker?.open){await window.HAxBROFutureMaker.open(handoffPrompt,true);return true}
      if(!kaiRoute.autoBuild&&window.HAxBROFutureMaker?.open){await window.HAxBROFutureMaker.open(handoffPrompt,false);return true}
      window.dispatchEvent(new CustomEvent('haxbro:open-app-maker',{detail:{prompt:handoffPrompt,autoBuild:!!kaiRoute.autoBuild}}));
      return true;
    }
    if(priorityDecode){const payload=value.replace(/^.*?\b(?:decode|decoding|decrypt)\b[:\s-]*/i,'').trim().replace(/^(?:this|this\s+text|this\s+code)[:\s-]*/i,'').trim()||value;if(window.HAxBRODecodingPartner?.openWithInput){await window.HAxBRODecodingPartner.openWithInput(payload);return true}window.dispatchEvent(new CustomEvent('haxbro:open-decoder',{detail:{input:payload}}));return true;}
    if(priorityEncode){if(window.HAxBRODecodingPartner?.open){await window.HAxBRODecodingPartner.open();return true}window.dispatchEvent(new CustomEvent('haxbro:open-decoder',{detail:{input:'',mode:'encrypt'}}));return true;}
    if(priorityExpert){const opts={research:true};if(window.HAxBRODeepX?.openWithTarget){window.HAxBRODeepX.openWithTarget('',opts);return true}window.dispatchEvent(new CustomEvent('haxbro:open-xpro',{detail:{target:'',...opts}}));return true;}
    if(priorityModification&&window.HAxBROFutureMaker?.modifyCurrent&&document.getElementById('haxNewAppMaker')?.classList.contains('open')){await window.HAxBROFutureMaker.modifyCurrent(value);return true;}
    if(priorityInvestigation){const opts={research:/\b(?:search google|search the web|google it|give a report|report about|report on)\b/i.test(value)};if(window.HAxBRODeepX?.openWithTarget){window.HAxBRODeepX.openWithTarget(priorityUrl,opts);return true}window.dispatchEvent(new CustomEvent('haxbro:open-xpro',{detail:{target:priorityUrl,...opts}}));return true;}
    /* Live thinking stays visible while the ordered server backup chain runs. */
    setBusy(true,'heavy');
    let apiAnswered=false;
    async function kaiRealtimeChat(){
      kaiActivityStep('runtime','KAI 51 · execution','Starting the live conversation engine.','running');
      const start=await fetch('/api/kai-start',{method:'POST',headers:{'Content-Type':'application/json'},signal:activeChatController?.signal,body:JSON.stringify({message:value,username:localStorage.getItem('haxbro_username')||'',history:JSON.stringify(active()?.items?.slice(-20)||[]),kaiMemory:JSON.stringify(getKaiMemory())})});
      if(!start.ok){kaiActivitySet('runtime','error','KAI execution could not be started');return false;}
      const sd=await start.json().catch(()=>({})); if(!sd.jobId){kaiActivitySet('runtime','error','No KAI job was created');return false;}
      kaiActivitySet('runtime','done','Live KAI execution started');
      let done=false,final=null,client=null;
      const handle=ev=>{
        if(ev.type==='connected') kaiActivityStep('execution','KAI 51 execution','Live activity channel connected','', 'done');
        else if(ev.type==='planning'){kaiActivitySet('execution','done');kaiActivitySet('thinking','done','Request understood');kaiActivityStep('interpreting',ev.label||'KAI 51 · interpreting',ev.detail||'Interpreting intent, context and required action','','running');}
        else if(ev.type==='search-start'){kaiActivitySet('interpreting','done','Intent interpreted');kaiActivitySet('searching','done','Research started');kaiActivityStep('search-'+String(ev.source||'web').toLowerCase(),'KAI 51 · searching · '+(ev.source||'the web'),ev.query,ev.source==='Wikipedia'?'https://www.wikipedia.org':'https://www.bing.com','running');}
        else if(ev.type==='knowledge-start') kaiActivityStep('knowledge','Checking HAxBRO Knowledge','Knowledge base lookup','','running');
        else if(ev.type==='source-found'){kaiActivitySet('search-'+String(ev.source||'web').toLowerCase(),'done');kaiActivityStep('source-'+String(ev.title||ev.source||'source').toLowerCase().replace(/[^a-z0-9]+/g,'-'),'Reading '+(ev.title||ev.source),ev.source,ev.url||'','done');}
        else if(ev.type==='context-ready'){kaiActivitySet('knowledge','done',(ev.sourceCount||0)+' sources · '+(ev.knowledgeCount||0)+' context items');kaiActivityStep('evidence','Evidence ready',(ev.sourceCount||0)+' sources · '+(ev.knowledgeCount||0)+' context items','','done');}
        else if(ev.type==='synthesis-start'){kaiActivitySet('searching','done','Research complete');kaiActivitySet('interpreting','done','Interpretation complete');kaiActivityStep('synthesis','KAI 51 · composing',ev.detail||'Organizing the retrieved context into an answer','','running');}
        else if(ev.type==='complete'){kaiActivitySet('synthesis','done','Answer synthesis completed');final=ev.result;done=true;}
        else if(ev.type==='error'){kaiActivitySet('synthesis','error',ev.message||'KAI execution failed');done=true;}
      };
      try{client=await withChatTimeout(()=>window.haxbroLoadRealtime(sd.jobId,handle),12000,'KAI realtime connection');activeRealtimeClient=client;}catch{return false;}
      if(!client)return false;
      kaiActivityStep('deploy','KAI 51 · executing','Live KAI execution is running.','running');
      try{const rr=await fetch('/api/kai-run',{method:'POST',headers:{'Content-Type':'application/json'},signal:activeChatController?.signal,body:JSON.stringify({jobId:sd.jobId,message:value,username:localStorage.getItem('haxbro_username')||'',history:JSON.stringify(active()?.items?.slice(-20)||[]),kaiMemory:JSON.stringify(getKaiMemory())})});if(!rr.ok){kaiActivitySet('deploy','error','KAI execution request failed');return false;}kaiActivitySet('deploy','done','Hatchable worker accepted the job');}catch{kaiActivitySet('deploy','error','Hatchable execution request failed');return false;}
      const started=Date.now();
      while(!done && Date.now()-started<90000)await new Promise(r=>setTimeout(r,80));
      try{client.close?.();}catch{}
      if(!final?.response&&!final?.text)return false;
      kaiActivityFinish(final); addMessage(final.response||final.text,'bot'); return true;
    }
    async function kaiStreamChat(){
      const rr=await fetch('/api/chat-stream',{method:'POST',headers:{'Content-Type':'application/json'},signal:activeChatController?.signal,body:JSON.stringify({message:value,username:localStorage.getItem('haxbro_username')||'',history:JSON.stringify(active()?.items?.slice(-20)||[]),kaiMemory:JSON.stringify(getKaiMemory())})});
      if(!rr.ok||!rr.body)return false;
      const reader=rr.body.getReader();activeStreamReader=reader; const decoder=new TextDecoder(); let buffer=''; let final=null;
      const consume=chunk=>{
        buffer+=decoder.decode(chunk,{stream:true});
        const parts=buffer.split('\\n\\n'); buffer=parts.pop()||'';
        for(const part of parts){
          const line=part.split('\\n').find(x=>x.startsWith('data: ')); if(!line)continue;
          try{
            const ev=JSON.parse(line.slice(6));
            if(ev.type==='connected') kaiActivityStep('stream','KAI 51 execution','Live stream connected','','done');
            else if(ev.type==='planning'){kaiActivitySet('thinking','done','Request understood');kaiActivityStep('interpreting',ev.label||'KAI 51 · interpreting',ev.detail||'Interpreting intent, context and required action','','running');}
            else if(ev.type==='search-start'){kaiActivitySet('interpreting','done','Intent interpreted');kaiActivitySet('searching','done','Research started');kaiActivityStep('search-'+String(ev.source||'web').toLowerCase(),'KAI 51 · searching · '+(ev.source||'the web'),ev.query,ev.source==='Wikipedia'?'https://wikipedia.org':'https://www.bing.com','running');}
            else if(ev.type==='knowledge-start') kaiActivityStep('knowledge','Checking HAxBRO Knowledge','Knowledge base lookup','','running');
            else if(ev.type==='source-found'){kaiActivitySet('search-'+String(ev.source||'web').toLowerCase(),'done');kaiActivityStep('source-'+String(ev.title||ev.source||'source').toLowerCase().replace(/[^a-z0-9]+/g,'-'),'Reading '+(ev.title||ev.source),ev.source,ev.url||'','done');}
            else if(ev.type==='context-ready'){kaiActivitySet('knowledge','done',(ev.sourceCount||0)+' sources · '+(ev.knowledgeCount||0)+' context items');kaiActivityStep('evidence','Evidence ready',(ev.sourceCount||0)+' sources · '+(ev.knowledgeCount||0)+' context items','','done');}
            else if(ev.type==='synthesis-start') kaiActivityStep('synthesis','Organizing answer',ev.detail||'Synthesizing retrieved context','','running');
            else if(ev.type==='complete'){kaiActivitySet('synthesis','done','Answer synthesis completed');final=ev.result;}
            else if(ev.type==='error'){kaiActivitySet('synthesis','error',ev.message||'KAI stream failed');throw new Error(ev.message||'KAI stream failed');}
          }catch(e){ if(e?.message==='KAI stream failed') throw e; }
        }
      };
      while(true){const {value:chunk,done}=await reader.read();if(done)break;consume(chunk)}
      if(!final?.response&&!final?.text)return false;
      kaiActivityFinish(final);
      addMessage(final.response||final.text,'bot');
      return true;
    }
    try{
      kaiActivityStep('thinking','KAI 51 · thinking','Understanding your message','','running');kaiActivityStep('language','Language layer','Detecting language and communication mode locally','','done');
      const chatController=activeChatController||new AbortController();const chatLimit=opts.searchMode==='quick'?15000:opts.searchMode==='deep'?90000:30000;const chatTimer=setTimeout(()=>chatController.abort(),chatLimit);const rr=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:chatController.signal,body:JSON.stringify({
        message:value,
        searchMode:opts.searchMode||'normal',
        kaiMode,
        prompt:'Answer the user naturally as HAxBRO. Keep internal orchestration and implementation details private.',
        mode,
        study,
        username:localStorage.getItem('haxbro_username')||'',
        history:JSON.stringify(active()?.items?.slice(-20)||[]),
        kaiMemory:JSON.stringify(getKaiMemory())
      })});
      const dd=await rr.json().catch(()=>({}));clearTimeout(chatTimer);
      if(rr.ok&&(dd.response||dd.text||dd.message||dd.answer||dd.output)){
        apiAnswered=true;
        const returnedSources=Array.isArray(dd.sources)?dd.sources:(Array.isArray(dd.webSteps)?dd.webSteps:[]);
        kaiActivitySet('thinking','done','Understanding complete');
        kaiActivityResearch(returnedSources);
        kaiActivityFinish(dd);
        addMessage(dd.response||dd.text||dd.message||dd.answer||dd.output,'bot');
        return true;
      }
    }catch{if(activeChatController?.signal.aborted||sendAttemptId!==attemptId)return true;}
    /* No browser-local canned fallback: failures stay visible instead of becoming rule-based replies. */
    if(!apiAnswered){
      kaiActivityFinish({sources:[]});
      if(opts.searchMode==='quick'||opts.searchMode==='deep'){
        return await sendChat(value,{skipUser:true,fromChoice:true,searchMode:'normal'});
      }
      /* If the managed generation lane is unavailable, give the first-party browser KAI runtime a chance.
         This keeps main chat usable without silently substituting a canned answer. */
      try{
        const localFallback=await window.HAxBROKai51Bootstrap?.generate?.(value,active()?.items?.slice(-12)||[]);
        if(localFallback?.response||localFallback?.text){
          addMessage(localFallback.response||localFallback.text,'bot');
          return true;
        }
      }catch(e){ console.warn('KAI 51 browser-local fallback unavailable',e); }
      addMessage("KAI could not complete the request right now. Please try again.",'bot');
    }
    return true;
/* KAI workspace handoff: users describe the task once; KAI opens the correct workspace and carries the exact target/input with it. */
const investigationMatch=(value.match(/https?:\/\/[^\s<>"']+/i)||[''])[0].replace(/[),.;!?]+$/,'');
const lowerValue=value.toLowerCase();
    const appMakerOpen=!!document.getElementById('haxNewAppMaker')?.classList.contains('open');
    const wantsModification=/\b(?:modify|change|update|edit|adjust|make|add|remove|fix|improve|redesign|restyle|rename)\b/i.test(value)&&/\b(?:app|application|ui|interface|button|color|red|blue|green|spacing|layout|theme|title|name|feature|screen|page|existing|current)\b/i.test(value);
const wantsInvestigation=!!investigationMatch&&['investigate','inspect','analyze','scan','check','verify','validate','review','look into','how this link works','how this website works','x-ray','xray','source code'].some(x=>lowerValue.includes(x));
const explicitDecode=['decode','decoding','decrypt','encoded','cipher','rot13','base64','hex','morse','binary','ascii','atbash','caesar','vigenere','rail fence','a1z26','xor'].some(x=>lowerValue.includes(x));const looksLikeEncodedPayload=/^(?:HAXBRO-AES1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+|(?:[01]{8}[\\s,;]*){3,}|(?:[0-9A-Fa-f]{2}[\\s:]*){6,}|(?:[A-Za-z0-9+/]{4}){3,}={0,2}|(?:%[0-9A-Fa-f]{2}){3,}|(?:[.-]{3,}(?:\\s|$)){2,})$/.test(value.trim());const wantsDecode=explicitDecode||looksLikeEncodedPayload;
if(wantsDecode&&window.HAxBRODecodingPartner?.openWithInput){
  const payload=value.replace(/^.*?\\b(?:decode|decoding|decrypt)\\b[:\\s-]*/i,'').trim().replace(/^(?:this|this\\s+text|this\\s+code)[:\\s-]*/i,'').trim()||value;
  await window.HAxBRODecodingPartner.openWithInput(payload);return true
}
if(appMakerOpen&&wantsModification&&window.HAxBROFutureMaker?.modifyCurrent){
  await window.HAxBROFutureMaker.modifyCurrent(value);return true;
}
if(wantsInvestigation){
  const target=investigationMatch;
  const launch=()=>{if(window.HAxBRODeepX?.openWithTarget){window.HAxBRODeepX.openWithTarget(target);return true}return false};
  if(!launch()){window.dispatchEvent(new CustomEvent('haxbro:open-xpro',{detail:{target}}));}
  return true;
}
if(wantsDecode&&window.HAxBRODecodingPartner?.openWithInput){
  const payload=value.replace(/^.*?(decode|decoding|decrypt)[:\\s-]*/i,'').trim().replace(/^(?:this|this\\s+text|this\\s+code)[:\\s-]*/i,'').trim()||value;
  await window.HAxBRODecodingPartner.openWithInput(payload);return true
}
/* Completed X Pro / Decoder results become live KAI context for natural follow-up questions. */
const workspaceContext=sessionStorage.getItem('haxbro_workspace_context')||'';
const workspaceType=sessionStorage.getItem('haxbro_workspace_type')||'';
const workspaceFollowup=!!workspaceContext&&!wantsInvestigation&&!wantsDecode&&!/^(?:make|build|create|develop|design|generate)\\b/i.test(value);
if(workspaceFollowup){
  sessionStorage.removeItem('haxbro_workspace_context');sessionStorage.removeItem('haxbro_workspace_type');
  value='KAI WORKSPACE CONTEXT\\nSOURCE: '+workspaceType+'\\nREPORT:\\n'+workspaceContext+'\\n\\nUSER FOLLOW-UP:\\n'+value+'\\n\\nAnswer using the workspace report as evidence. Explain observed behavior, architecture, technologies and evidence clearly; do not invent findings.';
}
/* App Data Miner is executed earlier, before legacy routing. */let routed=false;try{const explicitAppRequest=/^\\s*(?:please\\s+)?(?:make|build|create|develop|design|generate|turn)\\b[\\s\\S]*\\b(?:app|application|website|web\\s*app|dashboard|portal|platform|tool|system|saas|pwa|mobile\\s+app|game)\\b/i.test(value);if(explicitAppRequest){const kr=await fetch("/api/kai-router",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:value})});const kd=await kr.json().catch(()=>({}));routed=kd?.ok&&kd.wantsApp===true&&Number(kd.confidence||0)>=0.72}}catch{}if(routed&&window.HAxBROFutureMaker?.open){await window.HAxBROFutureMaker.open(value,true);return true}const intent=chatIntent(value);if(intent!=='chat'&&intent!=='app'){await runChatTool(intent,value);return true}}
const localEngine=window.HAxBROKai51Engine;
if(!overdrive&&!opts.fromChoice&&localEngine?.isReady?.()){
  const localHistory=active()?.items?.slice(-12)||[];
  /* The user message was already rendered and saved at the top of sendChat().
     Do not append it again when the local KAI runtime handles the turn. */
  kaiActivityStart('light');kaiActivityStep('local','KAI 51 · local','Running directly in this browser','','running');
  try{
    const localResult=await localEngine.generate(value,localHistory,window.HAxBROVoiceIntelligence?.snapshot?.()||window.HAxBROVoiceContext||null);
    kaiActivitySet('local','done','Response generated locally');
    kaiActivityFinish({sources:[],local:true});
    addMessage(localResult.response||localResult.text||'','bot');
  }catch(e){
    kaiActivitySet('local','error','Local runtime unavailable');
    kaiActivityFinish({sources:[]});
    addMessage('KAI 51 local runtime could not complete this turn. The local engine was not replaced by an external chat provider.','bot');
  }
  return true;
}
/* The KAI Lite bridge is handled once above. Do not run a second Lite request here:
   duplicate bridge calls were causing inconsistent handoffs and unnecessary latency. */
  let r;if(overdrive){
  const kaiCommand=value;
  if(window.HAxBROAdmin69Simulation?.run){await window.HAxBROAdmin69Simulation.run(kaiCommand);return true;}
  addMessage('KAI 69 simulation console is unavailable.','bot');return true;}else{r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:value,kaiMode,prompt:`KAI TOOL-AWARENESS CONTRACT:\n- You are the main KAI intelligence, not a collection of disconnected modes.\n- Treat App Maker, Code Writer, File Maker (PDF/PPTX/ZIP), Media tools, security tools, browser/research tools and workspace actions as tools available to you. Choose the appropriate tool when the user's request matches it.\n- Do not tell the user that a task is outside your scope merely because it belongs to another tool. Use the tool when available.\n- If the requested capability is not available in HAxBRO, say what is missing briefly and use web research when appropriate to find the practical way for the user to accomplish it, including the relevant destination or official resource. Never pretend an unavailable action was completed.\n- Understand the user's outcome first, then select tools; do not force the user to know which tool to invoke.\nUSER REQUEST:\n${value}`,mode,study,username:localStorage.getItem('haxbro_username')||'',history:JSON.stringify(active()?.items?.slice(-20)||[])})})}const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||('HTTP '+r.status));if(overdrive)ultimaxFinish(data);else {kaiActivityResearch(data?.webSteps||data?.sources||[]);kaiActivityDeepX(data?.deepxSteps||[]);kaiActivityFinish(data);}let reply=data.response||data.text||data.message||data.answer||data.output||'';if(overdrive&&data.result){const x=data.result;if(typeof x==='string')reply=x;else if(x&&typeof x==='object'&&typeof x.response==='string')reply=x.response;else if(x&&typeof x==='object'){const lines=[];if(x.url)lines.push('URL: '+x.url);if(x.finalUrl&&x.finalUrl!==x.url)lines.push('Final URL: '+x.finalUrl);if(x.status!==undefined)lines.push('Status: '+x.status+(x.statusText?' '+x.statusText:''));if(x.responseTimeMs!==undefined)lines.push('Response time: '+x.responseTimeMs+' ms');if(x.responseSizeBytes!==undefined)lines.push('Response size: '+x.responseSizeBytes+' bytes');if(x.title)lines.push('Title: '+x.title);if(x.description)lines.push('Description: '+x.description);if(Array.isArray(x.technologies)&&x.technologies.length)lines.push('Technologies: '+x.technologies.map(v=>typeof v==='string'?v:(v.value||JSON.stringify(v))).join(', '));if(x.linkCount!==undefined)lines.push('Links: '+x.linkCount);if(x.imageCount!==undefined)lines.push('Images: '+x.imageCount);if(x.bytes!==undefined)lines.push('Size: '+x.bytes+' bytes');if(x.kilobytes!==undefined)lines.push('Size: '+x.kilobytes+' KB');if(x.seo)lines.push('SEO: '+JSON.stringify(x.seo,null,2));if(x.headers)lines.push('Headers: '+JSON.stringify(x.headers,null,2));if(x.meta)lines.push('Metadata: '+JSON.stringify(x.meta,null,2));if(x.textPreview)lines.push('\n'+x.textPreview);if(x.text)lines.push('\n'+x.text);if(x.content)lines.push('\n'+x.content);if(x.html)lines.push('\nHTML returned ('+x.html.length+' characters).');if(Array.isArray(x.links))lines.push('Links found: '+x.links.length);if(Array.isArray(x.images))lines.push('Images found: '+x.images.length);reply=lines.join('\n')||JSON.stringify(x,null,2)}}if(!reply)reply='KAI789 completed the request but returned no displayable content.';if(overdrive&&data.provider)reply='[ATTACK MODE · '+data.provider+(data.model?' · '+data.model:'')+' ]\n\n'+reply;addMessage(reply,'bot');if(!overdrive)window.HAxBROKai51Bootstrap?.recordSuccess?.();}catch(e){if(activeChatController?.signal.aborted||sendAttemptId!==attemptId)return true;if(overdrive){ultimaxLog('KAI789 could not complete the task.','warn');ultimaxAbort();addMessage('I could not complete that task right now. Please try again.','bot')}else{if(localApi?.respond){try{const emergency=await localApi.respond(value,'light');if(emergency?.response){addMessage(emergency.response,'bot');return true}}catch{} }addMessage('I’m still here. I could not finish that request in time, so I did not want to give you a broken or misleading answer. Please try it again.','bot')} }finally{if(opts.internalRetry||sendAttemptId===attemptId){setBusy(false);if(!opts.internalRetry){clearTimeout(sendWatchdogTimer);sendWatchdogTimer=null;sendInFlight=false;if(sendAttemptId===attemptId){activeChatController=null;window.HAxBROActiveChatSignal=null}}}}return true}
async function submitAdmin69Password(){const field=$('#adminPasswordInput'),gate=$('#adminPasswordGate'),err=$('#adminPasswordError');if(!field)return;const password=field.value||'';if(!password)return;try{const r=await fetch('/api/admin69-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const data=await r.json().catch(()=>({}));if(!r.ok||!data.ok)throw new Error(data.error||'Invalid owner password');sessionStorage.setItem('haxbro_admin69_authenticated','true');if(data.token)sessionStorage.setItem('haxbro_admin69_token',data.token);if(gate){gate.hidden=true;gate.setAttribute('aria-hidden','true')}admin69Busy=false;setOverdrive(true);}catch(e){if(err){err.textContent=e.message||'Authentication failed';err.hidden=false}admin69Busy=false}}
function cancelAdmin69Password(){const gate=$('#adminPasswordGate');if(gate){gate.hidden=true;gate.setAttribute('aria-hidden','true')}admin69Busy=false}
function renderHistorySafe(){try{renderHistory()}catch(e){}}
function bind(id,event,fn){const el=$(id);if(el)el.addEventListener(event,fn)}
function wire(){
  const savedName=localStorage.getItem('haxbro_username')||'';
  const gate=$('#usernameGate');
  const openUsernameLogin=()=>{if(!gate)return;gate.hidden=false;gate.setAttribute('aria-hidden','false');const field=$('#usernameInput');if(field){field.value=localStorage.getItem('haxbro_username')||'';setTimeout(()=>field.focus(),40)}};
  if(savedName){if(gate)gate.hidden=true;updateCustomerProfile(savedName)}else openUsernameLogin();
  bind('#usernameLoginBtn','click',openUsernameLogin);
  bind('#usernameForm','submit',e=>{e.preventDefault();const n=String($('#usernameInput')?.value||'').trim().replace(/[^a-zA-Z0-9._-]/g,'').slice(0,32);if(!n)return;const previous=(localStorage.getItem('haxbro_username')||'').trim();if(previous!==n){localStorage.setItem('haxbro_username',n);mode=localStorage.getItem(haxbroUserKey('mode'))||'normal';study=localStorage.getItem(haxbroUserKey('study'))==='true';chats=JSON.parse(localStorage.getItem(haxbroUserKey('chats'))||'[]');adminChats=JSON.parse(localStorage.getItem(haxbroUserKey('admin_chats'))||'[]');current=chats[0]?.id||null;adminCurrent=adminChats[0]?.id||null;}else localStorage.setItem('haxbro_username',n);window.dispatchEvent(new CustomEvent('haxbro:username-changed',{detail:{username:n}}));if(gate){gate.hidden=true;gate.setAttribute('aria-hidden','true')}updateCustomerProfile(n);setMode(mode);if(!current||!active())ensureChat();else{renderHistory();renderMessages()}});
  window.addEventListener('haxbro:workspace-result',e=>{
    const d=e.detail||{}; if(!d.report)return;
    sessionStorage.setItem('haxbro_workspace_context',String(d.report).slice(0,6000));
    sessionStorage.setItem('haxbro_workspace_type',String(d.type||'workspace'));
    /* Decoder results stay inside Decoding Partner. Never close the workspace or dump encrypted/decoded payloads into the normal AI chat. X Pro likewise owns its report/follow-up surface. */
    if(d.type==='decoder'){
      setBusy(false);resize();return;
    }
    const headline='X PRO completed the investigation.';
    addMessage(headline+'\\n\\n'+String(d.report).slice(0,6000),'bot');
    setBusy(false);resize();input?.focus();
    requestAnimationFrame(()=>$('#messages')?.lastElementChild?.scrollIntoView({behavior:'smooth',block:'end'}));
  });
  bind('#chatForm','submit',e=>{e.preventDefault();if(sendInFlight){cancelChatResponse();return}sendChat(input?.value||'')});
  bind('#sendBtn','click',e=>{e?.preventDefault?.();if(sendInFlight){cancelChatResponse();return}sendChat(input?.value||'')});
  bind('#promptInput','input',resize);
  bind('#promptInput','keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat(input.value)}});
  bind('#promptClearBtn','click',()=>{input.value='';resize();input.focus()});
  bind('#adminPasswordSubmit','click',submitAdmin69Password);bind('#adminPasswordCancel','click',cancelAdmin69Password);
  bind('#adminPasswordInput','keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitAdmin69Password()}if(e.key==='Escape')cancelAdmin69Password()});
  document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>{if(!overdrive)setMode(b.dataset.mode)}));/* KAI mode is internal; no public selector. */
  bind('#newChatBtn','click',e=>{e?.preventDefault?.();newChat()});bind('#clearBtn','click',e=>{e?.preventDefault?.();newChat()});bind('#mobileNewChatBtn','click',e=>{e?.preventDefault?.();newChat()});bind('#menuBtn','click',e=>{e?.preventDefault?.();closeKaiLog();const d=$('#mobileDrawer');if(d){d.hidden=false;d.setAttribute('aria-hidden','false');document.body.classList.add('drawer-open')}});bind('#closeMenuBtn','click',e=>{e?.preventDefault?.();const d=$('#mobileDrawer');if(d){d.hidden=true;d.setAttribute('aria-hidden','true');document.body.classList.remove('drawer-open')}});bind('#kaiLogBtn','click',e=>{e?.preventDefault?.();const rail=$('#ultimaxLiveRail');toggleKaiLog(!rail?.classList.contains('mobile-open'))});bind('#kaiLogCloseBtn','click',e=>{e?.preventDefault?.();closeKaiLog()});
  bind('#adminExitBtn','click',()=>{setOverdrive(false);sessionStorage.removeItem('haxbro_admin69_token')});bind('#mobileAdminExitBtn','click',()=>{setOverdrive(false);sessionStorage.removeItem('haxbro_admin69_token')});
  bind('#studyBtn','click',()=>{study=!study;localStorage.setItem(haxbroUserKey('study'),study?'true':'false');$('#studyBadge').hidden=!study});bind('#mobileStudyBtn','click',()=>{$('#studyBtn')?.click()});
  function applyTheme(theme){const t=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=t;document.body.classList.toggle('dark',t==='dark');document.body.classList.toggle('light-ui',t==='light');document.querySelectorAll('.theme-choice').forEach(b=>{const active=(b.id.includes('Dark')?t==='dark':t==='light');b.classList.toggle('active-theme',active);b.setAttribute('aria-pressed',active?'true':'false')});localStorage.setItem('haxbro_theme',t)}const savedTheme=localStorage.getItem('haxbro_theme')||'light';applyTheme(savedTheme);bind('#themeLightBtn','click',()=>applyTheme('light'));bind('#themeDarkBtn','click',()=>applyTheme('dark'));bind('#mobileThemeLightBtn','click',()=>applyTheme('light'));bind('#mobileThemeDarkBtn','click',()=>applyTheme('dark'));
  bind('#attachBtn','click',e=>{e?.preventDefault?.();$('#imageInput')?.click()});bind('#imageInput','change',e=>{const f=e.target.files?.[0],p=$('#imageAttachmentPreview');if(!f||!p)return;window.HAxBROPendingImage=f;p.hidden=false;p.replaceChildren();const img=document.createElement('img');img.alt='Selected image preview';img.className='haxbro-attachment-thumb';img.src=URL.createObjectURL(f);img.onload=()=>URL.revokeObjectURL(img.src);const label=document.createElement('span');label.textContent=f.name+' · '+Math.max(1,Math.round(f.size/1024))+' KB';const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove attached image');remove.onclick=()=>{window.HAxBROPendingImage=null;$('#imageInput').value='';p.hidden=true;p.replaceChildren()};p.append(img,label,remove);});
  /* Main creation shortcuts live directly above the composer. */
  bind('#shortcutAppMaker','click',()=>window.HAxBROFutureMaker?.open?.());
  bind('#shortcutBuildAI','click',()=>window.HAxBROFutureMaker?.open?.());
  bind('#shortcutBuildArt','click',()=>window.HAxBROArt?.open?.());bind('#artGenerationBtn','click',e=>{e?.preventDefault?.();window.HAxBROArt?.open?.()});bind('#mobileArtGenerationBtn','click',e=>{e?.preventDefault?.();window.HAxBROArt?.open?.()});
  bind('#shortcutUI','click',()=>$('#uiCommandCenterBtn')?.click());
  bind('#shortcutCode','click',()=>$('#codeWriterBtn')?.click());
  const initial=chats.length?chats[0]:null;if(initial){current=initial.id;renderHistorySafe();renderMessages()}else{newChat()}
  setMode(mode);if(study&&$('#studyBadge'))$('#studyBadge').hidden=false;resize();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();