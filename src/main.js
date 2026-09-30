const {app,BrowserWindow,ipcMain,shell}=require('electron');
const path=require('path');
const fs=require('fs');
const Database=require('better-sqlite3');
let db;
function initDb(){
 const dir=path.join(app.getPath('userData'),'database'); fs.mkdirSync(dir,{recursive:true});
 db=new Database(path.join(dir,'ariya-karan.sqlite')); db.pragma('journal_mode = WAL');
 db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'کاربر',active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS contacts(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT,name TEXT NOT NULL,type TEXT NOT NULL DEFAULT 'مشتری',phone TEXT,address TEXT,national_id TEXT,notes TEXT,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,name TEXT NOT NULL,unit TEXT NOT NULL DEFAULT 'عدد',category TEXT,barcode TEXT,price REAL DEFAULT 0,min_stock REAL DEFAULT 0,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS invoices(id INTEGER PRIMARY KEY AUTOINCREMENT,number TEXT UNIQUE NOT NULL,type TEXT NOT NULL,contact_id INTEGER,invoice_date TEXT NOT NULL,subtotal REAL DEFAULT 0,discount REAL DEFAULT 0,tax REAL DEFAULT 0,total REAL DEFAULT 0,notes TEXT,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS invoice_items(id INTEGER PRIMARY KEY AUTOINCREMENT,invoice_id INTEGER,product_id INTEGER,description TEXT,qty REAL DEFAULT 1,price REAL DEFAULT 0,total REAL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS vouchers(id INTEGER PRIMARY KEY AUTOINCREMENT,number TEXT UNIQUE NOT NULL,date TEXT NOT NULL,description TEXT,total REAL DEFAULT 0,status TEXT DEFAULT 'ثبت شده',created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS voucher_items(id INTEGER PRIMARY KEY AUTOINCREMENT,voucher_id INTEGER,account TEXT,debit REAL DEFAULT 0,credit REAL DEFAULT 0,description TEXT);
 CREATE TABLE IF NOT EXISTS stock_movements(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id INTEGER,type TEXT NOT NULL,qty REAL NOT NULL,reference TEXT,warehouse TEXT DEFAULT 'انبار اصلی',date TEXT NOT NULL,notes TEXT);
 CREATE TABLE IF NOT EXISTS cases(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE NOT NULL,title TEXT NOT NULL,contact_id INTEGER,status TEXT DEFAULT 'در حال انجام',service TEXT,origin TEXT,destination TEXT,notes TEXT,created_at TEXT NOT NULL);`);
 const u=db.prepare('SELECT COUNT(*) c FROM users').get(); if(!u.c) db.prepare('INSERT INTO users(username,password,name,role,created_at) VALUES(?,?,?,?,?)').run('admin','1234','مدیر سیستم','مدیر کل',new Date().toISOString());
}
const now=()=>new Date().toISOString();
function createWindow(){const win=new BrowserWindow({width:1600,height:1000,minWidth:1180,minHeight:760,backgroundColor:'#f4f7fb',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});win.loadFile(path.join(__dirname,'index.html'));}
app.whenReady().then(()=>{initDb();createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow()});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
function list(table,where=''){return db.prepare(`SELECT * FROM ${table} ${where} ORDER BY id DESC`).all()}
ipcMain.handle('login',(_,x)=>{const u=db.prepare('SELECT id,username,name,role,active FROM users WHERE username=? AND password=? AND active=1').get(x.username,x.password);return u?{ok:true,user:u}:{ok:false,message:'نام کاربری یا رمز عبور نادرست است'};});
ipcMain.handle('dashboard',()=>({contacts:db.prepare('SELECT COUNT(*) c FROM contacts').get().c,products:db.prepare('SELECT COUNT(*) c FROM products').get().c,cases:db.prepare("SELECT COUNT(*) c FROM cases WHERE status!='تکمیل شده'").get().c,invoices:db.prepare('SELECT COUNT(*) c FROM invoices').get().c}));
ipcMain.handle('list',(e,{table})=>list(table));
ipcMain.handle('save',(e,{entity,data})=>{const t=now();
 if(entity==='user') return db.prepare('INSERT INTO users(username,password,name,role,active,created_at) VALUES(?,?,?,?,?,?)').run(data.username,data.password||'1234',data.name,data.role||'کاربر',1,t).lastInsertRowid;
 if(entity==='contact') return db.prepare('INSERT INTO contacts(code,name,type,phone,address,national_id,notes,created_at) VALUES(?,?,?,?,?,?,?,?)').run(data.code||'',data.name,data.type||'مشتری',data.phone||'',data.address||'',data.national_id||'',data.notes||'',t).lastInsertRowid;
 if(entity==='product') return db.prepare('INSERT INTO products(code,name,unit,category,barcode,price,min_stock,created_at) VALUES(?,?,?,?,?,?,?,?)').run(data.code||'',data.name,data.unit||'عدد',data.category||'',data.barcode||'',Number(data.price)||0,Number(data.min_stock)||0,t).lastInsertRowid;
 if(entity==='invoice') return db.prepare('INSERT INTO invoices(number,type,contact_id,invoice_date,subtotal,discount,tax,total,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(data.number,data.type,data.contact_id||null,data.invoice_date||new Date().toISOString().slice(0,10),Number(data.subtotal)||0,Number(data.discount)||0,Number(data.tax)||0,Number(data.total)||0,data.notes||'',t).lastInsertRowid;
 if(entity==='voucher') return db.prepare('INSERT INTO vouchers(number,date,description,total,status,created_at) VALUES(?,?,?,?,?,?)').run(data.number,data.date||new Date().toISOString().slice(0,10),data.description||'',Number(data.total)||0,'ثبت شده',t).lastInsertRowid;
 if(entity==='stock') return db.prepare('INSERT INTO stock_movements(product_id,type,qty,reference,warehouse,date,notes) VALUES(?,?,?,?,?,?,?)').run(data.product_id,data.type,Number(data.qty)||0,data.reference||'',data.warehouse||'انبار اصلی',data.date||new Date().toISOString().slice(0,10),data.notes||'').lastInsertRowid;
 if(entity==='case') return db.prepare('INSERT INTO cases(code,title,contact_id,status,service,origin,destination,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(data.code,data.title,data.contact_id||null,data.status||'در حال انجام',data.service||'',data.origin||'',data.destination||'',data.notes||'',t).lastInsertRowid;
 throw new Error('entity');
});
ipcMain.handle('report',()=>({contacts:list('contacts'),products:list('products'),invoices:list('invoices'),vouchers:list('vouchers'),stock:list('stock_movements'),cases:list('cases')}));
ipcMain.handle('backup',async()=>{const target=path.join(app.getPath('documents'),'ARIYA KARAN Backups');fs.mkdirSync(target,{recursive:true});const file=path.join(target,`backup-${Date.now()}.sqlite`);db.pragma('wal_checkpoint(TRUNCATE)');fs.copyFileSync(path.join(path.dirname(db.name),'ariya-karan.sqlite'),file);await shell.openPath(target);return file;});
