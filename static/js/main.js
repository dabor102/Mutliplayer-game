const socket = io();
let gameId, myRole;
let gameConfig = {};
let remainingClicks, remainingTime;
let timerInterval;
let isFirstClick = true;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    setupEventListeners();
    requestGameConfig();
});

// Particle Generator
function createParticle(className) {
    const particle = document.createElement('div');
    particle.className = `particle ${className}`;
    
    // More random initial angles for better spread
    const angle = Math.random() * Math.PI * 2;
    const velocity = 40 + Math.random() * 80; // Increased velocity range
    const spread = Math.random() * 0.8 + 0.2; // Adds variation to the explosion radius

    // Calculate trajectory
    particle.style.setProperty('--tx', Math.cos(angle) * velocity * spread);
    particle.style.setProperty('--ty', Math.sin(angle) * velocity * spread);
    
    return particle;
}

function createParticleEffect(x, y, timeBonus, clicksBonus) {
    console.log('Creating particle effect at:', x, y);
    const container = document.createElement('div');
    container.className = 'particle-container';
    container.style.left = x + 'px';
    container.style.top = y + 'px';

    // Add bonus text with slight offset for better visibility
    const timeText = document.createElement('div');
    timeText.className = 'bonus-text time-bonus';
    timeText.textContent = `+${timeBonus}s`;
    timeText.style.left = '-30px';
    timeText.style.top = '-20px';

    const clicksText = document.createElement('div');
    clicksText.className = 'bonus-text clicks-bonus';
    clicksText.textContent = `+${clicksBonus} clicks`;
    clicksText.style.left = '-40px';
    clicksText.style.top = '10px';

    container.appendChild(timeText);
    container.appendChild(clicksText);

    // Create more particles for a bigger explosion
    const particleCount = 30; // Increased from 20
    for (let i = 0; i < particleCount; i++) {
        const timeParticle = createParticle('time-particle');
        const clicksParticle = createParticle('clicks-particle');
        // Add slight random delay to each particle for more natural explosion
        timeParticle.style.animationDelay = `${Math.random() * 0.2}s`;
        clicksParticle.style.animationDelay = `${Math.random() * 0.2 + 0.1}s`;
        container.appendChild(timeParticle);
        container.appendChild(clicksParticle);
    }

    document.body.appendChild(container);
    
    // Remove container after animations complete
    setTimeout(() => container.remove(), 2000);
}

function setupEventListeners() {
    const loginForm = document.getElementById('login-form-element');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('Login form not found');
    }

    socket.on('login_response', handleLoginResponse);
    socket.on('waiting_message', handleWaitingMessage);
    socket.on('game_start', handleGameStart);
    socket.on('click_result', handleClickResult);
    socket.on('next_turn', handleNextTurn);
    socket.on('game_completed', handleGameCompleted);
    socket.on('game_config', handleGameConfig);
    socket.on('remove_modal', handleModalRemove);

}


function handleModalRemove() {
    const modal = document.querySelector('.end-turn-modal');
    if (modal) {
        modal.remove();
    }
}

    


function requestGameConfig() {
    socket.emit('get_game_config');
}

function handleLogin(event) {
    event.preventDefault(); // Prevent form submission
    const playerName = document.getElementById('player-name').value;
    if (playerName) {
        console.log('Sending login event:', playerName);
        socket.emit('login', { name: playerName });
    } else {
        console.error('Player name is empty');
    }
}

function handleLoginResponse(data) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('game-container').style.display = 'grid'; // Changed to 'grid'
    document.getElementById('game-grid').style.display = 'none';
    document.getElementById('objective-section').style.display = 'none';
    document.getElementById('player-stats').style.display = 'none';
    document.getElementById('player-name-display').textContent = document.getElementById('player-name').value;
    document.getElementById('player-role').textContent = data.role;
    myRole = data.role;
    updateGameStatus('Waiting for game to start...', 'info');
}

function handleWaitingMessage(data) {
    updateGameStatus(data.message, 'info');
}

function updatePlayerRoleView() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.classList.remove('role-shooter', 'role-spotter');
    if (myRole === 'shooter') {
        gameContainer.classList.add('role-shooter');
    } else if (myRole === 'spotter') {
        gameContainer.classList.add('role-spotter');
    }
}

function handleGameStart(data) {
    document.getElementById('game-grid').style.display = 'grid';
    document.getElementById('objective-section').style.display = 'block';
    document.getElementById('player-stats').style.display = 'block';
    console.log('Game started:', data);
    gameId = data.game_id;
    myRole = data.your_role;
    document.getElementById('player-role').textContent = myRole;
    updateGameStatus(`Game started!`, 'success');

    gameConfig = { ...gameConfig, ...data };
    updateObjectiveDisplay(gameConfig.object_shapes, gameConfig.shape_ascii, gameConfig.num_objects);

    // Show the grid
    document.querySelector('.grid').style.display = 'block';

    if (myRole === 'spotter') {
        initializeRadar();
    }

    resetGameState();
    createGrid();
    updateLevelDisplay(gameConfig.current_level);
    updatePlayerRoleView()
    enableClicks();
}

