/* الهيدر + القائمة الجانبية + الفوتر + سهم الصعود */
(()=>{
const A=window.AQX,t=A.t,pg=document.body.dataset.page||'';
const nav=[['home.html','home','🏠'],['timetable.html','timetable','📅'],['world.html','world','🌍'],['compare.html','compare','📊'],['settings.html','settings','⚙️'],['embed.html','embed','🧩'],['luck.html','luck','✨'],['pro.html','pro','👑'],['about.html','about','ℹ️']];
const soon=['world','compare','settings','embed','luck','pro','about'];
document.body.insertAdjacentHTML('afterbegin',`
<header class="hd"><button class="mb" id="mb" aria-label="القائمة" aria-expanded="false"><span></span><span></span><span></span></button>
<a class="brand" href="home.html"><i>🌙</i>AQX Ramadan</a><span class="yr">رمضان ${A.HIJRI} هـ · ${A.YEAR}</span></header>
<div class="ov" id="ov"></div>
<aside class="sd" id="sd" aria-label="القائمة الرئيسية"><div class="sd-h"><b>AQX Ramadan</b><small>الإمساكية الرمضانية العالمية</small></div>
<nav>${nav.map(([h,k,i])=>`<a href="${h}" class="${pg===k?'on':''}"><em>${i}</em>${t('nav.'+k)}${soon.includes(k)?`<s>${t('nav.soon')}</s>`:''}</a>`).join('')}</nav></aside>`);
document.body.insertAdjacentHTML('beforeend',`
<footer class="ft"><div><b>AQX Ramadan</b><p>منصة الإمساكية الرمضانية العالمية. المواقيت من AQX Prayer API وقد تختلف حسب طريقة الحساب.</p></div><a href="${A.SITE}">${A.SITE.replace('https://','')}</a></footer>
<button class="up" id="up" aria-label="للأعلى"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>`);
const sd=document.getElementById('sd'),ov=document.getElementById('ov'),mb=document.getElementById('mb'),up=document.getElementById('up');
const tg=o=>{sd.classList.toggle('open',o);ov.classList.toggle('on',o);mb.setAttribute('aria-expanded',o)};
mb.onclick=()=>tg(!sd.classList.contains('open'));ov.onclick=()=>tg(false);
addEventListener('keydown',e=>e.key==='Escape'&&tg(false));
addEventListener('scroll',()=>up.classList.toggle('on',scrollY>400),{passive:true});
up.onclick=()=>scrollTo({top:0,behavior:'smooth'});
})();
