/* Showstopper first-party page-view analytics. Logs via log_page_view RPC (deduped + rate limited).
   Admin dashboard at #/analytics (ad_admins only). No third-party trackers. */
window.SS_ANALYTICS=(function(){
 const api={status:"init",isAdmin:false};
 const vk=()=>localStorage.getItem("ss_vk")||(()=>{const k="v"+[...crypto.getRandomValues(new Uint8Array(10))].map(b=>b.toString(16).padStart(2,"0")).join("");localStorage.setItem("ss_vk",k);return k})();
 const pathOf=()=>{const h=(location.hash||"#/").replace(/^#/,"");return (h.startsWith("/")?h:"/"+h).slice(0,200)||"/"};
 const refOf=()=>{try{return document.referrer||""}catch(e){return ""}};
 let lastPath="",lastAt=0;
 api.track=()=>{
  const path=pathOf(), now=Date.now();
  if(path===lastPath && now-lastAt<2000)return; // client debounce across double route()
  lastPath=path; lastAt=now;
  if(!(window.SSB&&SSB.enabled&&SSB.client))return;
  SSB.client.rpc("log_page_view",{p_path:path,p_viewer:vk(),p_referrer:refOf()})
   .then(r=>{if(r.error&&!/function|schema|404|PGRST/i.test(r.error.message||""))console.warn("[AN]",r.error.message)})
   .catch(()=>{});
 };
 api.checkAdmin=async()=>{
  api.isAdmin=false;
  if(!(window.SSB&&SSB.enabled&&SSB.client&&SSB.user))return false;
  try{const {data,error}=await SSB.client.rpc("is_ad_admin"); if(!error)api.isAdmin=!!data}catch(e){}
  return api.isAdmin;
 };
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
 const n=x=>(+x||0).toLocaleString();
 api.page=async()=>{
  const app=document.getElementById("app");
  if(!(window.SSB&&SSB.enabled)){app.innerHTML=`<section class="panel"><h1>Analytics</h1><p class="mut">Supabase isn't connected.</p></section>`;return true}
  if(!SSB.user){app.innerHTML=`<section class="panel"><h1>Analytics</h1><p class="mut">Sign in with an admin account to view site analytics.</p><button class="btn sm" id="an-li">Log in</button></section>`;
   app.querySelector("#an-li").onclick=()=>document.getElementById("hli")?.click()||document.getElementById("g2")?.click();return true}
  await api.checkAdmin();
  if(!api.isAdmin){app.innerHTML=`<section class="panel"><h1>Analytics</h1><p class="mut">This page is only for Showstopper admins.</p></section>`;return true}
  app.innerHTML=`<section class="adv-hero"><p class="eyebrow">Admin</p><h1>Site analytics</h1>
   <p class="lead mut">First-party page views from Showstopper. No third-party trackers. Play starts are counted separately via clip plays.</p>
   <div class="an-range"><button class="btn ghost sm on" data-d="7">7 days</button><button class="btn ghost sm" data-d="30">30 days</button></div></section>
   <div id="an-body" class="mut">Loading…</div>`;
  const body=app.querySelector("#an-body");
  const load=async days=>{
   body.innerHTML="Loading…";
   const c=SSB.client;
   const [sum,pages,refs,daily]=await Promise.all([
    c.rpc("analytics_summary",{p_days:days}),
    c.rpc("analytics_top_pages",{p_days:days,p_limit:20}),
    c.rpc("analytics_top_referrers",{p_days:days,p_limit:15}),
    c.rpc("analytics_daily",{p_days:days})
   ]);
   if(sum.error||pages.error||refs.error||daily.error){
    const msg=(sum.error||pages.error||refs.error||daily.error).message||"";
    body.innerHTML=`<section class="panel"><p class="err">Couldn't load analytics${/function|schema|404|PGRST/i.test(msg)?": paste <code>page_views.sql</code> into the Supabase SQL Editor first.":": "+esc(msg)}</p></section>`;
    return;
   }
   const s=sum.data||{}, tp=pages.data||[], tr=refs.data||[], dy=daily.data||[];
   const maxV=Math.max(1,...dy.map(x=>x.visits));
   body.innerHTML=`
   <div class="adv-stats an-stats">
    <div><b>${n(days===7?s.visits_7d:s.visits_30d)}</b><span>visits · ${days}d</span></div>
    <div><b>${n(days===7?s.uniques_7d:s.uniques_30d)}</b><span>unique viewers · ${days}d</span></div>
    <div><b>${n(s.visits_7d)}</b><span>visits · 7d</span></div>
    <div><b>${n(s.uniques_30d)}</b><span>uniques · 30d</span></div>
   </div>
   <section class="panel"><h2>Daily trend</h2>
    <div class="an-bars">${dy.length?dy.map(d=>`<div class="an-bar" title="${esc(d.day)}: ${n(d.visits)} visits, ${n(d.uniques)} uniques"><i style="height:${Math.max(4,Math.round(100*d.visits/maxV))}%"></i><span>${esc(String(d.day).slice(5))}</span></div>`).join(""):'<p class="mut">No page views yet.</p>'}</div>
   </section>
   <div class="an-two">
    <section class="panel"><h2>Top pages</h2>
     <table class="rate an-table"><tr><th>Path</th><th>Visits</th><th>Uniques</th></tr>
     ${tp.length?tp.map(r=>`<tr><td><code>${esc(r.path)}</code></td><td>${n(r.visits)}</td><td>${n(r.uniques)}</td></tr>`).join(""):"<tr><td colspan=3 class=mut>None yet</td></tr>"}
     </table></section>
    <section class="panel"><h2>Top referrers</h2>
     <table class="rate an-table"><tr><th>Host</th><th>Visits</th><th>Uniques</th></tr>
     ${tr.length?tr.map(r=>`<tr><td>${esc(r.referrer)}</td><td>${n(r.visits)}</td><td>${n(r.uniques)}</td></tr>`).join(""):"<tr><td colspan=3 class=mut>None yet</td></tr>"}
     </table></section>
   </div>
   <p class="mut small">Privacy: we store an anonymous viewer key (localStorage), the page path, and the referrer host — not full IPs or user agents. Ad clicks/impressions stay in the ad system; clip plays use the existing play counter.</p>`;
  };
  app.querySelectorAll(".an-range [data-d]").forEach(b=>b.onclick=()=>{
   app.querySelectorAll(".an-range [data-d]").forEach(x=>x.classList.toggle("on",x===b));
   load(+b.dataset.d);
  });
  await load(7);
  return true;
 };
 return api;
})();
