import random

class Grid:
    def __init__(self, size=10, num_objects=3, object_size=3):
        self.size = size
        self.grid = [[0 for _ in range(size)] for _ in range(size)]
        self.place_objects(num_objects, object_size)

    def place_objects(self, num_objects, object_size):
        for _ in range(num_objects):
            while True:
                x = random.randint(0, self.size - object_size)
                y = random.randint(0, self.size - object_size)
                if self.can_place_object(x, y, object_size):
                    self.place_object(x, y, object_size)
                    break

    def can_place_object(self, x, y, size):
        for i in range(size):
            for j in range(size):
                if self.grid[y+j][x+i] != 0:
                    return False
        return True

    def place_object(self, x, y, size):
        for i in range(size):
            for j in range(size):
                self.grid[y+j][x+i] = 1

    def click(self, x, y):
        if self.grid[y][x] == 1:
            self.grid[y][x] = 2  # 2 represents a revealed part of an object
            return True
        return False

    def is_completed(self):
        return all(2 not in row for row in self.grid)