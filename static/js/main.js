const socket = io();
let gameId, myRole;
let gameConfig = {};
let remainingClicks, remainingTime;
let timerInterval;
let isFirstClick = true;
let restartButton;

console.log('main.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    setupEventListeners();
});

function setupEventListeners() {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    } else {
        console.error('Login button not found');
    }
    
    restartButton = document.getElementById('restart-button');
    if (restartButton) {
        restartButton.addEventListener('click', handleRestartGame);
    } else {
        console.error('Restart button not found');
    }
}

function handleLogin() {
    const playerName = document.getElementById('player-name').value;
    if (playerName) {
        console.log('Sending login event:', playerName);
        socket.emit('login', { name: playerName });
    } else {
        console.error('Player name is empty');
    }
}

function handleRestartGame() {
    console.log('Requesting game restart');
    socket.emit('restart_game', { game_id: gameId });
    updateGameStatus('Requesting game restart...', 'info');
}

function resetGameState() {
    isFirstClick = true;
    clearInterval(timerInterval);
    remainingClicks = gameConfig.SHOOT_LIMIT;
    remainingTime = gameConfig.TIME_LIMIT;
    updateCounters();
}

function initializeGameMechanics() {
    console.log('Initializing game mechanics for role:', myRole);
    resetGameState();
    if (myRole === 'shooter') {
        updateGameStatus("Your turn to shoot!", 'info');
    } else {
        updateGameStatus("Wait for the shooter to make a move.", 'info');
    }
}

function createGrid() {
    if (!gameConfig.GRID_SIZE) {
        console.error('Grid size not set, cannot create grid');
        return;
    }
    const grid = document.getElementById('game-grid');
    if (!grid) {
        console.error('Game grid element not found');
        return;
    }
    grid.innerHTML = '';
    for (let y = 0; y < gameConfig.GRID_SIZE; y++) {
        for (let x = 0; x < gameConfig.GRID_SIZE; x++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.addEventListener('click', handleCellClick);
            cell.textContent = `${x},${y}`;
            grid.appendChild(cell);
        }
    }
    grid.style.gridTemplateColumns = `repeat(${gameConfig.GRID_SIZE}, 30px)`;
    console.log('Grid created with', gameConfig.GRID_SIZE * gameConfig.GRID_SIZE, 'cells');
}

function handleCellClick(event) {
    if (myRole !== 'shooter' || remainingClicks === 0 || remainingTime <= 0) {
        console.log('Click ignored:', myRole, remainingClicks, remainingTime);
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
    // Don't update remainingClicks here, wait for server response
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        remainingTime = Math.max(0, remainingTime - 0.1);
        updateCounters();
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            updateGameStatus("Time's up! Waiting for game to restart.", 'warning');
            showRestartButton();
        }
    }, 100);
}

function updateGameStatus(message, type = 'info') {
    console.log('Updating game status:', message);
    const statusElement = document.getElementById('game-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-${type}`;
    } else {
        console.error('Game status element not found');
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

function updateGridFromState(gridView) {
    const grid = document.getElementById('game-grid');
    if (!grid) {
        console.error('Game grid element not found');
        return;
    }
    for (let y = 0; y < gameConfig.GRID_SIZE; y++) {
        for (let x = 0; x < gameConfig.GRID_SIZE; x++) {
            const cell = grid.querySelector(`[data-x="${x}"][data-y="${y}"]`);
            if (cell) {
                cell.className = 'grid-cell';
                if (myRole === 'shooter') {
                    if (gridView[y][x] === 1) cell.classList.add('attempted');
                } else if (myRole === 'spotter') {
                    if (gridView[y][x] === 2) cell.classList.add('hit');
                    else if (gridView[y][x] === 3) cell.classList.add('miss');
                }
            }
        }
    }
    console.log('Grid updated for role:', myRole);
}

    // Function to update the stats display
    function updateStatsDisplay(stats) {
        document.getElementById('turns-played').textContent = stats.turns_played || 0;
        document.getElementById('total-hits').textContent = stats.total_hits || 0;
        document.getElementById('total-misses').textContent = stats.total_misses || 0;
        document.getElementById('total-clicks').textContent = stats.total_clicks || 0;
        document.getElementById('player-stats').style.display = 'block';
    }


function showRestartButton() {
    if (restartButton) {
        restartButton.style.display = 'block';
    }
}

function hideRestartButton() {
    if (restartButton) {
        restartButton.style.display = 'none';
    }
}

// Socket event listeners

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('get_game_config');
});

socket.on('game_config', (config) => {
    console.log('Received game config:', config);
    gameConfig = {
        GRID_SIZE: config.grid_size,
        TIME_LIMIT: config.time_limit,
        SHOOT_LIMIT: config.shoot_limit,
        ROUNDS: config.rounds
    };
    createGrid();
});

socket.on('login_response', (data) => {
    console.log('Received login response:', data);
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    document.getElementById('player-name-display').textContent = document.getElementById('player-name').value;
    document.getElementById('player-role').textContent = data.role;
    myRole = data.role;
    updateGameStatus('Waiting for game to start...', 'info');
});

socket.on('waiting_message', (data) => {
    updateGameStatus(data.message, 'info');
});

socket.on('game_start', (data) => {
    console.log('Game started:', data);
    gameId = data.game_id;
    myRole = data.your_role;
    document.getElementById('player-role').textContent = myRole;
    document.getElementById('player-stats').style.display = 'none';
    updateGameStatus(`Game started! You are the ${myRole}. Your teammate (${data.teammate_role}) is ${data.teammate}.`, 'success');
    initializeGameMechanics();
});

socket.on('game_restarted', (data) => {
    console.log('Game restarted:', data);
    gameId = data.game_id;
    myRole = data.your_role;
    document.getElementById('player-role').textContent = myRole;
    document.getElementById('player-stats').style.display = 'none';
    updateGameStatus(`Game restarted! You are now the ${myRole}. Your teammate (${data.teammate_role}) is ${data.teammate}.`, 'success');
    updateGridFromState(data.grid_view);
    // Update stats display
    if (data.player_stats) {
        updateStatsDisplay(data.player_stats);
    }
    initializeGameMechanics();
    hideRestartButton();

    
});

socket.on('click_result', (data) => {
    console.log('Click result:', data);
    updateGridFromState(data.grid_view);
    remainingClicks = data.remaining_clicks;
    remainingTime = data.remaining_time;
    updateCounters();
    
    if (myRole === 'spotter' && isFirstClick) {
        startTimer();
        isFirstClick = false;
    }

    
    // *let message;
    // if (myRole === 'shooter') {
    //    message = `You clicked (${data.x}, ${data.y}). Waiting for spotter feedback.`;
    //} else {
    //    message = data.hit ? `Hit at (${data.x}, ${data.y})!` : `Miss at (${data.x}, ${data.y}).`;
    //}
    // 
    // updateGameStatus(data.hit ? 'success' : 'info'); // include message/ define in *let message;
    
    if (remainingClicks === 0 || remainingTime <= 0) {
        clearInterval(timerInterval);
        updateGameStatus("Turn ended. Waiting for game to restart.", 'warning');
        showRestartButton();
    }
});

socket.on('clear_grid', function() {
    // Clear all cell classes
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.className = 'grid-cell';
    });
    
    // Reset any other UI elements that show results
    document.getElementById('remaining-clicks').textContent = '15';
    document.getElementById('remaining-time').textContent = '15.0';
    // Add any other UI resets here
});