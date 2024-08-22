class Player:
    def __init__(self, name, id, role):
        self.name = name
        self.id = id
        self.role = role
        self.teammate = None

    def set_teammate(self, teammate):
        self.teammate = teammate