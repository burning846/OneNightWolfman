# API Document

## Web

## Game

### General Client Message

```json
{
    "type": "",
    "message": {} 
}
```

- game action

```json
{
    "type": "game_action",
    "message": {
        "player": "123",
        "player_index": 0,
        "target": [1,2]
    }
}
```

### General Server Message
```json
{
    "type": "string",
    "data": {}
}
```

- next stage
```json
{
    "type": "next_stage",
    "message": "success",
    "data": {
        "status": "doppelganger_turn", 
        "interval": 15
    }
}
```

- 