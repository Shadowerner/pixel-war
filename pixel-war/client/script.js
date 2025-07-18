// Configuration Firebase - À remplacer avec vos propres infos
const firebaseConfig = {
    apiKey: "AIzaSyA_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "pixelwar-xxxxx.firebaseapp.com",
    databaseURL: "https://pixelwar-xxxxx.firebaseio.com",
    projectId: "pixelwar-xxxxx",
    storageBucket: "pixelwar-xxxxx.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Configuration du jeu
const config = {
    canvasWidth: 800,
    canvasHeight: 600,
    pixelSize: 10,
    cooldownTime: 10, // secondes
    maxGridX: 80,     // 800 / 10
    maxGridY: 60      // 600 / 10
};

// Éléments du DOM
const elements = {
    canvas: document.getElementById('pixel-canvas'),
    ctx: document.getElementById('pixel-canvas').getContext('2d'),
    authSection: document.getElementById('auth-section'),
    controlsSection: document.getElementById('controls-section'),
    userInfo: document.getElementById('user-info'),
    username: document.getElementById('username'),
    loginBtn: document.getElementById('login-btn'),
    signupBtn: document.getElementById('signup-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    colorPicker: document.getElementById('color-picker'),
    timer: document.getElementById('timer'),
    coords: document.getElementById('coords'),
    placeBtn: document.getElementById('place-btn'),
    pixelInfo: document.getElementById('pixel-info'),
    totalPixels: document.getElementById('total-pixels'),
    activeUsers: document.getElementById('active-users'),
    lastUpdate: document.getElementById('last-update')
};

// État du jeu
let state = {
    user: null,
    lastPixelTime: 0,
    cooldown: 0,
    canPlacePixel: false,
    mousePos: { x: 0, y: 0 },
    activeUsersCount: 0,
    totalPixelsCount: 0
};

// Initialisation du canvas
function initCanvas() {
    elements.canvas.width = config.canvasWidth;
    elements.canvas.height = config.canvasHeight;
    
    // Fond blanc
    elements.ctx.fillStyle = '#ffffff';
    elements.ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
    
    // Écoute les changements de pixels
    database.ref('pixels').on('value', (snapshot) => {
        const pixels = snapshot.val() || {};
        renderCanvas(pixels);
        updatePixelCount(Object.keys(pixels).length);
    });
    
    // Met à jour les stats des utilisateurs actifs
    database.ref('presence').on('value', (snapshot) => {
        state.activeUsersCount = snapshot.numChildren();
        elements.activeUsers.textContent = state.activeUsersCount;
    });
    
    // Initialise la présence utilisateur
    if (state.user) {
        const presenceRef = database.ref('presence/' + state.user.uid);
        presenceRef.set(true);
        presenceRef.onDisconnect().remove();
    }
}

// Affiche tous les pixels
function renderCanvas(pixels) {
    // Efface le canvas
    elements.ctx.fillStyle = '#ffffff';
    elements.ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
    
    // Dessine tous les pixels
    for (const pos in pixels) {
        const [x, y] = pos.split(',').map(Number);
        elements.ctx.fillStyle = pixels[pos];
        elements.ctx.fillRect(
            x * config.pixelSize, 
            y * config.pixelSize, 
            config.pixelSize, 
            config.pixelSize
        );
    }
    
    // Dessine la grille
    drawGrid();
    elements.lastUpdate.textContent = new Date().toLocaleTimeString();
}

// Dessine la grille
function drawGrid() {
    elements.ctx.strokeStyle = '#e0e0e0';
    elements.ctx.lineWidth = 0.5;
    
    // Lignes verticales
    for (let x = 0; x <= config.maxGridX; x++) {
        elements.ctx.beginPath();
        elements.ctx.moveTo(x * config.pixelSize, 0);
        elements.ctx.lineTo(x * config.pixelSize, config.canvasHeight);
        elements.ctx.stroke();
    }
    
    // Lignes horizontales
    for (let y = 0; y <= config.maxGridY; y++) {
        elements.ctx.beginPath();
        elements.ctx.moveTo(0, y * config.pixelSize);
        elements.ctx.lineTo(config.canvasWidth, y * config.pixelSize);
        elements.ctx.stroke();
    }
}

// Met à jour le timer
function updateTimer() {
    const now = Date.now();
    const elapsed = Math.floor((now - state.lastPixelTime) / 1000);
    state.cooldown = Math.max(0, config.cooldownTime - elapsed);
    
    if (state.cooldown <= 0) {
        elements.timer.innerHTML = 'Prêt à placer un pixel! <span class="fw-bold">Maintenant</span>';
        state.canPlacePixel = true;
    } else {
        elements.timer.innerHTML = `Prochain pixel dans: <span class="fw-bold">${state.cooldown}</span> secondes`;
        state.canPlacePixel = false;
    }
}

// Place un pixel
function placePixel(x, y, color) {
    if (!state.user) {
        alert('Vous devez être connecté pour placer un pixel');
        return false;
    }
    
    if (!state.canPlacePixel) {
        alert(`Attendez encore ${state.cooldown} seconde(s) avant de placer un nouveau pixel.`);
        return false;
    }
    
    // Vérifie les limites
    if (x < 0 || x >= config.maxGridX || y < 0 || y >= config.maxGridY) {
        alert("Position en dehors du canvas!");
        return false;
    }
    
    // Vérifie la couleur
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
        alert("Couleur invalide!");
        return false;
    }
    
    // Vérifie le timer utilisateur
    const userTimerRef = database.ref('userTimers/' + state.user.uid);
    userTimerRef.once('value').then((snapshot) => {
        const lastUserPixelTime = snapshot.val() || 0;
        const now = Date.now();
        
        if (now - lastUserPixelTime < config.cooldownTime * 1000) {
            const remaining = Math.ceil((config.cooldownTime * 1000 - (now - lastUserPixelTime)) / 1000);
            alert(`Vous devez attendre encore ${remaining} secondes avant de placer un nouveau pixel.`);
            return false;
        }
        
        // Met à jour le timer utilisateur
        userTimerRef.set(now);
        
        // Place le pixel
        const pos = `${x},${y}`;
        database.ref('pixels/' + pos).set(color)
            .then(() => {
                state.lastPixelTime = now;
                updateTimer();
                showPixelInfo(x, y, color);
            })
            .catch((error) => {
                console.error("Erreur lors du placement du pixel:", error);
                alert("Une erreur est survenue lors du placement du pixel");
            });
    });
    
    return true;
}

// Affiche les infos du pixel survolé
function showPixelInfo(x, y, color) {
    elements.pixelInfo.style.display = 'block';
    elements.pixelInfo.style.left = `${x * config.pixelSize + config.pixelSize/2}px`;
    elements.pixelInfo.style.top = `${y * config.pixelSize}px`;
    elements.pixelInfo.innerHTML = `
        <div>Position: (${x}, ${y})</div>
        <div>Couleur: <span style="color:${color}">${color}</span></div>
    `;
    
    setTimeout(() => {
        elements.pixelInfo.style.display = 'none';
    }, 2000);
}

// Met à jour le compteur de pixels
function updatePixelCount(count) {
    state.totalPixelsCount = count;
    elements.totalPixels.textContent = count;
}

// Gestion de l'authentification
function initAuth() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            state.user = user;
            elements.authSection.classList.add('d-none');
            elements.controlsSection.classList.remove('d-none');
            elements.userInfo.classList.remove('d-none');
            elements.username.textContent = user.email;
            
            // Initialise le jeu
            initCanvas();
            updateTimer();
            setInterval(updateTimer, 1000);
            
            // Met à jour la présence
            const presenceRef = database.ref('presence/' + user.uid);
            presenceRef.set(true);
            presenceRef.onDisconnect().remove();
        } else {
            state.user = null;
            elements.authSection.classList.remove('d-none');
            elements.controlsSection.classList.add('d-none');
            elements.userInfo.classList.add('d-none');
        }
    });
    
    // Gestionnaires d'événements
    elements.loginBtn.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .catch((error) => {
                alert("Erreur de connexion: " + error.message);
            });
    });
    
    elements.signupBtn.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
                alert("Compte créé avec succès!");
            })
            .catch((error) => {
                alert("Erreur lors de la création du compte: " + error.message);
            });
    });
    
    elements.logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
}

// Gestion des interactions avec le canvas
function initCanvasInteractions() {
    // Clic sur le canvas
    elements.canvas.addEventListener('click', (e) => {
        if (!state.user) return;
        
        const rect = elements.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / config.pixelSize);
        const y = Math.floor((e.clientY - rect.top) / config.pixelSize);
        
        placePixel(x, y, elements.colorPicker.value);
    });
    
    // Mouvement de la souris sur le canvas
    elements.canvas.addEventListener('mousemove', (e) => {
        const rect = elements.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / config.pixelSize);
        const y = Math.floor((e.clientY - rect.top) / config.pixelSize);
        
        state.mousePos = { x, y };
        elements.coords.textContent = `(${x}, ${y})`;
    });
    
    // Bouton de placement manuel
    elements.placeBtn.addEventListener('click', () => {
        if (state.mousePos) {
            placePixel(state.mousePos.x, state.mousePos.y, elements.colorPicker.value);
        }
    });
}

// Initialisation de l'application
function initApp() {
    initAuth();
    initCanvasInteractions();
    
    // Affiche la configuration
    console.log("Pixel War initialisé avec la configuration:", config);
}

// Lance l'application quand la page est prête
document.addEventListener('DOMContentLoaded', initApp);
