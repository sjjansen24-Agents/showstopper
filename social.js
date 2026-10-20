/* Showstopper social layer. Uses Supabase (social-supabase.js) when connected; otherwise falls back to this browser's localStorage.
   Starts empty: no seeded members, comments, messages or watch history. */
const SOC=(()=>{
const K="ss_social_v2",NOW=Date.now(),DAY=864e5,esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clipById=id=>ALL_CLIPS.find(c=>c.id==id),ago=t=>{const m=Math.round((Date.now()-t)/6e4);return m<1?"just now":m<60?m+"m ago":m<1440?Math.round(m/60)+"h ago":Math.round(m/1440)+"d ago"};
localStorage.removeItem("ss_social_live_v1");let S=JSON.parse(localStorage.getItem(K)||"null");
function seed(){S={me:null,users:{},comments:{},msgs:[],watch:{},likes:{}};save()}
function save(){localStorage.setItem(K,JSON.stringify(S))}
if(!S)seed();
const me=()=>S.me&&S.users[S.me];
async function hash(p){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("ss:"+p));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){return "plain:"+p}}
/* ---------- UI helpers ---------- */
function modal(html){closeModal();const m=document.createElement("div");m.className="modal";m.innerHTML=`<div class="mbox" role="dialog"><button class="mx" aria-label="Close">×</button>${html}</div>`;
 m.onclick=e=>{if(e.target==m||e.target.classList.contains("mx"))closeModal()};document.body.appendChild(m);return m}
function closeModal(){document.querySelectorAll(".modal").forEach(m=>m.remove())}
function gate(why){if(me())return true;const m=modal(`<h2>Join free to ${why}</h2><p>Showstopper is free forever. Make an account to save clips, track artists, comment, and message other fans.</p><div class="mrow"><button class="btn" id="g1">Sign up free</button><button class="btn ghost" id="g2">Log in</button></div>`);
 m.querySelector("#g1").onclick=()=>authModal("up");m.querySelector("#g2").onclick=()=>authModal("in");return false}
function avatar(u,size=40){return `<span class="av" style="width:${size}px;height:${size}px;font-size:${size*.42}px;background:linear-gradient(135deg,hsl(${u.hue} 85% 55%),hsl(${(u.hue+60)%360} 70% 30%))">${esc(u.name[0])}</span>`}
function authModal(mode){const up=mode=="up",m=modal(`<h2>${up?"Create your free account":"Welcome back"}</h2>${window.SSB&&SSB.enabled?"":'<p class="demo-note">Our account service is offline right now, so this account will be saved in this browser only.</p>'}
<form id="af">${up?'<label>Display name<input name="name" required maxlength="40" placeholder="e.g. Sky Rivera"></label>':""}<label>Email<input name="email" type="email" required placeholder="you@example.com"></label><label>Password<input name="pw" type="password" required minlength="6" placeholder="At least 6 characters"></label>
<p class="err" id="ae"></p><button class="btn">${up?"Sign up free":"Log in"}</button></form><p class="mut">${up?'Already a member? <a href="#" id="sw">Log in</a>':'New here? <a href="#" id="sw">Sign up free</a>'}</p>`);
 m.querySelector("#sw").onclick=e=>{e.preventDefault();authModal(up?"in":"up")};
 m.querySelector("#af").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),email=f.get("email").trim().toLowerCase(),pw=await hash(f.get("pw"));
  let u=Object.values(S.users).find(x=>x.email==email);
  if(window.SSB&&SSB.enabled){try{up?await SSB.signUp(email,f.get("pw"),f.get("name").trim(),f.get("name").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,16)):await SSB.signIn(email,f.get("pw"))}catch(err){return m.querySelector("#ae").textContent="Supabase: "+err.message}}
  if(up){if(u)return m.querySelector("#ae").textContent="That email already has an account. Try logging in.";
   let h=f.get("name").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,16)||"fan";while(S.users[h])h+=Math.floor(Math.random()*9);
   u=S.users[h]={handle:h,name:f.get("name").trim(),hue:Math.floor(Math.random()*360),bio:"",email,pw,tracked:[],lists:[{id:"l1",name:"Watch later",clips:[]}],seen:[],joined:Date.now()};
  }else{if(!u&&window.SSB&&SSB.enabled&&SSB.user){const h=email.split("@")[0].replace(/[^a-z0-9]/g,"");u=S.users[h]=S.users[h]||{handle:h,name:h,hue:200,bio:"",email,pw,tracked:[],lists:[{id:"l1",name:"Watch later",clips:[]}],seen:[],joined:Date.now()}}
   if(!u||(u.pw!=pw&&!(window.SSB&&SSB.enabled&&SSB.user)))return m.querySelector("#ae").textContent="Email or password doesn't match."}
  S.me=u.handle;save();closeModal();header();route()}}
