/* AQX core — عميل API فقط. لا حساب محلي، ولا استبدال صامت لنتائج الـAPI. */
(()=>{
const C=window.AQX,D=window.AQX_LANGS[window.AQX_LANG];
const t=k=>D[k]||k;
const store={get(k,d){try{const v=JSON.parse(localStorage.getItem('aqx.'+k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem('aqx.'+k,JSON.stringify(v))}catch(e){}}};

async function api(p,ttl=0){
  const q=new URLSearchParams(p).toString(),key='aqxc.'+q;
  if(ttl){try{const c=JSON.parse(sessionStorage.getItem(key));if(c&&Date.now()-c.t<ttl)return c.d}catch(e){}}
  const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),20000);
  try{
    const r=await fetch(C.API+'?'+q,{signal:ctl.signal});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const d=await r.json();
    if(d&&(d.ok===false||d.success===false||d.error))throw new Error(d.error||d.message||'API error');
    if(ttl)try{sessionStorage.setItem(key,JSON.stringify({t:Date.now(),d}))}catch(e){}
    return d;
  }finally{clearTimeout(to)}
}
const arr=d=>{if(Array.isArray(d))return d;if(d&&typeof d==='object')for(const k of['data','cities','methods','items','results','result','rows','days','timetable','records']){const v=d[k];if(Array.isArray(v))return v;if(v&&typeof v==='object'){const a=arr(v);if(a.length)return a}}return[]};
const flat=o=>{const r={};(function w(x,n){for(const k in x){const v=x[k];if(v&&typeof v==='object'&&!Array.isArray(v)&&n<3)w(v,n+1);else r[k]=v}})(o||{},0);return r};
const pick=(f,ks)=>{for(const k of ks)for(const kk in f)if(kk.toLowerCase()===k&&f[kk]!==''&&f[kk]!=null)return f[kk]};
const hm=v=>{const m=String(v==null?'':v).match(/(\d{1,2}):(\d{2})/);return m?m[1].padStart(2,'0')+':'+m[2]:''};

const normCity=o=>{const f=flat(o),id=pick(f,['city_id','id','code']);
  const cc=String(pick(f,['country_id','iso2','country_code','country'])||String(id||'').split('_').pop()||'').toUpperCase();
  return{id,ar:pick(f,['city_ar','name_ar','arabic_name','city_name_ar','ar']),en:pick(f,['city_en','name_en','english_name','city_name_en','en','name']),cc:cc.slice(0,2),
    tz:pick(f,['timezone','iana_timezone','tz']),method:pick(f,['method_id','method','calc_method']),lat:pick(f,['latitude','lat']),lon:pick(f,['longitude','lon','lng'])}};
const normMethod=o=>{const f=flat(o);return{id:pick(f,['method_id','id','code','method']),name:pick(f,['name_en','method_name','name','english_name','name_ar'])}};
const KEYS=['imsak','fajr','sunrise','dhuhr','asr','maghrib','isha','midnight'];
const normRow=o=>{const f=flat(o),r={raw:f,day:+pick(f,['day','ramadan_day','day_number'])||0,city:pick(f,['city_id','city']),method:pick(f,['method_id','method'])};
  KEYS.forEach(k=>r[k]=hm(pick(f,k==='dhuhr'?['dhuhr','zuhr']:[k])));return r};

const cityName=c=>c.ar||c.en||c.id;
const countryName=cc=>{try{return new Intl.DisplayNames(['ar'],{type:'region'}).of(cc)}catch(e){return cc}};
const flag=cc=>/^[A-Z]{2}$/.test(cc)?String.fromCodePoint(...[...cc].map(c=>127397+c.charCodeAt())):'🌍';

async function prayer(city,method,day){
  const d=await api({action:'prayer',city,method,day},6e5);
  const r=normRow(arr(d)[0]||d);
  if(!r.fajr||!r.maghrib)throw new Error('استجابة غير متوقعة من action=prayer');
  r.day=day;return r;
}
async function timetable(city,method){
  let rows=[];
  try{rows=arr(await api({action:'ramadan',city,method,year:C.YEAR},6e5)).map(normRow)
    .filter(r=>r.fajr&&r.maghrib&&(!r.city||r.city===city)&&(!r.method||r.method===method))}catch(e){}
  if(rows.length<28){ // العقد الحالي: يوم بيوم عبر action=prayer
    rows=[];const days=[...Array(30)].map((_,i)=>i+1);
    for(let i=0;i<30;i+=6)rows.push(...await Promise.all(days.slice(i,i+6).map(d=>prayer(city,method,d))));
  }
  rows.forEach((r,i)=>r.day=r.day||i+1);return rows.sort((a,b)=>a.day-b.day);
}

const ymd=(tz)=>new Intl.DateTimeFormat('en-CA',{timeZone:tz||'UTC'}).format(new Date());
function ramadanDay(tz){const a=Date.parse(ymd(tz)+'T00:00:00Z'),b=Date.parse(C.RAMADAN_START+'T00:00:00Z');return Math.round((a-b)/864e5)+1}
function secNow(tz){const p=new Intl.DateTimeFormat('en-GB',{timeZone:tz||'UTC',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),g=n=>+p.find(x=>x.type===n).value;return g('hour')*3600+g('minute')*60+g('second')}
const sec=s=>{const m=String(s||'').match(/(\d+):(\d+)/);return m?m[1]*3600+m[2]*60:null};
const hms=s=>{s=Math.max(0,s|0);return[s/3600|0,(s%3600)/60|0,s%60].map(x=>String(x).padStart(2,'0')).join(':')};
const dateOf=n=>new Date(Date.UTC(2027,1,8+n-1,12));
const fmtDate=(n,o)=>new Intl.DateTimeFormat('ar-u-nu-latn',Object.assign({timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'},o)).format(dateOf(n));

function showErr(el,retry,detail){
  el.hidden=false;el.innerHTML=`<strong>${t('err.api')}</strong><p>لم يتم استخدام أي حساب بديل — لن نعرض لك أرقامًا غير مصدرها الـAPI.</p><small>${detail||''}</small><button class="btn sm" type="button">${t('err.retry')}</button>`;
  el.querySelector('button').onclick=retry;
}
function toast(m){let e=document.querySelector('.toast');if(!e){e=document.createElement('div');e.className='toast';document.body.append(e)}e.textContent=m;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),2200)}

/* منتقي الدولة/المدينة/الطريقة — كله من action=cities و action=methods */
async function picker(root,cb){
  const [cr,mr]=await Promise.all([api({action:'cities'},36e5),api({action:'methods'},36e5)]);
  const cities=arr(cr).map(normCity).filter(c=>c.id),methods=arr(mr).map(normMethod).filter(m=>m.id);
  if(!cities.length||!methods.length)throw new Error('قائمة المدن أو الطرق فارغة');
  const u=new URLSearchParams(location.search),sv=store.get('sel',{});
  let city=cities.find(c=>c.id===(u.get('city')||sv.city||C.DEFAULT.city))||cities[0];
  let method=methods.find(m=>m.id===(u.get('method')||sv.method||city.method||C.DEFAULT.method))||methods[0];
  root.innerHTML=`<div class="pick"><label>${t('location.country')}<select id="pc"></select></label><label>${t('location.city')}<select id="pt"></select></label><label>${t('location.method')}<select id="pm"></select></label><div class="srch"><span>🔍</span><input id="ps" type="search" placeholder="ابحث عن مدينتك… Cairo, London, Makkah" autocomplete="off"><ul id="pr" hidden></ul></div></div>`;
  const $=s=>root.querySelector(s),pc=$('#pc'),pt=$('#pt'),pm=$('#pm'),ps=$('#ps'),pr=$('#pr');
  const ccs=[...new Set(cities.map(c=>c.cc))].sort((a,b)=>countryName(a).localeCompare(countryName(b),'ar'));
  pc.innerHTML=ccs.map(c=>`<option value="${c}">${flag(c)} ${countryName(c)}</option>`).join('');
  pm.innerHTML=methods.map(m=>`<option value="${m.id}">${m.name||m.id}</option>`).join('');
  const fillCities=()=>{pt.innerHTML=cities.filter(c=>c.cc===pc.value).map(c=>`<option value="${c.id}">${cityName(c)}</option>`).join('')};
  const emit=(save=true)=>{if(save)store.set('sel',{city:city.id,method:method.id});
    history.replaceState(null,'','?'+new URLSearchParams({city:city.id,method:method.id}));
    cb({city:city.id,method:method.id,cityObj:city,tz:city.tz,cityName:cityName(city),country:countryName(city.cc),methodName:(methods.find(m=>m.id===method.id)||{}).name||method.id})};
  const sync=()=>{pc.value=city.cc;fillCities();pt.value=city.id;pm.value=method.id};
  pc.onchange=()=>{fillCities();city=cities.find(c=>c.id===pt.value);emit()};
  pt.onchange=()=>{city=cities.find(c=>c.id===pt.value);const m=methods.find(m=>m.id===city.method);if(m){method=m;pm.value=m.id}emit()};
  pm.onchange=()=>{method=methods.find(m=>m.id===pm.value);emit()};
  ps.oninput=()=>{const q=ps.value.trim().toLowerCase();if(!q){pr.hidden=true;return}
    const hit=cities.filter(c=>[c.ar,c.en,c.id,countryName(c.cc)].join(' ').toLowerCase().includes(q)).slice(0,8);
    pr.innerHTML=hit.map(c=>`<li data-id="${c.id}">${flag(c.cc)} ${cityName(c)} <small>${c.en||''} — ${countryName(c.cc)}</small></li>`).join('')||'<li class="no">لا توجد نتائج</li>';pr.hidden=false};
  pr.onclick=e=>{const li=e.target.closest('li[data-id]');if(!li)return;city=cities.find(c=>c.id===li.dataset.id);const m=methods.find(m=>m.id===city.method);if(m)method=m;sync();ps.value='';pr.hidden=true;emit()};
  document.addEventListener('click',e=>{if(!root.contains(e.target))pr.hidden=true});
  sync();emit(false);
}

window.AQX=Object.assign(C,{t,store,api,arr,prayer,timetable,picker,ramadanDay,secNow,sec,hms,dateOf,fmtDate,showErr,toast,flag,KEYS});
})();
