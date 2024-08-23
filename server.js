import express from 'express';
import httpProxy from 'http-proxy';
import http from 'http';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize Express
const app = express();
app.use(express.json()); // For parsing application/json

// Create a proxy server with http-proxy
const serverProxy = httpProxy.createProxyServer();

// Proxy server request event handling
serverProxy.on('proxyReq', function(proxyReq, req, res) {
    // Set the Basic Auth header
    proxyReq.setHeader('Authorization', `Basic ${process.env.GRAFANA_API_TOKEN}`);

    // Handle the body of the request if present
    if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
    }
});

// Setup endpoint to handle all dashboard related requests
app.all('/dashboard(/*)?', (req, res) => {
    console.log("Accessing Dashboard - User-Agent:", req.headers['user-agent']); // Log User-Agent
    console.log("Rewritten URL:", req.url);

    const targetUrl = process.env.GRAFANA_URL;
    if (!targetUrl) {
        console.error('No target URL specified');
        return res.status(500).send('Internal Server Error: Target URL not specified');
    }

    serverProxy.web(req, res, {
        target: targetUrl,
        prependPath: false
    });
});

// Proxy error handling
serverProxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error occurred');
});

// Create HTTP server and listen on a port
const server = http.createServer(app);
const PORT = process.env.PORT || 3333; // Set your port number, use environment variable if available
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
