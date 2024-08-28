import express from 'express';
import httpProxy from 'http-proxy';
import http from 'http';
import dotenv from 'dotenv';
import axios from 'axios'; // axios를 올바르게 임포트
import cors from 'cors'; // CORS 미들웨어 추가

// Load environment variables from .env file
dotenv.config();

// Initialize Express
const app = express();
app.use(express.json()); // For parsing application/json

// CORS 미들웨어 추가
app.use(cors({
    origin: 'http://localhost:3000', // 허용할 프론트엔드 도메인
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // 쿠키 자격 증명 허용 설정
}));

// Create

// Create a proxy server with http-proxy
const serverProxy = httpProxy.createProxyServer();

// Proxy server request event handling
serverProxy.on('proxyReq', function(proxyReq, req, res) {
    // Set the Basic Auth header
    proxyReq.setHeader('Authorization', `Bearer ${process.env.GRAFANA_API_TOKEN}`);

    // Handle the body of the request if present
    if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
    }
});

app.get('/test-callback', async (req, res) => {
    const targetUrl = `${process.env.GRAFANA_URL}/${process.env.GRAFANA_DASHBOARD_URL}`;

    try {
        // Send a GET request to the Grafana server
        const response = await axios.get(targetUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.GRAFANA_API_TOKEN}`
            }
        });

        // Send Grafana's response back to the client
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error calling Grafana API:', error.message);
        res.status(500).send('Error contacting Grafana API');
    }
});


// Setup endpoint to handle all dashboard related requests
app.all('/grafana/*', (req, res) => {
    console.log("Accessing Dashboard - User-Agent:", req.headers['user-agent']); // Log User-Agent

    const targetUrl = process.env.GRAFANA_URL;  // targetUrl 정의

    if (!targetUrl) {
        console.error('No target URL specified');
        return res.status(500).send('Internal Server Error: Target URL not specified');
    }

    serverProxy.web(req, res, {
        target: targetUrl,
        changeOrigin: true,
        pathRewrite: { '^/grafana': '' }, // '/grafana' 접두사를 제거하여 Grafana 서버에 전달
        secure: false, // SSL 검증 비활성화
    });
});

// Proxy error handling
serverProxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error occurred');
});

// Create HTTP server and listen on a port
const server = http.createServer(app);
const PORT = 3333; // Set your port number, use environment variable if available
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
