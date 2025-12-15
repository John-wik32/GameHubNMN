
const data=load();
const id=new URLSearchParams(location.search).get('id');
const game=data.games.find(g=>g.id===id);

document.getElementById('title').textContent=game.title;
document.getElementById('player').innerHTML=
 game.embed.includes('<')?game.embed:`<iframe src="${game.embed}"></iframe>`;

game.views++; save(data);

document.getElementById('like').onclick=()=>{
 game.likes++; save(data);
 alert('Liked!');
};

function toggleFull(){
 document.getElementById('player').requestFullscreen();
}

function share(){
 navigator.share?navigator.share({url:location.href}):alert(location.href);
}