/* ---------- notifications ---------- */
function alerts(){const u=me();if(!u)return[];return SHOWS.filter(s=>u.tracked.includes(s.artist.id)).sort((a,b)=>b.date-a.date).map(s=>({id:s.id,text:`New show from ${s.artist.name}`,sub:`${s.venue} · ${s.city} · ${fmt(s.date)}`,t:s.date.getTime()+20*36e5}))}
function unreadMsgs(){return me()?S.msgs.filter(m=>m.to==S.me&&!m.read).length:0}
function header(){const el=document.getElementById("acct"),u=me();if(!el)return;
 if(!u){el.innerHTML=`<button class="btn ghost sm" id="hli">Log in</button><button class="btn sm" id="hsu">Sign up free</button>`;el.querySelector("#hli").onclick=()=>authModal("in");el.querySelector("#hsu").onclick=()=>authModal("up");return}
 const al=alerts(),un=al.filter(a=>!u.seen.includes(a.id)).length,um=unreadMsgs();
 el.innerHTML=`<button class="ib" id="bell" aria-label="Notifications">🔔${un?`<i class="cnt">${un}</i>`:""}</button><a class="ib" href="#/messages" aria-label="Messages">✉️${um?`<i class="cnt">${um}</i>`:""}</a><button class="ib avb" id="avm">${avatar(u,34)}</button>`;
 el.querySelector("#bell").onclick=e=>{e.stopPropagation();drop(`<h3>Notifications</h3>${al.length?al.map(a=>`<a class="ni ${u.seen.includes(a.id)?"":"unread"}" href="#/show/${a.id}"><b>${a.text}</b><span class="mut">${a.sub}</span></a>`).join(""):'<p class="mut">Track artists to get new-show alerts.</p>'}<button class="btn ghost sm" id="mar">Mark all read</button>`);
  document.getElementById("mar").onclick=()=>{u.seen=al.map(a=>a.id);save();header();closeDrop()}};
 el.querySelector("#avm").onclick=e=>{e.stopPropagation();drop(`<div class="dm">${avatar(u,44)}<div><b>${esc(u.name)}</b><br><span class="mut">@${u.handle}</span></div></div><a class="ni" href="#/profile/${u.handle}">My profile & lists</a><a class="ni" href="#/messages">Messages</a><button class="ni" id="lo">Log out</button>`);
  document.getElementById("lo").onclick=()=>{window.SSB&&SSB.enabled&&SSB.signOut();S.me=null;save();closeDrop();header();route()}}}
function drop(html){closeDrop();const d=document.createElement("div");d.className="drop";d.innerHTML=html;d.onclick=e=>e.stopPropagation();document.body.appendChild(d)}
function closeDrop(){document.querySelectorAll(".drop").forEach(d=>d.remove())}
addEventListener("click",closeDrop);addEventListener("hashchange",closeDrop);
/* ---------- lists ---------- */
function saveModal(cid){if(!gate("save clips"))return;const u=me(),c=clipById(cid);
 const draw=()=>{m.querySelector(".lists").innerHTML=u.lists.map(l=>`<label class="lrow"><input type="checkbox" data-l="${l.id}" ${l.clips.includes(cid)?"checked":""}> ${esc(l.name)} <span class="mut">(${l.clips.length})</span></label>`).join("")||'<p class="mut">No lists yet.</p>';
  m.querySelectorAll("[data-l]").forEach(b=>b.onchange=()=>{const l=u.lists.find(x=>x.id==b.dataset.l);b.checked?l.clips.push(cid):l.clips.splice(l.clips.indexOf(cid),1);save();draw();window.SSB&&SSB.enabled&&SSB.saveToList(l.name,cid,b.checked).catch(e=>console.warn("[SSB]",e.message))})};
 const m=modal(`<h2>Save “${esc(c.song)}”</h2><p class="mut">${c.artist.name} · ${c.city}</p><div class="lists"></div><form id="nl" class="mrow"><input name="n" placeholder="New list name" required maxlength="40"><button class="btn">Create</button></form><button class="btn ghost" id="dn">Done</button>`);
 m.querySelector("#nl").onsubmit=e=>{e.preventDefault();const n=e.target.n.value.trim();u.lists.push({id:"l"+Date.now(),name:n,clips:[cid]});e.target.reset();save();draw();window.SSB&&SSB.enabled&&SSB.saveToList(n,cid,true).catch(e=>console.warn("[SSB]",e.message))};m.querySelector("#dn").onclick=closeModal;draw()}
