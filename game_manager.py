from player import Player
from grid import Grid
from config import GameConfig
import time
import random
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class GameManager:
    def __init__(self) -> None:
        self.players = {}
        self.waiting_player = None
        self.games = {}
        self.current_level = 1  # Initialize with level 1

        # Validate the configuration when the GameManager is initialized
        try:
            GameConfig.validate_config()
        except ValueError as e:
            logger.error(f"Configuration error: {e}")
            raise

    def add_player(self, name, session_id):
        if self.waiting_player:
            new_player = Player(name, session_id, 'spotter')
            self.players[session_id] = new_player
            paired_player = self.waiting_player
            self.waiting_player = None
            
            # Set teammates
            new_player.set_teammate(paired_player)
            paired_player.set_teammate(new_player)
            
            game_id = self.create_game(paired_player, new_player)
            return new_player, paired_player, game_id
        else:
            new_player = Player(name, session_id, 'shooter')
            self.waiting_player = new_player
            self.players[session_id] = new_player
            return new_player, None, None

    def create_game(self, player1, player2):
        game_id = f"{player1.id}_{player2.id}"
        level_config = GameConfig.get_level_config(self.current_level)
        logger.info(f"Loading level {self.current_level}")
        print(f"Loading level {self.current_level}")  # Console output for level loading

        self.games[game_id] = {
            'grid': Grid(level_config['grid_size'], level_config['num_objects'], level_config['object_shapes']),
            'players': [player1, player2],
            'clicks': 0,
            'start_time': None,
            'shooter_view': [[0 for _ in range(level_config['grid_size'])] for _ in range(level_config['grid_size'])],
            'spotter_view': [[0 for _ in range(level_config['grid_size'])] for _ in range(level_config['grid_size'])],
            'consecutive_hits': 0,
            'level': self.current_level,
            'time_limit': level_config['time_limit'],
            'click_limit': level_config['click_limit']
        }
        return game_id

    def set_level(self, level):
        if 1 <= level <= len(GameConfig.LEVELS):
            self.current_level = level
            logger.info(f"Current level set to {self.current_level}")
            print(f"Current level set to {self.current_level}")  # Console output for level setting
        else:
            raise ValueError(f"Invalid level: {level}. Must be between 1 and {len(GameConfig.LEVELS)}")
    


    def click(self, game_id, x, y):
        game = self.games[game_id]
        
        
        # Set start time on first click
        if game['start_time'] is None:
            game['start_time'] = time.time()

        # Check if the cell has already been clicked
        if game['shooter_view'][y][x] != 0 or game['spotter_view'][y][x] != 0:
            return False, game['start_time'], False  # Cell already clicked, no change


        result = game['grid'].click(x, y)
        game['clicks'] += 1
        
        game['shooter_view'][y][x] = 1  # 1 for attempted
        game['spotter_view'][y][x] = 2 if result else 3  # 2 for hit, 3 for miss

        # Update consecutive hits and adjust time if necessary
        if result:
            game['consecutive_hits'] += 1
            if game['consecutive_hits'] == 2:
                game['start_time'] += 1  # Add 1 second to the timer
                game['consecutive_hits'] = 0  # Reset consecutive hits
        else:
            game['consecutive_hits'] = 0  # Reset consecutive hits on miss
        
        # Check if level is completed
        level_completed = game['grid'].all_objects_destroyed() if result else False

        return result, game['start_time'], level_completed

    def advance_to_next_level(self, game_id):
        self.current_level += 1
        if self.current_level <= len(GameConfig.LEVELS):
            self.start_turn(game_id)
            return True
        else:
            # Game completed
            self.current_level = 1  # Reset to first level
            return False

    def start_turn(self, game_id):
        game = self.games[game_id]
        level_config = GameConfig.get_level_config(self.current_level)
        game['clicks'] = 0
        game['start_time'] = None 
        game['grid'] = Grid(level_config['grid_size'], level_config['num_objects'], level_config['object_shapes'])
        game['shooter_view'] = [[0 for _ in range(level_config['grid_size'])] for _ in range(level_config['grid_size'])]
        game['spotter_view'] = [[0 for _ in range(level_config['grid_size'])] for _ in range(level_config['grid_size'])]
        game['consecutive_hits'] = 0
 

 
    def get_player_view(self, game_id, role):
        game = self.games[game_id]
        return game['shooter_view'] if role == 'shooter' else game['spotter_view']

    def remove_player(self, session_id):
        if session_id in self.players:
            player = self.players[session_id]
            if player == self.waiting_player:
                self.waiting_player = None
            del self.players[session_id]
            # End any active game this player is in
            for game_id, game in list(self.games.items()):
                if player in game['players']:
                    self.end_game(game_id)

    def end_game(self, game_id):
        if game_id in self.games:
            del self.games[game_id]