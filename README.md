# Chess

A synced multiplayer 3D chess board. Moves are checked with [chess.js](https://github.com/jhlywa/chess.js). Made for **SideQuest / AltspaceVR** worlds, and it also works in **Banter**.

There is no server: players stay in sync through the space's shared state, and the game is plain static files served from <https://chess.firer.at>.

To try it, open <https://chess.firer.at> in Altspace or Banter.

## Features

- Full chess rules, with legal move checking
- Reset button
- Several independent boards in one world
- Lit or unlit materials

## Add it to an Altspace world (snippet)

In a Creator SDK world, add an empty GameObject at the origin, click **Add Component > BS > Snippet** and type `chess`. Or paste this into `Assets/WebRoot/index.html`, between the snippet section comments:

```html
<!-- snippet section -->
<bs-snippet name="chess" title="Chess"
  description="Synced multiplayer chess board with a reset button."
  script="https://chess.firer.at/snippet.js"
  room=""
  position="0 1 2"
  rotation="0 0 0"
  scale="0.5"
  lit="true"
  add-lights="false"
  turn-cooldown="5"
  hide-ui="false"
  hide-board="false"
  pieces-opacity="1"
  reset-position="0 0 2.5"
  reset-rotation="0 0 0"
  reset-scale="1"
  scoreboard-position="0 0 0"
  scoreboard-rotation="0 0 0"
  scoreboard-scale="1">
  <bs-gizmo type="position" attribute="position"/>
  <bs-gizmo type="box" attribute="position" size="2 0.05 2"/>
</bs-snippet>
<!-- end snippet section -->
```

- Each placement is its own game. Its sync id is `room`, or the placement's own id when `room` is empty. Give placements the same `room` to share one game.
- `position` and `rotation` are Unity world values, and `scale` can be a single number. The other settings are listed under [Settings](#settings). An empty setting uses the default.
- The Scene-view gizmo shows the board at its default size; it does not follow `scale`.
- Unity reads the snippet section as XML: quote every attribute, close every element, and write `&` as `&amp;`.

## Add it with a script tag

This works in an Altspace world's `Assets/WebRoot/index.html` (outside the snippet section) and in a Banter space's HTML:

```html
<script src="https://chess.firer.at/Chess.js" position="0 1.1 -2" scale="0.8"></script>
```

For more than one board in a space, give each one its own `instance`:

```html
<script src="https://chess.firer.at/Chess.js" instance="board1" position="-2 1.1 -2"></script>
<script src="https://chess.firer.at/Chess.js" instance="board2" position="2 1.1 -2"></script>
```

Settings can also go in the URL, as in older setups: `https://chess.firer.at/Chess.js?boardPosition=0+1.1+-2&boardScale=0.8`.

## Settings

| Setting | Also accepted | Default | Description |
| :--- | :--- | :--- | :--- |
| `instance` |  | page URL | Sync id. Boards with the same id share one game. In a snippet, use `room` instead. |
| `boardPosition` | `position`, `board-position` | `0 1.1 -2` | Board position (x y z). |
| `boardRotation` | `rotation`, `board-rotation` | `0 0 0` | Board rotation in degrees (x y z). |
| `boardScale` | `scale`, `board-scale` | `1` | Board scale: one number, or x y z. |
| `resetPosition` | `reset-position` | `0 0 2.5` | Reset button position, relative to the board. |
| `resetRotation` | `reset-rotation` | `0 0 0` | Reset button rotation, relative to the board. |
| `resetScale` | `reset-scale` | `1` | Reset button scale. |
| `hideUI` | `hide-ui` | `false` | `true` makes the reset button invisible (it still works and its RESET label stays visible) and hides the turn display. |
| `scoreboardPosition` | `scoreboard-position` | `0 0 0` | Position of the sign showing whose turn it is, relative to the board. |
| `scoreboardRotation` | `scoreboard-rotation` | `0 0 0` | Turn sign rotation. |
| `scoreboardScale` | `scoreboard-scale` | `1` | Turn sign scale. |
| `turnCooldown` | `turn-cooldown` | `5` | Seconds after a move before the same person can move for the other side, so a double click or an eager player can't take the opponent's turn. Playing both sides alone still works after the wait. `0` turns it off. |
| `hideBoard` | `hide-board` | `false` | `true` hides the board, e.g. to use your own. |
| `lit` |  | `true` | Uses materials that react to scene lights. `false` uses unlit materials that ignore lighting. |
| `lighting` |  | `lit` | Older form of `lit`: `lit` or `unlit`. `lit` wins if both are set. |
| `addLights` | `add-lights` | `false` | With `lit="true"`, `true` adds a directional light, for worlds that have no lights of their own. |
| `piecesOpacity` | `pieces-opacity` | `1` | Piece opacity, 0 to 1. |

Settings can be written as `boardPosition` or `board-position`; the snippet uses the hyphenated form.

A position of `0 0 0` means automatic: the turn sign sits in its default spot next to the board. Any other value places it relative to the board.

## How to play

1. Click one of your pieces. Its square turns green.
2. Click the square to move it to.
3. Pawns that reach the far side become queens.

## Files

- `Chess.js`: the game.
- `models/White`, `models/Black`: the piece models.
- `snippet.js`, `snippet.html`: the Creator SDK snippet and its definition.
- `index.html`: a test page with a floor and the game.

## License

GPL-3.0. See [LICENSE](LICENSE).
