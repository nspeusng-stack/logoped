const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const db = require('./db');
const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(require('cors')());

// API: приём лидов
app.post('/api/lead', (req, res) => {
  const { parentName, childName, contact, format, timezone, problem, city } = req.body;
  if(!parentName || !childName || !contact || !problem) return res.status(400).json({error:'Заполните обязательные поля'});
  try {
    const stmt = db.prepare(`INSERT INTO leads (parentName, childName, contact, format, timezone, problem, city) VALUES (?,?,?,?,?,?,?)`);
    const info = stmt.run(parentName, childName, contact, format, timezone||'', problem, city||'Барановичи');
    // В реальном проекте здесь можно отправлять уведомление на e-mail/Telegram
    res.json({ok:true,id:info.lastInsertRowid});
  } catch(e){
    res.status(500).json({error:'DB error'});
  }
});

// API: чат (сохранение и автодополнение)
app.post('/api/chat', (req, res) => {
  const { text } = req.body;
  if(!text) return res.status(400).json({error:'empty'});
  const reply = 'Спасибо за вопрос. Оставьте, пожалуйста, контакт в заявке, и мы ответим подробнее.';
  const stmt = db.prepare('INSERT INTO chats (text, reply) VALUES (?,?)');
  stmt.run(text, reply);
  res.json({ok:true,reply});
});

// Простая админка для просмотра лидов
app.get('/admin', (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 200').all();
  const chats = db.prepare('SELECT * FROM chats ORDER BY created_at DESC LIMIT 200').all();
  let html = `<html><head><meta charset="utf-8"><title>Admin</title><style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}</style></head><body>`;
  html += `<h2>Leads</h2><table><tr><th>ID</th><th>Parent</th><th>Child</th><th>Contact</th><th>Format</th><th>City</th><th>Problem</th><th>Created</th></tr>`;
  leads.forEach(l => html += `<tr><td>${l.id}</td><td>${l.parentName}</td><td>${l.childName}</td><td>${l.contact}</td><td>${l.format}</td><td>${l.city}</td><td>${l.problem}</td><td>${l.created_at}</td></tr>`);
  html += `</table><h2>Chats</h2><table><tr><th>ID</th><th>Text</th><th>Reply</th><th>Created</th></tr>`;
  chats.forEach(c => html += `<tr><td>${c.id}</td><td>${c.text}</td><td>${c.reply}</td><td>${c.created_at}</td></tr>`);
  html += `</table></body></html>`;
  res.send(html);
});

const PORT = 3000;
app.listen(PORT, ()=> console.log(`Server running at http://localhost:${PORT}`));
