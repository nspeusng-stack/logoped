const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '8388608', 10);
const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  }
});

function sanitizeString(s = '') { return String(s).trim(); }

function validatePhoneBY(phone) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return /^(375(29|33|25|44)\d{7})$/.test(digits) || /^(80(29|33|25|44)\d{7})$/.test(digits);
}

async function notifyTelegram(text, filePath) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const base = `https://api.telegram.org/bot${token}`;
  try {
    await axios.post(`${base}/sendMessage`, { chat_id: chat, text, parse_mode: 'HTML' }, { timeout: 5000 });
    if (filePath) {
      const form = new FormData();
      form.append('chat_id', chat);
      form.append('document', fs.createReadStream(filePath));
      await axios.post(`${base}/sendDocument`, form, { headers: form.getHeaders(), timeout: 20000 });
    }
  } catch (e) {
    try {
      const cfgFile = path.join(__dirname, 'runtime-config.json');
      const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
      if (cfg.debug) {
        fs.appendFileSync(path.join(__dirname, '..', 'data', 'telegram-errors.log'), `${new Date().toISOString()} ${e.toString()}\n`);
      }
    } catch {}
  }
}

router.post('/apply', (req, res, next) => {
  upload.single('file')(req, res, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const body = req.body || {};
    const type = sanitizeString(body.type || body.type_hidden || '');
    const format = sanitizeString(body.format || '');
    const prefer = sanitizeString(body.contact_prefer || '');
    const contact = sanitizeString(body.contact_value || body.intl_phone || '');
    const description = sanitizeString(body.description || '');
    const consent = body.consent === 'true' || body.consent === 'on' || body.consent === '1';

    if (!consent) return res.status(400).json({ error: 'Consent required' });
    if (!['child','adult','poststroke'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
    if (!['online','offline'].includes(format)) return res.status(400).json({ error: 'Invalid format' });
    if (!['phone','telegram','email'].includes(prefer)) return res.status(400).json({ error: 'Invalid contact prefer' });
    if (!contact) return res.status(400).json({ error: 'Contact required' });

    if (prefer === 'phone' || format === 'offline') {
      if (!validatePhoneBY(contact)) return res.status(400).json({ error: 'Phone must be Belarusian number' });
    }

    const record = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      type,
      format,
      prefer,
      contact,
      description,
      fields: {}
    };

    if (type === 'child') {
      record.fields.parent_name = sanitizeString(body.parent_name);
      record.fields.child_name = sanitizeString(body.child_name);
      record.fields.child_age = Number(body.child_age || 0);
      if (!record.fields.parent_name || !record.fields.child_name || record.fields.child_age < 4) {
        return res.status(400).json({ error: 'Child form: parent name, child name and age>=4 required' });
      }
    } else if (type === 'adult') {
      record.fields.name = sanitizeString(body.name);
      record.fields.age = Number(body.age || 0);
      if (!record.fields.name || record.fields.age <= 0) {
        return res.status(400).json({ error: 'Adult form: name and age required' });
      }
    } else if (type === 'poststroke') {
      record.fields.name = sanitizeString(body.name);
      record.fields.age = Number(body.age || 0);
      record.fields.diagnosis = sanitizeString(body.diagnosis);
      if (!record.fields.name || record.fields.age <= 0 || !record.fields.diagnosis) {
        return res.status(400).json({ error: 'Post-stroke form: name, age and diagnosis required' });
      }
    }

    const DATA_FILE = path.join(__dirname, '..', 'data', 'applications.jsonl');
    const toSave = { ...record, raw: { ...body } };
    fs.appendFileSync(DATA_FILE, JSON.stringify(toSave) + '\n', 'utf8');

    let filePath = null;
    if (req.file) filePath = req.file.path;

    const parts = [
      `<b>Новая заявка</b>`,
      `ID: ${record.id}`,
      `Тип: ${type}`,
      `Формат: ${format}`,
      `Контакт (предпочтение): ${prefer} / ${contact}`,
      `Детали: ${description ? description.slice(0, 800) : '-'}`,
    ];
    if (type === 'child') {
      parts.push(`Родитель: ${record.fields.parent_name}`);
      parts.push(`Ребенок: ${record.fields.child_name}, ${record.fields.child_age} лет`);
    } else {
      parts.push(`Имя: ${record.fields.name}`);
      parts.push(`Возраст: ${record.fields.age}`);
    }
    if (type === 'poststroke') parts.push(`Диагноз: ${record.fields.diagnosis}`);

    await notifyTelegram(parts.join('\n'), filePath);

    if (filePath) {
      setTimeout(() => { try { fs.unlinkSync(filePath); } catch {} }, 60 * 1000);
    }

    res.json({ success: true, id: record.id });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
