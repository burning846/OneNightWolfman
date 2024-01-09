class CharactorBase:
    def __init__(self, c_id, name) -> None:
        self.c_id = c_id
        self.name = name

class Charactor:
    DOPPELGANGER = CharactorBase(0, 'doppelganger')    # 化身幽灵
    WEREWOLF  = CharactorBase(1, 'werewolf')       # 狼人
    MINION = CharactorBase(2, 'minion')          # 爪牙
    MASON = CharactorBase(3, 'mason')           # 守夜人
    SEER = CharactorBase(4, 'seer')            # 预言家
    ROBBER = CharactorBase(5, 'robber')          # 强盗
    TROUBLEMAKER = CharactorBase(6, 'troublemaker')    # 捣蛋鬼
    DRUNK = CharactorBase(7, 'drunk')           # 酒鬼
    INSOMNIAC = CharactorBase(8, 'insomniac')       # 失眠者
    VILLAGER = CharactorBase(9, 'villager')        # 村民
    HUNTER = CharactorBase(10, 'hunter')         # 猎人
    TANNER = CharactorBase(11, 'tanner')         # 皮匠

    DOPPELGANGER_WEREWOLF = CharactorBase(12, 'doppelganger')
    DOPPELGANGER_MINION = CharactorBase(13, 'doppelganger')
    DOPPELGANGER_MASON = CharactorBase(14, 'doppelganger')
    DOPPELGANGER_SEER = CharactorBase(15, 'doppelganger')
    DOPPELGANGER_ROBBER = CharactorBase(16, 'doppelganger')
    DOPPELGANGER_TROUBLEMAKER = CharactorBase(17, 'doppelganger')
    DOPPELGANGER_DRUNK = CharactorBase(18, 'doppelganger')
    DOPPELGANGER_INSOMNIAC = CharactorBase(19, 'doppelganger')
    DOPPELGANGER_VILLAGER = CharactorBase(20, 'doppelganger')
    DOPPELGANGER_HUNTER = CharactorBase(21, 'doppelganger')
    DOPPELGANGER_TANNER = CharactorBase(22, 'doppelganger')