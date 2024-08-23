class Player:
    def __init__(self, name, id, role):
        self.name = name
        self.id = id
        self.role = role
        self.teammate = None
        self.stats = {
            'turns_played': 0,
            #'turns_as_shooter': 0,
            #'turns_as_spotter': 0,
            'total_hits': 0,
            'total_misses': 0,
            'total_clicks': 0
        }

    def set_teammate(self, teammate):
        self.teammate = teammate

    def update_stats(self, hit):
        self.stats['total_clicks'] += 1
        if hit:
            self.stats['total_hits'] += 1
        else:
            self.stats['total_misses'] += 1

    def increment_turns(self):
        self.stats['turns_played'] += 1

    def get_stats(self):
        return self.stats