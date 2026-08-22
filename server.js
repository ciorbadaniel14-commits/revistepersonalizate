const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const UPLOADS = path.join(ROOT, "uploads");
const DATA = path.join(ROOT, "data");
fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

const db = new Database(path.join(DATA, "albumart.db"));
db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  delivery_address TEXT NOT NULL,
  model TEXT NOT NULL,
  cover_material TEXT NOT NULL,
  cover_color TEXT NOT NULL,
  size TEXT NOT NULL,
  pages INTEGER NOT NULL,
  cover_text TEXT,
  notes TEXT,
  total INTEGER NOT NULL,
  photos_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Noua'
)
`);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "-" + safe);
  }
});
const upload = multer({
  storage,
  limits: { files: 80, fileSize: 15 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype);
    cb(ok ? null : new Error("Sunt permise doar imagini JPG, PNG, WEBP sau HEIC."));
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOADS));
app.use(express.static(path.join(ROOT, "public")));

function calculateTotal({ model, size, pages }) {
  const models = { "Classic":350, "Piele Eco":450, "Catifea":500, "Acrilic":550, "Lemn":600 };
  const sizes = { "30x30":0, "25x25":80, "20x30":120 };
  const pageExtra = { 20:0, 30:70, 40:140, 50:230 };
  if (!(model in models) || !(size in sizes) || !(pages in pageExtra)) throw new Error("Configuratie invalida.");
  return models[model] + sizes[size] + pageExtra[pages];
}

async function sendAdminEmail(order) {
  if (!process.env.SMTP_HOST || !process.env.ADMIN_EMAIL) return false;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `AlbumArt — Comandă #${order.id}`,
    text:
`Comandă nouă #${order.id}

Client: ${order.customer_name}
Telefon: ${order.phone}
Email: ${order.email || "-"}
Adresă: ${order.delivery_address}

Album: ${order.model}
Material copertă: ${order.cover_material}
Culoare: ${order.cover_color}
Dimensiune: ${order.size}
Pagini: ${order.pages}
Text copertă: ${order.cover_text || "-"}
Note: ${order.notes || "-"}
Total: ${order.total} MDL

Poze încărcate: ${order.photos.length}
`
  });
  return true;
}

app.post("/api/orders", upload.array("photos", 80), async (req, res) => {
  try {
    const body = req.body;
    if (!body.customer_name || !body.phone || !body.delivery_address) {
      return res.status(400).json({ error: "Completează numele, telefonul și adresa." });
    }
    const pages = Number(body.pages);
    const total = calculateTotal({ model: body.model, size: body.size, pages });
    const photos = (req.files || []).map(f => ({
      original: f.originalname,
      file: f.filename,
      url: `/uploads/${f.filename}`
    }));

    const created = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO orders
      (created_at, customer_name, phone, email, delivery_address, model, cover_material, cover_color, size, pages, cover_text, notes, total, photos_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      created, body.customer_name, body.phone, body.email || "",
      body.delivery_address, body.model, body.cover_material, body.cover_color,
      body.size, pages, body.cover_text || "", body.notes || "", total,
      JSON.stringify(photos)
    );

    const order = {
      id: info.lastInsertRowid, created_at: created, ...body,
      pages, total, photos
    };

    let emailSent = false;
    try { emailSent = await sendAdminEmail(order); } catch (e) { console.error("Email error:", e.message); }

    res.json({
      ok: true,
      orderId: order.id,
      total,
      emailSent,
      message: `Comanda #${order.id} a fost înregistrată.`
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || "Nu am putut înregistra comanda." });
  }
});

app.get("/api/orders", (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 200").all();
  res.json(rows.map(r => ({ ...r, photos: JSON.parse(r.photos_json) })));
});

app.patch("/api/orders/:id", (req, res) => {
  const statuses = ["Noua","Confirmata","In lucru","Expediata","Finalizata","Anulata"];
  if (!statuses.includes(req.body.status)) return res.status(400).json({error:"Status invalid"});
  db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status, req.params.id);
  res.json({ok:true});
});

app.get("/admin", (_, res) => res.sendFile(path.join(ROOT, "public", "admin.html")));

app.listen(PORT, () => console.log(`AlbumArt rulează la http://localhost:${PORT}`));