/* ---------- comments ---------- */
function commentsHTML(key){return `<section class="comments" data-key="${key}"><h2>Comments</h2><form class="cform" data-parent=""><textarea name="t" placeholder="${me()?"Add a comment…":"Sign in to join the conversation"}" required maxlength="500"></textarea><button class="btn">Post</button></form><div class="clist"></div></section>`}
function drawComments(sec){const key=sec.dataset.key,list=S.comments[key]||[],lk=S.likes[S.me]||[];
 const node=(c,depth)=>{const u=S.users[c.user]||{name:c.user,hue:0,handle:c.user},kids=list.filter(x=>x.parent==c.id);
  return `<div class="cm" style="--d:${depth}">${avatar(u,36)}<div class="cb"><a href="#/profile/${u.handle}"><b>${esc(u.name)}</b></a> <span class="mut">· ${ago(c.t)}</span><p>${esc(c.text)}</p>
  <div class="ca"><button data-like="${c.id}" class="${lk.includes(c.id)?"on":""}">♥ ${c.likes+(lk.includes(c.id)?1:0)}</button>${depth<3?`<button data-reply="${c.id}">Reply</button>`:""}</div><div class="rf"></div>${kids.map(k=>node(k,depth+1)).join("")}</div></div>`};
 sec.querySelector(".clist").innerHTML=list.filter(c=>!c.parent).sort((a,b)=>b.t-a.t).map(c=>node(c,0)).join("")||'<p class="mut">Be the first to comment.</p>';
 sec.querySelectorAll("[data-like]").forEach(b=>b.onclick=()=>{if(!gate("like comments"))return;const l=S.likes[S.me]=S.likes[S.me]||[],i=l.indexOf(b.dataset.like);i<0?l.push(b.dataset.like):l.splice(i,1);save();drawComments(sec)});
 sec.querySelectorAll("[data-reply]").forEach(b=>b.onclick=()=>{if(!gate("reply"))return;const rf=b.parentNode.nextElementSibling;rf.innerHTML=`<form class="cform" data-parent="${b.dataset.reply}"><textarea name="t" placeholder="Write a reply…" required></textarea><button class="btn sm">Reply</button></form>`;bind(rf.querySelector("form"),sec);rf.querySelector("textarea").focus()})}
function bind(f,sec){f.onsubmit=e=>{e.preventDefault();if(!gate("comment"))return;const txt=f.t.value.trim(),par=f.dataset.parent||null,key=sec.dataset.key,loc={id:"c"+Date.now(),user:S.me,text:txt,t:Date.now(),likes:0,parent:par};
  (S.comments[key]=S.comments[key]||[]).push(loc);save();drawComments(sec);if(!par)f.reset();
  if(window.SSB&&SSB.enabled)SSB.comment(key,txt,par&&par.startsWith("r")?+par.slice(1):null).then(r=>{loc.id="r"+r.id;save()}).catch(e=>console.warn("[SSB]",e.message))};f.t.onfocus=()=>{if(!me()){f.t.blur();gate("comment")}}}
function mountComments(){document.querySelectorAll(".comments").forEach(sec=>{bind(sec.querySelector(".cform"),sec);drawComments(sec);
 if(window.SSB&&SSB.enabled)SSB.loadComments(sec.dataset.key).then(rows=>{const L=S.comments[sec.dataset.key]=S.comments[sec.dataset.key]||[];
  rows.forEach(r=>{const id="r"+r.id;if(L.some(x=>x.id==id))return;const h=r.profiles?.handle||"member";S.users[h]=S.users[h]||{handle:h,name:r.profiles?.display_name||h,hue:r.profiles?.hue||200,bio:"",tracked:[],lists:[],seen:[]};
   L.push({id,user:h,text:r.body,t:Date.parse(r.created_at),likes:(r.comment_likes?.[0]?.count)||0,parent:r.parent_id?"r"+r.parent_id:null})});drawComments(sec)})})}
