import random
import threading
import copy
from game.charactors import Charactor
from game.message import MessageType
from game.game_utils import Constant

class GameStatusBase:
    def __init__(self, name, related_charactors) -> None:
        self.name = name
        self.related_charactors = related_charactors

class GameStatus:
    END = GameStatusBase(Constant.END_NAME, [])
    VOTE = GameStatusBase(Constant.VOTE_STAGE_NAME, [])
    INSOMNIAC = GameStatusBase(Constant.INSOMNIAC_TURN_NAME, [Charactor.INSOMNIAC, Charactor.DOPPELGANGER_INSOMNIAC])
    DRUNK = GameStatusBase(Constant.DRUNK_TURN_NAME, [Charactor.DRUNK])
    TROUBLEMAKER = GameStatusBase(Constant.TROUBLEMAKER_TURN_NAME, [Charactor.TROUBLEMAKER])
    ROBBER = GameStatusBase(Constant.ROBBER_TURN_NAME, [Charactor.ROBBER])
    SEER = GameStatusBase(Constant.SEER_TURN_NAME, [Charactor.SEER, Charactor.DOPPELGANGER_SEER])
    MASON = GameStatusBase(Constant.MASON_TURN_NAME, [Charactor.MASON, Charactor.DOPPELGANGER_MASON])
    MINION = GameStatusBase(Constant.MINION_TURN_NAME, [Charactor.MINION, Charactor.DOPPELGANGER_MINION])
    WEREWOLF = GameStatusBase(Constant.WEREWOLF_TURN_NAME, [Charactor.WEREWOLF, Charactor.DOPPELGANGER_WEREWOLF])
    DOPPELGANGER_ACTION = GameStatusBase(Constant.DOPPELGANGER_ACTION_TURN_NAME, [Charactor.DOPPELGANGER,
                                                                                  Charactor.DOPPELGANGER_ROBBER,
                                                                                  Charactor.DOPPELGANGER_SEER,
                                                                                  Charactor.DOPPELGANGER_TROUBLEMAKER,
                                                                                  Charactor.DOPPELGANGER_DRUNK])
    DOPPELGANGER = GameStatusBase(Constant.DOPPELGANGER_TURN_NAME, [Charactor.DOPPELGANGER])
    START = GameStatusBase(Constant.GAME_START_NAME, [])

    TURN_ORDER = [
        START,
        DOPPELGANGER,
        DOPPELGANGER_ACTION,
        WEREWOLF,
        MINION,
        MASON,
        SEER,
        ROBBER,
        TROUBLEMAKER,
        DRUNK,
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
        self.roles = self._assign_roles()           # List[Charactor]
        self.turns = self._get_turns()              # List[GameStatus]
        self.num_players = len(self.players)
        self.original_roles = copy.deepcopy(self.roles)
        self.action_done = False
        self.logs = []
        self.game_process_mapping = {
            GameStatus.START: self._game_start,
            GameStatus.DOPPELGANGER: self._doppelganger_prepare,
            GameStatus.DOPPELGANGER_ACTION: self._doppelganger_action_turn_prepare,
            GameStatus.WEREWOLF: self._werewolf_prepare,
            GameStatus.MINION: self._minion_prepare,
            GameStatus.MASON: self._mason_prepare,
            GameStatus.SEER: self._seer_prepare,
            GameStatus.ROBBER: self._robber_prepare,
            GameStatus.TROUBLEMAKER: self._troublemaker_prepare,
            GameStatus.DRUNK: self._drunk_prepare,
            GameStatus.INSOMNIAC: self._insomniac_prepare,
            GameStatus.VOTE: self._vote_prepare,
        }
        self.action_process_mapping = {
            GameStatus.DOPPELGANGER: self._doppelganger_turn,
            GameStatus.DOPPELGANGER_ACTION: self._doppelganger_action_turn,
            GameStatus.WEREWOLF: self._werewolf_turn,
            GameStatus.SEER: self._seer_turn,
            GameStatus.ROBBER: self._robber_turn,
            GameStatus.TROUBLEMAKER: self._troublemaker_turn,
            GameStatus.DRUNK: self._drunk_turn,
            GameStatus.VOTE: self._vote_stage,
        }
        self.lock = threading.Lock()

        # Game Variable
        self.werewolf_cnt = 0
    
    def __make_message(self, type, data):
        return {
            'type': type,
            'data': data,
        }

    def _check_player_valid(self, action):
        if self.turns[self.status_idx] in [GameStatus.START, GameStatus.VOTE, GameStatus.END]:
            return True, ""
        
        current_related_charactors = self.turns[self.status_idx].related_charactors
        current_player = action['player']
        current_player_idx = action['player_index']
        if self.players[current_player_idx] != current_player:
            return False, "Invalid player"
        if self.roles[current_player_idx] not in current_related_charactors:
            return False, "Invalid Charactor"
        return True, ""
    
    def _doppelganger_prepare(self):
        messages = []
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.NEXT_STAGE,
                'data': {
                    'status': GameStatus.DOPPELGANGER.name,
                    'interval': self.interval
                }
            }
        })
        for idx in range(len(players)):
            if self.roles[idx] in [Charactor.DOPPELGANGER_WEREWOLF, Charactor.WEREWOLF]:
                werewolf_cnt += 1
        threading.Timer(self.interval, self._time_up)
        return

    def _doppelganger_action_turn_prepare(self):
        messages = []
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.NEXT_STAGE,
                'data': {
                    'status': GameStatus.DOPPELGANGER_ACTION.name,
                    'interval': self.interval
                }
            }
        })
        for idx in range(len(players)):
            if self.roles[idx] in [Charactor.DOPPELGANGER_WEREWOLF, Charactor.WEREWOLF]:
                werewolf_cnt += 1
        threading.Timer(self.interval, self._time_up)
        return

    def _werewolf_prepare(self):
        messages = []
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.NEXT_STAGE,
                'data': {
                    'status': GameStatus.WEREWOLF.name,
                    'interval': self.interval
                }
            }
        })
        werewolf_cnt = 0
        werewolf_roles_info = {}
        for idx in range(len(self.players)):
            if self.roles[idx] in [Charactor.DOPPELGANGER_WEREWOLF, Charactor.WEREWOLF]:
                werewolf_cnt += 1
                werewolf_roles_info[idx] = {
                    'player': self.players[idx],
                    'role': 'werewolf'
                }
        self.werewolf_cnt = werewolf_cnt
        for idx in werewolf_roles_info.keys():
            messages.append({
                'type': 'individual_message',
                'target': self.players[idx],
                'message': {
                    'type': MessageType.WEREWOLF_TURN,
                    'data': {
                        'roles': werewolf_roles_info
                    }
                }
            })
        
        for message in messages:
            self._send_message(message)
        threading.Timer(self.interval, self._time_up)
        return

    def _minion_prepare(self):
        messages = []
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.NEXT_STAGE,
                'data': {
                    'status': GameStatus.MINION.name,
                    'interval': self.interval
                }
            }
        })

        werewolf_roles_info = {}
        for idx in range(len(self.players)):
            if self.roles[idx] in [Charactor.DOPPELGANGER_WEREWOLF, Charactor.WEREWOLF]:
                werewolf_roles_info[idx] = {
                    'player': self.players[idx],
                    'role': 'werewolf'
                }
        minion_idx = self.roles.index(Charactor.MINION)
        if minion_idx < len(self.players):
            messages.append({
                'type': 'individual_message',
                'target': self.players[minion_idx],
                'message': {
                    'type': MessageType.MINION_TURN,
                    'data': {
                        'roles': werewolf_roles_info
                    }
                    
                }
            })
        
        for message in messages:
            self._send_message(message)
        threading.Timer(self.interval, self._time_up)
        return

    def _mason_prepare(self):
        messages = []
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.NEXT_STAGE,
                'data': {
                    'status': GameStatus.MASON.name,
                    'interval': self.interval
                }
            }
        })

        mason_roles_info = {}
        for idx in range(len(self.players)):
            if self.roles[idx] in [Charactor.DOPPELGANGER_MASON, Charactor.MASON]:
                mason_roles_info[idx] = {
                    'player': self.players[idx],
                    'role': 'mason'
                }
        for idx in mason_roles_info.keys():
            messages.append({
                'type': 'individual_message',
                'target': self.players[idx],
                'message': {
                    'type': MessageType.MASON_TURN,
                    'data': {
                        'roles': mason_roles_info
                    }
                }
            })
        
        for message in messages:
            self._send_message(message)
        threading.Timer(self.interval, self._time_up)
        return
    
    def _seer_prepare(self):
        messages = []
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.NEXT_STAGE,
                'data': {
                    'status': GameStatus.SEER.name,
                    'interval': self.interval
                }
            }
        })
        for message in messages:
            self._send_message(message)
        threading.Timer(self.interval, self._time_up)
        return
    
    def _robber_prepare(self):
        messages = []
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.NEXT_STAGE,
                'data': {
                    'status': GameStatus.ROBBER.name,
                    'interval': self.interval
                }
            }
        })
        for message in messages:
            self._send_message(message)
        threading.Timer(self.interval, self._time_up)
        return
    
    def _troublemaker_prepare(self):
        messages = []
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.NEXT_STAGE,
                'data': {
                    'status': GameStatus.TROUBLEMAKER.name,
                    'interval': self.interval
                }
            }
        })
        for message in messages:
            self._send_message(message)
        threading.Timer(self.interval, self._time_up)
        return
    
    def _drunk_prepare(self):
        messages = []
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.NEXT_STAGE,
                'data': {
                    'status': GameStatus.DRUNK.name,
                    'interval': self.interval
                }
            }
        })
        for message in messages:
            self._send_message(message)
        threading.Timer(self.interval, self._time_up)
        return
    
    def _insomniac_prepare(self):
        messages = []
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.NEXT_STAGE,
                'data': {
                    'status': GameStatus.SEER.name,
                    'interval': self.interval
                }
            }
        })
        for idx in range(len(self.players)):
            if self.original_roles[idx] in [Charactor.INSOMNIAC, Charactor.DOPPELGANGER_INSOMNIAC]:
                messages.append({
                    'type': 'individual_message',
                    'message': {
                        'type': MessageType.INSOMNIAC_TURN,
                        'data': {
                            'roles': {
                                idx: {
                                    'player': self.players[idx],
                                    'role': self.roles[idx].show
                                }
                            }
                        }
                    }
                })
        for message in messages:
            self._send_message(message)
        threading.Timer(self.interval, self._time_up)
        return
    
    def _vote_prepare(self):
        pass

    def _doppelganger_turn(self, action):
        current_player = action['player']
        current_player_idx = action['player_index']
        target = action['target'][0]
        target_charactor = self.roles[target]
        if target_charactor == Charactor.WEREWOLF:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_WEREWOLF
        if target_charactor == Charactor.MINION:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_MINION
        if target_charactor == Charactor.MASON:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_MASON
        if target_charactor == Charactor.SEER:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_SEER
        if target_charactor == Charactor.ROBBER:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_ROBBER
        if target_charactor == Charactor.TROUBLEMAKER:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_TROUBLEMAKER
        if target_charactor == Charactor.DRUNK:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_DRUNK
        if target_charactor == Charactor.INSOMNIAC:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_INSOMNIAC
        if target_charactor == Charactor.VILLAGER:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_VILLAGER
        if target_charactor == Charactor.HUNTER:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_HUNTER
        if target_charactor == Charactor.TANNER:
            self.roles[current_player_idx] = Charactor.DOPPELGANGER_TANNER
        
        messages = []
        messages.append({
            'type': 'individual_message',
            'target': current_player,
            'message': {
                'roles': {
                    current_player_idx: {
                        'player': current_player,
                        'role': self.roles[current_player_idx],
                    }
                }
            }
        })
        return True, messages
    
    async def _time_up(self):
        # time up without user action
        if not self.action_done:
            pass
        
        self.status_idx += 1
        self.game_process_mapping[self.turns[self.status_idx]]()
        return


    def _werewolf_turn(self, action):
        '''
        only deal with 1 werewolf case
        '''
        if self.werewolf_cnt == 1:
            target = action['target']
            roles_info = {}
            for t in target:
                if t not in list(range(len(self.players), len(self.players) + 3)):
                    return False, "Invalid Target"
                roles_info[t] = {'role': self.roles[t]}
            messages = []
            messages.append({
                'type': 'individual_message',
                'message': {
                    'roles': roles_info,
                }
            })
            return True, messages
        else:
            return False, "Only 1 Werewolf can check roles"
        
    def _doppelganger_action_turn(self, action):
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
                if related_charactor in roles:
                    final_turns.append(turn)
                    break

        return final_turns

    def _assign_roles(self):
        total_roles = []
        for name, number in self.settings['roles'].items():
            if number > 0:
                total_roles += [Charactor.mapping_string_to_charactor(name)] * number
        random.shuffle(total_roles)
        return total_roles

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
                            'role': self.roles[idx].name
                        }
                    }
                }
            })
        threading.Timer(self.interval, self._next_stage)
        return True, messages


    def game_run(self, action) -> dict | None:
        valid, error = self._check_player_valid(self, action)
        if not valid:
            return False, error
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