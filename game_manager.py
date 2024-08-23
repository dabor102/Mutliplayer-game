from player import Player
from grid import Grid
from config import GameConfig
import time
import random

class GameManager:
    def __init__(self):
        self.players = {}
        self.waiting_player = None
        self.games = {}

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
        self.games[game_id] = {
            'grid': Grid(GameConfig.GRID_SIZE, GameConfig.NUM_OBJECTS, GameConfig.OBJECT_SIZE),
            'players': [player1, player2],
            'clicks': 0,
            'start_time': None,
            'shooter_view': [[0 for _ in range(GameConfig.GRID_SIZE)] for _ in range(GameConfig.GRID_SIZE)],
            'spotter_view': [[0 for _ in range(GameConfig.GRID_SIZE)] for _ in range(GameConfig.GRID_SIZE)],
            'consecutive_hits': 0  # New field to track consecutive hits
        }
        return game_id

    def click(self, game_id, x, y):
        game = self.games[game_id]
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
        
        return result, game['start_time']

    def start_turn(self, game_id):
        game = self.games[game_id]
        game['clicks'] = 0
        game['start_time'] = time.time()
        game['grid'] = Grid(GameConfig.GRID_SIZE, GameConfig.NUM_OBJECTS, GameConfig.OBJECT_SIZE)
        game['shooter_view'] = [[0 for _ in range(GameConfig.GRID_SIZE)] for _ in range(GameConfig.GRID_SIZE)]
        game['spotter_view'] = [[0 for _ in range(GameConfig.GRID_SIZE)] for _ in range(GameConfig.GRID_SIZE)]
        game['consecutive_hits'] = 0  # Reset consecutive hits at the start of each turn
 

 
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