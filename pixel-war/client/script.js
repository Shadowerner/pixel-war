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
    let pixels = {};
    let lastPixelTime = 0;
    let cooldown = 0;
    let canPlacePixel = true;
    
    // Initialisation du canvas
    function initCanvas() {
        // Dessiner la grille
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        
        // Dessiner les pixels existants
        for (const pos in pixels) {
            const [x, y] = pos.split(',').map(Number);
            ctx.fillStyle = pixels[pos];
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
        
        // Dessiner la grille
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
        const now = Date.now();
        
        if (!canPlacePixel) {
            alert(`Attendez encore ${cooldown} seconde(s) avant de placer un nouveau pixel.`);
            return false;
        }
        
        // Vérifier les limites
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
            alert("Position en dehors du canvas!");
            return false;
        }
        
        // Enregistrer le pixel
        const pos = `${x},${y}`;
        pixels[pos] = color;
        
        // Dessiner le pixel
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        
        // Redessiner la grille sur le pixel
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        
        // Mettre à jour le timer
        lastPixelTime = now;
        canPlacePixel = false;
        updateTimer();
        
        // Sauvegarder dans le localStorage
        localStorage.setItem('pixelWarPixels', JSON.stringify(pixels));
        
        return true;
    }
    
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
    
    // Charger les pixels depuis le localStorage
    function loadPixels() {
        const savedPixels = localStorage.getItem('pixelWarPixels');
        if (savedPixels) {
            pixels = JSON.parse(savedPixels);
        }
    }
    
    // Initialisation
    loadPixels();
    initCanvas();
    
    // Mettre à jour le timer toutes les secondes
    setInterval(updateTimer, 1000);
    
    // Pour un système multi-utilisateurs, vous devriez utiliser une base de données
    // Voici un exemple simplifié avec un serveur Node.js:
    /*
    async function fetchPixels() {
        try {
            const response = await fetch('/api/pixels');
            if (response.ok) {
                pixels = await response.json();
                initCanvas();
            }
        } catch (error) {
            console.error('Error fetching pixels:', error);
        }
    }
    
    async function sendPixel(x, y, color) {
        try {
            const response = await fetch('/api/pixels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ x, y, color }),
            });
            
            if (response.ok) {
                fetchPixels();
            }
        } catch (error) {
            console.error('Error sending pixel:', error);
        }
    }
    
    // Appeler fetchPixels() périodiquement pour les mises à jour
    setInterval(fetchPixels, 5000);
    fetchPixels();
    */
});
