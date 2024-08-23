const socket = io();
let gameId, myRole;
let gameConfig = {};
let remainingClicks, remainingTime;
let timerInterval;
let isFirstClick = true;
let restartButton;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    setupEventListeners();
    requestGameConfig();
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

    socket.on('login_response', handleLoginResponse);
    socket.on('waiting_message', handleWaitingMessage);
    socket.on('game_start', handleGameStart);
    socket.on('click_result', handleClickResult);
    socket.on('turn_ended', handleTurnEnded);
    socket.on('game_restarted', handleGameRestarted);
    socket.on('level_completed', handleLevelCompleted);
    socket.on('game_completed', handleGameCompleted);
    socket.on('game_config', handleGameConfig);
}

function requestGameConfig() {
    socket.emit('get_game_config');
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

function handleLoginResponse(data) {
    console.log('Received login response:', data);
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
    document.getElementById('player-name-display').textContent = document.getElementById('player-name').value;
    document.getElementById('player-role').textContent = data.role;
    myRole = data.role;
    updateGameStatus('Waiting for game to start...', 'info');
}

function handleWaitingMessage(data) {
    updateGameStatus(data.message, 'info');
}

function handleGameStart(data) {
    console.log('Game started:', data);
    gameId = data.game_id;
    myRole = data.your_role;
    document.getElementById('player-role').textContent = myRole;
    updateGameStatus(`Game started! You are the ${myRole}. Your teammate (${data.teammate_role}) is ${data.teammate}.`, 'success');
    
    gameConfig = { ...gameConfig, ...data };
    
    resetGameState();
    createGrid();
    updateLevelDisplay(gameConfig.current_level);
}

function handleClickResult(data) {
    console.log('Click result:', data);
    updateGridFromState(data.grid_view);
    remainingClicks = data.remaining_clicks;
    remainingTime = data.remaining_time;
    updateCounters();
    
    if (myRole === 'spotter' && isFirstClick) {
        startTimer();
        isFirstClick = false;
    }
}

function handleTurnEnded(data) {
    updateGameStatus(data.message, 'warning');
    clearInterval(timerInterval);
    showRestartButton();
}

function handleGameRestarted(data) {
    console.log('Game restarted:', data);
    gameConfig = { ...gameConfig, ...data };
    myRole = data.your_role;
    document.getElementById('player-role').textContent = myRole;
    updateGameStatus(`Game restarted! You are now the ${myRole}. Your teammate (${data.teammate_role}) is ${data.teammate}.`, 'success');
    updateGridFromState(data.grid_view);
    updateStatsDisplay(data.player_stats);
    resetGameState();
    createGrid();
    updateLevelDisplay(data.current_level);
    hideRestartButton();
}

function handleLevelCompleted(data) {
    console.log('Level completed:', data);
    updateGameStatus(data.message, 'success');
    
    gameConfig = { ...gameConfig, ...data };
    
    resetGameState();
    createGrid();
    updateLevelDisplay(data.next_level);
    
    setTimeout(() => {
        updateGameStatus("New level started! Get ready to play!", 'info');
    }, 3000);
}

function handleGameCompleted(data) {
    console.log('Game completed:', data);
    updateGameStatus(data.message, 'success');
    disableClicks();
    showRestartButton();
}

function handleGameConfig(config) {
    console.log('Received game config:', config);
    gameConfig = { ...gameConfig, ...config };
    createGrid();
    updateLevelDisplay(config.current_level);
}

function resetGameState() {
    isFirstClick = true;
    clearInterval(timerInterval);
    remainingClicks = gameConfig.click_limit;
    remainingTime = gameConfig.time_limit;
    updateCounters();
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
    grid.style.gridTemplateColumns = `repeat(${gameConfig.grid_size}, 30px)`;
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

function updateLevelDisplay(level) {
    const levelDisplay = document.getElementById('current-level');
    if (levelDisplay) {
        levelDisplay.textContent = `Level: ${level}`;
    } else {
        console.error('Level display element not found');
    }
}

function updateStatsDisplay(stats) {
    document.getElementById('turns-played').textContent = stats.turns_played || 0;
    document.getElementById('total-hits').textContent = stats.total_hits || 0;
    document.getElementById('total-misses').textContent = stats.total_misses || 0;
    document.getElementById('total-clicks').textContent = stats.total_clicks || 0;
    document.getElementById('player-stats').style.display = 'block';
}

function disableClicks() {
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.removeEventListener('click', handleCellClick);
    });
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

function handleRestartGame() {
    console.log('Requesting game restart');
    socket.emit('restart_game', { game_id: gameId });
    updateGameStatus('Requesting game restart...', 'info');
}