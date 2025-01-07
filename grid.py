import random
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class Grid:
    def __init__(self, size, num_objects, object_shapes):
        self.size = size
        self.grid = [[0 for _ in range(size)] for _ in range(size)]
        self.total_object_cells = 0
        self.objects = []  # List to store object locations and their shapes
        self.destroyed_objects = set()  # Keep track of which objects have been fully destroyed
        self.place_objects(num_objects, object_shapes)

    def can_place_object(self, x, y, shape):
        for dx, dy in shape:
            new_x, new_y = x + dx, y + dy
            if new_x < 0 or new_x >= self.size or new_y < 0 or new_y >= self.size or self.grid[new_y][new_x] != 0:
                return False
        return True

    def place_object(self, x, y, shape):
        for dx, dy in shape:
            self.grid[y + dy][x + dx] = 1

    def place_objects(self, num_objects, object_shapes):
        shape_names = list(object_shapes.keys())
        logger.debug(f"Available shapes: {shape_names}")
        logger.debug(f"Number of objects to place: {num_objects}")
        logger.debug(f"Object shapes dictionary: {object_shapes}")
        
        for i in range(num_objects):
            shape_name = random.choice(shape_names)
            shape = object_shapes[shape_name]
            logger.debug(f"Placing object {i+1}: {shape_name}")
            logger.debug(f"Shape coordinates: {shape}")
            
            while True:
                x = random.randint(0, self.size - max(coord[0] for coord in shape) - 1)
                y = random.randint(0, self.size - max(coord[1] for coord in shape) - 1)
                if self.can_place_object(x, y, shape):
                    self.place_object(x, y, shape)
                    # Store object information with unique ID
                    object_cells = [(x + dx, y + dy) for dx, dy in shape]
                    self.objects.append({
                        'id': i,
                        'cells': object_cells,
                        'hit_cells': set(),
                        'size': len(shape)
                    })
                    self.total_object_cells += len(shape)
                    logger.debug(f"Successfully placed object {i} at ({x}, {y})")
                    break

    def click(self, x, y):
        if self.grid[y][x] == 1:
            self.grid[y][x] = 2  # Mark as hit
            
            destroyed_object = None
            # Check all objects that contain this cell
            for obj in self.objects:
                if (x, y) in obj['cells'] and obj['id'] not in self.destroyed_objects:
                    obj['hit_cells'].add((x, y))
                    # Check if this was the last cell needed to destroy this object
                    if len(obj['hit_cells']) == obj['size']:
                        logger.debug(f"Object fully destroyed! Size: {obj['size']}")
                        self.destroyed_objects.add(obj['id'])
                        destroyed_object = obj
            
            return True, destroyed_object['size'] if destroyed_object else 0
        return False, 0

    def all_objects_destroyed(self):
        logger.info("Checking if all objects are destroyed...")
        logger.info(f"Total objects: {len(self.objects)}, Destroyed objects: {len(self.destroyed_objects)}")
        all_destroyed = len(self.destroyed_objects) == len(self.objects)
        if all_destroyed:
            logger.info("ALL OBJECTS DESTROYED")
        return all_destroyed