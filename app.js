const $=s=>document.querySelector(s),app=$("#app");
const fmt=d=>d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const iso=d=>d.toISOString().slice(0,10);
const follows=new Set(JSON.parse(localStorage.getItem("ssf")||"[]"));
const grad=h=>`background:linear-gradient(135deg,hsl(${h} 90% 45%),hsl(${(h+60)%360} 80% 20%) 60%,#05050a),radial-gradient(circle at 70% 20%,#fff4,transparent 40%)`;
const thumb=(c,best)=>`<div class="thumb" style="${c.thumb?`background:#000 url(${c.thumb}) center/cover`:grad(c.hue)}"><div class="play"></div>${best?'<span class="badge best">★ Best clip</span>':''}<span class="badge">${c.len}</span></div>`;
const creditFull=c=>`<span class="src">via ${c.platform}</span> <span class="mut">by ${c.uploader_url?`<a href="${c.uploader_url}" target="_blank" rel="noopener" style="text-decoration:underline">${esc0(c.uploader)}</a>`:esc0(c.uploader)}</span>${c.url?` · <a class="srcl" href="${c.url}" target="_blank" rel="noopener">Watch on ${c.platform} ↗</a>`:""}`;
const credit=c=>`<span class="src">via ${c.platform}</span> <span class="mut">by ${esc0(c.uploader)}</span>`;
const esc0=s=>String(s).replace(/[&<>"]/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[x]));
const siteViews=c=>window.SOC?SOC.sitePlays(c.id):0;
const totalViews=c=>(c.source_views||0)+siteViews(c);
const viewsTip=c=>`${(c.source_views||0).toLocaleString("en-US")} on ${c.platform} (fetched ${String(c.source_views_fetched_at||"").slice(0,16).replace("T"," ")} UTC) + ${siteViews(c).toLocaleString("en-US")} on Showstopper`;
const nviews=c=>`<span class="tv" data-tv="${c.id}" title="${viewsTip(c)}">${totalViews(c).toLocaleString("en-US")}</span>`;
const trendOf=c=>Math.round(totalViews(c)/Math.max(c.age_days||1,1));
const embed=(c,best)=>c.embed?`<div class="embed-wrap">${best?'<span class="badge best">★ Best clip</span>':''}<iframe src="${c.embed}${c.platform=="YouTube"?"?rel=0&modestbranding=1":""}" title="${esc0(c.song)} — ${c.platform} embed" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`:thumb(c,best);
const showCard=s=>`<a class="card" href="#/show/${s.id}">${thumb(s.best,1)}<div class="meta"><b>${s.artist.name}</b><span class="mut">${s.venue} · ${s.city}</span><br><span class="mut">${fmt(s.date)}</span> · ${credit(s.best)}</div></a>`;
const artistAvatar=(a,size=28)=>a.thumb?`<img class="aav" src="${esc0(a.thumb)}" alt="" referrerpolicy="no-referrer" width="${size}" height="${size}" loading="lazy" style="width:${size}px;height:${size}px" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'aav ini',style:'width:${size}px;height:${size}px;font-size:${Math.round(size*.45)}px;background:hsl(${a.hue} 70% 40%)',textContent:'${esc0(a.name[0])}'}))">`:`<span class="aav ini" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.45)}px;background:linear-gradient(135deg,hsl(${a.hue} 80% 50%),hsl(${(a.hue+60)%360} 70% 25%))">${esc0(a.name.replace(/^The /,"")[0])}</span>`;
const artistChip=a=>`<a class="chip achip" href="#/artist/${a.id}" style="border-color:hsl(${a.hue} 80% 55%)">${artistAvatar(a,26)}${esc0(a.name)}</a>`;
const HAS30=typeof HIST_DAYS!="undefined"&&HIST_DAYS>=28;
const site30=c=>{const r=window.SSB&&SSB.remoteTotals&&SSB.remoteTotals[c.id];return r&&r.site_30d!=null?Number(r.site_30d):0};
const gain30=c=>(c.views_30d||0)+site30(c);
const recentPool=()=>{const p=ALL_CLIPS.filter(c=>(c.age_days||999)<=30);return p.length?p:ALL_CLIPS};
const MV_TIP=HAS30?"Most views gained over the last 30 days: YouTube views now minus ~30 days ago (daily snapshots) + Showstopper plays in the last 30 days."
 :`Not enough history yet (${typeof HIST_DAYS!="undefined"?HIST_DAYS:0} of 30 days of daily view snapshots). Until then: clips uploaded in the last 30 days, ranked by total views.`;
const rank30=list=>HAS30?[...list].sort((x,y)=>gain30(y)-gain30(x)):[...list].sort((x,y)=>totalViews(y)-totalViews(x));
const artistRow=a=>{const sh=SHOWS.filter(s=>s.artist==a);return `<a class="arow" href="#/artist/${a.id}">${artistAvatar(a,52)}<div><b>${esc0(a.name)}</b><span class="mut">${esc0(a.genre)} · ${sh.length} show${sh.length==1?"":"s"}${sh[0]?` · latest ${fmt(sh[0].date)}${sh[0].city?", "+esc0(sh[0].city):""}`:""}</span></div><span class="mut">→</span></a>`};
function pager(el,items,render,per=30){let n=0;const more=document.createElement("button");more.className="btn ghost more";
 const draw=()=>{el.insertAdjacentHTML("beforeend",items.slice(n,n+per).map(render).join(""));n+=per;more.style.display=n<items.length?"":"none";more.textContent=`Show more (${items.length-n} left)`;window.SOC&&SOC.after&&0};
 el.innerHTML=items.length?"":'<p class="empty">No matches.</p>';el.after(more);more.onclick=draw;draw();return more}
function home(){let now=new Date();if(!ALL_CLIPS.some(c=>c.date.getMonth()==now.getMonth()&&c.date.getFullYear()==now.getFullYear()))now=new Date(Math.max(...ALL_CLIPS.map(c=>c.date)));const mo=now.toLocaleDateString("en-US",{month:"long",year:"numeric"});
const top=rank30(HAS30?ALL_CLIPS:recentPool())[0];
const arts=[...ARTISTS].sort((x,y)=>x.name.localeCompare(y.name)),groups={};arts.forEach(a=>{const L=a.name.replace(/^The /,"")[0];(groups[L]=groups[L]||[]).push(a)});
const genres=[...new Set(ARTISTS.map(a=>a.genre))].sort();
const trend=rank30(HAS30?ALL_CLIPS:recentPool()).filter(c=>c!=top).slice(0,8);
app.innerHTML=`<section class="hero mv"><p class="eyebrow">Most Viewed Clip of the Month <span class="tip" tabindex="0" title="${esc0(MV_TIP)}" aria-label="${esc0(MV_TIP)}">ⓘ</span></p>
<a class="mv-card" href="#/show/${top.showId}"><div class="player">${thumb(top,0)}<span class="mv-badge">#1 Most Viewed · ${HAS30?"last 30 days":mo}</span></div>
<div class="mv-info"><h1>${top.artist.name}</h1><p class="mv-song">“${esc0(top.song)}” · <b>${HAS30?`+${gain30(top).toLocaleString("en-US")} views in 30 days`:`${nviews(top)} total views`}</b></p><p class="vbreak" data-tvb="${top.id}">${viewsTip(top)}</p>
<p>${top.venue} · ${top.city} · ${fmt(top.date)}</p><p>${credit(top)}</p><span class="btn">Watch the show →</span></div></a></section>
<h2>Artists A–Z <a class="mut small" style="font-weight:400" href="#/artists">· search all ${ARTISTS.length} artists →</a></h2><div class="az">${Object.keys(groups).sort().map(L=>`<div class="az-g"><span class="az-l">${L}</span><div class="chips">${groups[L].map(artistChip).join("")}</div></div>`).join("")}</div>
<h2>Genres A–Z</h2><div class="chips">${genres.map(g=>`<a class="chip" href="#/genre/${encodeURIComponent(g)}">${g} <span class="mut">${ARTISTS.filter(a=>a.genre==g).length}</span></a>`).join("")}</div>
<div id="ad-home"></div><h2>Trending Now <span class="mut" style="font-size:15px;font-weight:400">· ${HAS30?"most views gained in the last 30 days":"uploaded in the last 30 days, by total views"} <span class="tip" tabindex="0" title="${esc0(MV_TIP)}">ⓘ</span></span></h2>
<div class="grid">${trend.map((c,i)=>`<a class="card" data-clip="${c.id}" href="#/show/${c.showId}">${thumb(c)}<div class="meta"><b>#${i+1} ${c.artist.name}</b><span class="mut">“${esc0(c.song)}” · ${c.city}</span><br><span class="trend">${HAS30?`▲ +${gain30(c).toLocaleString("en-US")} / 30d`:`${nviews(c)} views`}</span> ${credit(c)}</div></a>`).join("")}</div>`;}
function artist(id){const a=ARTISTS.find(x=>x.id==id);if(!a)return home();const list=SHOWS.filter(s=>s.artist==a);
const cities=[...new Set(list.map(s=>s.city))];
app.innerHTML=`<div class="ahead">${artistAvatar(a,120).replace('class="aav','class="aav big')}<div><span class="mut">${a.genre}</span><h1>${a.name}</h1>${a.thumb_credit?`<p class="mut small credit">${a.thumb_credit_url?`<a href="${esc0(a.thumb_credit_url)}" target="_blank" rel="noopener">${esc0(a.thumb_credit)}</a>`:esc0(a.thumb_credit)}</p>`:""}<p class="mut">${list.length} recent shows · ${list.reduce((n,s)=>n+s.clips.length,0)} fan clips indexed</p><button class="btn" id="fb"></button></div></div>
<h2>Recent shows</h2><div class="filters"><select id="fc"><option value="">All cities</option>${cities.map(c=>`<option>${c}</option>`).join("")}</select><select id="fs"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="clips">Most clips</option></select></div><div id="sl"></div>`;
const fb=$("#fb"),upd=()=>{fb.textContent=follows.has(id)?"✓ Following":"+ Follow";fb.className=follows.has(id)?"btn ghost":"btn"};upd();
fb.onclick=()=>{follows.has(id)?follows.delete(id):follows.add(id);localStorage.setItem("ssf",JSON.stringify([...follows]));upd()};
const draw=()=>{let l=list.filter(s=>!$("#fc").value||s.city==$("#fc").value);const o=$("#fs").value;
 l.sort((x,y)=>o=="old"?x.date-y.date:o=="clips"?y.clips.length-x.clips.length:y.date-x.date);
 $("#sl").innerHTML=l.map(s=>`<a class="row" href="#/show/${s.id}"><div><b>${fmt(s.date)}</b> — ${s.venue}<br><span class="mut">${s.city}</span></div><div class="mut">${s.clips.length} clips · best ${s.best.score}/100 →</div></a>`).join("")};
$("#fc").onchange=$("#fs").onchange=draw;draw();}
function show(id){const s=SHOWS.find(x=>x.id==id);if(!s)return home();const b=s.best,bar=(l,v)=>`<div>${l} <span class="mut">${v}</span></div><div class="bar"><i style="width:${Math.min(v,100)}%"></i></div>`;
app.innerHTML=`<p class="mut"><a href="#/artist/${s.artist.id}">← ${s.artist.name}</a></p><h1>${s.artist.name} <span class="mut" style="font-size:.5em">live at ${s.venue}</span></h1>
<div class="player live">${embed(b,0)}</div><p class="clipbar" data-clip="${b.id}"><span class="badge best inl">★ Best clip</span> ${esc0(b.song)} · ${creditFull(b)} · <span class="mut">${nviews(b)} total views (<span data-tvb="${b.id}">${viewsTip(b)}</span>) · ${b.len} · official ${b.platform} embed (youtube-nocookie)</span></p>
<div class="two"><div class="panel"><h3 style="margin-top:0">Clip index <span class="mut" style="font-weight:400;font-size:15px">· setlist needs a setlist.fm key</span></h3><ol class="set">${s.clips.slice(0,12).map(c=>`<li><a href="#/clip/${c.id}"><b>${esc0(c.song)}</b></a> <span class="mut">· ${c.len}${c.full&&c.len!="full show"?" · full show":""}</span></li>`).join("")}</ol></div>
<div><div class="panel"><h3 style="margin-top:0">Why this is the best clip · ${b.score}/100</h3>${bar("Resolution (HD)",b.sc.video)}${bar("Audio proxy (title keywords)",b.sc.audio)}${bar("Full-show length",b.sc.stability)}${bar("Views (k, capped)",Math.min(b.sc.views/10,100)|0)}<p class="mut" style="margin:0">PLAN score: 30% full-show, 15% resolution, 15% audio proxy, 15% setlist coverage, 15% views, 5% likes, 5% recency.</p></div>
<div class="panel" style="margin-top:16px"><h3 style="margin-top:0">Show info</h3><p style="margin:0"><b>${fmt(s.date)}</b><br>${s.venue}<br>${s.city}<br><span class="mut">${s.artist.genre}</span></p></div></div></div>
<h2>More fan clips (${s.clips.length-1})</h2><div class="grid">${s.clips.slice(1).map(c=>`<a class="card" data-clip="${c.id}" href="#/clip/${c.id}">${thumb(c)}<div class="meta"><b>${esc0(c.song)}</b>${credit(c)}<br><span class="mut">Score ${c.score}/100</span></div></a>`).join("")}</div>`;}
function browse(pre){const g=[...new Set(ARTISTS.map(a=>a.genre))],c=[...new Set(SHOWS.map(s=>s.city))].sort();
app.innerHTML=`<h1>Browse shows</h1><div class="filters"><select id="bg"><option value="">All genres</option>${g.map(x=>`<option>${x}</option>`)}</select><select id="bc"><option value="">All cities</option>${c.map(x=>`<option>${x}</option>`)}</select>
<label class="mut">From <input type="date" id="b1"></label><label class="mut">To <input type="date" id="b2"></label></div><p class="mut" id="bn"></p><div class="grid" id="bl"></div>`;
const draw=()=>{const l=SHOWS.filter(s=>(!bg.value||s.artist.genre==bg.value)&&(!bc.value||s.city==bc.value)&&(!b1.value||iso(s.date)>=b1.value)&&(!b2.value||iso(s.date)<=b2.value));
 $("#bn").textContent=l.length+" shows";document.querySelectorAll("#app .more").forEach(b=>b.remove());pager($("#bl"),l,showCard,24);window.SOC&&SOC.after("browse")};
if(pre)bg.value=decodeURIComponent(pre);["bg","bc","b1","b2"].forEach(i=>$("#"+i).oninput=draw);draw();}
function artistsPage(g,q0){const gl=g?decodeURIComponent(g):"",pool=[...ARTISTS].filter(a=>!gl||a.genre==gl).sort((x,y)=>x.name.localeCompare(y.name));
 app.innerHTML=`<p class="mut">${gl?'<a href="#/">← Home</a>':""}</p><h1>${gl?esc0(gl):"All artists"} <span class="mut" style="font-size:.45em">${pool.length} artist${pool.length==1?"":"s"}</span></h1>
 <div class="search asearch"><input id="aq" type="search" placeholder="Search ${gl?esc0(gl)+" ":""}artists by name…" aria-label="Search artists" autocomplete="off" value="${esc0(q0||"")}"></div><div class="alist" id="al"></div>
 ${gl?`<h2>Recent ${esc0(gl)} shows</h2><div class="grid" id="gs"></div>`:""}`;
 const f=$("#aq"),draw=()=>{const t=f.value.trim().toLowerCase();document.querySelectorAll("#app .alist + .more").forEach(b=>b.remove());pager($("#al"),pool.filter(a=>!t||a.name.toLowerCase().includes(t)),artistRow,30)};
 f.oninput=draw;draw();if(gl){pager($("#gs"),SHOWS.filter(s=>s.artist.genre==gl),showCard,12)}if(!q0)f.focus({preventScroll:true});else{f.focus();f.setSelectionRange(f.value.length,f.value.length)}}
function route(){const [,p,id]=location.hash.split("/");window.scrollTo(0,0);
 if(window.SOC&&SOC.route(p,id))return SOC.after(p,id);
 p=="artist"?artist(id):p=="show"?show(id):p=="browse"?browse(id):p=="genre"?artistsPage(id):p=="artists"?artistsPage("",decodeURIComponent(id||"")):home();window.SOC&&SOC.after(p,id);}
addEventListener("hashchange",route);route();
