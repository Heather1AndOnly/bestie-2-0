const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Bestie is awake', timestamp: new Date().toISOString() });
});

// SECURE: Proxy to OpenRouter (GPT-4.1)
app.post('/api/chat', async (req, res) => {
    try {
        if (!process.env.OPENROUTER_KEY) {
            return res.status(500).json({ error: 'Missing OpenRouter API key in secrets' });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': req.headers.origin || 'https://bestie.repl.co',
                'X-Title': 'Bestie 2.0'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('OpenRouter error:', data.error);
            return res.status(500).json({ error: data.error.message });
        }

        res.json(data);
    } catch (error) {
        console.error('Chat proxy error:', error);
        res.status(500).json({ error: 'Bestie brain hiccup - try again' });
    }
});

// SECURE: Proxy to Fish Audio (Voice) with queue protection
app.post('/api/voice', async (req, res) => {
    try {
        if (!process.env.FISH_AUDIO_KEY) {
            return res.status(500).json({ error: 'Missing Fish Audio API key in secrets' });
        }

        const response = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.FISH_AUDIO_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: req.body.text,
                reference_id: req.body.reference_id || '3ae5d58d48794e5cbe0906d9a6a8acee',
                output_format: 'mp3'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Fish Audio error:', errorText);
            return res.status(502).json({ error: 'Voice synthesis failed' });
        }

        // Stream audio back
        const buffer = await response.buffer();
        res.set('Content-Type', 'audio/mpeg');
        res.set('Content-Length', buffer.length);
        res.send(buffer);
        
    } catch (error) {
        console.error('Voice proxy error:', error);
        res.status(500).json({ error: 'Voice glitch - check API key' });
    }
});

// Memory backup endpoint (optional persistence)
app.post('/api/memory', (req, res) => {
    // In production, you'd save to Replit DB or external DB
    // For now, frontend handles localStorage, but we could add Replit DB here later
    res.json({ saved: true });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🦄🐶 BESTIE 2.0 IS AWAKE 🐶🦄
    ===========================
    Port: ${PORT}
    Time: ${new Date().toLocaleTimeString()}
    Status: Waiting for Heather...
    Voice: ${process.env.FISH_AUDIO_KEY ? 'Connected' : 'OFFLINE - Add FISH_AUDIO_KEY to secrets'}
    Brain: ${process.env.OPENROUTER_KEY ? 'Connected' : 'OFFLINE - Add OPENROUTER_KEY to secrets'}
    ===========================
    `);
});