/* ---------- ads (made-up vendors) ---------- */
const ad=(cls,title,body,cta)=>`<aside class="ad ${cls}"><span class="spons">Sponsored</span><div><b>${title}</b><p>${body}</p></div><span class="btn sm">${cta}</span></aside>`;
/* ---------- watch log ---------- */
function sitePlays(id){if(window.SSB&&SSB.enabled){const r=SSB.sitePlays(id);if(r!=null)return r}let n=(S.anon||{})[id]||0;Object.values(S.watch||{}).forEach(l=>l.forEach(x=>{if(x.clip==id)n++}));return n}
function refreshViewLabels(id){const c=clipById(id);if(!c)return;document.querySelectorAll(`[data-tv="${CSS.escape(id)}"]`).forEach(e=>{e.textContent=totalViews(c).toLocaleString("en-US");e.title=viewsTip(c)});document.querySelectorAll(`[data-tvb="${CSS.escape(id)}"]`).forEach(e=>e.textContent=viewsTip(c))}
function play(cid){const c=clipById(cid);if(!c)return;window.SSB&&SSB.enabled&&SSB.recordPlay(cid);
 if(!me()){S.anon=S.anon||{};S.anon[cid]=(S.anon[cid]||0)+1;save();refreshViewLabels(cid);return}(S.watch[S.me]=S.watch[S.me]||[]).push({clip:cid,t:Date.now(),secs:(+c.len.split(":")[0])*60+(+c.len.split(":")[1])});save();
 const t=document.createElement("div");t.className="toast";t.textContent=`▶ Logged a play of “${esc0(c.song)}” (embed would start here)`;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
/* ---------- pages ---------- */
function clipPage(id){const c=clipById(id);if(!c)return false;
 app.innerHTML=`<p class="mut"><a href="#/show/${c.showId}">← ${c.artist.name} at ${c.venue}</a></p><h1>“${esc(c.song)}” <span class="mut" style="font-size:.5em">${c.artist.name}</span></h1>
 <div class="player live">${embed(c,0)}</div><p class="clipbar" data-clip="${c.id}">${SHOWS.find(s=>s.id==c.showId).best==c?'<span class="badge best inl">★ Best clip</span> ':""}${creditFull(c)} · ${nviews(c)} total views (<span data-tvb="${c.id}">${viewsTip(c)}</span>) · ${c.len} · Score ${c.score}/100 · ${fmt(c.date)} · ${c.city}</p>${commentsHTML("clip:"+c.id)}`;return true}
function profile(h){const u=S.users[h];if(!u){app.innerHTML='<p class="empty">Member not found.</p>';return true}const own=S.me==h;
 const lists=u.lists.map(l=>`<div class="panel lst" data-lid="${l.id}"><div class="lh"><b>${esc(l.name)}</b> <span class="mut">${l.clips.length} clip${l.clips.length==1?"":"s"}</span>${own?`<span class="la"><button data-ren="${l.id}">Rename</button><button data-del="${l.id}">Delete</button></span>`:""}</div>
  <div class="lc">${l.clips.map(id=>{const c=clipById(id);return c?`<a href="#/clip/${c.id}" class="mini"><span style="background:linear-gradient(135deg,hsl(${c.hue} 90% 45%),#05050a)"></span>${esc(c.song)}<small class="mut">${c.artist.name}</small></a>`:""}).join("")||'<span class="mut">Empty — hit Save on any clip.</span>'}</div></div>`).join("")||'<p class="mut">No lists yet.</p>';
 let an="";if(own){const log=(S.watch[h]||[]),secs=log.reduce((n,x)=>n+x.secs,0),cnt={},gen={};log.forEach(x=>{const c=clipById(x.clip);if(!c)return;cnt[c.artist.name]=(cnt[c.artist.name]||0)+1;gen[c.artist.genre]=(gen[c.artist.genre]||0)+1});
  const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,3),days=Array.from({length:30},(_,i)=>{const s=new Date(NOW-(29-i)*DAY);s.setHours(0,0,0,0);const e=s.getTime()+DAY;return log.filter(x=>x.t>=s.getTime()&&(i==29||x.t<e)).length});
  const mx=Math.max(...days,1),W=600,H=160,pts=days.map((v,i)=>`${(i/29*W).toFixed(1)},${(H-10-v/mx*(H-30)).toFixed(1)}`).join(" ");
  an=!log.length?`<section class="panel analytics empty-an"><h2>Your analytics <span class="mut" style="font-size:15px;font-weight:400">· only you can see this</span></h2><p>Nothing here yet. Press play on any show and your watch time, top artists and top genres will show up here.</p><a class="btn sm" href="#/">Find a show to watch →</a></section>`:`<section class="panel analytics"><h2>Your analytics <span class="mut" style="font-size:15px;font-weight:400">· only you can see this</span></h2>
  <div class="stats"><div><b>${log.length}</b><span>clips watched</span></div><div><b>${Math.floor(secs/3600)}h ${Math.round(secs%3600/60)}m</b><span>watch time</span></div><div><b>${top(cnt)[0]?.[0]||"—"}</b><span>top artist</span></div><div><b>${top(gen)[0]?.[0]||"—"}</b><span>top genre</span></div></div>
  <div class="two2"><div><h3>Views, last 30 days</h3><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Views per day over the last 30 days"><defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7cffb2" stop-opacity=".55"/><stop offset="1" stop-color="#7cffb2" stop-opacity="0"/></linearGradient></defs>
  ${[0,.5,1].map(f=>`<line x1="0" x2="${W}" y1="${H-10-f*(H-30)}" y2="${H-10-f*(H-30)}" stroke="#ffffff1a"/><text x="4" y="${H-14-f*(H-30)}" fill="#cbb" font-size="13">${Math.round(f*mx)}</text>`).join("")}
  <polygon points="0,${H-10} ${pts} ${W},${H-10}" fill="url(#cg)"/><polyline points="${pts}" fill="none" stroke="#7cffb2" stroke-width="3"/></svg><div class="axis mut"><span>30 days ago</span><span>Today</span></div></div>
  <div><h3>Top artists</h3><ol>${top(cnt).map(([n,v])=>`<li>${n} <span class="mut">${v} plays</span></li>`).join("")}</ol><h3>Top genres</h3><ol>${top(gen).map(([n,v])=>`<li>${n} <span class="mut">${v}</span></li>`).join("")}</ol></div></div></section>`}
 app.innerHTML=`<div class="ahead">${avatar(u,120)}<div><span class="mut">@${u.handle} · free member</span><h1>${esc(u.name)}</h1>
 <div id="bio"><p class="bio">${u.bio?esc(u.bio):'<span class="mut">No bio yet.</span>'}</p>${own?'<button class="btn ghost sm" id="eb">Edit bio</button>':""}</div>
 ${!own?`<button class="btn" id="msgb">✉️ Message</button>`:""}</div></div>${an}
 <h2>Tracked artists</h2><div class="chips">${u.tracked.map(id=>ARTISTS.find(a=>a.id==id)).filter(Boolean).map(artistChip).join("")||'<span class="mut">Not tracking anyone yet.</span>'}</div>
 <h2>Lists</h2>${own?'<form id="nl2" class="mrow"><input name="n" placeholder="New list name" required maxlength="40"><button class="btn sm">Create list</button></form>':""}<div class="lists2">${lists}</div>`;
 if(own){app.querySelector("#eb").onclick=()=>{app.querySelector("#bio").innerHTML=`<form id="bf"><textarea name="b" maxlength="280">${esc(u.bio)}</textarea><div class="mrow"><button class="btn sm">Save bio</button></div></form>`;app.querySelector("#bf").onsubmit=e=>{e.preventDefault();u.bio=e.target.b.value.trim();save();route()}};
  app.querySelector("#nl2").onsubmit=e=>{e.preventDefault();u.lists.push({id:"l"+Date.now(),name:e.target.n.value.trim(),clips:[]});save();route()};
  app.querySelectorAll("[data-ren]").forEach(b=>b.onclick=()=>{const l=u.lists.find(x=>x.id==b.dataset.ren),n=prompt("Rename list",l.name);if(n&&n.trim()){l.name=n.trim().slice(0,40);save();route()}});
  app.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{const l=u.lists.find(x=>x.id==b.dataset.del);if(confirm(`Delete “${l.name}”?`)){u.lists=u.lists.filter(x=>x!=l);save();route()}})}
 else app.querySelector("#msgb").onclick=()=>{if(gate("message other fans"))location.hash="#/messages/"+h};return true}
