class GameConfig:
    GRID_SIZE = 15
    TIME_LIMIT = 15  # seconds
    SHOOT_LIMIT = 15
    NUM_OBJECTS = 3
    OBJECT_SIZE = 3
    ROUNDS = 4

    @classmethod
    def update(cls, **kwargs):
        for key, value in kwargs.items():
            if hasattr(cls, key):
                setattr(cls, key, value)
            else:
                raise AttributeError(f"GameConfig has no attribute '{key}'")