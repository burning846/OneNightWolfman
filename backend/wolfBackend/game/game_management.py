import random

class GameStatus:
    START = 0


class GameManager:
    def __init__(self, players, settings) -> None:
        self.players = players
        self.settings = settings
        self.status = GameStatus.START
        self.game_init()

    def _assign_roles(self):
        total_roles = []
        for name, number in self.set_settings['roles'].items():
            if number > 0:
                total_roles += [name] * number
        random.shuffle(total_roles)
        return total_roles

    def set_settings(self, new_settings) -> bool:
        self.settings = new_settings
        return True

    def game_init(self) -> None:
        self.num_players = len(self.players)
        self.roles = self._assign_roles()
        

if __name__ == "__main__":
    players = list(range(8))
    settings = {
        "num_players": 8,
        "roles": {
            "doppelganger": 0,
            "werewolf": 2,
            "minion": 1,
            "mason": 2,
            "seer": 1,
            "robber": 1,
            "troublemaker": 1,
            "drunk": 1,
            "insomniac": 1,
            "hunter": 1,
        }
    }
    manager = GameManager(players, settings)
    manager.game_init()

# class CharactorId:
#     DOPPELGANGER = 0    # 化身幽灵
#     WEREWOLF  = 1       # 狼人
#     MINION = 2          # 爪牙
#     MASON = 3           # 守夜人
#     SEER = 4            # 预言家
#     ROBBER = 5          # 强盗
#     TROUBLEMAKER = 6    # 捣蛋鬼
#     DRUNK = 7           # 酒鬼
#     INSOMNIAC = 8       # 失眠者
#     VILLAGER = 9        # 村民
#     HUNTER = 10         # 猎人
#     TANNER = 11         # 皮匠