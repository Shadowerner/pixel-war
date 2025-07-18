const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Configuration
const PORT = process.env.PORT || 3000;
const CANVAS_SIZE = 50; // 50x50 grid
const PIXEL_COOLDOWN = 10000; // 10 seconds in ms

// État du serveur
let pixels = {};
let players = {};

// Initialiser le canvas avec des pixels blancs
function initializeCanvas() {
    for (let x = 0; x < CANVAS_SIZE; x++) {
        for (let y = 0; y < CANVAS_SIZE; y++) {
            const pos = `${x},${y}`;
            pixels[pos] = { color: '#ffffff', playerId: null };
        }
    }
}

// Middleware
app.use(cors());
app.use(express.static('../client'));

// Routes
app.get('/api/pixels', (req, res) => {
    res.json(pixels);
});

app.get('/api/players', (req, res) => {
    res.json(players);
});

// Socket.io
io.on('connection', (socket) => {
    console.log(`Nouveau joueur connecté: ${socket.id}`);
    
    // Envoyer l'état initial au nouveau joueur
    socket.emit('initial-state', { pixels, players });
    
    // Enregistrer un nouveau joueur
    socket.on('register-player', (data) => {
        players[socket.id] = {
            id: socket.id,
            color: data.color || '#ff0000',
            pixelsPlaced: 0,
            lastPixelTime: 0
        };
        
        io.emit('players-update', players);
    });
    
    // Mettre à jour la couleur d'un joueur
    socket.on('update-player-color', (data) => {
        if (players[socket.id]) {
            players[socket.id].color = data.color;
            io.emit('players-update', players);
        }
    });
    
    // Placer un pixel
    socket.on('place-pixel', (data) => {
        const { x, y, color } = data;
        const player = players[socket.id];
        
        // Vérifier les limites
        if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) {
            return;
        }
        
        // Vérifier le cooldown
        const now = Date.now();
        if (player && now - player.lastPixelTime < PIXEL_COOLDOWN) {
            return;
        }
        
        // Mettre à jour le pixel
        const pos = `${x},${y}`;
        pixels[pos] = { color, playerId: socket.id };
        
        // Mettre à jour les stats du joueur
        if (player) {
            player.pixelsPlaced += 1;
            player.lastPixelTime = now;
        }
        
        // Diffuser à tous les clients
        io.emit('pixel-update', { x, y, color, playerId: socket.id });
        io.emit('players-update', players);
    });
    
    // Déconnexion
    socket.on('disconnect', () => {
        console.log(`Joueur déconnecté: ${socket.id}`);
        delete players[socket.id];
        io.emit('players-update', players);
    });
});

// Initialiser le canvas
initializeCanvas();

// Démarrer le serveur
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});