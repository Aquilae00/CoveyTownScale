## Town Store
Key: towns
Data type: Set
Values: townID


## Town
Key: town:${id}
Data type: Hash
Fields:
- friendlyName 
- isPubliclyListed 
- capacity 
- occupancy
- townUpdatePassword

Key: town:${id}:players
Data type: Set
Values: playerID

## Players
Key: player:${id}
Data type: Hash
Fields:
- username
