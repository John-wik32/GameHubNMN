
const data=load();

document.getElementById('add').onclick=()=>{
 data.games.push({
  id:uid(),
  title:title.value,
  logo:logo.value,
  embed:embed.value,
  tags:tags.value.split(','),
  tab:tab.value,
  likes:0,views:0,comments:[]
 });
 save(data);
 alert('Game added');
};

document.getElementById('saveTheme').onclick=()=>{
 data.theme.primary=primary.value;
 data.theme.bg=bg.value;
 save(data);
 alert('Theme saved');
};

document.getElementById('stats').innerHTML=
 'Games: '+data.games.length+'<br>'+
 'Views: '+data.games.reduce((a,b)=>a+b.views,0);

function exportData(){
 const a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)]));
 a.download='games.json';
 a.click();
}
