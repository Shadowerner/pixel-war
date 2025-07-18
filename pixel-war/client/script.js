// Configuration Firebase - À remplacer avec vos propres infos
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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
    
    // État du jeu
    let lastPixelTime = 0;
    let cooldown = 0;
    let canPlacePixel = true;
    
    // Initialisation du canvas
    function initCanvas() {
        // Fond blanc
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        
        // Écoute les changements dans la base de données
        database.ref('pixels').on('value', (snapshot) => {
            const pixels = snapshot.val() || {};
            
            // Redessine tous les pixels
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasSize, canvasSize);
            
            for (const pos in pixels) {
                const [x, y] = pos.split(',').map(Number);
                ctx.fillStyle = pixels[pos];
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
            
            // Redessine la grille
            drawGrid();
        });
        
        drawGrid();
    }
    
    // Dessine la grille
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
    
    // Met à jour le timer
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
    
    // Place un pixel
    function placePixel(x, y, color) {
        const now = Date.now();
        
        if (!canPlacePixel) {
            alert(`Attendez encore ${cooldown} seconde(s) avant de placer un nouveau pixel.`);
            return false;
        }
        
        // Vérifie les limites
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
            alert("Position en dehors du canvas!");
            return false;
        }
        
        // Envoie le pixel à Firebase
        const pos = `${x},${y}`;
        database.ref('pixels/' + pos).set(color);
        
        // Met à jour le timer
        lastPixelTime = now;
        canPlacePixel = false;
        updateTimer();
        
        return true;
    }
    
    // Gestionnaire d'événement pour le clic sur le canvas
    canvas.addEventListener('click', function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / pixelSize);
        const y = Math.floor((e.clientY - rect.top) / pixelSize);
        
        placePixel(x, y, colorPicker.value);
    });
    
    // Affiche les coordonnées de la souris
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / pixelSize);
        const y = Math.floor((e.clientY - rect.top) / pixelSize);
        
        coordsElement.textContent = `X: ${x}, Y: ${y}`;
    });
    
    // Initialisation
    initCanvas();
    
    // Met à jour le timer toutes les secondes
    setInterval(updateTimer, 1000);
});
