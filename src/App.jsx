const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const cors = require('cors');
const path = require('path');

const app = express();

// CONFIGURACIÓN CORS ULTRA-PERMISIVA PARA EMERGENCIAS
app.use(cors({
    origin: '*', // Permite cualquier origen (Vercel, Localhost, etc.)
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));

const port = process.env.PORT || 3000;
let lastQR = '';
let isReady = false;

// Ruta absoluta para Render
const chromePath = path.join(process.cwd(), '.cache', 'puppeteer', 'chrome', 'linux-127.0.6533.88', 'chrome-linux64', 'chrome');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: chromePath,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', 
            '--disable-gpu',
            '--no-zygote'
        ],
    }
});

client.on('qr', async (qr) => {
    isReady = false;
    console.log('--- NUEVO QR GENERADO ---');
    qrcodeTerminal.generate(qr, { small: true });
    try {
        lastQR = await QRCode.toDataURL(qr);
    } catch (err) {
        console.error('Error QR:', err);
    }
});

client.on('ready', () => {
    console.log('¡WHATSAPP CONECTADO!');
    isReady = true;
    lastQR = ''; 
});

client.on('disconnected', () => {
    isReady = false;
    client.initialize();
});

// Endpoint de estado con headers de seguridad explícitos
app.get('/status', (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ 
        whatsappReady: isReady,
        qr: lastQR 
    });
});

app.post('/send', async (req, res) => {
    const { number, text, mediaBase64, mimetype, filename } = req.body;
    if (!isReady) return res.status(503).json({ error: 'WhatsApp no vinculado' });

    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        if (mediaBase64) {
            const media = new MessageMedia(mimetype, mediaBase64.split(',')[1], filename);
            await client.sendMessage(chatId, media, { caption: text });
        } else {
            await client.sendMessage(chatId, text);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor activo en puerto ${port}`);
    client.initialize().catch(err => console.error('Error Puppeteer:', err.message));
});
