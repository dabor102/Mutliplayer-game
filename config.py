class GameConfig:
    OBJECT_SHAPES = {
        'single': [(0, 0)],
        'T_shape': [(0, 0), (0, 1), (0, 2), (1, 1)],
        'square_3x3': [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1), (2, 2)],
        'X_shape': [(0, 1), (1, 0), (1, 2), (2, 1), (1, 1)],
    }

    SHAPE_ASCII = {
        'single': '■',
        'T_shape': ' ▄▄▄\n  █  ',
        'square_3x3': '███\n███\n███',
        'X_shape': '█ █\n █ \n█ █'
    }


    LEVELS = [
        {
            "level": 1,
            "grid_size": 10,
            "num_objects": 1,
            "object_shapes": ['square_3x3'],
            "time_limit": 20,
            "click_limit": 20
        },
        {
            "level": 2,
            "grid_size": 10,
            "num_objects": 2,
            "object_shapes": ['square_3x3'],
            "time_limit": 20,
            "click_limit": 20
        },
        {
            "level": 3,
            "grid_size": 12,
            "num_objects": 2,
            "object_shapes": ['square_3x3', 'X_shape'],
            "time_limit": 25,
            "click_limit": 22
        }
    ]

    @classmethod
    def get_level_config(cls, level):
        for level_config in cls.LEVELS:
            if level_config['level'] == level:
                # Create a copy of the level config to avoid modifying the original
                config = level_config.copy()
                # Convert shape names to actual shape coordinates
                try:
                    config['object_shapes'] = {shape: cls.OBJECT_SHAPES[shape] for shape in config['object_shapes']}
                    # Add ASCII representations separately
                    config['shape_ascii'] = {shape: cls.SHAPE_ASCII[shape] for shape in config['object_shapes']}
                except KeyError as e:
                    raise ValueError(f"Invalid shape name in level {level} configuration: {e}")
                return config
        raise ValueError(f"Level {level} configuration not found")

    @classmethod
    def validate_config(cls):
        for level in cls.LEVELS:
            for shape in level['object_shapes']:
                if shape not in cls.OBJECT_SHAPES:
                    raise ValueError(f"Invalid shape '{shape}' in level {level['level']} configuration")