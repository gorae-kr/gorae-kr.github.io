// 지부 페이지 공통 동작: 헤더, 모바일 메뉴, 진행바, 맨 위로, 복사, 사진 자리
(function(){
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  setTimeout(()=>document.body.classList.add('ready'),60);
  const rvIO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rvIO.unobserve(e.target)}}),{threshold:.12});
  $$('.rv').forEach(el=>rvIO.observe(el));
  addEventListener('scroll',()=>{
    const h=document.documentElement,y=h.scrollTop;
    $('#progress').style.width=(y/Math.max(1,h.scrollHeight-h.clientHeight)*100)+'%';
    $('#header').classList.toggle('line',y>10);
    $('#topBtn').classList.toggle('show',y>600);
  },{passive:true});
  $('#topBtn').onclick=()=>scrollTo({top:0});
  $('#menuBtn').onclick=()=>document.body.classList.toggle('open');
  $$('.gnb a').forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('open')));
  addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('open')});
  const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1800)};
  $$('.copy[data-copy]').forEach(b=>b.onclick=()=>{navigator.clipboard?.writeText(b.dataset.copy).then(()=>toast('복사했어요'),()=>toast(b.dataset.copy))});
})();
