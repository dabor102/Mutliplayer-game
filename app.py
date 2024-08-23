from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room
from game_manager import GameManager
from config import GameConfig
import logging
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'team_battle'
socketio = SocketIO(app, async_mode='gevent', logger=True, engineio_logger=True)

game_manager = GameManager()

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    logger.debug("Serving index page")
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    logger.debug(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    logger.debug(f"Client disconnected: {request.sid}")
    game_manager.remove_player(request.sid)

@socketio.on('login')
def handle_login(data):
    logger.info(f"Login attempt: {data['name']} (SID: {request.sid})")
    new_player, paired_player, game_id = game_manager.add_player(data['name'], request.sid)
    join_room(request.sid)
    emit('login_response', {'role': new_player.role, 'id': new_player.id})

    if paired_player:
        logger.info(f"Players paired: {new_player.name} and {paired_player.name}")
        game_manager.start_turn(game_id)
        level_config = GameConfig.get_level_config(game_manager.current_level)
        for p in [new_player, paired_player]:
            emit('game_start', {
                'teammate': p.teammate.name,
                'teammate_role': p.teammate.role,
                'your_role': p.role,
                'game_id': game_id,
                'grid_size': level_config['grid_size'],
                'time_limit': level_config['time_limit'],
                'click_limit': level_config['click_limit'],
                'current_level': game_manager.current_level
            }, room=p.id)
    else:
        emit('waiting_message', {'message': 'Waiting for a teammate...'}, room=request.sid)

@socketio.on('click')
def handle_click(data):
    logger.debug(f"Click event received: {data}")
    game_id = data['game_id']
    x, y = data['x'], data['y']
    game = game_manager.games[game_id]
    result, updated_start_time, level_completed = game_manager.click(game_id, x, y)
    
    level_config = GameConfig.get_level_config(game_manager.current_level)
    remaining_clicks = max(0, level_config['click_limit'] - game['clicks'])
    remaining_time = max(0, level_config['time_limit'] - (time.time() - updated_start_time))

    click_result = {
        'x': x,
        'y': y,
        'hit': result,
        'remaining_clicks': remaining_clicks,
        'remaining_time': round(remaining_time, 1)
    }
    
    for player in game['players']:
        emit('click_result', {
            **click_result,
            'grid_view': game['shooter_view'] if player.role == 'shooter' else game['spotter_view']
        }, room=player.id)

    # Update the clicking player's (shooter's) stats
    player = game_manager.players[request.sid]
    player.update_stats(result)
    
    # Include updated stats in the click_result
    click_result['player_stats'] = player.get_stats()

    logger.debug(f"Click result sent: {click_result}")

    # Check if the turn should end
    if remaining_clicks == 0 or remaining_time <= 0:
        emit('turn_ended', {'message': 'Turn ended. Waiting for game to restart.'}, room=game_id)

   # Check if the level is completed
    if level_completed:
        if game_manager.advance_to_next_level(game_id):
            new_level_config = GameConfig.get_level_config(game_manager.current_level)
            emit('level_completed', {
                'message': f'Level {game_manager.current_level - 1} completed! Moving to level {game_manager.current_level}.',
                'next_level': game_manager.current_level,
                'grid_size': new_level_config['grid_size'],
                'time_limit': new_level_config['time_limit'],
                'click_limit': new_level_config['click_limit']
            }, room=game_id)
        else:
            emit('game_completed', {'message': 'Congratulations! You\'ve completed all levels!'}, room=game_id)
    elif remaining_clicks == 0 or remaining_time <= 0:
        emit('turn_ended', {'message': 'Turn ended. Waiting for game to restart.'}, room=game_id)


@socketio.on('get_game_config')
def handle_get_game_config():
    level_config = GameConfig.get_level_config(game_manager.current_level)
    emit('game_config', {
        'grid_size': level_config['grid_size'],
        'time_limit': level_config['time_limit'],
        'click_limit': level_config['click_limit'],
        'current_level': game_manager.current_level
    })

@socketio.on('restart_game')
def handle_restart_game(data):
    logger.info(f"Restart game request received: {data}")
    game_id = data['game_id']
    game = game_manager.games.get(game_id)
    
    if not game:
        logger.error(f"Game not found: {game_id}")
        return

    # Increment turns played for both players
    for player in game['players']:
        player.increment_turns()

    # Swap roles
    game['players'][0].role, game['players'][1].role = game['players'][1].role, game['players'][0].role
    
    # Reset game state
    game_manager.start_turn(game_id)
    
    level_config = GameConfig.get_level_config(game_manager.current_level)
    
    for player in game['players']:
        emit('game_restarted', {
            'game_id': game_id,
            'your_role': player.role,
            'teammate': player.teammate.name,
            'teammate_role': player.teammate.role,
            'grid_view': game['shooter_view'] if player.role == 'shooter' else game['spotter_view'],
            'player_stats': player.get_stats(),
            'grid_size': level_config['grid_size'],
            'time_limit': level_config['time_limit'],
            'click_limit': level_config['click_limit'],
            'current_level': game_manager.current_level
        }, room=player.id)
    
    logger.info(f"Game restarted: {game_id}")

if __name__ == '__main__':
    logger.debug("Starting SocketIO app")
    socketio.run(app, debug=True)