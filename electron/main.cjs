const {app,BrowserWindow,Tray,Menu} = require('electron');
const path=require('path');
let win, tray;
function createWindow(){
  win=new BrowserWindow({width:1440,height:900,minWidth:1100,minHeight:700,icon:path.join(__dirname,'../public/g-lokoo-logo.png'),webPreferences:{contextIsolation:true}});
  const url=process.env.GLOKOO_POS_URL||'https://g-lokoo-pos-v2-24-0-staff-management-2-0.vercel.app';
  win.loadURL(url);
  win.on('close',e=>{if(!app.isQuitting){e.preventDefault();win.hide();}});
}
app.whenReady().then(()=>{createWindow();tray=new Tray(path.join(__dirname,'../public/g-lokoo-logo.png'));tray.setToolTip('G-LOKOO POS');tray.setContextMenu(Menu.buildFromTemplate([{label:'Open G-LOKOO POS',click:()=>win.show()},{type:'separator'},{label:'Quit',click:()=>{app.isQuitting=true;app.quit()}}]));tray.on('double-click',()=>win.show());});
app.on('window-all-closed',e=>e.preventDefault());
