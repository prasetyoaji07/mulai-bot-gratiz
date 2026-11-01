# 🐍 PythonBuddy - Gemini AI Chatbot

Chatbot **teman belajar Python** untuk pemula, dibangun dengan **Node.js + Express** (backend) dan **Vanilla JavaScript** (frontend), ditenagai **Google Gemini 2.5 Flash**.

## Use Case & Konfigurasi Kreatif
| Aspek | Penjelasan |
|---|---|
| Use case | Education bot: asisten belajar Python untuk mahasiswa/pemula |
| System instruction | Persona PythonBuddy, gaya santai-sopan, fokus topik Python, memberi petunjuk (bukan sekadar jawaban jadi) |
| Parameter | `temperature: 0.7`, `topP: 0.9`, `topK: 40` |
| Memory | Riwayat percakapan multi-turn dikirim ke backend (maks. 20 pesan terakhir) |
| Fitur UI | Typing indicator, format kode (markdown), tombol saran pertanyaan, reset percakapan |

## Arsitektur
`Browser (fetch POST /api/chat)` → `Express (index.js)` → `Gemini generateContent()` → `{ result }` → tampil di chat.

## Cara Menjalankan
1. Pastikan Node.js v18+ terpasang (`node -v`).
2. Salin `.env.example` menjadi `.env`, isi API key dari https://aistudio.google.com/apikey :
   ```
   GEMINI_API_KEY=api_key_kamu
   ```
3. Install dependency dan jalankan:
   ```bash
   npm install
   npm start
   ```
4. Buka http://localhost:3000

## API
`POST /api/chat`
```json
{ "conversation": [ { "role": "user", "text": "Apa itu list?" } ] }
```
Respons: `{ "result": "..." }`

## Struktur
```
├── index.js          # server Express + endpoint Gemini
├── public/           # index.html, style.css, script.js
├── .env.example
└── package.json
```
