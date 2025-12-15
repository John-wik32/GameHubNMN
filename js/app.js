
const data=load();
const gamesEl=document.getElementById('games');
const tabsEl=document.getElementById('tabs');

const tabs=[...new Set(data.games.map(g=>g.tab||'All'))];
tabs.forEach(t=>{
 const b=document.createElement('button');
 b.textContent=t;
 b.onclick=()=>render(t);
 tabsEl.appendChild(b);
});

function render(tab){
 gamesEl.innerHTML='';
 data.games.filter(g=>!tab||g.tab===tab).forEach(g=>{
  const d=document.createElement('div');
  d.className='game';
  d.innerHTML=`<h3>${g.title}</h3>`;
  d.onclick=()=>location.href='player.html?id='+g.id;
  gamesEl.appendChild(d);
 });
}

render();