function handleClickResult(data) {
    console.log('Click result:', data);
    updateGridFromState(data.grid_view);
    remainingClicks = data.remaining_clicks;
    remainingTime = data.remaining_time;
    updateCounters();

    if (data.destroyed_object_size > 0) {
        console.log('Object destroyed! Creating particle effect...');
        // Get the grid cell position
        const cell = document.querySelector(`[data-x="${data.x}"][data-y="${data.y}"]`);
        console.log('Cell found:', cell);
        if (cell) {
            const rect = cell.getBoundingClientRect();
            console.log('Cell position:', rect);
            
            // Create the particle effect at the cell's position
            createParticleEffect(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                5,  // time bonus
                data.destroyed_object_size  // clicks bonus
            );
        }
    }


    if (myRole === 'shooter' && isFirstClick) {
        startTimer();
        isFirstClick = false;
    }

    

    if (data.all_destroyed) {
        clearInterval(timerInterval);
        disableClicks();
        showEndTurnModal("Level Complete!", 'Next Level');
    } else if (remainingClicks === 0) {
        endGame('no_clicks');
    } else if (remainingTime <= 0) {
        endGame('time_up');
    }
}


function handleNextTurn(data) {
    console.log('Next turn started:', data);
    
    // Remove any existing modal
    handleModalRemove();
    
    gameConfig = { ...gameConfig, ...data };
    updateObjectiveDisplay(gameConfig.object_shapes, gameConfig.shape_ascii, gameConfig.num_objects);
    myRole = data.your_role;
    document.getElementById('player-role').textContent = myRole;
    updateGameStatus(`Next turn! Your role: ${myRole}`, 'success');
    
    if (data.current_level > gameConfig.current_level) {
        updateGameStatus(`Level ${data.current_level} started!`, 'success');
    }

    createGrid();
    updateGridFromState(data.grid_view);
    updateStatsDisplay(data.player_stats);
    resetGameState();
    updateLevelDisplay(data.current_level);
    updatePlayerRoleView();
    enableClicks();
}

function handleLevelCompleted(data) {
    console.log('Level completed:', data);
    gameConfig = { ...gameConfig, ...data };
    myRole = data.your_role;
    document.getElementById('player-role').textContent = myRole;
    updateGameStatus(`Level Completed - all objects destroyed!`, 'success');
    updateGridFromState(data.grid_view);
    updateStatsDisplay(data.player_stats);
    resetGameState();
    createGrid();
    updateLevelDisplay(data.current_level);
}
    

function handleGameCompleted(data) {
    console.log('Game completed:', data);
    updateGameStatus(data.message, 'success');
    disableClicks();
    showNextButton();
}

function handleGameConfig(config) {
    console.log('Received game config:', config);
    gameConfig = { ...gameConfig, ...config };
    updateObjectiveDisplay(config.object_shapes, config.shape_ascii, config.num_objects);
    createGrid();
    updateLevelDisplay(config.current_level);
}

function resetGameState() {
    isFirstClick = true;
    clearInterval(timerInterval);
    remainingClicks = gameConfig.click_limit;
    remainingTime = gameConfig.time_limit;
    updateCounters();
    enableClicks();
}

function createGrid() {
    const grid = document.getElementById('game-grid');
    grid.innerHTML = '';
    for (let y = 0; y < gameConfig.grid_size; y++) {
        for (let x = 0; x < gameConfig.grid_size; x++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.addEventListener('click', handleCellClick);
            cell.textContent = `${x},${y}`;
            grid.appendChild(cell);
        }
    }
    // Remove the fixed size and let CSS handle the grid layout
    grid.style.gridTemplateColumns = `repeat(${gameConfig.grid_size}, 1fr)`;
}

let radarCanvas, radarContext, radarInterval;
const RADAR_SIZE = 200;
const SWEEP_INTERVAL = 10000; // 10 seconds for a full sweep

function initializeRadar() {
    if (myRole === 'spotter') {
        radarCanvas = document.getElementById('radar-display');
        radarCanvas.style.display = 'block'; // Show radar for spotter
        radarContext = radarCanvas.getContext('2d');
        startRadarSweep();
    }
}

function startRadarSweep() {
    let angle = 0;
    radarInterval = setInterval(() => {
        drawRadarSweep(angle);
        angle = (angle + 2) % 360;
    }, 50); // Update every 50ms for smooth animation
}

function drawRadarSweep(angle) {
    radarContext.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);
    
    // Draw radar background
    radarContext.beginPath();
    radarContext.arc(RADAR_SIZE/2, RADAR_SIZE/2, RADAR_SIZE/2, 0, Math.PI * 2);
    radarContext.fillStyle = 'rgba(0, 20, 0, 0.7)';
    radarContext.fill();

    // Draw sweep line
    radarContext.beginPath();
    radarContext.moveTo(RADAR_SIZE/2, RADAR_SIZE/2);
    radarContext.lineTo(
        RADAR_SIZE/2 + Math.cos(angle * Math.PI / 180) * RADAR_SIZE/2,
        RADAR_SIZE/2 + Math.sin(angle * Math.PI / 180) * RADAR_SIZE/2
    );
    radarContext.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    radarContext.stroke();

    // We'll add object detection here in the next step
}

