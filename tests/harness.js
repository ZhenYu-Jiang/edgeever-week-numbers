import plugin from '/main.js';
if(new URLSearchParams(location.search).has('dark'))document.body.classList.add('dark');
const host=window.host={notices:[],inserted:[],copied:[],failInsert:false,failCopy:false,delay:0,disposed:0};let panel,unmount;const commands={};
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{async writeText(text){if(host.failCopy)throw Error('Denied');host.copied.push(text);}}});
const dispose=plugin.activate({editor:{async insertAtCursor(text){if(host.delay)await new Promise(r=>setTimeout(r,host.delay));if(host.failInsert)throw Error('No editor');host.inserted.push(text);}},ui:{showNotice(s){host.notices.push(s);},panels:{register(p){panel=p;return()=>host.disposed++;},async open(){unmount?.();unmount=panel.mount(document.querySelector('#container'),{shell:{set({header}){document.querySelector('#title').textContent=header.title;document.querySelector('#description').textContent=header.description;}}});}}},commands:{register(c){commands[c.id]=c;return()=>host.disposed++;}}});
host.run=id=>commands[id].run();host.close=()=>{unmount?.();unmount=null;};host.deactivate=()=>{host.close();dispose();};await commands['open-week-numbers'].run();
