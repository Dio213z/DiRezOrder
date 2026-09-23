const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

function readDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialData = {
        settings: { slots: 10, price: 30000, version: 0 },
        orders: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.settings || !Array.isArray(data.orders)) {
      throw new Error('Format database.json tidak valid.');
    }
    return data;
  } catch (err) {
    throw new Error('Gagal membaca database.json: ' + err.message);
  }
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    throw new Error('Gagal menyimpan ke database.json: ' + err.message);
  }
}

// 1. Get Settings (Slot & Harga)
app.get('/api/settings', (req, res) => {
  try {
    const db = readDatabase();
    res.json(db.settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Place Order
app.post('/api/place_order', (req, res) => {
  try {
    const body = req.body || {};
    const db = readDatabase();

    const existing = db.orders.find(o => o.request_key === body.p_key);
    if (existing) {
      return res.json({ id: existing.id, price: existing.price });
    }

    if (db.settings.slots < 1) {
      return res.status(400).json({ error: 'Maaf, slot sudah habis.' });
    }

    if (body.p_expected_price !== db.settings.price) {
      return res.status(400).json({ error: 'Harga berubah. Periksa harga terbaru lalu kirim ulang.' });
    }

    const order = {
      id: crypto.randomUUID(),
      request_key: body.p_key,
      created_at: new Date().toISOString(),
      price: db.settings.price,
      status: 'Baru',
      data: body.p_data,
      attachments: body.p_attachments || []
    };

    db.orders.unshift(order);
    db.settings.slots--;
    db.settings.version++;

    saveDatabase(db);
    res.json({ id: order.id, price: order.price });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update Settings (Slot & Harga)
app.post('/api/update_settings', (req, res) => {
  try {
    const body = req.body || {};
    const db = readDatabase();

    if (
      !Number.isInteger(body.p_slots) || body.p_slots < 0 || body.p_slots > 999 ||
      !Number.isInteger(body.p_price) || body.p_price < 1000 || body.p_price > 10000000 ||
      body.p_price % 1000 !== 0
    ) {
      return res.status(400).json({ error: 'Slot 0–999; harga kelipatan Rp1.000 sampai Rp10.000.000.' });
    }

    if (body.p_version !== db.settings.version) {
      return res.status(400).json({ error: 'Slot berubah di tab lain. Periksa angka terbaru lalu simpan lagi.' });
    }

    db.settings = {
      slots: body.p_slots,
      price: body.p_price,
      version: db.settings.version + 1
    };

    saveDatabase(db);
    res.json(db.settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. List Orders
app.get('/api/list_orders', (req, res) => {
  try {
    const offset = parseInt(req.query.offset || '0', 10);
    const db = readDatabase();
    const result = db.orders.slice(offset, offset + 25).map(o => ({
      id: o.id,
      name: o.data ? o.data.name : '',
      created_at: o.created_at,
      price: o.price,
      status: o.status
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Order Detail
app.get('/api/order_detail/:id', (req, res) => {
  try {
    const db = readDatabase();
    const order = db.orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan di database.json.' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Update Order Status
app.post('/api/order_status', (req, res) => {
  try {
    const body = req.body || {};
    const db = readDatabase();
    const order = db.orders.find(o => o.id === body.p_id);

    if (!order) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan di database.json.' });
    }

    if (!['Baru', 'Terkonfirmasi', 'Selesai'].includes(body.p_status)) {
      return res.status(400).json({ error: 'Status tidak valid.' });
    }

    order.status = body.p_status;
    saveDatabase(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server DIREZ berjalan di http://localhost:${PORT}`);
});