function messages(withH){if(!me()){app.innerHTML='<h1>Messages</h1><p class="empty">Sign in to message other fans.</p>';gate("message other fans");return true}
 const mine=S.msgs.filter(m=>m.from==S.me||m.to==S.me),peers=[...new Set(mine.map(m=>m.from==S.me?m.to:m.from))];if(withH&&!peers.includes(withH)&&S.users[withH])peers.unshift(withH);
 const cur=withH||peers[0];if(cur)S.msgs.forEach(m=>{if(m.to==S.me&&m.from==cur)m.read=true});save();header();
 const conv=cur?mine.filter(m=>m.from==cur||m.to==cur).sort((a,b)=>a.t-b.t):[];
 app.innerHTML=`<h1>Messages</h1><div class="inbox"><div class="convs">${peers.map(p=>{const u=S.users[p],last=mine.filter(m=>m.from==p||m.to==p).sort((a,b)=>b.t-a.t)[0],un=S.msgs.filter(m=>m.from==p&&m.to==S.me&&!m.read).length;
  return `<a class="conv ${p==cur?"on":""}" href="#/messages/${p}">${avatar(u,40)}<div><b>${esc(u.name)}</b>${un?` <i class="cnt in">${un}</i>`:""}<span class="mut">${last?esc(last.text.slice(0,38))+"…":"New conversation"}</span></div></a>`}).join("")||'<p class="mut">No conversations yet. Visit a member profile and hit Message.</p>'}</div>
 <div class="thread panel">${cur?`<div class="th">${avatar(S.users[cur],36)} <a href="#/profile/${cur}"><b>${esc(S.users[cur].name)}</b></a></div><div class="msgs">${conv.map(m=>`<div class="bub ${m.from==S.me?"me":""}">${esc(m.text)}<small>${ago(m.t)}</small></div>`).join("")}</div>
 <form id="mf" class="mrow"><input name="t" placeholder="Message ${esc(S.users[cur].name)}…" required maxlength="500"><button class="btn">Send</button></form>`:'<p class="mut">Pick a conversation.</p>'}</div></div>`;
 const f=app.querySelector("#mf");if(f)f.onsubmit=e=>{e.preventDefault();const txt=f.t.value.trim();S.msgs.push({from:S.me,to:cur,text:txt,t:Date.now(),read:false});save();window.SSB&&SSB.enabled&&SSB.sendMessage(cur,txt).catch(e=>console.warn("[SSB]",e.message));messages(cur)};
 const ms=app.querySelector(".msgs");if(ms)ms.scrollTop=1e6;return true}
