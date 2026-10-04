(()=>{
const A=window.AQX,t=A.t,$=s=>document.querySelector(s),box=$('#today'),err=$('#err');
const ico={imsak:'🌙',fajr:'🕌',sunrise:'☀️',dhuhr:'🌞',asr:'🌤️',maghrib:'🌅',isha:'🌃',midnight:'🌌'};
let timer,seq=0;
async function load(s){
  const my=++seq;clearInterval(timer);err.hidden=true;box.innerHTML='<div class="skel"></div>';
  try{
    const n=A.ramadanDay(s.tz),live=n>=1&&n<=30,day=live?n:1,row=await A.prayer(s.city,s.method,day);
    if(my!==seq)return;
    const label=live?`${t('ramadan.day')} ${day}`:'معاينة اليوم الأول';
    box.innerHTML=`<article class="tc"><div class="tc-top"><div><span class="chip">${live?'اليوم':n<1?'رمضان القادم':'انتهى رمضان '+A.HIJRI}</span><h2>${label}<small>${day} رمضان ${A.HIJRI} هـ</small></h2><p>${A.fmtDate(day)}</p></div><div class="loc">📍 ${s.cityName}<br><small>${s.country}</small></div></div>
    <div class="cd"><div id="cl" class="cd-l"></div><div id="ct" class="cd-t">--:--:--</div><div id="cs" class="cd-s"></div></div></article>
    <div class="grid">${A.KEYS.map(k=>`<div class="tile" data-k="${k}"><em>${ico[k]}</em><span>${t('prayer.'+k)}</span><b>${row[k]||'—'}</b></div>`).join('')}</div>
    <p class="src">المصدر: AQX Prayer API · طريقة الحساب: ${s.methodName} · المنطقة الزمنية: ${s.tz||'—'}</p>
    <a class="btn" href="timetable.html?city=${s.city}&method=${s.method}">عرض إمساكية رمضان كاملة</a>`;
    const tick=()=>{
      if(!live){$('#cl').textContent=n<1?'يبدأ رمضان بعد':'';$('#ct').textContent=n<1?(1-n)+' يوم':'';$('#cs').textContent='مواقيت اليوم الأول للمعاينة';return}
      const x=A.secNow(s.tz),im=A.sec(row.imsak||row.fajr),fj=A.sec(row.fajr),mg=A.sec(row.maghrib);let st,tgt,lb;
      if(x<im){st='قبل الإمساك';tgt=im;lb='متبقي على الإمساك'}
      else if(x<fj){st='حان وقت الإمساك';tgt=fj;lb='متبقي على الفجر'}
      else if(x<mg-1800){st='وقت الصيام';tgt=mg;lb='متبقي على الإفطار'}
      else if(x<mg){st='قبل الإفطار';tgt=mg;lb='متبقي على الإفطار'}
      else{st='بعد الإفطار';tgt=im+86400;lb='متبقي على الإمساك القادم'}
      $('#cl').textContent=lb;$('#ct').textContent=A.hms(tgt-x);$('#cs').textContent=st;
      const nx=A.KEYS.find(k=>row[k]&&A.sec(row[k])>x);
      box.querySelectorAll('.tile').forEach(e=>e.classList.toggle('next',e.dataset.k===nx));
    };
    tick();timer=setInterval(tick,1000);
  }catch(e){if(my===seq){box.innerHTML='';A.showErr(err,()=>load(s),e.message)}}
}
A.picker($('#picker'),load).catch(e=>A.showErr(err,()=>location.reload(),e.message));
})();
