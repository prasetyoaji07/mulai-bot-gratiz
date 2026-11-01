# Mulai Bot Gratiz - Gemini AI Chatbot

Chatbot berbasis **Google Gemini AI** buatan **Prasetyo Aji** (Hacktiv8 - AI Productivity and AI API Integration for Developers). Dibangun dengan **Node.js + Express** (backend) dan **Vanilla JavaScript** (frontend).

## Use Case & Konfigurasi
| Aspek | Penjelasan |
|---|---|
| Use case | Asisten belajar interaktif untuk mahasiswa dan pelajar |
| System instruction | Persona "Prasetyo Aji", gaya bahasa santai-sopan, aturan menjawab |
| Parameter | `temperature: 0.7`, `topP: 0.9`, `topK: 40` |
| Memory | Riwayat percakapan multi-turn dikirim ke backend (maks. 20 pesan terakhir) |
| Ketahanan | Retry otomatis saat server Gemini sibuk (503/429) |
| Fitur UI | Typing indicator, format kode, tombol saran pertanyaan, reset percakapan |

## Arsitektur
`Browser (fetch POST /api/chat)` → `Express (index.js)` → `Gemini generateContent()` → `{ result }` → tampil di chat.

## Cara Menjalankan
1. Install Node.js v18+.
2. Salin `.env.example` menjadi `.env`, lalu isi API key dari https://aistudio.google.com/apikey :
   ```
   GEMINI_API_KEY=api_key_kamu
   ```
3. Jalankan:
   ```bash
   npm install
   npm start
   ```
4. Buka http://localhost:3000

## Struktur
```
├── index.js          # server Express + endpoint Gemini
├── public/           # index.html, style.css, script.js, logo
├── .env.example
└── package.json
```