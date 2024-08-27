import random
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class Grid:
    def __init__(self, size, num_objects, object_shapes):
        self.size = size
        self.grid = [[0 for _ in range(size)] for _ in range(size)]
        self.place_objects(num_objects, object_shapes)
        self.total_object_cells = sum(len(shape) for shape in object_shapes.values()) * num_objects

    def place_objects(self, num_objects, object_shapes):
        shape_names = list(object_shapes.keys())  # Get a list of shape names
        for _ in range(num_objects):
            shape_name = random.choice(shape_names)  # Choose a random shape name
            shape = object_shapes[shape_name]  # Get the actual shape coordinates
            while True:
                x = random.randint(0, self.size - max(coord[0] for coord in shape) - 1)
                y = random.randint(0, self.size - max(coord[1] for coord in shape) - 1)
                if self.can_place_object(x, y, shape):
                    self.place_object(x, y, shape)
                    break

    def can_place_object(self, x, y, shape):
        for dx, dy in shape:
            new_x, new_y = x + dx, y + dy
            if new_x < 0 or new_x >= self.size or new_y < 0 or new_y >= self.size or self.grid[new_y][new_x] != 0:
                return False
        return True

    def place_object(self, x, y, shape):
        for dx, dy in shape:
            self.grid[y + dy][x + dx] = 1

    def click(self, x, y):
        if self.grid[y][x] == 1:
            self.grid[y][x] = 2  # 2 represents a revealed part of an object
            return True
        return False

    def all_objects_destroyed(self):
        destroyed_cells = sum(row.count(2) for row in self.grid)
        logger.info(f"ALL OBJECTS DESTROYED")
        return destroyed_cells == self.total_object_cells

    def is_completed(self):
        return self.all_objects_destroyed()