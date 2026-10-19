/* Showstopper — Supabase layer. Active only when window.SUPABASE_URL and window.SUPABASE_ANON_KEY are set (config.js)
   AND the schema exists; otherwise SSB.enabled=false and social.js keeps using localStorage.
   Only the public anon key belongs here. Never put the service-role key in the site. */
window.SSB=(()=>{const api={enabled:false,ready:null,status:"off",user:null};
 const URL_=window.SUPABASE_URL,KEY=window.SUPABASE_ANON_KEY;if(!URL_||!KEY){api.status="no config";api.ready=Promise.resolve(false);return api}
 let sb;const remoteTotals={};api.remoteTotals=remoteTotals;
 api.ready=(async()=>{try{
   if(!window.supabase){await new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
   sb=window.supabase.createClient(URL_,KEY);api.client=sb;
   const {error}=await sb.from("artists").select("id").limit(1);if(error){api.status="schema missing: "+(error.code||error.message);console.warn("[SSB]",api.status,"- using localStorage");return false}
   api.enabled=true;api.status="connected";const {data}=await sb.auth.getSession();api.user=data.session?.user||null;
   sb.auth.onAuthStateChange((_e,s)=>api.user=s?.user||null);return true}catch(e){api.status="load failed";console.warn("[SSB] falling back to localStorage",e);return false}})();
 const need=()=>{if(!api.enabled)throw new Error("Supabase not enabled");if(!api.user)throw new Error("not signed in")};
 api.signUp=async(email,password,display_name,handle)=>{const {data,error}=await sb.auth.signUp({email,password,options:{data:{display_name,handle}}});if(error)throw error;api.user=data.user;return data};
 api.signIn=async(email,password)=>{const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;api.user=data.user;return data};
 api.signOut=()=>sb&&sb.auth.signOut();
 api.recordPlay=async(clipId)=>{if(!api.enabled)return;const {data,error}=await sb.rpc("increment_play",{p_clip_id:clipId});if(error){console.warn("[SSB] play",error.message);return}
   remoteTotals[clipId]=Object.assign(remoteTotals[clipId]||{},{site_views:data});window.SOC&&SOC.refreshViewLabels(clipId);return data};
 api.loadTotals=async(ids)=>{if(!api.enabled||!ids.length)return;const {data,error}=await sb.rpc("clip_view_totals",{p_ids:ids});if(error)return;
   data.forEach(r=>{remoteTotals[r.clip_id]=Object.assign(remoteTotals[r.clip_id]||{},r);window.SOC&&SOC.refreshViewLabels(r.clip_id)});
   if(typeof HIST_DAYS=="undefined"||HIST_DAYS<28)return;const g=await sb.rpc("clip_views_30d",{p_ids:ids});if(!g.error)g.data.forEach(r=>{remoteTotals[r.clip_id]=Object.assign(remoteTotals[r.clip_id]||{},{site_30d:r.site_plays_30d})})};
 api.sitePlays=id=>remoteTotals[id]?Number(remoteTotals[id].site_views):null;
 api.track=async(artistId,on)=>{need();const q=sb.from("follows");const {error}=on?await q.insert({user_id:api.user.id,artist_id:artistId}):await q.delete().eq("user_id",api.user.id).eq("artist_id",artistId);if(error&&error.code!="23505")throw error};
 api.saveToList=async(listName,clipId,on)=>{need();let {data:l}=await sb.from("lists").select("id").eq("user_id",api.user.id).eq("name",listName).maybeSingle();
   if(!l){const r=await sb.from("lists").insert({user_id:api.user.id,name:listName}).select("id").single();if(r.error)throw r.error;l=r.data}
   const q=sb.from("list_items");const {error}=on?await q.upsert({list_id:l.id,clip_id:clipId}):await q.delete().eq("list_id",l.id).eq("clip_id",clipId);if(error)throw error;return l.id};
 api.comment=async(key,body,parentRemoteId)=>{need();const [target_type,target_id]=key.split(/:(.+)/);const {data,error}=await sb.from("comments").insert({target_type,target_id,user_id:api.user.id,body,parent_id:parentRemoteId||null}).select("id,created_at").single();if(error)throw error;return data};
 api.loadComments=async(key)=>{if(!api.enabled)return [];const [t,id]=key.split(/:(.+)/);const {data,error}=await sb.from("comments").select("id,parent_id,body,created_at,user_id,profiles(handle,display_name,hue),comment_likes(count)").eq("target_type",t).eq("target_id",id).order("created_at");return error?[]:data};
 api.sendMessage=async(otherHandle,body)=>{need();const {data:p}=await sb.from("profiles").select("id").eq("handle",otherHandle).maybeSingle();if(!p)return null;
   const {data:cid,error}=await sb.rpc("start_conversation",{p_other:p.id});if(error)throw error;const r=await sb.from("messages").insert({conversation_id:cid,sender_id:api.user.id,body});if(r.error)throw r.error;return cid};
 return api})();
