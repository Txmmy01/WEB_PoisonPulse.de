require("dotenv").config();
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const required = ["ADMIN_USERNAME", "ADMIN_PASSWORD", "SESSION_SECRET"];
for (const key of required) if (!process.env[key]) {
  console.error(`Missing required environment variable: ${key}`);
  process.exit(1);
}
if (process.env.ADMIN_PASSWORD.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const dataDir = path.resolve(process.env.DATA_DIR || "./data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "poisonpulse.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS news (
 id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Community',
 excerpt TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', published INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS clan_members (
 id INTEGER PRIMARY KEY AUTOINCREMENT, minecraft_name TEXT NOT NULL, rank TEXT NOT NULL DEFAULT 'Member',
 description TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 100
);
CREATE TABLE IF NOT EXISTS applications (
 id INTEGER PRIMARY KEY AUTOINCREMENT, minecraft_name TEXT NOT NULL, discord_name TEXT NOT NULL,
 age INTEGER, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new',
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS advent_calendar (
 id INTEGER PRIMARY KEY AUTOINCREMENT, day INTEGER NOT NULL UNIQUE CHECK(day BETWEEN 1 AND 24),
 title TEXT NOT NULL, content TEXT NOT NULL, reveal_at TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0
);
`);

const adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "32kb" }));
app.use(session({
  store: new SQLiteStore({ db: "sessions.sqlite", dir: dataDir, table: "sessions" }),
  name: "pp.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }
}));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: "draft-7", legacyHeaders: false });
const applicationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false });
const admin = (req,res,next) => req.session?.admin ? next() : res.status(401).json({ error: "Bitte zuerst anmelden." });
const clean = (v,max=2000) => String(v ?? "").trim().slice(0,max);
const bool = v => v === true || v === "true" || v === 1 || v === "1" ? 1 : 0;
const allowed = {
 news: ["title","category","excerpt","body","published"],
 members: ["minecraft_name","rank","description","active","sort_order"],
 calendar: ["day","title","content","reveal_at","published"]
};
const tables = { news: "news", members: "clan_members", calendar: "advent_calendar" };

app.get("/api/public", (req,res) => {
 const today = new Date().toISOString().slice(0,10);
 res.json({
  news: db.prepare("SELECT id,title,category,excerpt,created_at FROM news WHERE published=1 ORDER BY created_at DESC LIMIT 5").all(),
  members: db.prepare("SELECT minecraft_name,rank,description FROM clan_members WHERE active=1 ORDER BY sort_order,id").all(),
  calendar: db.prepare("SELECT day,title,content FROM advent_calendar WHERE published=1 AND reveal_at<=? ORDER BY day").all(today)
 });
});
app.post("/api/applications", applicationLimiter, (req,res) => {
 const minecraft_name=clean(req.body.minecraft_name,16), discord_name=clean(req.body.discord_name,80);
 const message=clean(req.body.message,2000), age=req.body.age === "" || req.body.age == null ? null : Number(req.body.age);
 if(minecraft_name.length<3 || discord_name.length<2 || message.length<20 || (age!==null && (!Number.isInteger(age)||age<1||age>99)))
  return res.status(400).json({error:"Bitte prüfe deine Angaben. Die Nachricht muss mindestens 20 Zeichen lang sein."});
 db.prepare("INSERT INTO applications(minecraft_name,discord_name,age,message) VALUES(?,?,?,?)").run(minecraft_name,discord_name,age,message);
 res.status(201).json({ok:true});
});
app.post("/api/login", loginLimiter, async (req,res) => {
 const username=clean(req.body.username,80), password=String(req.body.password||"");
 const expectedUser=process.env.ADMIN_USERNAME;
 const expectedHash=await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
 const userOk=username===expectedUser;
 const passOk=await bcrypt.compare(password, expectedHash);
 if(!userOk || !passOk) return res.status(401).json({error:"Benutzername oder Passwort falsch."});
 req.session.regenerate(err => {
  if(err) return res.status(500).json({error:"Login fehlgeschlagen."});
  req.session.admin=true;
  req.session.save(err2 => err2 ? res.status(500).json({error:"Sitzung konnte nicht gespeichert werden."}) : res.json({ok:true}));
 });
});
app.get("/api/session",(req,res)=>res.json({authenticated:!!req.session?.admin}));
app.post("/api/logout",admin,(req,res)=>req.session.destroy(()=>{res.clearCookie("pp.sid",{httpOnly:true,sameSite:"strict"});res.json({ok:true});}));
app.get("/api/admin/:kind",admin,(req,res)=>{
 const table=tables[req.params.kind]; if(!table)return res.sendStatus(404);
 const order=req.params.kind==="news"||req.params.kind==="applications"?"created_at DESC":"id DESC";
 res.json(db.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all());
});
app.post("/api/admin/:kind",admin,(req,res)=>{
 const kind=req.params.kind, table=tables[kind], fields=allowed[kind]; if(!table)return res.sendStatus(404);
 const data={}; for(const key of fields) if(req.body[key]!==undefined) data[key]=["published","active"].includes(key)?bool(req.body[key]):key==="day"||key==="sort_order"?Number(req.body[key]):clean(req.body[key],key==="content"||key==="body"||key==="excerpt"||key==="description"?2000:160);
 if(kind==="news" && (!data.title || !data.excerpt))return res.status(400).json({error:"Titel und Kurztext sind Pflicht."});
 if(kind==="members" && (!data.minecraft_name || data.minecraft_name.length>16))return res.status(400).json({error:"Minecraft-Name fehlt oder ist zu lang."});
 if(kind==="calendar" && (!Number.isInteger(data.day)||data.day<1||data.day>24||!data.title||!data.reveal_at))return res.status(400).json({error:"Bitte Türchen, Titel und Datum prüfen."});
 const id=Number(req.body.id);
 if(id){
  const cols=Object.keys(data); if(!cols.length)return res.status(400).json({error:"Keine Daten."});
  db.prepare(`UPDATE ${table} SET ${cols.map(k=>k+"=@"+k).join(",")} WHERE id=@id`).run({...data,id});
 } else {
  const cols=Object.keys(data); if(!cols.length)return res.status(400).json({error:"Keine Daten."});
  db.prepare(`INSERT INTO ${table}(${cols.join(",")}) VALUES(${cols.map(k=>":"+k).join(",")})`).run(data);
 }
 res.json({ok:true});
});
app.delete("/api/admin/:kind/:id",admin,(req,res)=>{
 const table=tables[req.params.kind]; if(!table)return res.sendStatus(404);
 db.prepare(`DELETE FROM ${table} WHERE id=?`).run(Number(req.params.id)); res.json({ok:true});
});
app.patch("/api/admin/applications/:id",admin,(req,res)=>{
 const status=clean(req.body.status,20);
 if(!["new","reviewing","accepted","declined"].includes(status))return res.status(400).json({error:"Ungültiger Status."});
 db.prepare("UPDATE applications SET status=? WHERE id=?").run(status,Number(req.params.id));res.json({ok:true});
});
app.get("/api/admin/applications",admin,(req,res)=>res.json(db.prepare("SELECT * FROM applications ORDER BY created_at DESC").all()));

app.use((req,res,next)=>{
 const requested=path.resolve(__dirname, "." + req.path);
 if(requested===dataDir || requested.startsWith(dataDir + path.sep)) return res.sendStatus(404);
 next();
});
app.use(express.static(path.join(__dirname)));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));
const port=Number(process.env.PORT||3000);
app.listen(port,"0.0.0.0",()=>console.log(`PoisonPulse läuft auf Port ${port}; SQLite: ${path.join(dataDir,"poisonpulse.sqlite")}`));