function stopRadarSweep() {
    clearInterval(radarInterval);
}


function handleCellClick(event) {
    if (myRole !== 'shooter') {
        console.log('Click ignored:', myRole);
        return;
    }

    const cell = event.target;
    if (cell.classList.contains('hit') || cell.classList.contains('miss')) {
        console.log('Cell already clicked');
        return;
    }

    const x = parseInt(event.target.dataset.x);
    const y = parseInt(event.target.dataset.y);
    console.log(`Clicked cell: (${x}, ${y})`);
    
    if (isFirstClick) {
        startTimer();
        isFirstClick = false;
    }
    
    socket.emit('click', { game_id: gameId, x: x, y: y });
}


function checkTimeUp() {
    if (remainingTime <= 0) {
        endGame('time_up');
    }
}

function checkRemainingClicks() {
    if (remainingClicks === 0) {
        endGame('no_clicks');
    }
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        remainingTime = Math.max(0, remainingTime - 0.1);
        updateCounters();
    }, 100);
}


function endGame(reason) {
    clearInterval(timerInterval);
    disableClicks();

    let message;
    if (reason === 'time_up') {
        message = "Time's up!";
    } else if (reason === 'no_clicks') {
        message = "No more clicks remaining!";
    }

    showEndTurnModal(message, 'Next Turn');
}


function updateGridFromState(gridView) {
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach((cell, index) => {
        const x = index % gameConfig.grid_size;
        const y = Math.floor(index / gameConfig.grid_size);
        cell.className = 'grid-cell';
        if (myRole === 'shooter') {
            if (gridView[y][x] === 1) cell.classList.add('attempted');
        } else if (myRole === 'spotter') {
            if (gridView[y][x] === 2) cell.classList.add('hit');
            else if (gridView[y][x] === 3) cell.classList.add('miss');
        }
    });
}

function updateGameStatus(message, type = 'info') {
    const statusElement = document.getElementById('game-status-message');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-${type}`;
    } else {
        console.error('Game status message element not found');
    }
}

function updateCounters() {
    const remainingClicksElement = document.getElementById('remaining-clicks');
    const remainingTimeElement = document.getElementById('remaining-time');
    if (remainingClicksElement && remainingTimeElement) {
        remainingClicksElement.textContent = remainingClicks;
        remainingTimeElement.textContent = remainingTime.toFixed(1);
    } else {
        console.error('Counter elements not found');
    }
}

function updateLevelDisplay(level) {
    const levelDisplay = document.getElementById('current-level');
    if (levelDisplay) {
        levelDisplay.textContent = `Level: ${level}`;
    } else {
        console.error('Level display element not found');
    }
}

function updateObjectiveDisplay(shapes, shapeAscii, numObjects) {
    const objectiveElement = document.getElementById('objective-display');
    if (objectiveElement) {
        document.getElementById('num-objects').textContent = numObjects;

        const shapeDisplay = document.getElementById('shape-display');
        shapeDisplay.innerHTML = '';

        shapes.forEach(shape => {
            const shapeItem = document.createElement('div');
            shapeItem.className = 'shape-item';
            shapeItem.innerHTML = `
                <div>${shape}</div>
                <pre>${shapeAscii[shape]}</pre>
            `;
            shapeDisplay.appendChild(shapeItem);
        });
    }
}

function updateStatsDisplay(stats) {
    document.getElementById('turns-played').textContent = stats.turns_played || 0;
    document.getElementById('total-hits').textContent = stats.total_hits || 0;
    document.getElementById('total-misses').textContent = stats.total_misses || 0;
    document.getElementById('total-clicks').textContent = stats.total_clicks || 0;
    const playerStatsElement = document.querySelector('.player-stats');
    if (playerStatsElement) {
        playerStatsElement.style.display = 'block';
    }
}

function disableClicks() {
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.removeEventListener('click', handleCellClick);
    });
}

function enableClicks() {
    if (myRole === 'shooter') {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.addEventListener('click', handleCellClick);
        });
    }
}

// modal for next turn

function showEndTurnModal(message, nextTurnText) {
    const modal = document.createElement('div');
    modal.className = 'end-turn-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${message}</h2>
            ${myRole === 'shooter' ? `<button id="next-turn-button">${nextTurnText}</button>` : '<p>Waiting for shooter to start next turn...</p>'}
        </div>
    `;
    document.body.appendChild(modal);

    if (myRole === 'shooter') {
        document.getElementById('next-turn-button').addEventListener('click', () => {
            modal.remove();
            socket.emit('next_turn', { game_id: gameId, reason: message === 'Level Complete!' ? 'level_completed' : 'turn_ended' });
        });
    }
}