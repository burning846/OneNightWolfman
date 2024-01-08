class MessageType:
    # room related
    PLAYER_JOIN = 0
    PLAYER_LEAVE = 1
    HOST_CHANGE = 2
    CREATE_ROOM = 3

    # game related
    GAME_START = 3
    GAME_END = 4
    DOPPELGANGER_TURN = 5
    WEREWOLF_TURN = 6
    MINION_TURN = 7
    MASON_TURN = 8
    SEER_TURN = 9
    ROBBER_TURN = 10
    TROUBLEMAKER_TURN = 11
    DRUNK_TURN = 12
    INSOMNIAC_TURN = 13
    VOTE_STAGE = 14
