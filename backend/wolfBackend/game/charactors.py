class BaseCharactor:
    name = None

    def __str__(self) -> str:
        return str(self.name)
    
    def play(self, data) -> bool:
        return False

class Wolfman(BaseCharactor):
    def play(self, data) -> bool:
        return True