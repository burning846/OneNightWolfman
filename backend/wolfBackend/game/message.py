class MessageType:
    # room related
    PLAYER_JOIN = 'player_join'
    PLAYER_LEAVE = 'player_leave'
    HOST_CHANGE = 'host_change'
    CREATE_ROOM = 'create_room'
    SET_SETTINGS = 'set_settings'
    GAME_ACTION = 'game_action'

    # game related
    GAME_START = 'game_start'
    GAME_END = 'game_end'
    DOPPELGANGER_TURN = 'doppelganger_turn'
    WEREWOLF_TURN = 'werewolf_turn'
    MINION_TURN = 'minion_turn'
    MASON_TURN = 'mason_turn'
    SEER_TURN = 'seer_turn'
    ROBBER_TURN = 'robber_turn'
    TROUBLEMAKER_TURN = 'troublemaker_turn'
    DRUNK_TURN = 'drunk_turn'
    INSOMNIAC_TURN = 'insomniac_turn'
    DOPPELGANGER_ACTION_TURN = 'doppelganger_action_turn'
    VOTE_STAGE = 'vote_stage'
    NEXT_STAGE = 'next_stage'

class MessageText:
    ERROR = 'error'
    SUCCESS = 'success'