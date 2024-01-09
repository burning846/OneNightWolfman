import random
import threading
import copy
from game.charactors import Charactor
from game.message import MessageType

class GameStatusBase:
    def __init__(self, status_id, related_charactors) -> None:
        self.status_id = status_id
        self.related_charactors = related_charactors

class GameStatus:
    VOTE = GameStatusBase(MessageType.VOTE_STAGE, [])
    INSOMNIAC = GameStatusBase(MessageType.INSOMNIAC_TURN, [Charactor.INSOMNIAC, Charactor.DOPPELGANGER_INSOMNIAC])
    DOPPELGANGER_DRUNK = GameStatusBase(MessageType.DOPPELGANGER_DRUNK_TURN, [Charactor.DOPPELGANGER_DRUNK])
    DRUNK = GameStatusBase(MessageType.DRUNK_TURN, [Charactor.DRUNK])
    DOPPELGANGER_TROUBLEMAKER = GameStatusBase(MessageType.DOPPELGANGER_TROUBLEMAKER_TURN, [Charactor.DOPPELGANGER_TROUBLEMAKER])
    TROUBLEMAKER = GameStatusBase(MessageType.TROUBLEMAKER_TURN, [Charactor.TROUBLEMAKER])
    DOPPELGANGER_ROBBER = GameStatusBase(MessageType.DOPPELGANGER_ROBBER_TURN, [Charactor.DOPPELGANGER_ROBBER])
    ROBBER = GameStatusBase(MessageType.ROBBER_TURN, [Charactor.ROBBER])
    SEER = GameStatusBase(MessageType.SEER_TURN, [Charactor.SEER, Charactor.DOPPELGANGER_SEER])
    MASON = GameStatusBase(MessageType.MASON_TURN, [Charactor.MASON, Charactor.DOPPELGANGER_MASON])
    MINION = GameStatusBase(MessageType.MINION_TURN, [Charactor.MINION, Charactor.DOPPELGANGER_MINION])
    WEREWOLF = GameStatusBase(MessageType.WEREWOLF_TURN, [Charactor.WEREWOLF, Charactor.DOPPELGANGER_WEREWOLF])
    DOPPELGANGER = GameStatusBase(MessageType.DOPPELGANGER_TURN, [Charactor.DOPPELGANGER])
    START = GameStatusBase(MessageType.GAME_START, [])

    TURN_ORDER = [
        START,
        DOPPELGANGER,
        WEREWOLF,
        MINION,
        MASON,
        SEER,
        ROBBER,
        DOPPELGANGER_ROBBER,
        TROUBLEMAKER,
        DOPPELGANGER_TROUBLEMAKER,
        DRUNK,
        DOPPELGANGER_DRUNK,
        INSOMNIAC,
        VOTE
    ]


class GameManager:
    def __init__(self, players, settings, channel_layer, room_group_name) -> None:
        self.players = players
        self.settings = settings
        self.interval = settings['interval']
        self.status_idx = 0
        self.channel_layer = channel_layer
        self.room_group_name = room_group_name
        self.roles = self._assign_roles()
        self.turns = self._get_turns()
        self.num_players = len(self.players)
        self.original_roles = copy.deepcopy(self.roles)
        self.logs = []
        self.game_process_mapping = {
            GameStatus.START: self._game_start,
            GameStatus.DOPPELGANGER: self._doppelganger_turn,
            GameStatus.WEREWOLF: self._werewolf_turn,
            GameStatus.MINION: self._minion_turn,
            GameStatus.MASON: self._mason_turn,
            GameStatus.SEER: self._seer_turn,
            GameStatus.ROBBER: self._robber_turn,
            GameStatus.TROUBLEMAKER: self._troublemaker_turn,
            GameStatus.DRUNK: self._drunk_turn,
            GameStatus.INSOMNIAC: self._insomniac_turn,
            GameStatus.VOTE: self._vote_stage,
        }
        self.lock = threading.Lock()

    def _next_stage(self):
        self.status_idx += 1
        # TODO
        # send messages when specific stages
        # WEREWOLF
        # MINION
        # MASON
        # INSOMNIAC
        if self.turns[self.status_idx] != GameStatus.VOTE:
            threading.Timer(self.interval, self._next_stage)


    def _doppelganger_turn(self, action):
        pass
    def _werewolf_turn(self, action):
        pass
    def _minion_turn(self, action):
        pass
    def _mason_turn(self, action):
        pass
    def _seer_turn(self, action):
        pass
    def _robber_turn(self, action):
        pass
    def _troublemaker_turn(self, action):
        pass
    def _drunk_turn(self, action):
        pass
    def _insomniac_turn(self, action):
        pass
    def _vote_stage(self, action):
        pass

    async def _send_message(self, message):
        await self.channel_layer.group_send(
            self.room_group_name,
            message
        )

    def _get_turns(self):
        roles = set()
        for name, number in self.settings['roles'].items():
            if number > 0:
                roles.add(name)

        final_turns = []
        for turn in GameStatus.TURN_ORDER:
            if turn == GameStatus.START or turn == GameStatus.VOTE:
                final_turns.append(turn)
            for related_charactor in turn.related_charactors:
                if related_charactor.name in roles:
                    final_turns.append(turn)
                    break

        return final_turns

    def _assign_roles(self):
        total_roles = []
        for name, number in self.settings['roles'].items():
            if number > 0:
                total_roles += [name] * number
        self.status
        random.shuffle(total_roles)
        roles = {}
        for idx, player in enumerate(self.players):
            roles[idx] = {
                'player': player,
                'role': total_roles[idx],
            }
        return roles

    def _game_start(self, _) -> None:
        '''
        assign rols
        '''
        messages = []
        for idx, player in enumerate(self.players):
            messages.append({
                'type': 'individual_message',
                'target': player,
                'message': {
                    'type': MessageType.DOPPELGANGER_TURN,
                    'roles': {
                        idx: {
                            'player': player,
                            'role': self.roles[idx]
                        }
                    }
                }
            })
        threading.Timer(self.interval, self._next_stage)
        return True, messages


    def game_run(self, action) -> dict | None:
        '''
        action: {
            'player': User,
            'target': list[int],
        }
        '''
        # according to GameStatus choose corresponding function
        # to deal with the player action
        messages = self.game_process_mapping[self.turns[self.status_idx]](action)
        return True, messages
        

if __name__ == "__main__":
    players = list(range(8))
    settings = {
        "interval": 15,
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
    manager._game_start()

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