document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const canvasSize = 500;
    const pixelSize = 10;
    const gridSize = canvasSize / pixelSize;
    const cooldownTime = 10; // secondes
    
    // Éléments du DOM
    const canvas = document.getElementById('pixel-canvas');
    const ctx = canvas.getContext('2d');
    const colorPicker = document.getElementById('color-picker');
    const timerElement = document.getElementById('timer');
    const coordsElement = document.getElementById('coords');
    const playerCountElement = document.getElementById('player-count');
    const leaderboardList = document.getElementById('leaderboard-list');
    
    // État du jeu
    let pixels = {};
    let lastPixelTime = 0;
    let cooldown = 0;
    let canPlacePixel = true;
    let players = {};
    let playerId = null;
    let playerColor = '#ff0000';
    
    // Connexion WebSocket
    const socket = io();
    
    // Initialisation du canvas
    function initCanvas() {
        // Dessiner le fond blanc
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        
        // Dessiner tous les pixels
        for (const pos in pixels) {
            const [x, y] = pos.split(',').map(Number);
            ctx.fillStyle = pixels[pos].color;
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
        
        // Dessiner la grille
        drawGrid();
    }
    
    // Dessiner la grille
    function drawGrid() {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * pixelSize, 0);
            ctx.lineTo(i * pixelSize, canvasSize);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i * pixelSize);
            ctx.lineTo(canvasSize, i * pixelSize);
            ctx.stroke();
        }
    }
    
    // Mettre à jour le timer
    function updateTimer() {
        const now = Date.now();
        const elapsed = Math.floor((now - lastPixelTime) / 1000);
        cooldown = Math.max(0, cooldownTime - elapsed);
        
        if (cooldown <= 0) {
            timerElement.textContent = "Prêt à placer un pixel!";
            canPlacePixel = true;
        } else {
            timerElement.textContent = `Prochain pixel dans: ${cooldown}s`;
            canPlacePixel = false;
        }
    }
    
    // Placer un pixel
    function placePixel(x, y, color) {
        if (!canPlacePixel) {
            alert(`Attendez encore ${cooldown} seconde(s) avant de placer un nouveau pixel.`);
            return false;
        }
        
        // Vérifier les limites
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
            alert("Position en dehors du canvas!");
            return false;
        }
        
        // Envoyer au serveur
        socket.emit('place-pixel', { x, y, color });
        
        // Mettre à jour le timer côté client
        lastPixelTime = Date.now();
        canPlacePixel = false;
        updateTimer();
        
        return true;
    }
    
    // Mettre à jour le classement
    function updateLeaderboard() {
        // Convertir l'objet players en array et trier
        const playersArray = Object.values(players).sort((a, b) => b.pixelsPlaced - a.pixelsPlaced);
        
        leaderboardList.innerHTML = '';
        
        playersArray.forEach((player, index) => {
            const li = document.createElement('li');
            
            const colorSpan = document.createElement('span');
            colorSpan.className = 'player-color';
            colorSpan.style.backgroundColor = player.color;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = player.id === playerId ? `Vous (${player.pixelsPlaced})` : `Joueur ${player.id.slice(0, 4)} (${player.pixelsPlaced})`;
            
            li.appendChild(colorSpan);
            li.appendChild(nameSpan);
            leaderboardList.appendChild(li);
        });
    }
    
    // Événements Socket.io
    
    // Connexion initiale
    socket.on('connect', () => {
        playerId = socket.id;
        playerColor = colorPicker.value;
        
        // Enregistrer le joueur
        socket.emit('register-player', { color: playerColor });
    });
    
    // Recevoir l'état initial
    socket.on('initial-state', (data) => {
        pixels = data.pixels;
        players = data.players;
        initCanvas();
        updateLeaderboard();
        playerCountElement.textContent = `${Object.keys(players).length} joueurs en ligne`;
    });
    
    // Mise à jour des pixels
    socket.on('pixel-update', (data) => {
        const { x, y, color, playerId } = data;
        const pos = `${x},${y}`;
        
        // Mettre à jour le pixel
        pixels[pos] = { color, playerId };
        
        // Redessiner le pixel
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        
        // Redessiner la grille
        drawGrid();
    });
    
    // Mise à jour des joueurs
    socket.on('players-update', (updatedPlayers) => {
        players = updatedPlayers;
        playerCountElement.textContent = `${Object.keys(players).length} joueurs en ligne`;
        updateLeaderboard();
    });
    
    // Gestionnaire d'événement pour le clic sur le canvas
    canvas.addEventListener('click', function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / pixelSize);
        const y = Math.floor((e.clientY - rect.top) / pixelSize);
        
        placePixel(x, y, colorPicker.value);
    });
    
    // Afficher les coordonnées de la souris
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / pixelSize);
        const y = Math.floor((e.clientY - rect.top) / pixelSize);
        
        coordsElement.textContent = `X: ${x}, Y: ${y}`;
    });
    
    // Changer de couleur
    colorPicker.addEventListener('change', function(e) {
        playerColor = e.target.value;
        socket.emit('update-player-color', { color: playerColor });
    });
    
    // Initialisation
    initCanvas();
    
    // Mettre à jour le timer toutes les secondes
    setInterval(updateTimer, 1000);
});