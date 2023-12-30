class CharactorId:
    DOPPELGANGER = 0    # 化身幽灵
    WEREWOLF  = 1       # 狼人
    MINION = 2          # 爪牙
    MASON = 3           # 守夜人
    SEER = 4            # 预言家
    ROBBER = 5          # 强盗
    TROUBLEMAKER = 6    # 捣蛋鬼
    DRUNK = 7           # 酒鬼
    INSOMNIAC = 8       # 失眠者
    VILLAGER = 9        # 村民
    HUNTER = 10         # 猎人
    TANNER = 11         # 皮匠

class BaseCharactor:
    name = None
    c_id = -1

    def __str__(self) -> str:
        return str(self.name)
    
    def play(self, data) -> bool:
        return False

class WereWolf(BaseCharactor):
    def __init__(self) -> None:
        self.c_id = 1

    def play(self, data) -> bool:
        return True
    
