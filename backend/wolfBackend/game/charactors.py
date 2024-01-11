class CharactorBase:
    def __init__(self, c_id, name, show) -> None:
        self.c_id = c_id
        self.name = name # 实际身份
        self.show = show # 牌面名称

class Charactor:
    DOPPELGANGER = CharactorBase(0, 'doppelganger', 'doppelganger')    # 化身幽灵
    WEREWOLF  = CharactorBase(1, 'werewolf', 'werewolf')       # 狼人
    MINION = CharactorBase(2, 'minion', 'minion')          # 爪牙
    MASON = CharactorBase(3, 'mason', 'mason')           # 守夜人
    SEER = CharactorBase(4, 'seer', 'seer')            # 预言家
    ROBBER = CharactorBase(5, 'robber', 'robber')          # 强盗
    TROUBLEMAKER = CharactorBase(6, 'troublemaker', 'troublemaker')    # 捣蛋鬼
    DRUNK = CharactorBase(7, 'drunk', 'drunk')           # 酒鬼
    INSOMNIAC = CharactorBase(8, 'insomniac', 'insomniac')       # 失眠者
    VILLAGER = CharactorBase(9, 'villager', 'villager')        # 村民
    HUNTER = CharactorBase(10, 'hunter', 'hunter')         # 猎人
    TANNER = CharactorBase(11, 'tanner', 'tanner')         # 皮匠

    DOPPELGANGER_WEREWOLF = CharactorBase(12, 'doppelganger_werewolf', 'doppelganger')
    DOPPELGANGER_MINION = CharactorBase(13, 'doppelganger_minion', 'doppelganger')
    DOPPELGANGER_MASON = CharactorBase(14, 'doppelganger_mason', 'doppelganger')
    DOPPELGANGER_SEER = CharactorBase(15, 'doppelganger_seer', 'doppelganger')
    DOPPELGANGER_ROBBER = CharactorBase(16, 'doppelganger_robber', 'doppelganger')
    DOPPELGANGER_TROUBLEMAKER = CharactorBase(17, 'doppelganger_troublemaker', 'doppelganger')
    DOPPELGANGER_DRUNK = CharactorBase(18, 'doppelganger_drunk', 'doppelganger')
    DOPPELGANGER_INSOMNIAC = CharactorBase(19, 'doppelganger_insomniac', 'doppelganger')
    DOPPELGANGER_VILLAGER = CharactorBase(20, 'doppelganger_villager', 'doppelganger')
    DOPPELGANGER_HUNTER = CharactorBase(21, 'doppelganger_hunter', 'doppelganger')
    DOPPELGANGER_TANNER = CharactorBase(22, 'doppelganger_tanner', 'doppelganger')

    mapping_string_to_charactor = {
        'doppelganger': DOPPELGANGER,
        'werewolf': WEREWOLF,
        'minion': MINION,
        'mason': MASON,
        'seer': SEER,
        'robber': ROBBER,
        'troublemaker': TROUBLEMAKER,
        'drunk': DRUNK,
        'insomniac': INSOMNIAC,
        'hunter': HUNTER,
        'tanner': TANNER
    }