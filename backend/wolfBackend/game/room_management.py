from game.game_management import GameManager

class RoomManager:
    rooms = {}
    games = {}

    @classmethod
    def join_room(cls, room_id, player):
        if room_id not in cls.rooms:
            cls.rooms[room_id] = []
        cls.rooms[room_id].append(player)

    @classmethod
    def leave_room(cls, room_id, player):
        if room_id in cls.rooms:
            cls.rooms[room_id].remove(player)
            if not cls.rooms[room_id]:
                del cls.rooms[room_id]

    @classmethod
    def start_game(cls, room_id):
        if room_id in cls.rooms and room_id not in cls.games:
            cls.games[room_id] = GameManager()

    @classmethod
    def end_game(cls, room_id):
        if room_id in cls.rooms and room_id in cls.games:
            del cls.games[room_id]

