const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const PDFDocument = require('pdfkit');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public')); 
app.use(session({
  secret: 'clave_cecyt3',
  resave: false,
  saveUninitialized: true
}));

// Base de Datos SQLite (Archivo local)
const db = new sqlite3.Database('citas.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT,
    fecha DATETIME NOT NULL,
    servicio TEXT NOT NULL
  )`);
});

// Rutas
app.get('/api/citas', (req, res) => {
  db.all("SELECT * FROM citas ORDER BY fecha DESC", [], (err, rows) => {
    if (err) res.status(500).json({error: err.message});
    else res.json(rows);
  });
});

app.post('/api/citas', (req, res) => {
  const { cliente, email, telefono, fecha, servicio } = req.body;
  if (!cliente || !fecha) return res.status(400).json({ error: "Faltan datos" });

  const stmt = db.prepare("INSERT INTO citas (cliente, email, telefono, fecha, servicio) VALUES (?,?,?,?,?)");
  stmt.run(cliente, email, telefono, fecha, servicio, function(err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ id: this.lastID, msg: "Cita creada" });
  });
  stmt.finalize();
});

app.delete('/api/citas/:id', (req, res) => {
    db.run("DELETE FROM citas WHERE id = ?", req.params.id, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ msg: "Eliminado" });
    });
  });

app.get('/api/pdf/:id', (req, res) => {
    db.get("SELECT * FROM citas WHERE id = ?", req.params.id, (err, row) => {
      if (!row) return res.status(404).send('No encontrado');
      
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=cita_${row.id}.pdf`);
      
      doc.pipe(res);
      doc.fontSize(20).text(`Comprobante CECyT 3 - Cita #${row.id}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Cliente: ${row.cliente}`);
      doc.text(`Fecha: ${row.fecha}`);
      doc.text(`Servicio: ${row.servicio}`);
      doc.end();
    });
  });

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});