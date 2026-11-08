import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// __dirname untuk ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const PORT = process.env.PORT || 3000;
const MAX_HISTORY = 20; // jumlah pesan terakhir yang dikirim ke model (memory percakapan)
const MAX_CHARS = 2000; // batas panjang tiap pesan agar kuota API tidak boros

// ===== Use case: Mulai Bot Gratiz - asisten gizi dan makan sehat =====
const SYSTEM_INSTRUCTION = `
Kamu adalah "Mulai Bot Gratiz", asisten AI bertema gizi dan makan sehat yang dibuat oleh Prasetyo Aji.

Persona & gaya bahasa:
- Jika ditanya siapa kamu, jawab bahwa kamu Mulai Bot Gratiz, sahabat MBG buatan Prasetyo Aji.
- Jawab dalam Bahasa Indonesia yang santai tapi sopan, ramah, boleh emoji secukupnya.

Aturan menjawab:
- Fokus pada gizi seimbang, ide menu makan bergizi, isi piring, kebersihan makanan, dan tips makan sehat untuk anak sekolah.
- Jika diminta menu, berikan komponen: karbohidrat, lauk protein, sayur, buah, dan minuman.
- Jangan memberi diagnosis atau nasihat medis yang pasti; untuk alergi atau penyakit, sarankan menemui dokter atau ahli gizi.
- Jika pertanyaan di luar topik gizi dan makanan, tolak dengan ramah dan arahkan kembali ke topik.
- Jawaban ringkas dan terstruktur (maksimal sekitar 250 kata).
`.trim();

// ===== Helper: buka stream Gemini, coba ulang jika sibuk (503) atau kena batas (429) =====
// Mengembalikan iterator dan potongan pertama, supaya error awal bisa dicoba ulang
// sebelum ada teks yang dikirim ke browser.
async function openStream(params, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const stream = await ai.models.generateContentStream(params);
      const it = stream[Symbol.asyncIterator]();
      const first = await it.next();
      return { it, first };
    } catch (e) {
      lastError = e;
      const msg = String(e?.message || '');
      const sementara =
        msg.includes('"code":503') || msg.includes('"code":429') || msg.includes('UNAVAILABLE');
      if (!sementara || attempt === maxAttempts) break;
      console.warn(`Gemini sibuk, coba lagi (percobaan ${attempt}/${maxAttempts})...`);
      await new Promise((r) => setTimeout(r, attempt * 2000)); // tunggu 2 detik, lalu 4 detik
    }
  }
  throw lastError;
}

// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== Endpoint cek status =====
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', model: GEMINI_MODEL });
});

// ===== Endpoint chat (multi-turn, streaming) =====
app.post('/api/chat', async (req, res) => {
  const { conversation } = req.body ?? {};
  let started = false; // sudah mulai mengirim teks ke browser?

  try {
    if (!Array.isArray(conversation) || conversation.length === 0) {
      return res.status(400).json({ error: 'conversation harus berupa array dan tidak boleh kosong.' });
    }

    // Validasi + normalisasi + batasi riwayat
    const history = conversation
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'model') &&
          typeof m.text === 'string' &&
          m.text.trim() !== ''
      )
      .slice(-MAX_HISTORY);

    // Gemini mengharuskan percakapan diawali pesan dari user
    while (history.length && history[0].role !== 'user') history.shift();

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Pesan terakhir harus berasal dari user.' });
    }

    const contents = history.map(({ role, text }) => ({
      role,
      parts: [{ text: text.slice(0, MAX_CHARS) }],
    }));

    const config = {
      temperature: 0.7, // cukup kreatif untuk ide menu, tetap akurat
      topP: 0.9,
      topK: 40,
      systemInstruction: SYSTEM_INSTRUCTION,
    };
    // Matikan "thinking" pada seri 2.5 Flash supaya jawaban lebih cepat
    if (GEMINI_MODEL.includes('2.5-flash')) {
      config.thinkingConfig = { thinkingBudget: 0 };
    }

    const mulai = Date.now();
    const { it, first } = await openStream({ model: GEMINI_MODEL, contents, config });
    console.log(`Potongan pertama tiba dalam ${((Date.now() - mulai) / 1000).toFixed(1)} detik`);

    let r = first;
    while (!r.done) {
      const teks = r.value?.text;
      if (teks) {
        if (!started) {
          res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
          });
          started = true;
        }
        res.write(teks);
      }
      r = await it.next();
    }

    if (!started) {
      return res.status(502).json({ error: 'Model tidak mengembalikan jawaban. Coba ulangi pertanyaanmu.' });
    }
    res.end();
    console.log(`Jawaban selesai dalam ${((Date.now() - mulai) / 1000).toFixed(1)} detik`);
  } catch (e) {
    console.error('Gemini error:', e?.message || e);
    if (started) {
      // sudah terlanjur mengirim sebagian jawaban
      res.write('\n\n(Jawaban terputus. Coba kirim ulang ya.)');
      return res.end();
    }
    const sibuk = String(e?.message || '').includes('"code":503');
    res.status(sibuk ? 503 : 500).json({
      error: sibuk
        ? 'Server Gemini sedang ramai. Coba kirim lagi beberapa saat lagi ya.'
        : e?.message || 'Terjadi kesalahan pada server.',
    });
  }
});

app.listen(PORT, () => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith('isi_api_key')) {
    console.warn('⚠️  GEMINI_API_KEY belum diisi di file .env');
  }
  console.log(`Mulai Bot Gratiz running on http://localhost:${PORT} (model: ${GEMINI_MODEL})`);
});