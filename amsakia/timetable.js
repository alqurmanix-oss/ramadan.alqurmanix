(()=>{
const A=window.AQX,t=A.t,$=s=>document.querySelector(s),err=$('#err'),tb=$('#tb');
const cols=['imsak','fajr','sunrise','dhuhr','asr','maghrib','isha'];
let st,rows=[],seq=0;
async function load(s){
  st=s;const my=++seq;err.hidden=true;$('#tools').hidden=true;
  tb.innerHTML='<tr><td colspan="9"><div class="skel"></div></td></tr>';
  const title=`إمساكية رمضان ${A.HIJRI} هـ — ${s.cityName}، ${s.country}`;
  $('#h1').textContent=title;document.title=title+' — AQX Ramadan';
  document.querySelector('link[rel=canonical]').href=`${A.SITE}/timetable.html?city=${s.city}&method=${s.method}`;
  $('#meta').innerHTML=[['السنة',`${A.YEAR} م`],['المدينة',s.cityName],['الدولة',s.country],['طريقة الحساب',s.methodName],['المنطقة الزمنية',s.tz||'—'],['المصدر','AQX Prayer API']].map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('');
  try{
    rows=await A.timetable(s.city,s.method);if(my!==seq)return;
    const today=A.ramadanDay(s.tz);
    tb.innerHTML=rows.map(r=>`<tr class="${r.day===today?'today':''}"><td class="d" data-label="">${r.day===today?'<i>اليوم</i> ':''}${t('ramadan.day')} ${r.day}<small>${A.fmtDate(r.day,{weekday:'short',year:undefined})}</small></td>${cols.map(k=>`<td data-label="${t('prayer.'+k)}">${r[k]||'—'}</td>`).join('')}</tr>`).join('');
    $('#tools').hidden=false;
    const cur=tb.querySelector('.today');if(cur)setTimeout(()=>cur.scrollIntoView({block:'center',behavior:'smooth'}),400);
  }catch(e){if(my===seq){tb.innerHTML='';A.showErr(err,()=>load(s),e.message)}}
}
$('#bp').onclick=()=>print();
$('#bs').onclick=async()=>{const d={title:document.title,url:location.href};try{if(navigator.share)await navigator.share(d);else{await navigator.clipboard.writeText(d.url);A.toast('تم نسخ الرابط')}}catch(e){}};
$('#bl').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);A.toast('تم نسخ الرابط')}catch(e){A.toast('تعذر النسخ')}};
$('#bc').onclick=()=>{
  const h=['اليوم','التاريخ',...cols.map(k=>t('prayer.'+k))];
  const csv='\ufeff'+[h,...rows.map(r=>[r.day,A.dateOf(r.day).toISOString().slice(0,10),...cols.map(k=>r[k])])].map(l=>l.join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download=`aqx-ramadan-${A.HIJRI}-${st.city}-${st.method}.csv`;a.click();
};
A.picker($('#picker'),load).catch(e=>A.showErr(err,()=>location.reload(),e.message));
})();
