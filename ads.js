/* Showstopper — ad system. Slots + campaigns come from Supabase (backend/supabase/migrations/ads.sql) when present;
   otherwise the built-in slot list below is used and every slot shows the house ad. Every ad is labeled "Sponsored".
   Impressions: logged once per page view when >=50% of the ad is visible for 1 continuous second (MRC display standard).
   Clicks: logged on click. Both go through the log_ad_event RPC (deduped + rate limited server-side). */
window.ADS=(()=>{
 const SLOTS=[ // mirrors the ads.sql seed; the DB copy wins when available
  {id:"home-native",name:"Home native card",page:"home",size:"native card, fluid width",pricing_model:"cpm",base_cpm_usd:10,flat_price_usd:300,targeting:["genre","city"],description:"Between Genres A–Z and Trending Now on the home page. One per page view.",placeholder:{headline:"Your ad here",body:"Reach live-music fans between Genres and Trending. Advertise with Showstopper.",cta:"Advertise"}},
  {id:"show-tickets",name:"Show-page ticket banner",page:"show",size:"banner, fluid width under the player",pricing_model:"cpm",base_cpm_usd:18,targeting:["artist","genre","city"],description:"Directly under the main video on every show page. Targetable by artist, genre and city; ideal for tickets to the artist's next show.",placeholder:{headline:"Your ticket link here",body:"Fans watching this show are your next ticket buyers. Advertise with Showstopper.",cta:"Advertise"}},
  {id:"artist-merch",name:"Artist-page merch card",page:"artist",size:"native card under the artist header",pricing_model:"cpm",base_cpm_usd:14,targeting:["artist","genre"],description:"Under the artist header. Targetable by artist and genre; ideal for official merch, vinyl, fan clubs.",placeholder:{headline:"Your merch here",body:"Put official merch in front of this artist's fans. Advertise with Showstopper.",cta:"Advertise"}},
  {id:"clip-companion",name:"Clip-page companion card",page:"clip",size:"compact card under the clip info bar",pricing_model:"cpm",base_cpm_usd:8,targeting:["artist","genre"],description:"Under the clip info bar on single-clip pages, above comments. Targetable by artist and genre.",placeholder:{headline:"Your ad here",body:"Sit next to the clip fans came for. Advertise with Showstopper.",cta:"Advertise"}}];
 const api={status:"local",slots:SLOTS,campaigns:[],events:[]};
 const esc=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
 const vk=localStorage.getItem("ss_vk")||(()=>{const k="v"+[...crypto.getRandomValues(new Uint8Array(10))].map(b=>b.toString(16).padStart(2,"0")).join("");localStorage.setItem("ss_vk",k);return k})();
 api.ready=(window.SSB?SSB.ready:Promise.resolve(false)).then(async ok=>{if(!ok){api.status="local (no Supabase)";return}
  const c=SSB.client,[s,k]=await Promise.all([c.from("ad_slots").select("*").order("sort"),c.from("ad_campaigns").select("id,advertiser,slot_id,creative_image_url,headline,body,cta_label,cta_url,starts_at,ends_at,target_artists,target_genres,target_cities,priority")]);
  if(s.error||k.error){api.status="ads schema missing (run migrations/ads.sql) - house ads only";console.info("[ADS]",api.status);return}
  if(s.data.length)api.slots=s.data;api.campaigns=k.data;api.status="connected";});
 // targeting: every non-empty target list must contain the page's value; more specific matches win, then priority
 function pick(slot,ctx){const now=Date.now();const m=api.campaigns.filter(c=>c.slot_id==slot.id&&Date.parse(c.starts_at)<=now&&now<=Date.parse(c.ends_at)).map(c=>{let sp=0;
   for(const [k,v] of [["target_artists",ctx.artist],["target_genres",ctx.genre],["target_cities",ctx.city]]){const t=c[k]||[];if(t.length){if(!v||!t.map(x=>x.toLowerCase()).includes(String(v).toLowerCase()))return null;sp++}}return {c,sp}}).filter(Boolean);
  if(!m.length)return null;m.sort((a,b)=>b.sp-a.sp||b.c.priority-a.c.priority);const top=m.filter(x=>x.sp==m[0].sp&&x.c.priority==m[0].c.priority);return top[Math.floor(Math.random()*top.length)].c}
 function html(slot,c,ctx,cls){const p=slot.placeholder||{},house=!c,href=house?"#/advertise":c.cta_url;
  const hl=house?(slot.id=="show-tickets"&&ctx.artistName?`Your ticket link for ${esc(ctx.artistName)} fans here`:esc(p.headline)):esc(c.headline);
  return `<aside class="ad ad-${slot.id} ${cls||""}${house?" house":""}" data-slot="${slot.id}" data-campaign="${house?"":c.id}" aria-label="Sponsored"><span class="spons">Sponsored</span>
  ${!house&&c.creative_image_url?`<img class="ad-img" src="${esc(c.creative_image_url)}" alt="" loading="lazy">`:""}<div><b>${hl}</b><p>${house?esc(p.body):esc(c.body||"")}${house?"":` <span class="mut">· ${esc(c.advertiser)}</span>`}</p></div>
  <a class="btn sm" href="${esc(href)}"${house?"":' target="_blank" rel="sponsored noopener"'}>${house?esc(p.cta||"Advertise"):esc(c.cta_label)}</a></aside>`}
 function log(kind,el){const ev={kind,slot:el.dataset.slot,campaign:el.dataset.campaign?Number(el.dataset.campaign):null,t:Date.now()};api.events.push(ev);
  if(api.status=="connected")SSB.client.rpc("log_ad_event",{p_kind:kind,p_slot:ev.slot,p_campaign:ev.campaign,p_viewer:vk,p_page:location.hash.slice(0,200)||"#/",p_context:JSON.parse(el.dataset.ctx||"{}")}).then(r=>{ev.recorded=r.data;if(r.error){ev.error=r.error.message;console.warn("[ADS]",r.error.message)}})}
 const io="IntersectionObserver" in window?new IntersectionObserver(es=>es.forEach(e=>{const el=e.target;
   if(e.intersectionRatio>=.5&&document.visibilityState=="visible"){if(!el._t)el._t=setTimeout(()=>{io.unobserve(el);el.dataset.seen=1;log("impression",el)},1000)}else{clearTimeout(el._t);el._t=null}}),{threshold:[0,.5,1]}):null;
 function mount(slotId,where,pos,ctx,cls){const slot=api.slots.find(s=>s.id==slotId&&s.active!==false);if(!slot||!where)return;
document.querySelectorAll(`[data-slot="${slotId}"]:not(.preview)`).forEach(x=>x.remove());
  where.insertAdjacentHTML(pos,html(slot,pick(slot,ctx),ctx,cls));const el=document.querySelector(`[data-slot="${slotId}"]:not(.preview)`);el.dataset.ctx=JSON.stringify({artist:ctx.artist,genre:ctx.genre,city:ctx.city});
  el.querySelector("a").addEventListener("click",()=>log("click",el));io&&io.observe(el)}
 api.render=(p,id)=>api.ready.then(()=>{const $=s=>document.querySelector(s);
  if(!p){mount("home-native",$("#ad-home"),"afterbegin",{})}
  else if(p=="show"){const s=SHOWS.find(x=>x.id==id);s&&mount("show-tickets",$(".clipbar"),"afterend",{artist:s.artist.id,artistName:s.artist.name,genre:s.artist.genre,city:s.city})}
  else if(p=="artist"){const a=ARTISTS.find(x=>x.id==id);a&&mount("artist-merch",$(".ahead"),"afterend",{artist:a.id,genre:a.genre})}
  else if(p=="clip"){const c=ALL_CLIPS.find(x=>x.id==id);c&&mount("clip-companion",$(".clipbar"),"afterend",{artist:c.artist.id,genre:c.artist.genre,city:c.city},"compact")}});
 /* ---------- /advertise page ---------- */
 const SRC=[["Google News Initiative: direct-sold ads average $10–20 CPM vs $1–5 programmatic","https://newsinitiative.withgoogle.com/resources/trainings/understand-direct-and-programmatic-ad-revenue/"],
  ["CMO Mag (Basis/Adform 2026): native display $6.10–10.90 CPM, standard banner $0.75–2.10","https://cmomag.com/advertising/programmatic-display-cpm-benchmarks-2026"],
  ["Agency Echelon 2026 benchmarks: premium-publisher display $5–15, native $3–10 CPM","https://agencyechelon.com/reference/benchmarks/programmatic-display-and-video/"],
  ["Playwire: music sites draw ticketing/streaming/merch demand; direct entertainment deals far above programmatic","https://www.playwire.com/entertainment-website-ad-revenue-guide"],
  ["MRC Viewable Ad Impression Guidelines: 50% of pixels for 1 continuous second","https://www.mediaratingcouncil.org/sites/default/files/Standards/081815%20Viewable%20Ad%20Impression%20Guideline_v2.0_Final.pdf"],
  ["Coalition for Better Ads: mobile large sticky ads & >30% ad density fail the standard","https://www.betterads.org/standards/"]];
 const SAMPLE=Object.fromEntries(SLOTS.map(s=>[s.id,{advertiser:"Your brand",headline:"Your headline here",body:"A short line about your offer, up to 180 characters.",cta_label:"Your CTA"}]));
 const price=s=>s.pricing_model=="cpm"?`from <b>$${Number(s.base_cpm_usd).toFixed(0)} CPM</b>${s.flat_price_usd?` · or <b>$${Number(s.flat_price_usd).toFixed(0)}/week</b> flat`:""}`:`from <b>$${Number(s.flat_price_usd).toFixed(0)}</b>`;
 api.page=()=>{const app=document.getElementById("app"),srcv=ALL_CLIPS.reduce((n,c)=>n+(c.source_views||0),0);
  app.innerHTML=`<section class="adv-hero"><p class="eyebrow">Advertise with Showstopper</p><h1>Reach fans while they relive the show.</h1>
  <p class="lead">Showstopper is where fans find the best video of every concert. Every page is about a specific artist, show and city, so you can put tickets, merch and gear in front of the people who were just watching that band.</p>
  <div class="adv-stats"><div><b>${SHOWS.length}</b><span>shows indexed</span></div><div><b>${ARTISTS.length}</b><span>artists</span></div><div><b>${ALL_CLIPS.length}</b><span>fan videos</span></div><div><b>${(srcv/1e6).toFixed(1)}M</b><span>views of these clips on YouTube*</span></div></div>
  <p class="mut small">*Views the indexed clips have on their source platforms. That's demand for this content, not Showstopper traffic. We're pre-launch: verified site impressions (MRC 50%/1s viewability) will be reported from our own ad logs after launch.</p></section>
  <h2>Ad slots</h2><p class="mut">Four placements, chosen so ads never get in the way of the music: no pop-ups, no autoplay, no sticky mobile footers, and no ads on profiles or in messages. Every ad is labeled <b>Sponsored</b>.</p>
  <div class="slot-gal">${api.slots.map(s=>{const c=Object.assign({id:0,slot_id:s.id},SAMPLE[s.id]||{});return `<div class="panel slotc"><div class="mock mock-${s.page}"><div class="mk-bar"></div>${s.page=="home"?'<div class="mk-chips"></div>':'<div class="mk-player"></div>'}
  <div class="mk-ad">${html(s,c,{}, "preview"+(s.id=="clip-companion"?" compact":"")).replace('target="_blank" rel="sponsored noopener"','tabindex="-1"').replace(/href="[^"]*"/,'href="#/advertise"')}</div><div class="mk-grid"></div></div>
  <h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><p class="mut">Size: ${esc(s.size)} · Targeting: ${(s.targeting||[]).join(", ")||"run of site"}</p><p class="price">Starting at ${price(s)}</p></div>`}).join("")}</div>
  <h2>Pricing <span class="mut" style="font-size:15px;font-weight:400">· illustrative “starting at” rates until launch traffic is measured</span></h2>
  <div class="panel"><table class="rate"><tr><th>Slot</th><th>Starting at</th><th>Why</th></tr>
  <tr><td>Show-page ticket banner</td><td>$18 CPM</td><td>Highest intent (fan is watching that artist's show), artist + city targeting; top of the $10–20 direct-sold CPM range [1].</td></tr>
  <tr><td>Artist-page merch card</td><td>$14 CPM</td><td>Artist-targeted native card; above open-web native ($6–11 [2], $3–10 [3]) because it's direct-sold and contextual [1][4].</td></tr>
  <tr><td>Home native card</td><td>$10 CPM · $300/week flat</td><td>Broad reach, genre/city targeting; low end of direct-sold [1], at the top of native benchmarks [2].</td></tr>
  <tr><td>Clip-page companion</td><td>$8 CPM</td><td>Compact unit lower on the page; priced near native midpoint [2].</td></tr></table>
  <p class="mut small">Minimum campaign $250. Impressions count only when ≥50% of the ad is on screen for 1 continuous second [5]; clicks deduped per viewer per day. Final pricing depends on audience data after launch. Placements follow the Better Ads Standards [6].</p>
  <ol class="srcs">${SRC.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ol></div>
  <h2>Get in touch</h2><form id="adq" class="panel adq"><div class="g2"><label>Name<input name="name" required maxlength="120"></label><label>Work email<input name="email" type="email" required maxlength="200"></label>
  <label>Company<input name="company" maxlength="160"></label><label>Budget<select name="budget"><option value="">Choose…</option><option>Under $1k</option><option>$1k–5k</option><option>$5k–25k</option><option>$25k+</option></select></label></div>
  <fieldset><legend>Interested in</legend>${api.slots.map(s=>`<label class="lrow"><input type="checkbox" name="slots" value="${s.id}"> ${esc(s.name)}</label>`).join("")}</fieldset>
  <label>Message<textarea name="message" maxlength="2000" placeholder="Artists, cities, dates, goals…"></textarea></label><input name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
  <button class="btn">Send inquiry</button><p class="err" id="adqm" role="status"></p></form>`;
  const f=app.querySelector("#adq"),msg=app.querySelector("#adqm");f.onsubmit=async e=>{e.preventDefault();if(f.website.value)return;msg.textContent="Sending…";
   await api.ready;if(!(window.SSB&&SSB.enabled)){msg.textContent="Couldn't send: the inquiry service isn't connected. Please try again later.";return}
   const {data,error}=await SSB.client.rpc("submit_ad_inquiry",{p_name:f.name.value,p_email:f.email.value,p_company:f.company.value,p_budget:f.budget.value,p_slots:[...f.querySelectorAll("[name=slots]:checked")].map(x=>x.value),p_message:f.message.value});
   if(error){msg.textContent=/rate limited/.test(error.message)?"Too many inquiries from this network. Please try again in an hour.":/function|schema|404/i.test(error.message+error.code)?"Couldn't send: the inquiry service isn't set up yet.":"Couldn't send: "+error.message;return}
   api.lastInquiry=data;f.reset();msg.className="ok";msg.textContent="Thanks! We'll reply within 2 business days."}; return true};
 return api})();
