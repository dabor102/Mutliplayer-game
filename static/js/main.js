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

    resetGameState();
    createGrid();
    updateLevelDisplay(gameConfig.current_level);
    enableClicks();
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

    if (data.all_destroyed) {
        clearInterval(timerInterval);
        disableClicks();
        updateGameStatus("All objects destroyed! Click 'Next Level' to advance.", 'success');
        showNextButton('Next Level');
    } else {
        checkRemainingClicks();
        checkTimeUp();
    }
}


function handleNextTurn(data) {
    console.log('Next turn started:', data);
    gameConfig = { ...gameConfig, ...data };
    updateObjectiveDisplay(gameConfig.object_shapes, gameConfig.shape_ascii, gameConfig.num_objects);
    myRole = data.your_role;
    document.getElementById('player-role').textContent = myRole;
    updateGameStatus(`Next turn! Roles swapped`, 'success');
    
    // Check if the level has changed, indicating level completion
    if (data.current_level > gameConfig.current_level) {
        statusMessage = `Level Completed! ${statusMessage}`;
    }

    updateGridFromState(data.grid_view);
    updateStatsDisplay(data.player_stats);
    resetGameState();
    createGrid();
    updateLevelDisplay(data.current_level);
    enableClicks();
    const nextButton = document.getElementById('next-button');
    nextButton.style.display = 'none';
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
        message = "Time's up! Click 'Next Turn' to continue.";
    } else if (reason === 'no_clicks') {
        message = "No more clicks remaining! Click 'Next Turn' to continue.";
    }

    updateGameStatus(message, 'warning');
    showNextButton('Next Turn');
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

function showNextButton(text) {
    const nextButton = document.getElementById('next-button');
    nextButton.textContent = text;
    nextButton.style.display = 'block';
    nextButton.onclick = () => {
        socket.emit('next_turn', { game_id: gameId, reason: text === 'Next Level' ? 'level_completed' : 'turn_ended' });        
    };
}