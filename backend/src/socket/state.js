// Store mapping of uid to socket id
export const userSockets = new Map();

// Map to track participants in each room. Key: roomCode, Value: Array of user objects
export const activeQuizRooms = new Map();

// Arena Matchmaking
export const arenaQueue = []; // array of { socket, user, matchData, mode, queuedAt, timer }
export const activeArenaRooms = new Map(); // roomCode -> roomState
export const tournamentLobbies = new Map(); // tournamentCode -> Map(uid -> { socket, user })
