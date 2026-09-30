const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('api',{login:x=>ipcRenderer.invoke('login',x),dashboard:()=>ipcRenderer.invoke('dashboard'),list:table=>ipcRenderer.invoke('list',{table}),save:(entity,data)=>ipcRenderer.invoke('save',{entity,data}),report:()=>ipcRenderer.invoke('report'),backup:()=>ipcRenderer.invoke('backup')});
