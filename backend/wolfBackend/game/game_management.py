import random

class GameManager:
    def __init__(self, players, settings) -> None:
        self.players = players
        self.settings = settings
        self.game_init()

    def game_init(self):
        self.num_players = len(self.players)
        self.roles = self.settings.get('roles', None)
        if self.roles is None:
            self.roles = self.get_roles(self.num_players)
        