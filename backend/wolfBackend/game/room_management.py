from game.game_management import GameManager

class RoomManager:
    rooms = {}
    games = {}

    @classmethod
    def create_room(cls, room_id, player) -> (bool, str):
        if room_id not in cls.rooms:
            cls.rooms[room_id] = [player]
            return True, "success"
        else:
            return False, "room already exists"

    @classmethod
    def join_room(cls, room_id, player) -> (bool, str):
        if room_id not in cls.rooms:
            return False, "room doesn't exist"
        cls.rooms[room_id].append(player)
        return True, "success"

    @classmethod
    def leave_room(cls, room_id, player) -> (bool, str):
        if room_id in cls.rooms:
            if player in cls.rooms[room_id]:
                cls.rooms[room_id].remove(player)
                if not cls.rooms[room_id]:
                    del cls.rooms[room_id]
                return True, "success"
            else:
                False, "player not in this room"
        else:
            False, "room doesn't exist"

    @classmethod
    def create_game(cls, room_id) -> (bool, str):
        if room_id in cls.rooms and room_id not in cls.games:
            cls.games[room_id] = GameManager()
            return True, "success"
        elif room_id not in cls.rooms:
            return False, "room doesn't exist"
        elif room_id in cls.games:
            return False, "game already exists"

    @classmethod
    def start_game(cls, room_id) -> (dict | None):
        if room_id in cls.rooms and room_id not in cls.games:
            game_manager = cls.games[room_id]
            roles = game_manager.init()
            return roles
        else:
            return None

    @classmethod
    def end_game(cls, room_id) -> (bool, str):
        if room_id in cls.rooms and room_id in cls.games:
            del cls.games[room_id]
            return True, "success"
        elif room_id not in cls.rooms:
            return False, "room doesn't exist"
        elif room_id not in cls.games:
            return False, "game doesn't exist"

