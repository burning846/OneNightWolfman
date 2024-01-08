from game.game_management import GameManager
from game.message import MessageType

class RoomManager:
    '''
    room_id: {
        is_in_game: bool,
        settings: dict,
        host: User,
        max_player_num: int,
        players: list[User],
        game_maneger: GameManager,
    }
    '''
    rooms = {}

    @classmethod
    def create_room(cls, player, room_id, settings) -> (bool, list[dict]|str):
        if room_id  in cls.rooms:
            return False, "room already exists"
        
        messages = []
        cls.rooms[room_id] = {
            'is_in_game': False,
            'settings': settings,
            'host': player,
            'max_player_num': settings['num_player'],
            'players': [player],
            'game_maneger': None,
        }
        messages.append({
            'type': 'group_message',
            'message': {
                'type': MessageType.CREATE_ROOM,
                'room_id': room_id
            }
        })
        return True, messages
            

    @classmethod
    def join_room(cls, room_id, player) -> (bool, list[dict]|str):
        messages = []
        if room_id not in cls.rooms:
            return False, "room doesn't exist"
        cls.rooms[room_id]['players'].append(player)
        messages.append({
            'type': 'group_message', 
            'message': {
                'type': MessageType.PLAYER_JOIN,
                'player': player,
                'current_players': cls.rooms[room_id]['players'],
            }
        })
        return True, messages

    @classmethod
    def leave_room(cls, room_id, player) -> (bool, list[dict]|str):
        if room_id not in cls.rooms:
            return False, "room doesn't exist"
        if player not in cls.rooms[room_id]:
            return False, "player not in this room"
        
        messages = []
        cls.rooms[room_id]['players'].remove(player)
        if not cls.rooms[room_id]['players']:
            del cls.rooms[room_id]
        else:
            messages.append({
                'type': 'group_message',
                'message': {
                    'type': MessageType.PLAYER_LEAVE,
                    'player': player,
                    'current_players': cls.rooms[room_id]['players'],
                }
            })
        if cls.rooms[room_id]['host'] == player:
            cls.rooms[room_id]['host'] = cls.rooms[room_id]['players'][0]
            messages.append({
                'type': 'group_message',
                'message': {
                    'type': MessageType.HOST_CHANGE,
                    'player': cls.rooms[room_id]['host'],
                }
            })
        return True, messages
            
            

    @classmethod
    def start_game(cls, room_id) -> (bool, list[dict]|str):
        if room_id not in cls.rooms:
            return False, "room doesn't exist"
        
        messages = []
        game_manager = GameManager(
            players=cls.rooms['room_id']['players'],
            settings=cls.rooms['room_id']['settings'],
        )
        cls.rooms[room_id]['game_manager'] = game_manager
        game_manager.game_init()
        for player, role in game_manager.roles.items():
            messages.append({
                'type': 'individual_message',
                'target': [player, ],
                'message':{
                    'type': MessageType.GAME_START,
                    'roles': role
                }
            })
        return True, messages
            
        
    @classmethod
    def run_game(cls, room_id, action) -> (bool, list[dict]|str):
        if room_id not in cls.rooms:
            return False, "room doesn't exist"
        if 'game_manager' not in cls.rooms['room_id']:
            return False, "game didn't start"

        game_manager = cls.rooms['room_id']['game_manager']
        messages = game_manager.game_run(action)
        return True, messages
            
        

    # @classmethod
    # def end_game(cls, room_id) -> (bool, list[dict]|str):
    #     if room_id in cls.rooms and room_id in cls.games:
    #         del cls.games[room_id]
    #         return True, "success"
    #     elif room_id not in cls.rooms:
    #         return False, "room doesn't exist"
    #     elif room_id not in cls.games:
    #         return False, "game doesn't exist"