/* ---------- route hooks ---------- */
function routeHook(p,id){return p=="advertise"?(window.ADS?ADS.page():false):p=="clip"?clipPage(id):p=="profile"?profile(id):p=="messages"?messages(id):false}
let playedThisView=new Set();addEventListener("hashchange",()=>playedThisView=new Set());
addEventListener("blur",()=>setTimeout(()=>{const f=document.activeElement;if(f&&f.tagName=="IFRAME"){const w=f.closest(".player");const cb=w&&w.nextElementSibling;const id=cb&&cb.dataset.clip;if(id&&!playedThisView.has(id)){playedThisView.add(id);play(id)}}},0));
function after(p,id){header();if(window.SSB)SSB.ready.then(ok=>{if(ok)SSB.loadTotals([...new Set([...document.querySelectorAll("[data-tv]")].map(e=>e.dataset.tv))])});
 document.querySelectorAll("[data-clip]").forEach(el=>{if(el.querySelector(".savebtn"))return;const b=document.createElement("button");b.className="savebtn";b.textContent="＋ Save";b.onclick=e=>{e.preventDefault();e.stopPropagation();saveModal(el.dataset.clip)};el.style.position="relative";el.appendChild(b)});
 document.querySelectorAll("[data-play] .play").forEach(pl=>{pl.style.cursor="pointer";pl.onclick=e=>{e.preventDefault();e.stopPropagation();play(pl.closest("[data-play]").dataset.play)}});
 if(p=="show"){const s=SHOWS.find(x=>x.id==id);if(!s)return;const next=new Date(s.date.getTime()+46*DAY);
  app.insertAdjacentHTML("beforeend",commentsHTML("show:"+s.id));}
 if(p=="artist"){const a=ARTISTS.find(x=>x.id==id);if(!a)return;const fb=document.getElementById("fb"),u=me();
  fb.textContent=u&&u.tracked.includes(a.id)?"✓ Tracking":"＋ Track";fb.className=u&&u.tracked.includes(a.id)?"btn ghost":"btn";
  fb.onclick=()=>{if(!gate("track artists"))return;const t=me().tracked,i=t.indexOf(a.id);i<0?t.push(a.id):t.splice(i,1);save();window.SSB&&SSB.enabled&&SSB.track(a.id,i<0).catch(e=>console.warn("[SSB]",e.message));after(p,id)};
 }
 window.ADS&&ADS.render(p,id);
 mountComments()}
return {route:routeHook,after,S:()=>S,sitePlays,play,refreshViewLabels};})();
window.SOC=SOC;
