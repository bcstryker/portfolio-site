export const gameOptions = {
  "candy-land": {name: "Candy Land", maxPlayers: 8, rules: "Click the deck to draw a card. Move to the next space of that color, or the second matching space for a double card. Follow the rainbow path to the castle! If there are no more matching spaces, move to the castle and win. The 48-card deck reshuffles when empty."},
  "chutes-and-ladders": {name: "Chutes and Ladders", maxPlayers: 8, rules: "Take turns spinning the wheel for a number from 1 to 6. Land at a ladder’s foot to climb, or a chute’s top to slide. Reach 100 with an exact spin to win; if you overshoot, stay put."},
  "tic-tac-toe": {name: "Tic Tac Toe", maxPlayers: 2, rules: "X goes first. Take turns choosing an empty square. Three in a row horizontally, vertically, or diagonally wins. A full board without a winner is a draw."},
  "connect-four": {name: "Connect Four", maxPlayers: 2, rules: "Red goes first. Choose a column to drop a disc into its lowest empty space. Four in a row horizontally, vertically, or diagonally wins. A full board without a winner is a draw."},
} as const;
export type GameType = keyof typeof gameOptions;
export function isGameType(value: unknown): value is GameType {
  return typeof value === "string" && Object.hasOwn(gameOptions, value);
}

// Rooms fetched before the strategy-game migration have none of these columns.
export function normalizeGameRoom<T extends {game_type?: unknown; board?: unknown; winning_cells?: unknown}>(room: T) {
  const gameType = room.game_type ?? "chutes-and-ladders";
  if (!isGameType(gameType)) throw new Error("This room uses an unsupported game.");
  const board = Array.isArray(room.board) ? room.board as number[] : [];
  const winningCells = Array.isArray(room.winning_cells) ? room.winning_cells as number[] : [];
  const expectedSize = gameType === "tic-tac-toe" ? 9 : gameType === "connect-four" ? 42 : 0;
  if (board.length !== expectedSize) throw new Error("This game’s board is unavailable. Please check that the latest game migration has deployed.");
  return {...room, game_type: gameType, board, winning_cells: winningCells};
}
