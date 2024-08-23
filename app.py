from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room
from game_manager import GameManager
from config import GameConfig
from grid import Grid
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
    logger.debug(f"Login attempt: {data['name']} (SID: {request.sid})")
    new_player, paired_player, game_id = game_manager.add_player(data['name'], request.sid)
    join_room(request.sid)
    emit('login_response', {'role': new_player.role, 'id': new_player.id})

    if paired_player:
        logger.debug(f"Players paired: {new_player.name} and {paired_player.name}")
        game_manager.start_turn(game_id)
        for p in [new_player, paired_player]:
            emit('game_start', {
                'teammate': p.teammate.name,
                'teammate_role': p.teammate.role,
                'your_role': p.role,
                'game_id': game_id
            }, room=p.id)
    else:
        emit('waiting_message', {'message': 'Waiting for a teammate...'}, room=request.sid)

@socketio.on('click')
def handle_click(data):
    logger.debug(f"Click event received: {data}")
    game_id = data['game_id']
    x, y = data['x'], data['y']
    game = game_manager.games[game_id]
    result, updated_start_time = game_manager.click(game_id, x, y)
    
    remaining_clicks = GameConfig.SHOOT_LIMIT - game['clicks']
    remaining_time = max(0, GameConfig.TIME_LIMIT - (time.time() - updated_start_time))

    
    click_result = {
        'x': x,
        'y': y,
        'hit': result,
        'remaining_clicks': remaining_clicks,
        'remaining_time': round(remaining_time, 1)
    }
    
    game['shooter_view'][y][x] = 1  # 1 for attempted
    game['spotter_view'][y][x] = 2 if result else 3  # 2 for hit, 3 for miss

   
        
    
    for player in game['players']:
        emit('click_result', {
            **click_result,
            'grid_view': game['shooter_view'] if player.role == 'shooter' else game['spotter_view']
        }, room=player.id)

    # Check if time bonus was awarded
    if updated_start_time != game['start_time']:
        bonus_time = updated_start_time - game['start_time']
        emit('time_bonus', {'bonus_time': bonus_time}, room=game_id)
        logger.debug(f"Time bonus awarded: {bonus_time} seconds")

   # Update the clicking player's (shooter's) stats
    player = game_manager.players[request.sid]
    player.update_stats(result)
    
    # Include updated stats in the click_result
    click_result['player_stats'] = player.get_stats()

    logger.debug(f"Stats updated for player {player.name}: {player.get_stats()}")
    
    logger.debug(f"Click result sent: {click_result}")




@socketio.on('get_game_config')
def handle_get_game_config():
    emit('game_config', {
        'grid_size': GameConfig.GRID_SIZE,
        'time_limit': GameConfig.TIME_LIMIT,
        'shoot_limit': GameConfig.SHOOT_LIMIT,
        #'rounds': GameConfig.ROUNDS
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
    game['grid'] = Grid(GameConfig.GRID_SIZE, GameConfig.NUM_OBJECTS, GameConfig.OBJECT_SIZE)
    game['clicks'] = 0
    game['start_time'] = time.time()
    game['shooter_view'] = [[0 for _ in range(GameConfig.GRID_SIZE)] for _ in range(GameConfig.GRID_SIZE)]
    game['spotter_view'] = [[0 for _ in range(GameConfig.GRID_SIZE)] for _ in range(GameConfig.GRID_SIZE)]
    
    for player in game['players']:
        emit('game_restarted', {
            'game_id': game_id,
            'your_role': player.role,
            'teammate': player.teammate.name,
            'teammate_role': player.teammate.role,
            'grid_view': game['shooter_view'] if player.role == 'shooter' else game['spotter_view'],
            'player_stats': player.get_stats()  # Include player stats here
        }, room=player.id)
    
    logger.info(f"Game restarted: {game_id}")

if __name__ == '__main__':
    logger.debug("Starting SocketIO app")
    socketio.run(app, debug=True)