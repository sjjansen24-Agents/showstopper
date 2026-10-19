(function(){const r=document.documentElement,rm=matchMedia("(prefers-reduced-motion: reduce)");
let t=0;function u(){t=0;const y=scrollY,h=innerHeight,k=Math.min(y/(h*1.1),1);
r.style.setProperty("--fade",k.toFixed(3));r.style.setProperty("--rise",rm.matches?"0px":(-k*18)+"vh");r.style.setProperty("--par",rm.matches?"0px":(-y*0.15)+"px")}
addEventListener("scroll",()=>{if(!t)t=requestAnimationFrame(u)},{passive:true});addEventListener("hashchange",()=>setTimeout(u,50));u()})();
