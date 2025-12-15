
const KEY='GAMEHUB_DATA';

function load(){
 return JSON.parse(localStorage.getItem(KEY)||'{"games":[],"theme":{}}');
}

function save(data){
 localStorage.setItem(KEY,JSON.stringify(data));
}

function uid(){
 return Date.now().toString(36);
}
