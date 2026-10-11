// Backend API to serve Supabase credentials securely
// Deploy to Vercel, Netlify Functions, or Railway

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// CORS - Environment-aware origins
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedOrigins = ['https://stokika.com', 'https://www.stokika.com'];

// Only add localhost in development
if (isDevelopment) {
    allowedOrigins.push('http://localhost:5500', 'http://127.0.0.1:5500');
    console.warn('⚠️ Development mode: localhost origins allowed');
}

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Serve config
app.get('/api/config', (req, res) => {
    const referer = req.get('Referer');
    const origin = req.get('Origin');
    
    // In production, only allow stokika.com domains
    if (process.env.NODE_ENV === 'production') {
        if (!referer || !referer.includes('stokika.com')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    } else {
        // In development, allow localhost
        const isValidReferer = referer && (
            referer.includes('stokika.com') || 
            referer.includes('localhost') ||
            referer.includes('127.0.0.1')
        );
        
        if (!isValidReferer) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    }

    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
