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
const artistChip=a=>`<a class="chip" href="#/artist/${a.id}" style="border-color:hsl(${a.hue} 80% 55%)">${a.name}</a>`;
function home(){const now=new Date(2026,9,19),mo=now.toLocaleDateString("en-US",{month:"long",year:"numeric"});
const month=ALL_CLIPS.filter(c=>c.date.getMonth()==now.getMonth()&&c.date.getFullYear()==now.getFullYear());
const top=month.reduce((m,c)=>totalViews(c)>totalViews(m)?c:m,month[0]);
const arts=[...ARTISTS].sort((x,y)=>x.name.localeCompare(y.name)),groups={};arts.forEach(a=>{const L=a.name.replace(/^The /,"")[0];(groups[L]=groups[L]||[]).push(a)});
const genres=[...new Set(ARTISTS.map(a=>a.genre))].sort();
const trend=[...ALL_CLIPS].sort((x,y)=>trendOf(y)-trendOf(x)).slice(0,8);
app.innerHTML=`<section class="hero mv"><p class="eyebrow">Most Viewed Clip of the Month</p>
<a class="mv-card" href="#/show/${top.showId}"><div class="player">${thumb(top,0)}<span class="mv-badge">#1 Most Viewed · ${mo}</span></div>
<div class="mv-info"><h1>${top.artist.name}</h1><p class="mv-song">“${esc0(top.song)}” · <b>${nviews(top)} total views</b></p><p class="vbreak" data-tvb="${top.id}">${viewsTip(top)}</p>
<p>${top.venue} · ${top.city} · ${fmt(top.date)}</p><p>${credit(top)}</p><span class="btn">Watch the show →</span></div></a></section>
<h2>Artists A–Z</h2><div class="az">${Object.keys(groups).sort().map(L=>`<div class="az-g"><span class="az-l">${L}</span><div class="chips">${groups[L].map(artistChip).join("")}</div></div>`).join("")}</div>
<h2>Genres A–Z</h2><div class="chips">${genres.map(g=>`<a class="chip" href="#/browse/${encodeURIComponent(g)}">${g}</a>`).join("")}</div>
<div id="ad-home"></div><h2>Trending Now <span class="mut" style="font-size:15px;font-weight:400">· trend = total views (YouTube + Showstopper) per day since upload</span></h2>
<div class="grid">${trend.map((c,i)=>`<a class="card" data-clip="${c.id}" href="#/show/${c.showId}">${thumb(c)}<div class="meta"><b>#${i+1} ${c.artist.name}</b><span class="mut">“${esc0(c.song)}” · ${c.city}</span><br><span class="trend">▲ ${trendOf(c).toLocaleString("en-US")}/day</span> ${credit(c)}</div></a>`).join("")}</div>`;}
function artist(id){const a=ARTISTS.find(x=>x.id==id);if(!a)return home();const list=SHOWS.filter(s=>s.artist==a);
const cities=[...new Set(list.map(s=>s.city))];
app.innerHTML=`<div class="ahead"><div class="avatar" style="${grad(a.hue)}"></div><div><span class="mut">${a.genre} · example artist</span><h1>${a.name}</h1><p class="mut">${list.length} recent shows · ${list.reduce((n,s)=>n+s.clips.length,0)} fan clips indexed</p><button class="btn" id="fb"></button></div></div>
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
 $("#bn").textContent=l.length+" shows";$("#bl").innerHTML=l.map(showCard).join("")||'<p class="empty">No shows match these filters.</p>'};
if(pre)bg.value=decodeURIComponent(pre);["bg","bc","b1","b2"].forEach(i=>$("#"+i).oninput=draw);draw();}
function route(){const [,p,id]=location.hash.split("/");window.scrollTo(0,0);
 if(window.SOC&&SOC.route(p,id))return SOC.after(p,id);
 p=="artist"?artist(id):p=="show"?show(id):p=="browse"?browse(id):home();window.SOC&&SOC.after(p,id);}
addEventListener("hashchange",route);route();
