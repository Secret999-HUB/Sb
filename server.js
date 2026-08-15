// Secret X💢 | Slap Battles Signal Relay
// Tiny relay so Main can push a command ("combo" / "snipe") to Helper
// without relying on in-game chat or position tricks. Helper polls
// once a second and consumes the command when it sees one.

const express = require('express');
const app = express();
app.use(express.json());

// in-memory store: { [helperUsername]: { cmd, ts } }
const signalStore = {};

// how long a signal is considered valid if nobody polls it in time
const SIGNAL_TTL_MS = 30 * 1000;

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'slap-signal-hub' });
});

// Main calls this to send a command to a specific Helper
app.post('/signal/:helper', (req, res) => {
  const helper = req.params.helper;
  const { cmd } = req.body || {};
  if (!cmd) return res.status(400).json({ error: 'cmd required' });

  signalStore[helper] = { cmd, ts: Date.now() };
  res.json({ ok: true });
});

// Helper polls this with their own username to check for a pending command
app.get('/signal/:helper', (req, res) => {
  const helper = req.params.helper;
  const entry = signalStore[helper];

  if (entry && Date.now() - entry.ts <= SIGNAL_TTL_MS) {
    delete signalStore[helper]; // consume once read
    return res.json({ cmd: entry.cmd });
  }

  if (entry) delete signalStore[helper]; // expired, clean it up
  res.json({ cmd: null });
});

// periodic cleanup of anything that expired without being polled
setInterval(() => {
  const now = Date.now();
  for (const helper in signalStore) {
    if (now - signalStore[helper].ts > SIGNAL_TTL_MS) {
      delete signalStore[helper];
    }
  }
}, 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`slap-signal-hub listening on port ${PORT}`);
});
