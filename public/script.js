const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const suggestions = document.getElementById('suggestions');

// Memory percakapan (dikirim utuh ke backend tiap request)
let conversation = [];

   const WELCOME =
     'Halo! 👋 Aku **Mulai Bot Gratiz**, asisten AI kamu. Tanya apa saja, aku siap bantu!';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Format markdown sederhana (aman: HTML di-escape dulu)
function formatMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, (_m, code) => `<pre><code>${code.trim()}</code></pre>`);
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|\n)[*-] (.+)/g, '$1• $2');
  return html.replace(/\n/g, '<br>').replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, (m) => m.replace(/<br>/g, '\n'));
}

function appendMessage(sender, text, isError = false) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  if (isError) msg.classList.add('error');
  if (sender === 'bot') msg.innerHTML = formatMarkdown(text);
  else msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function showTyping() {
  const msg = document.createElement('div');
  msg.classList.add('message', 'bot', 'typing');
  msg.innerHTML = '<span></span><span></span><span></span>';
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  input.disabled = isLoading;
  if (!isLoading) input.focus();
}

async function sendMessage(userMessage) {
  appendMessage('user', userMessage);
  conversation.push({ role: 'user', text: userMessage });
  input.value = '';
  suggestions.style.display = 'none';

  const botMsg = showTyping();
  setLoading(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error || response.statusText);
    }

    const data = await response.json();
    if (data && data.result) {
      botMsg.classList.remove('typing');
      botMsg.innerHTML = formatMarkdown(data.result);
      conversation.push({ role: 'model', text: data.result });
    } else {
      botMsg.classList.remove('typing');
      botMsg.classList.add('error');
      botMsg.textContent = 'Sorry, no response received.';
      conversation.pop(); // buang pesan user agar riwayat tetap konsisten
    }
  } catch (error) {
    console.error('Error fetching response:', error);
    botMsg.classList.remove('typing');
    botMsg.classList.add('error');
    botMsg.textContent = 'Failed to get response from server. ' + (error.message || '');
    conversation.pop();
  } finally {
    setLoading(false);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const userMessage = input.value.trim();
  if (!userMessage) return;
  sendMessage(userMessage);
});

suggestions.addEventListener('click', (e) => {
  const q = e.target.dataset?.q;
  if (q) sendMessage(q);
});

clearBtn.addEventListener('click', () => {
  conversation = [];
  chatBox.innerHTML = '';
  suggestions.style.display = 'flex';
  appendMessage('bot', WELCOME);
});

appendMessage('bot', WELCOME);
