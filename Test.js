(function () {
    // One game per copy of this script, so several boards on a page don't share a game.
    let chessGame = null;
    /**
     * BanterChess Unified Embed Script
     * Loads dependencies, initializes game logic, and renders the board in Banter.
     */

    // --- Configuration ---
    const config = {
        boardPosition: [0, 1.1, -2],
        boardRotation: [0, 0, 0],
        boardScale: [1, 1, 1],
        resetPosition: [0, 0, 2.5],
        resetRotation: [0, 0, 0],
        resetScale: [1, 1, 1],
        scoreboardPosition: [0, 0.45, 0],
        scoreboardRotation: [0, 0, 0],
        scoreboardScale: [0.16, 0.16, 0.16],
        instance: window.location.href.split('?')[0], // Default to current URL without query params to avoid mismatches
        hideUI: false,
        turnCooldown: 5, // Seconds before the same person can move for the other side; 0 = off
        lockTimeout: 90, // Inactivity timeout in seconds before an idle player's seat unlocks (0 = off)
        cullDistance: 20, // Metres beyond which the game objects are disabled/hidden for performance; 0 = off
        volume: 0.4, // Sound effect volume, 0-1; 0 = no sounds
        soundNear: 2.5, // Metres from the game where sounds are at full volume
        soundFar: 10, // Metres from the game where sounds fade out completely
        mutePosition: null, // null (0 0 0) = automatic: beside the Reset button
        muteRotation: [0, 0, 0],
        muteScale: [1, 1, 1],
        hideBoard: false,
        piecesOpacity: 1.0,
        lighting: 'lit',
        addLights: false
    };

    // Helper to parse Vector3 from string - now returns array [x,y,z]
    const parseVector3 = (str, defaultVal) => {
        if (!str) return defaultVal;
        const s = str.trim();
        if (s.includes(' ')) {
            const parts = s.split(' ').map(Number);
            if (parts.length === 3) return [parts[0], parts[1], parts[2]];
        } else {
            const val = parseFloat(s);
            if (!isNaN(val)) return [val, val, val];
        }
        return defaultVal;
    };

    // Parse URL params or script attributes from this script tag immediately
    // If document.currentScript is null (e.g. dynamically appended or async execution),
    // find the script tag in the document referencing Test.js or Chess.js.
    const currentScript = document.currentScript || (() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.find(s => s.src && (/Test\.js/i.test(s.src) || /Chess\.js/i.test(s.src))) || null;
    })();
    const scriptSrc = currentScript ? currentScript.src : 'https://chess.firer.at/Test.js';

    if (currentScript) {
        const getParam = (name, defaultValue) => {
            if (!currentScript) return defaultValue;
            
            const getFromURL = (key) => {
                try {
                    const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost';
                    const url = new URL(currentScript.src, base);
                    const params = new URLSearchParams(url.search);
                    if (params.has(key)) return params.get(key);
                    const lowerKey = key.toLowerCase();
                    for (const [pKey, pVal] of params.entries()) {
                        if (pKey.toLowerCase() === lowerKey) {
                            return pVal;
                        }
                    }
                } catch (e) {}
                return null;
            };

            const getFromScriptTag = (key) => {
                try {
                    if (currentScript.hasAttribute(key)) {
                        return currentScript.getAttribute(key);
                    }
                    const lowerKey = key.toLowerCase();
                    if (currentScript.hasAttribute(lowerKey)) {
                        return currentScript.getAttribute(lowerKey);
                    }
                    const datasetKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    if (currentScript.dataset && currentScript.dataset[datasetKey] !== undefined) {
                        return currentScript.dataset[datasetKey];
                    }
                } catch (e) {}
                return null;
            };

            const keys = [name];
            const aliases = {
                boardPosition: ['position', 'board-position'],
                boardRotation: ['rotation', 'board-rotation'],
                boardScale: ['scale', 'board-scale'],
                hideUI: ['hide-ui'],
                turnCooldown: ['turn-cooldown'],
                volume: ['sound-volume'],
                soundNear: ['sound-near'],
                soundFar: ['sound-far'],
                mutePosition: ['mute-position'],
                muteRotation: ['mute-rotation'],
                muteScale: ['mute-scale'],
                hideBoard: ['hide-board'],
                useCustomModels: ['use-custom-models'],
                addLights: ['add-lights'],
                useAOBaking: ['use-ao-baking'],
                boardSize: ['board-size'],
                piecesOpacity: ['pieces-opacity'],
                lockTimeout: ['lock-timeout', 'seat-timeout', 'idle-timeout'],
                cullDistance: ['cull-distance', 'renderDistance', 'render-distance', 'cull-dist'],
                scoreboardPosition: ['scoreboard-position', 'ui-position', 'panel-position'],
                scoreboardRotation: ['scoreboard-rotation', 'ui-rotation', 'panel-rotation'],
                scoreboardScale: ['scoreboard-scale', 'ui-scale', 'panel-scale'],
                resetPosition: ['reset-position'],
                resetRotation: ['reset-rotation'],
                resetScale: ['reset-scale'],
                passPosition: ['pass-position'],
                passRotation: ['pass-rotation'],
                passScale: ['pass-scale']
            };

            if (aliases[name]) {
                aliases[name].forEach(alias => {
                    if (!keys.includes(alias)) keys.push(alias);
                });
            }

            for (const key of keys) {
                const val = getFromURL(key);
                if (val !== null) return val;
            }
            for (const key of keys) {
                const val = getFromScriptTag(key);
                if (val !== null) return val;
            }

            return defaultValue;
        };

        config.hideBoard = getParam('hideBoard', String(config.hideBoard)) === 'true';
        config.hideUI = getParam('hideUI', String(config.hideUI)) === 'true';
        config.turnCooldown = parseFloat(getParam('turnCooldown', String(config.turnCooldown)));
        if (isNaN(config.turnCooldown)) config.turnCooldown = 5;
        config.volume = parseFloat(getParam('volume', String(config.volume)));
        if (isNaN(config.volume)) config.volume = 0.4;
        config.soundNear = parseFloat(getParam('soundNear', String(config.soundNear)));
        if (isNaN(config.soundNear)) config.soundNear = 2.5;
        config.soundFar = parseFloat(getParam('soundFar', String(config.soundFar)));
        if (isNaN(config.soundFar)) config.soundFar = 10;
        // 0 0 0 means automatic (beside the Reset button)
        config.mutePosition = parseVector3(getParam('mutePosition'), null);
        if (config.mutePosition && config.mutePosition.every(n => n === 0)) config.mutePosition = null;
        config.muteRotation = parseVector3(getParam('muteRotation'), config.muteRotation);
        config.muteScale = parseVector3(getParam('muteScale'), config.muteScale);
        config.instance = getParam('instance', config.instance);
        config.lighting = getParam('lighting', config.lighting);
        // 'lit' is a true/false switch (a checkbox in the snippet editor); it overrides 'lighting'.
        const litParam = getParam('lit', null);
        if (litParam !== null) config.lighting = litParam === 'true' ? 'lit' : 'unlit';
        config.addLights = getParam('addLights', String(config.addLights)) !== 'false';

        const opacityStr = getParam('piecesOpacity');
        if (opacityStr) {
            const opacity = parseFloat(opacityStr);
            if (!isNaN(opacity)) {
                config.piecesOpacity = Math.max(0, Math.min(1, opacity)); // Clamp between 0 and 1
            }
        }

        config.cullDistance = parseFloat(getParam('cullDistance', String(config.cullDistance)));
        if (isNaN(config.cullDistance)) config.cullDistance = 20;
        config.lockTimeout = parseFloat(getParam('lockTimeout', String(config.lockTimeout)));
        if (isNaN(config.lockTimeout)) config.lockTimeout = 90;

        // Store as arrays for now
        config.boardScale = parseVector3(getParam('boardScale'), config.boardScale);
        config.boardPosition = parseVector3(getParam('boardPosition'), config.boardPosition);
        config.boardRotation = parseVector3(getParam('boardRotation'), config.boardRotation);

        config.resetPosition = parseVector3(getParam('resetPosition'), config.resetPosition);
        config.resetRotation = parseVector3(getParam('resetRotation'), config.resetRotation);
        config.scoreboardPosition = parseVector3(getParam('scoreboardPosition'), config.scoreboardPosition);
        // 0 0 0 means automatic (the panel's default spot)
        if (config.scoreboardPosition && config.scoreboardPosition.every(n => n === 0)) config.scoreboardPosition = [0, 0.45, 0];
        config.scoreboardRotation = parseVector3(getParam('scoreboardRotation'), config.scoreboardRotation);
        config.scoreboardScale = parseVector3(getParam('scoreboardScale'), config.scoreboardScale);
        config.resetScale = parseVector3(getParam('resetScale'), config.resetScale);
    }

    // --- Dependency Loading ---
    const loadScript = (src, globalName) => {
        return new Promise((resolve, reject) => {
            // Helper to check if the global is ready (is a function if globalName is provided)
            const isGlobalReady = () => globalName ? (typeof window[globalName] === 'function') : true;

            // Case 1: Global is already available and ready.
            if (globalName && isGlobalReady()) {
                return resolve();
            }

            // Case 2: Script tag exists but global is missing or not ready.
            if (document.querySelector(`script[src="${src}"]`)) {
                if (!globalName) return resolve(); // No global to check, assume fine.

                // Poll for the global to become available and ready
                const maxAttempts = 50; // 5 seconds (100ms * 50)
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    if (isGlobalReady()) {
                        clearInterval(interval);
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        reject(new Error(`Timeout waiting for global ${globalName} to be a function from ${src}`));
                    }
                }, 100);
                return;
            }

            // Case 3: Script tag does not exist. Load it.
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => {
                // If we need a global, ensure it's there (rarely needs delay after onload for standard scripts)
                if (globalName && !isGlobalReady()) { // Check if not ready after onload
                    // Fallback polling just in case
                    const interval = setInterval(() => {
                         if (isGlobalReady()) { clearInterval(interval); resolve(); }
                    }, 50);
                } else {
                    resolve();
                }
            };
            s.onerror = reject;
            document.head.appendChild(s);
        });
    };

    // New function to load chess.js as an ES Module and expose its Chess export globally
    const loadChessModule = () => {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.min.js';
            s.type = 'module'; // Crucial: load as an ES Module
            s.onload = async () => {
                try {
                    // Dynamic import the module to access its named exports
                    const module = await import(s.src);
                    // Assign the Chess constructor from the module's exports to the global window object
                    window.Chess = module.Chess;
                    resolve();
                } catch (e) {
                    console.error("Error dynamically importing chess.js module:", e);
                    reject(e);
                }
            };
            s.onerror = reject;
            document.head.appendChild(s);
        });
    };

    const loadDependencies = async () => {
        const deps = [];
        // Load chess.js using the new module loader
        deps.push(loadChessModule());
        // If you have other non-module dependencies, you can add them here using loadScript
        // deps.push(loadScript('other-dependency.js', 'OtherGlobal'));
        await Promise.all(deps);
    };

    // --- Game Logic (ChessGame) ---
    class ChessGame {
        constructor() {
            this.chess = new Chess();
            this.onGameOverCallback = null;
        }
        reset() { this.chess.reset(); }
        loadFen(fen) {
            try {
                this.chess.load(fen);
                return true;
            } catch (e) {
                console.error("Failed to load FEN:", fen, e);
                return false;
            }
        }
        makeMove(move) {
            try {
                const result = this.chess.move(move);
                if (result) {
                    // this.checkGameOver(); // Optional for demo
                    return true;
                }
            } catch (e) { console.warn("Invalid move:", move); }
            return false;
        }
        receiveMove(move) {
            const result = this.chess.move(move);
            if (result && this.onMoveCallback) this.onMoveCallback(result);
        }
        getFen() { return this.chess.fen(); }
        getMoves(square) { return this.chess.moves({ square: square, verbose: true }); }
    }

    // --- Banter Board Logic ---
    const COLORS = {
        white: '#EEEEEE', black: '#333333', selected: '#76F250', valid: '#50ABF2',
        highlight: '#E3C662', whitePiece: '#D4AF37', blackPiece: '#222222'
    };

    function hexToVector4(hex) {
        let c = hex.substring(1);
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return new BS.Vector4(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255, 1);
    }

    function withTimeout(promise, ms, desc) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${desc || ''}`)), ms))
        ]);
    }

    const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const state = {
        tiles: {}, pieces: {}, selectedSquare: null,
        boardRoot: null, boardVisuals: null, piecesRoot: null,
        listenersSetup: false, tileSize: 0.5, boardSize: 8, offset: 0,
        ui: null,
        gameState: null,
        lastSpaceState: null
    };
    state.offset = (state.boardSize * state.tileSize) / 2 - (state.tileSize / 2);

    function getLocalUser() {
        const scene = BS.BanterScene.GetInstance();
        return scene && scene.localUser ? scene.localUser : null;
    }

    function isSpaceHost() {
        const scene = BS.BanterScene.GetInstance();
        if (!scene || !scene.localUser) return false;
        if (scene.space && scene.space.owner && String(scene.space.owner.uid) === String(scene.localUser.uid)) return true;
        if (scene.space && (scene.space.isHost || scene.space.isOwner)) return true;
        const uids = Object.keys(scene.users || {}).sort();
        return uids.length > 0 && String(uids[0]) === String(scene.localUser.uid);
    }

    function isPlayerPresent(uid) {
        if (!uid) return false;
        const scene = BS.BanterScene.GetInstance();
        if (!scene) return false;
        if (scene.localUser && String(scene.localUser.uid) === String(uid)) return true;
        if (scene.users && scene.users[uid]) return true;
        return false;
    }

    function isSeatIdle(player) {
        if (!player || !config.lockTimeout || config.lockTimeout <= 0) return false;
        const lastAction = state.gameState?.lastActionTime;
        if (!lastAction) return false;
        return (Date.now() - lastAction) > (config.lockTimeout * 1000);
    }

    function saveState(boardState) {
        state.lastSpaceState = boardState;
        state.gameState = boardState;
        const stateKey = 'chess_game_' + config.instance;
        BS.BanterScene.GetInstance().SetPublicSpaceProps({ [stateKey]: JSON.stringify(boardState) });
    }

    const SOUND_FILES = { move: 3, capture: 2, castle: 1, check: 1, promote: 1, win: 1, draw: 1, reset: 1 };
    const MUTE_KEY = 'banterGames_muted_chess';
    const sounds = { files: SOUND_FILES, cache: {}, live: false, prev: null, prevKey: null, muted: false };
    try { sounds.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { }

    async function initializeBoard() {
        console.log("Chess: Setup Started");

        state.boardRoot = await new BS.GameObject("ChessBoardRoot");

        // Transform
        let rootTrans = state.boardRoot.GetComponent(BS.ComponentType.Transform);
        if (!rootTrans) rootTrans = await state.boardRoot.AddComponent(new BS.Transform());

        // Apply Config
        rootTrans.position = config.boardPosition;
        rootTrans.localEulerAngles = config.boardRotation; // Apply Rotation
        rootTrans.localScale = config.boardScale;         // Apply Scale

        // Visuals container for 3D board geometry (frame, tiles, pieces, lights)
        // Can be toggled safely via SetActive(!culled) without breaking BanterUI
        state.boardVisuals = await new BS.GameObject("ChessBoardVisuals");
        await state.boardVisuals.SetParent(state.boardRoot, false);
        let visTrans = await state.boardVisuals.AddComponent(new BS.Transform());
        visTrans.localPosition = new BS.Vector3(0, 0, 0);
        visTrans.localEulerAngles = new BS.Vector3(0, 0, 0);
        visTrans.localScale = new BS.Vector3(1, 1, 1);

        // Add lights if we are using a lit shader and the user has not disabled them.
        if (config.lighting === 'lit' && config.addLights) {
            const lightGO = await new BS.GameObject("BanterChess_DirectionalLight");
            await lightGO.SetParent(state.boardVisuals, false);
            let lightTrans = await lightGO.AddComponent(new BS.Transform());
            lightTrans.localPosition = new BS.Vector3(0, 5, -5); // Above and behind the board from white's perspective
            lightTrans.localEulerAngles = new BS.Vector3(45, 0, 0); // Angled down

            // Add a directional light. BS.LightType.Directional is 1.
            await lightGO.AddComponent(new BS.Light(1, new BS.Vector4(1, 1, 1, 1), 1, 0.1));
        }

        console.log("Board Initialized with Config:", config);

        // Modern UI Panel replaces old 3D box reset/turn buttons
        await buildModernUI();

        if (!config.hideBoard) await createBoardFrame();
        await generateTiles();

        // Performance proximity culling
        setupDistanceCulling();

        // Networking Setup & Initial Board Sync
        await setupBanterStateListeners();
    }

    // A wooden frame round the squares, a little higher than them.
    async function createBoardFrame() {
        const span = state.boardSize * state.tileSize;
        const rail = 0.18;
        const edge = span / 2 + rail / 2;
        const bars = [
            [0, edge, span + rail * 2, rail], [0, -edge, span + rail * 2, rail],
            [edge, 0, rail, span], [-edge, 0, rail, span]
        ];
        for (let i = 0; i < bars.length; i++) {
            const [x, z, w, d] = bars[i];
            await createBanterObject(`Frame_${i}`, state.boardVisuals, new BS.Vector3(x, 0.01, z),
                '#4A2C16', BS.GeometryType.BoxGeometry, { width: w, height: 0.14, depth: d });
        }
    }

    // --- Modern UI Panel (BanterUI) & Game Controls ---
    async function buildModernUI() {
        if (config.hideUI) return;

        const v3 = a => Array.isArray(a) ? new BS.Vector3(...a) : a;
        let uiPos = config.scoreboardPosition ? v3(config.scoreboardPosition) : new BS.Vector3(0, 0.45, 0);
        if (!uiPos || (uiPos.x === 0 && uiPos.y === 0 && uiPos.z === 0)) {
            uiPos = new BS.Vector3(0, 0.45, 0);
        }
        const uiRot = config.scoreboardRotation ? v3(config.scoreboardRotation) : new BS.Vector3(0, 0, 0);

        let rawScale = config.scoreboardScale ? v3(config.scoreboardScale) : new BS.Vector3(0.16, 0.16, 0.16);
        let uiScale;
        if (rawScale.x >= 0.5) {
            uiScale = new BS.Vector3(0.16 * rawScale.x, 0.16 * rawScale.y, 0.16 * rawScale.z);
        } else {
            uiScale = rawScale;
        }

        const uiObj = await new BS.GameObject({
            name: "Chess_CentralUI",
            parent: state.boardRoot,
            localPosition: uiPos,
            localEulerAngles: uiRot,
            localScale: uiScale
        }).Async();

        let t = uiObj.GetComponent(BS.ComponentType.Transform);
        if (!t) t = await uiObj.AddComponent(new BS.Transform());

        let billboard = await uiObj.AddComponent(new BS.BanterBillboard({ smoothing: 1, enableXAxis: false, enableYAxis: true }));
        billboard.enableXAxis = false;

        const panel = await uiObj.AddComponent(new BS.BanterUI(new BS.Vector2(650, 270), false));
        const rootEl = panel.CreateVisualElement();
        await rootEl.Async();

        rootEl.SetStyles({
            backgroundColor: 'rgba(15, 18, 26, 0.94)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '14px',
            paddingBottom: '14px',
            paddingLeft: '18px',
            paddingRight: '18px',
            borderRadius: '16px',
            borderWidth: '3px',
            borderColor: 'rgba(80, 95, 125, 0.85)',
            width: '100%',
            height: '100%'
        });

        if (rootEl.parent && rootEl.parent.SetStyles) {
            rootEl.parent.SetStyles({ backgroundColor: 'rgba(0, 0, 0, 0)' });
        }

        // Header Row: Title, Turn Status, Mute Button
        const headerRow = panel.CreateVisualElement(rootEl);
        await headerRow.Async();
        headerRow.SetStyles({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: '4px',
            backgroundColor: 'rgba(0,0,0,0)'
        });

        const title = panel.CreateLabel(undefined, headerRow);
        await title.Async();
        title.text = "CHESS";
        title.SetStyles({
            color: '#f0f0f0',
            fontSize: '26px',
            fontWeight: 'bold',
            backgroundColor: 'rgba(0,0,0,0)',
            marginRight: '10px'
        });

        const statusLabel = panel.CreateLabel(undefined, headerRow);
        await statusLabel.Async();
        statusLabel.text = turnStatusText();
        statusLabel.SetStyles({
            color: '#ffcc00',
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
            flexGrow: '1',
            backgroundColor: 'rgba(0,0,0,0)'
        });

        const muteBtn = panel.CreateButton(headerRow);
        await muteBtn.Async();
        if (muteBtn.parent && muteBtn.parent.SetStyles) {
            muteBtn.parent.SetStyles({ backgroundColor: 'rgba(0,0,0,0)', backgroundImage: 'none' });
        }
        muteBtn.text = sounds.muted ? "🔇" : "🔊";
        muteBtn.SetStyles({
            backgroundColor: '#37474f',
            color: 'white',
            fontSize: '20px',
            paddingTop: '6px',
            paddingBottom: '6px',
            paddingLeft: '14px',
            paddingRight: '14px',
            borderRadius: '8px',
            borderWidth: '0px',
            backgroundImage: 'none'
        });
        const handleMuteToggle = () => {
            sounds.muted = !sounds.muted;
            try { localStorage.setItem(MUTE_KEY, sounds.muted ? '1' : '0'); } catch (e) {}
            muteBtn.text = sounds.muted ? "🔇" : "🔊";
        };
        if (typeof muteBtn.OnClick === 'function') muteBtn.OnClick(handleMuteToggle);
        else if (typeof muteBtn.On === 'function') muteBtn.On('click', handleMuteToggle);

        // Seats Row: White & Black Player Seats
        const seatsRow = panel.CreateVisualElement(rootEl);
        await seatsRow.Async();
        seatsRow.SetStyles({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginTop: '6px',
            marginBottom: '6px',
            backgroundColor: 'rgba(0,0,0,0)'
        });

        const createSeatBtn = async (parent, text, color, textColor, handler) => {
            const btn = panel.CreateButton(parent);
            await btn.Async();
            if (btn.parent && btn.parent.SetStyles) {
                btn.parent.SetStyles({ backgroundColor: 'rgba(0,0,0,0)', backgroundImage: 'none' });
            }
            btn.text = text;
            btn.SetStyles({
                backgroundColor: color,
                color: textColor || 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                paddingTop: '10px',
                paddingBottom: '10px',
                paddingLeft: '14px',
                paddingRight: '14px',
                borderRadius: '8px',
                borderWidth: '2px',
                borderColor: '#666666',
                backgroundImage: 'none',
                flexGrow: '1',
                marginRight: '6px',
                marginLeft: '6px'
            });
            if (typeof btn.OnClick === 'function') btn.OnClick(handler);
            else if (typeof btn.On === 'function') btn.On('click', handler);
            return btn;
        };

        const whiteSeatBtn = await createSeatBtn(seatsRow, "WHITE: [CLAIM]", '#ffffff', '#111111', () => handleWhiteSeatClick());
        const blackSeatBtn = await createSeatBtn(seatsRow, "BLACK: [CLAIM]", '#262626', '#ffffff', () => handleBlackSeatClick());

        // Actions Row: Reset Button & Notice Label
        const actionsRow = panel.CreateVisualElement(rootEl);
        await actionsRow.Async();
        actionsRow.SetStyles({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            backgroundColor: 'rgba(0,0,0,0)'
        });

        const resetBtn = panel.CreateButton(actionsRow);
        await resetBtn.Async();
        if (resetBtn.parent && resetBtn.parent.SetStyles) {
            resetBtn.parent.SetStyles({ backgroundColor: 'rgba(0,0,0,0)', backgroundImage: 'none' });
        }
        resetBtn.text = "RESET GAME";
        resetBtn.SetStyles({
            backgroundColor: '#c62828',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            paddingTop: '8px',
            paddingBottom: '8px',
            paddingLeft: '22px',
            paddingRight: '22px',
            borderRadius: '8px',
            borderWidth: '0px',
            backgroundImage: 'none',
            marginRight: '12px'
        });
        const handleResetAction = () => handleResetClick();
        if (typeof resetBtn.OnClick === 'function') resetBtn.OnClick(handleResetAction);
        else if (typeof resetBtn.On === 'function') resetBtn.On('click', handleResetAction);

        // Notice / Feedback Label
        const noticeLabel = panel.CreateLabel(undefined, actionsRow);
        await noticeLabel.Async();
        noticeLabel.text = "";
        noticeLabel.SetStyles({
            color: '#ff7043',
            fontSize: '15px',
            textAlign: 'left',
            flexGrow: '1',
            minHeight: '20px',
            backgroundColor: 'rgba(0,0,0,0)'
        });

        state.ui = {
            obj: uiObj,
            transform: t,
            panel,
            rootEl,
            statusLabel,
            whiteSeatBtn,
            blackSeatBtn,
            resetBtn,
            muteBtn,
            noticeLabel,
            savedPos: uiPos,
            savedScale: uiScale
        };

        updateModernUI();

        // Slow periodic idle timeout and presence refresher (starts only after scene loads)
        const startIdleRefresher = () => {
            setInterval(() => {
                if (!isCulled && state.ui) {
                    updateModernUI();
                }
            }, 10000);
        };

        const sceneInst = BS.BanterScene.GetInstance();
        if (window.__banterLoadedHref || (sceneInst && sceneInst.sceneLoaded)) {
            startIdleRefresher();
        } else if (sceneInst && typeof sceneInst.OneShot === 'function') {
            sceneInst.OneShot('scene-loaded', () => setTimeout(startIdleRefresher, 1000));
        } else {
            window.addEventListener('scene-loaded', () => setTimeout(startIdleRefresher, 1000), { once: true });
            setTimeout(startIdleRefresher, 5000);
        }
    }

    function updateModernUI() {
        if (!state.ui || !state.ui.statusLabel) return;

        state.ui.statusLabel.text = turnGuard.notice ? turnGuard.notice : turnStatusText();

        const local = getLocalUser();
        const localUidStr = local && local.uid !== undefined ? String(local.uid) : null;
        const white = state.gameState?.whitePlayer;
        const black = state.gameState?.blackPlayer;
        const currentTurn = chessGame ? chessGame.chess.turn() : 'w';

        if (state.ui.whiteSeatBtn) {
            const whitePresent = white ? isPlayerPresent(white.uid) : false;
            const whiteIdle = white ? isSeatIdle(white) : false;

            if (!white) {
                state.ui.whiteSeatBtn.text = "WHITE: [CLAIM]";
                state.ui.whiteSeatBtn.SetStyles({
                    backgroundColor: '#ffffff',
                    color: '#111111',
                    borderColor: currentTurn === 'w' ? '#4CAF50' : '#888888',
                    borderWidth: currentTurn === 'w' ? '3px' : '2px'
                });
            } else if (localUidStr && String(white.uid) === localUidStr) {
                state.ui.whiteSeatBtn.text = `WHITE: YOU (${white.name}) [LEAVE]`;
                state.ui.whiteSeatBtn.SetStyles({
                    backgroundColor: '#e8f5e9',
                    color: '#111111',
                    borderColor: currentTurn === 'w' ? '#4CAF50' : '#2e7d32',
                    borderWidth: currentTurn === 'w' ? '3px' : '2px'
                });
            } else if (!whitePresent) {
                state.ui.whiteSeatBtn.text = "WHITE: Disconnected [RECLAIM]";
                state.ui.whiteSeatBtn.SetStyles({
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderColor: '#e57373',
                    borderWidth: '2px'
                });
            } else if (whiteIdle && currentTurn === 'w') {
                state.ui.whiteSeatBtn.text = `WHITE: ${white.name} (Idle) [RECLAIM]`;
                state.ui.whiteSeatBtn.SetStyles({
                    backgroundColor: '#fff8e1',
                    color: '#f57f17',
                    borderColor: '#ffb300',
                    borderWidth: '2px'
                });
            } else {
                state.ui.whiteSeatBtn.text = `WHITE: ${white.name}`;
                state.ui.whiteSeatBtn.SetStyles({
                    backgroundColor: '#eeeeee',
                    color: '#333333',
                    borderColor: currentTurn === 'w' ? '#4CAF50' : '#888888',
                    borderWidth: currentTurn === 'w' ? '3px' : '2px'
                });
            }
        }

        if (state.ui.blackSeatBtn) {
            const blackPresent = black ? isPlayerPresent(black.uid) : false;
            const blackIdle = black ? isSeatIdle(black) : false;

            if (!black) {
                state.ui.blackSeatBtn.text = "BLACK: [CLAIM]";
                state.ui.blackSeatBtn.SetStyles({
                    backgroundColor: '#262626',
                    color: '#ffffff',
                    borderColor: currentTurn === 'b' ? '#4CAF50' : '#666666',
                    borderWidth: currentTurn === 'b' ? '3px' : '2px'
                });
            } else if (localUidStr && String(black.uid) === localUidStr) {
                state.ui.blackSeatBtn.text = `BLACK: YOU (${black.name}) [LEAVE]`;
                state.ui.blackSeatBtn.SetStyles({
                    backgroundColor: '#1b3820',
                    color: '#ffffff',
                    borderColor: currentTurn === 'b' ? '#4CAF50' : '#2e7d32',
                    borderWidth: currentTurn === 'b' ? '3px' : '2px'
                });
            } else if (!blackPresent) {
                state.ui.blackSeatBtn.text = "BLACK: Disconnected [RECLAIM]";
                state.ui.blackSeatBtn.SetStyles({
                    backgroundColor: '#3e2723',
                    color: '#ffab91',
                    borderColor: '#e57373',
                    borderWidth: '2px'
                });
            } else if (blackIdle && currentTurn === 'b') {
                state.ui.blackSeatBtn.text = `BLACK: ${black.name} (Idle) [RECLAIM]`;
                state.ui.blackSeatBtn.SetStyles({
                    backgroundColor: '#3e2723',
                    color: '#ffe082',
                    borderColor: '#ffb300',
                    borderWidth: '2px'
                });
            } else {
                state.ui.blackSeatBtn.text = `BLACK: ${black.name}`;
                state.ui.blackSeatBtn.SetStyles({
                    backgroundColor: '#222222',
                    color: '#aaaaaa',
                    borderColor: currentTurn === 'b' ? '#4CAF50' : '#555555',
                    borderWidth: currentTurn === 'b' ? '3px' : '2px'
                });
            }
        }

        if (state.ui.muteBtn) {
            state.ui.muteBtn.text = sounds.muted ? "🔇" : "🔊";
        }
    }

    function handleWhiteSeatClick() {
        const local = getLocalUser();
        if (!local || local.uid === undefined) {
            showTurnNotice("Could not determine your user ID");
            return;
        }
        const white = state.gameState?.whitePlayer;
        const black = state.gameState?.blackPlayer;
        const localUidStr = String(local.uid);

        const whitePresent = white ? isPlayerPresent(white.uid) : false;
        const whiteIdle = white ? isSeatIdle(white) : false;

        if (!white || !whitePresent || whiteIdle) {
            const newBlack = (black && String(black.uid) === localUidStr) ? null : black;
            updateSeats({ uid: localUidStr, name: local.name || "Player" }, newBlack);
            showTurnNotice("You claimed White");
        } else if (String(white.uid) === localUidStr) {
            updateSeats(null, black);
            showTurnNotice("You left White");
        } else {
            showTurnNotice(`White is taken by ${white.name}`);
        }
    }

    function handleBlackSeatClick() {
        const local = getLocalUser();
        if (!local || local.uid === undefined) {
            showTurnNotice("Could not determine your user ID");
            return;
        }
        const white = state.gameState?.whitePlayer;
        const black = state.gameState?.blackPlayer;
        const localUidStr = String(local.uid);

        const blackPresent = black ? isPlayerPresent(black.uid) : false;
        const blackIdle = black ? isSeatIdle(black) : false;

        if (!black || !blackPresent || blackIdle) {
            const newWhite = (white && String(white.uid) === localUidStr) ? null : white;
            updateSeats(newWhite, { uid: localUidStr, name: local.name || "Player" });
            showTurnNotice("You claimed Black");
        } else if (String(black.uid) === localUidStr) {
            updateSeats(white, null);
            showTurnNotice("You left Black");
        } else {
            showTurnNotice(`Black is taken by ${black.name}`);
        }
    }

    function updateSeats(whitePlayer, blackPlayer) {
        const fen = chessGame.getFen();
        const currentData = state.lastSpaceState || {};
        const newState = {
            ...currentData,
            fen: currentData.fen || fen,
            whitePlayer: whitePlayer || null,
            blackPlayer: blackPlayer || null,
            lastActionTime: Date.now()
        };
        saveState(newState);
        updateModernUI();
    }

    function handleResetClick() {
        const local = getLocalUser();
        const white = state.gameState?.whitePlayer;
        const black = state.gameState?.blackPlayer;
        const isGameActive = chessGame && chessGame.getFen() !== STARTING_FEN;
        const isGameOver = chessGame && (chessGame.chess.isCheckmate() || chessGame.chess.isDraw());
        const isSeatClaimed = !!(white || black);

        if (isSeatClaimed && isGameActive && !isGameOver) {
            const localUidStr = local && local.uid !== undefined ? String(local.uid) : null;
            const isWhite = white && String(white.uid) === localUidStr;
            const isBlack = black && String(black.uid) === localUidStr;
            const isHost = isSpaceHost();
            const whitePresent = white ? isPlayerPresent(white.uid) : true;
            const blackPresent = black ? isPlayerPresent(black.uid) : true;
            const whiteIdle = white ? isSeatIdle(white) : false;
            const blackIdle = black ? isSeatIdle(black) : false;

            const hasAbandonedSeat = (!whitePresent || whiteIdle || !blackPresent || blackIdle);

            if (!isWhite && !isBlack && !isHost && !hasAbandonedSeat) {
                showTurnNotice("Only seated players or host can reset an active game!");
                return;
            }
        }

        console.log("Requesting game reset...");
        const currentData = state.lastSpaceState || {};
        const boardState = {
            ...currentData,
            fen: 'reset',
            lastMove: null,
            lastActionTime: Date.now()
        };
        saveState(boardState);

        console.log("Optimistically resetting local board.");
        chessGame.reset();
        syncBoard();
        clearSelection();
        showTurnNotice("Game reset");
        updateModernUI();
    }

    // --- Distance-based Object Culling ---
    let isCulled = false;
    let cullingInterval = null;

    function setupDistanceCulling() {
        if (config.cullDistance <= 0) return;
        const start = () => {
            if (cullingInterval) clearInterval(cullingInterval);
            cullingInterval = setInterval(updateCulling, 1000);
        };
        const scene = BS.BanterScene.GetInstance();
        if (window.__banterLoadedHref || (scene && scene.sceneLoaded)) {
            start();
        } else if (scene && typeof scene.OneShot === 'function') {
            scene.OneShot('scene-loaded', () => setTimeout(start, 1000));
        } else {
            window.addEventListener('scene-loaded', () => setTimeout(start, 1000), { once: true });
            setTimeout(start, 5000);
        }
    }

    function updateCulling() {
        if (config.cullDistance <= 0 || !state.boardRoot) {
            if (isCulled) setCulled(false);
            return;
        }

        const head = headTracker();
        const p = head.markerPos || head.posePos;
        if (!p) return;

        const bPos = config.boardPosition;
        const dist = Math.hypot(p.x - bPos.x, p.y - bPos.y, p.z - bPos.z);
        const shouldCull = dist > config.cullDistance;

        if (shouldCull !== isCulled) {
            setCulled(shouldCull);
        }
    }

    function setCulled(culled) {
        isCulled = culled;
        if (!state.boardRoot) return;

        // 1. Safely toggle 3D board geometry (frame, tiles, pieces, lights)
        if (state.boardVisuals && typeof state.boardVisuals.SetActive === 'function') {
            try {
                state.boardVisuals.SetActive(!culled);
            } catch (e) {
                console.warn("Chess: Could not set active state on boardVisuals", e);
            }
        }

        // 2. Hide/show BanterUI via scale & display to avoid breaking VisualTree or Billboard
        if (state.ui && state.ui.obj) {
            try {
                const tr = state.ui.transform || state.ui.obj.GetComponent(BS.ComponentType.Transform);
                if (tr) {
                    tr.localScale = culled ? new BS.Vector3(0.0001, 0.0001, 0.0001) : state.ui.savedScale;
                }
                if (state.ui.rootEl && typeof state.ui.rootEl.SetStyles === 'function') {
                    state.ui.rootEl.SetStyles({ display: culled ? 'none' : 'flex' });
                }
            } catch (e) {
                console.warn("Chess: Could not update UI culling state", e);
            }
        }

        if (!culled) {
            syncBoard();
            updateModernUI();
        }
    }

    // Stubs for backward compatibility
    async function addButtonLabel() {}
    async function createResetButton() {}
    async function createTurnBoard() {}

    async function createBanterObject(name, parent, posLocal, colorHex, geometryType, dims) {
        const obj = await new BS.GameObject({
            name: name,
            parent: parent,
            localPosition: posLocal
        }).Async();

        const geoArgs = getGeometryArgs(geometryType, dims);
        await obj.AddComponent(new BS.BanterGeometry(...geoArgs));

        const color = hexToVector4(colorHex);

        const isTile = name.startsWith("Tile_");
        
        let shader;
        let texture;

        if (config.lighting === 'lit' && !(config.hideBoard && isTile)) {
            shader = 'Standard';
            texture = "";
        } else {
            // Original unlit logic, or when board is hidden to ensure transparency
            shader = (config.hideBoard && isTile) ? 'Unlit/DiffuseTransparent' : 'Unlit/Diffuse';
            texture = (config.hideBoard && isTile) ? null : "";
        }

        // Tiles need unique material instances for dynamic color highlighting
        const cacheBust = isTile ? name : "";
        await obj.AddComponent(new BS.BanterMaterial(shader, texture, color, BS.MaterialSide.Front, false, cacheBust));

        let colSize;
        if (geometryType === BS.GeometryType.BoxGeometry) {
            colSize = new BS.Vector3(dims.width, dims.height, dims.depth);
        } else {
            const r = dims.radius || dims.radiusBottom || 0.2;
            const h = dims.height || 0.6;
            colSize = new BS.Vector3(r * 2, h, r * 2);
        }
        await obj.AddComponent(new BS.BoxCollider(true, new BS.Vector3(0, 0, 0), colSize));
        await obj.SetLayer(5); // UI Layer
        return obj;
    }

    function getGeometryArgs(type, d) {
        return [
            type, null, d.width || 1, d.height || 1, d.depth || 1, 1, 1, 1,
            d.radius || 0.5, 24, 0, 6.283185, 0, 6.283185, 8, false,
            d.radiusTop || d.radius || 0.5, d.radiusBottom || d.radius || 0.5,
            0, 1, 24, 8, 0.4, 16, 6.283185, 2, 3, 5, 5, 0, ""
        ];
    }

    async function generateTiles() {
        const size = state.tileSize;
        const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for (let x = 0; x < 8; x++) {
            for (let z = 0; z < 8; z++) {
                const file = letters[x];
                const rank = z + 1;
                const squareId = `${file}${rank}`;
                const isWhite = (x + z) % 2 === 1;
                const xPos = (x * size) - state.offset;
                const zPos = -((rank - 1) * size) + state.offset;

                const tile = await createBanterObject(`Tile_${squareId}`, state.boardVisuals, new BS.Vector3(xPos, 0, zPos),
                    isWhite ? COLORS.white : COLORS.black, BS.GeometryType.BoxGeometry, { width: 0.5, height: 0.1, depth: 0.5 });

                tile.On('click', () => handleSquareClick(squareId));
                state.tiles[squareId] = tile;

                // Set initial color/transparency now that the tile is created
                setMaterialColor(tile, isWhite ? COLORS.white : COLORS.black);
            }
        }
    }

    const PIECE_MODELS = {
        'p': 'Pawn.glb', 'r': 'Rook.glb', 'n': 'Knight.glb',
        'b': 'Bishop.glb', 'q': 'Queen.glb', 'k': 'King.glb'
    };

    function getSquarePos(squareId) {
        const size = state.tileSize;
        const xIndex = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].indexOf(squareId[0]);
        const rank = parseInt(squareId[1]);
        const xPos = (xIndex * size) - state.offset;
        const zPos = -((rank - 1) * size) + state.offset;
        // Base raising to sit on board. 
        return new BS.Vector3(xPos, 0.15, zPos);
    }

    // HELPER: Get adjusted position for a specific piece type
    function getPiecePos(squareId, char) {
        const pos = getSquarePos(squareId);
        const type = char.toLowerCase();

        // Fine-tune Y heights per piece type
        const Y_ADJUSTMENTS = {
            'r': -0.01, // Rook
            'n': 0.04, // Knight
            'b': 0.03, // Bishop
            'q': 0.1, // Queen
            'k': 0.11  // King
        };

        if (Y_ADJUSTMENTS[type]) {
            pos.y += Y_ADJUSTMENTS[type];
        }
        return pos;
    }

    function getModelUrl(modelName) {
        try {
            // Use the captured 'currentScript' variable from the top of the IIFE
            if (scriptSrc) {
                // /Chess.js -> /models/Name.glb
                return new URL(`/models/${modelName}`, scriptSrc).href;
            }
        } catch (e) { console.error("Error resolving model URL:", e); }
        // Fallback if script tag parsing failed
        return `https://chess.firer.at/models/${modelName}`;
    }

    async function createPiece(char, squareId, parent) {
        try {
            console.log(`Creating piece ${char} at ${squareId}`);
            const isWhite = char === char.toUpperCase();
            const type = char.toLowerCase();
            const modelName = PIECE_MODELS[type];
            if (!modelName) {
                console.error(`No model for type ${type}`);
                return null;
            }

            const piece = await withTimeout(
                new BS.GameObject({
                    name: `Piece_${char}_${squareId}_${Math.random().toString(36).substr(2, 5)}`,
                    parent: parent,
                    localPosition: getPiecePos(squareId, char),
                    localEulerAngles: new BS.Vector3(0, isWhite ? 180 : 0, 0),
                    localScale: new BS.Vector3(1, 1, 1)
                }).Async(),
                5000,
                `GameObject ${char} on ${squareId}`
            );

            const folder = isWhite ? 'White' : 'Black';
            const url = getModelUrl(`${folder}/${modelName}`);
            console.log(`Loading GLB from: ${url}`);

            try {
                await withTimeout(
                    piece.AddComponent(new BS.BanterGLTF(url, false, false, false, false, false, false)),
                    5000,
                    `BanterGLTF ${char} on ${squareId}`
                );

                // Only add custom material if unlit or custom opacity is requested;
                // standard GLTF PBR textures/materials are already embedded inside White/ and Black/ GLBs
                if (config.lighting !== 'lit' || config.piecesOpacity < 1.0) {
                    const colorHex = isWhite ? COLORS.whitePiece : COLORS.blackPiece;
                    const colorVec4 = hexToVector4(colorHex);
                    colorVec4.w = config.piecesOpacity;
                    const isTransparent = config.piecesOpacity < 1.0;
                    const shader = isTransparent ? 'Unlit/DiffuseTransparent' : 'Unlit/Diffuse';
                    await withTimeout(
                        piece.AddComponent(new BS.BanterMaterial(shader, isTransparent ? null : '', colorVec4, BS.MaterialSide.Front, false)),
                        4000,
                        `BanterMaterial ${char} on ${squareId}`
                    );
                }
            } catch (glbErr) {
                console.error(`Failed to load GLTF for ${char}:`, glbErr);
            }

            // Collider for click - Stays on the main piece object for correct click handling
            await withTimeout(
                piece.AddComponent(new BS.BoxCollider(true, new BS.Vector3(0, 0.15, 0), new BS.Vector3(0.2, 0.15, 0.2))),
                4000,
                `BoxCollider ${char} on ${squareId}`
            );
            await piece.SetLayer(5); // UI layer

            piece.On('click', () => {
                const currentSq = Object.keys(state.pieces).find(key => state.pieces[key] === piece);
                console.log(`Piece clicked: ${char} at ${currentSq}`);
                if (currentSq) handleSquareClick(currentSq);
            });

            piece.pieceType = char;
            return piece;
        } catch (e) {
            console.error(`Failed to create piece ${char} at ${squareId}:`, e);
            return null;
        }
    }

    // Redraws can overlap (e.g. loading saved state on join while the first sync event
    // arrives). Two overlapping redraws both create a piece for the same empty slot and one
    // gets orphaned, so it is never hidden again (e.g. after a reset). Run one at a time,
    // and redraw once more if a new one was requested mid-run.
    let redrawing = null;
    let redrawAgain = false;
    let renderStatus = "idle";
    let lastRenderError = null;
    function syncBoard() {
        soundForState();
        redrawAgain = true;
        if (!redrawing) {
            redrawing = (async () => {
                try {
                    while (redrawAgain) {
                        redrawAgain = false;
                        await renderBoard();
                        updateTurnBoard();
                    }
                } finally {
                    redrawing = null;
                }
            })();
        }
        return redrawing;
    }

    async function renderBoard() {
        console.log("Syncing board...");
        try {
            renderStatus = "starting renderBoard";
            if (!state.piecesRoot) {
                state.piecesRoot = await new BS.GameObject("PiecesContainer").Async();
                await state.piecesRoot.SetParent(state.boardVisuals, false);
                let trans = await state.piecesRoot.AddComponent(new BS.Transform());
                trans.localPosition = new BS.Vector3(0, 0, 0);
            }

            const fen = chessGame.getFen();
            const rows = fen.split(' ')[0].split('/');
            const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            const newBoardState = {};

            // 1. Map current board state based on FEN
            rows.forEach((row, rowIndex) => {
                const rank = 8 - rowIndex;
                let fileIndex = 0;
                for (let char of row) {
                    if (parseInt(char)) fileIndex += parseInt(char);
                    else {
                        newBoardState[`${letters[fileIndex]}${rank}`] = char;
                        fileIndex++;
                    }
                }
            });

            // 2. Prepare pool of available pieces from current state
            const availablePieces = {}; // char -> [GameObject]
            if (state.pieces) {
                Object.values(state.pieces).forEach(p => {
                    const type = p.pieceType;
                    if (!availablePieces[type]) availablePieces[type] = [];
                    availablePieces[type].push(p);
                });
            }

            const nextPiecesMap = {};
            const pendingSquares = [];

            // 3. PASS 1: Keep pieces in place if possible
            for (const [sq, char] of Object.entries(newBoardState)) {
                const existingPieceOnSquare = state.pieces ? state.pieces[sq] : null;
                if (existingPieceOnSquare && existingPieceOnSquare.pieceType === char) {
                    // Exact match in place - LOCK IT
                    nextPiecesMap[sq] = existingPieceOnSquare;

                    // Remove from pool so it can't be stolen
                    const list = availablePieces[char];
                    if (list) {
                        const idx = list.indexOf(existingPieceOnSquare);
                        if (idx > -1) list.splice(idx, 1);
                    }
                } else {
                    // Needs a piece, try to resolve in Pass 2
                    pendingSquares.push({ sq, char });
                }
            }

            // 4. PASS 2: Match available moved pieces or schedule concurrent creation
            const piecesToCreate = [];
            for (const { sq, char } of pendingSquares) {
                if (availablePieces[char] && availablePieces[char].length > 0) {
                    const piece = availablePieces[char].pop();
                    const trans = piece.GetComponent(BS.ComponentType.Transform);
                    if (trans) trans.localPosition = getPiecePos(sq, char);
                    nextPiecesMap[sq] = piece;
                } else {
                    piecesToCreate.push({ sq, char });
                }
            }

            if (piecesToCreate.length > 0) {
                renderStatus = `creating ${piecesToCreate.length} pieces concurrently`;
                const createdResults = await Promise.all(
                    piecesToCreate.map(async ({ sq, char }) => {
                        const piece = await createPiece(char, sq, state.piecesRoot);
                        return { sq, piece };
                    })
                );
                for (const { sq, piece } of createdResults) {
                    if (piece) {
                        nextPiecesMap[sq] = piece;
                    }
                }
            }

            // 5. Destroy unused pieces (captured)
            for (const list of Object.values(availablePieces)) {
                for (const p of list) {
                    p.Destroy();
                }
            }

            // 6. Update State
            state.pieces = nextPiecesMap;
            renderStatus = `complete (${Object.keys(nextPiecesMap).length} pieces)`;
            console.log("Board sync complete.");
        } catch (e) {
            lastRenderError = e.message + " | " + (e.stack || "");
            renderStatus = "error: " + e.message;
            console.error("renderBoard error:", e);
        }
    }

    function setMaterialColor(go, hexColor) {
        if (!go) return;
        const mat = go.GetComponent((BS.ComponentType.Material ?? BS.ComponentType.BanterMaterial));
        if (mat) {
            const newColor = hexToVector4(hexColor);
            // If board is hidden, adjust tile alpha.
            if (config.hideBoard && go.name.startsWith("Tile_")) {
                if (hexColor === COLORS.selected || hexColor === COLORS.valid) {
                    newColor.w = 0.5; // Make selection/valid moves semi-transparent
                } else {
                    newColor.w = 0; // Keep normal tiles fully transparent
                }
            }
            mat.color = newColor;
        } else {
            console.warn("No BanterMaterial found on", go.name);
        }
    }

    function soundAudio(file) {
        let a = sounds.cache[file];
        if (!a) {
            a = sounds.cache[file] = new Audio(new URL(`Sounds/${file}.ogg`, scriptSrc || window.location.href).href);
            a.preload = 'auto';
        }
        return a;
    }

    // `name` is a key of SOUND_FILES; ones with several takes pick one at random.
    function playSound(name, delayMs = 0) {
        if (!(config.volume > 0) || sounds.muted) return;
        const volume = config.volume * distanceGain(config.boardPosition, config.soundNear, config.soundFar);
        if (volume < 0.005) return; // too far away to hear
        const takes = sounds.files[name] || 1;
        const file = takes > 1 ? name + (1 + Math.floor(Math.random() * takes)) : name;
        setTimeout(() => {
            try {
                const audio = soundAudio(file).cloneNode();
                audio.volume = Math.min(1, volume);
                audio.play().catch(() => {});
            } catch (e) { }
        }, delayMs);
    }

    // Call after every state change; repeats of the same state are ignored.
    function soundForState() {
        let next;
        try { next = soundSnapshot(); } catch (e) { return; }
        if (!next) return;
        const key = JSON.stringify(next);
        if (key === sounds.prevKey) return;
        const prev = sounds.prev;
        sounds.prev = JSON.parse(key);
        sounds.prevKey = key;
        if (sounds.live && prev) {
            try { chooseSounds(prev, sounds.prev); } catch (e) { console.warn("Sound error", e); }
        }
    }

    // Call once the saved game (if any) has loaded; sounds play from then on.
    function startSounds() {
        soundForState();
        sounds.live = true;
        headTracker();
        if (config.volume > 0) {
            for (const [name, takes] of Object.entries(sounds.files)) {
                if (takes > 1) for (let i = 1; i <= takes; i++) soundAudio(name + i);
                else soundAudio(name);
            }
        }
    }

    // --- Hearing distance ---
    // Sounds fade with the local player's distance from the game: full volume within `near` metres,
    // silent from `far` metres, so people elsewhere in the world aren't disturbed. The head position
    // comes from an empty object attached to the player's head (Unity reports where it is), or from
    // pose-update until that works. All the games on a page share one tracker.
    function headTracker() {
        if (window.BanterGamesHead) return window.BanterGamesHead;
        const head = window.BanterGamesHead = { marker: null, attaching: false, markerPos: null, posePos: null };
        const scene = BS.BanterScene.GetInstance();
        scene.On('pose-update', e => {
            const h = e && e.detail && e.detail.head;
            if (h && h.position) head.posePos = h.position;
        });
        const attach = async () => {
            const uid = scene.localUser && scene.localUser.uid;
            if (!uid || head.marker || head.attaching) return;
            head.attaching = true;
            try {
                const go = await new BS.GameObject("GameSoundsHead").Async();
                head.marker = go;
                if (typeof BS.AttachedObject === 'function') {
                    const point = BS.AvatarBoneName ? BS.AvatarBoneName.HEAD : 0;
                    const attached = await go.AddComponent(new BS.AttachedObject({ uid, avatarAttachmentPoint: point }));
                    await attached.Attach(uid);
                } else if (typeof scene.LegacyAttachObject === 'function' && BS.LegacyAttachmentPosition) {
                    await scene.LegacyAttachObject(go, uid, BS.LegacyAttachmentPosition.HEAD);
                } else {
                    return; // no way to attach here: pose-update only
                }
                const PN = BS.PN || BS.PropertyName;
                if (typeof go.WatchTransform === 'function' && PN) {
                    await go.WatchTransform([PN.position], t => {
                        if (head.marker === go && t && t.position) head.markerPos = t.position;
                    });
                }
            } finally {
                head.attaching = false;
            }
        };
        const tryAttach = () => attach().catch(e => console.warn("Game sounds: could not follow the head", e));
        // The SDK drops attachments when the player leaves, so the marker is made again when they
        // come back (a moment later, so the SDK is ready).
        scene.On('user-left', e => {
            if (!(e && e.detail && e.detail.isLocal)) return;
            try { if (head.marker) head.marker.Destroy(); } catch (err) { }
            head.marker = null;
            head.markerPos = null;
        });
        scene.On('user-joined', e => {
            if (e && e.detail && e.detail.isLocal && !head.marker) setTimeout(tryAttach, 5000);
        });
        (async () => {
            while (!scene.localUser || scene.localUser.uid === undefined) await new Promise(r => setTimeout(r, 500));
            await tryAttach();
        })();
        return head;
    }

    // 0-1: how loud a sound from `centre` (a world position) is for the local player.
    function distanceGain(centre, near, far) {
        const head = headTracker();
        const p = head.markerPos || head.posePos;
        if (!p || !centre) return 1; // not known yet, so play it
        const d = Math.hypot(p.x - centre.x, p.y - centre.y, p.z - centre.z);
        if (d <= near) return 1;
        if (!(far > near) || d >= far) return 0;
        const f = 1 - (d - near) / (far - near);
        return f * f;
    }

    // The mute button only mutes this game's sounds for you, and is remembered on this device. By
    // default it sits beside the Reset button, attached to it so it follows it; set mutePosition
    // (relative to the board) to place it on its own. `size` is the Reset button's
    // [width, height, depth], and `flat` is true when it lies flat with its label on top.
    async function createMuteButton(reset, parent, size, flat) {
        if (!reset) return;
        const v3 = a => Array.isArray(a) ? new BS.Vector3(...a) : a;
        const [rw, h, d] = size;
        const w = rw * 0.8;
        const btn = await new BS.GameObject("MuteButton").Async();
        const custom = !!config.mutePosition;
        await btn.SetParent(custom ? parent : reset, false);
        const t = await btn.AddComponent(new BS.Transform());
        if (custom) {
            t.localPosition = v3(config.mutePosition);
        } else {
            // Beside Reset, on the side away from the middle of the board
            const side = config.resetPosition && config.resetPosition.x < 0 ? -1 : 1;
            t.localPosition = new BS.Vector3(side * (rw / 2 + rw * 0.08 + w / 2), 0, 0);
        }
        t.localEulerAngles = v3(config.muteRotation);
        t.localScale = v3(config.muteScale);
        await btn.AddComponent(new BS.BanterGeometry(BS.GeometryType.BoxGeometry, null, w, h, d));
        // With hideUI it's invisible but still clickable, with its label showing (like Reset)
        const alpha = config.hideUI ? 0 : 1;
        const shader = config.hideUI ? 'Unlit/DiffuseTransparent' : (config.lighting === 'lit' ? 'Standard' : 'Unlit/Diffuse');
        const colour = () => sounds.muted ? new BS.Vector4(0.8, 0.42, 0.05, alpha) : new BS.Vector4(0.25, 0.25, 0.28, alpha);
        const mat = await btn.AddComponent(new BS.BanterMaterial(shader, "", colour(), BS.MaterialSide.Front, false));
        await btn.AddComponent(new BS.BoxCollider(true, new BS.Vector3(0, 0, 0), new BS.Vector3(w, h, d)));
        await btn.SetLayer(5);
        const label = await new BS.GameObject("Label").Async();
        await label.SetParent(btn, false);
        const lt = await label.AddComponent(new BS.Transform());
        lt.localPosition = flat ? new BS.Vector3(0, h / 2 + 0.005, 0) : new BS.Vector3(0, 0, d / 2 + 0.005);
        lt.localEulerAngles = flat ? new BS.Vector3(90, 180, 0) : new BS.Vector3(0, 180, 0);
        const lh = flat ? d : h;
        const text = await label.AddComponent(new BS.BanterText(
            "", new BS.Vector4(1, 1, 1, 1), BS.HorizontalAlignment.Center, BS.VerticalAlignment.Center,
            lh * 3.5, false, false, new BS.Vector2(w * 10, lh * 10)
        ));
        const update = () => {
            text.text = sounds.muted ? "UNMUTE" : "MUTE";
            mat.color = colour();
        };
        update();
        btn.On('click', () => {
            sounds.muted = !sounds.muted;
            try { localStorage.setItem(MUTE_KEY, sounds.muted ? '1' : '0'); } catch (e) { }
            update();
        });
    }

    // Cells (of a 2D board) that differ between two boards.
    function boardDiff(a, b) {
        const out = [];
        for (let r = 0; r < b.length; r++) {
            for (let c = 0; c < b[r].length; c++) {
                const was = a[r] ? a[r][c] : undefined;
                if (was !== b[r][c]) out.push({ r, c, was, now: b[r][c] });
            }
        }
        return out;
    }

    function soundSnapshot() {
        return chessGame ? { fen: chessGame.getFen() } : null;
    }

    // The piece placement part of a FEN as 64 characters, '.' for empty squares.
    function fenSquares(fen) {
        return fen.split(' ')[0].replace(/\d/g, d => '.'.repeat(+d)).replace(/\//g, '');
    }

    function chooseSounds(prev, next) {
        const a = fenSquares(prev.fen), b = fenSquares(next.fen);
        if (a === b) return;
        if (b === 'rnbqkbnrpppppppp' + '.'.repeat(32) + 'PPPPPPPPRNBQKBNR') return playSound('reset');
        const count = (s, re) => (s.match(re) || []).length;
        let changed = 0;
        for (let i = 0; i < 64; i++) if (a[i] !== b[i]) changed++;
        if (count(b, /[nbrqNBRQ]/g) > count(a, /[nbrqNBRQ]/g)) playSound('promote');
        else if (count(b, /[^.]/g) < count(a, /[^.]/g)) playSound('capture');
        else if (changed === 4) playSound('castle');
        else if (chessCheck('in_check', 'isCheck') && !chessCheck('in_checkmate', 'isCheckmate')) playSound('check');
        else playSound('move');
        if (chessCheck('in_checkmate', 'isCheckmate')) playSound('win', 350);
        else if (chessCheck('in_draw', 'isDraw') || chessCheck('in_stalemate', 'isStalemate')) playSound('draw', 350);
    }

    // --- Turn cooldown ---
    // Stops one person from taking both sides' turns by accident (a double click, or moving again
    // before the other player has had a chance). After you move, if it is now the other side's
    // turn, you must wait `turnCooldown` seconds before you can move for them. Someone playing on
    // their own can still play both sides; they just wait. Extra turns for the same side are not
    // affected. The time is only ever compared on the mover's own clock.
    const turnGuard = { lastMove: null, notice: '', noticeTimer: null, texts: [] };

    function localUid() {
        const user = BS.BanterScene.GetInstance().localUser;
        return user && user.uid !== undefined ? String(user.uid) : null;
    }

    // True (and shows a notice) if the local user has to wait before moving for `side`.
    function turnOnCooldown(side) {
        const m = turnGuard.lastMove;
        const uid = localUid();
        if (!m || !uid || !(config.turnCooldown > 0) || m.uid !== uid || m.side === side) return false;
        const left = config.turnCooldown * 1000 - (Date.now() - m.at);
        if (left <= 0) return false;
        showTurnNotice(`Other player's turn (${Math.ceil(left / 1000)}s)`);
        return true;
    }

    // Marks outgoing state as a move by the local user for `side`.
    function stampMove(data, side) {
        turnGuard.lastMove = { uid: localUid(), side, at: Date.now() };
        data.lastMove = turnGuard.lastMove;
        return data;
    }

    // Call with every state loaded from the space. A reset has no lastMove, which clears it.
    function loadLastMove(data) {
        turnGuard.lastMove = (data && data.lastMove) || null;
    }

    function showTurnNotice(text) {
        turnGuard.notice = text;
        clearTimeout(turnGuard.noticeTimer);
        turnGuard.noticeTimer = setTimeout(() => {
            turnGuard.notice = '';
            if (state.ui && state.ui.noticeLabel) state.ui.noticeLabel.text = "";
            updateTurnBoard();
        }, 3000);
        if (state.ui && state.ui.noticeLabel) state.ui.noticeLabel.text = text;
        updateTurnBoard();
    }

    function updateTurnBoard() {
        updateModernUI();
    }

    // chess.js renamed its methods (in_checkmate -> isCheckmate), so accept either.
    function chessCheck(oldName, newName) {
        const c = chessGame.chess;
        if (typeof c[newName] === 'function') return c[newName]();
        if (typeof c[oldName] === 'function') return c[oldName]();
        return false;
    }

    function turnStatusText() {
        if (!chessGame) return "";
        const toMove = chessGame.chess.turn() === 'w' ? 'White' : 'Black';
        const other = toMove === 'White' ? 'Black' : 'White';
        if (chessCheck('in_checkmate', 'isCheckmate')) return `Checkmate! ${other} wins`;
        if (chessCheck('in_draw', 'isDraw') || chessCheck('in_stalemate', 'isStalemate')) return "Draw!";
        if (chessCheck('in_check', 'isCheck')) return `${toMove}'s turn - check!`;
        return `${toMove}'s turn`;
    }

    function handleSquareClick(squareId) {
        const game = chessGame;
        const side = game.chess.turn();
        const local = getLocalUser();
        const localUidStr = local && local.uid !== undefined ? String(local.uid) : null;
        const white = state.gameState?.whitePlayer;
        const black = state.gameState?.blackPlayer;

        // Seat check: if a seat is claimed, only the seated player can move for that side.
        // If the player disconnected or is idle (>90s), allow another player to take over.
        if (side === 'w' && white) {
            const whitePresent = isPlayerPresent(white.uid);
            const whiteIdle = isSeatIdle(white);
            if (!whitePresent || whiteIdle) {
                if (localUidStr && String(white.uid) !== localUidStr) {
                    showTurnNotice(`White is ${!whitePresent ? 'disconnected' : 'idle'} — claimed seat`);
                    updateSeats({ uid: localUidStr, name: local ? (local.name || "Player") : "Player" }, black);
                }
            } else if (!localUidStr || String(white.uid) !== localUidStr) {
                showTurnNotice(`It is ${white.name}'s turn (White)`);
                return;
            }
        } else if (side === 'b' && black) {
            const blackPresent = isPlayerPresent(black.uid);
            const blackIdle = isSeatIdle(black);
            if (!blackPresent || blackIdle) {
                if (localUidStr && String(black.uid) !== localUidStr) {
                    showTurnNotice(`Black is ${!blackPresent ? 'disconnected' : 'idle'} — claimed seat`);
                    updateSeats(white, { uid: localUidStr, name: local ? (local.name || "Player") : "Player" });
                }
            } else if (!localUidStr || String(black.uid) !== localUidStr) {
                showTurnNotice(`It is ${black.name}'s turn (Black)`);
                return;
            }
        }

        if (turnOnCooldown(side)) return;

        if (!state.selectedSquare) {
            const piece = game.chess.get(squareId);
            if (piece) {
                if (piece.color !== side) return;
                state.selectedSquare = squareId;
                if (state.tiles[squareId]) setMaterialColor(state.tiles[squareId], COLORS.selected);
                game.getMoves(squareId).forEach(m => {
                    if (state.tiles[m.to]) setMaterialColor(state.tiles[m.to], COLORS.valid);
                });
            }
            return;
        }

        const move = { from: state.selectedSquare, to: squareId, promotion: 'q' };
        if (game.makeMove(move)) {
            const fen = game.getFen();
            const currentData = state.lastSpaceState || {};
            const boardState = stampMove({
                ...currentData,
                fen: fen,
                lastActionTime: Date.now()
            }, side);
            saveState(boardState);

            console.log("Optimistically syncing local board after move.");
            syncBoard();
            clearSelection();
            updateModernUI();
        } else {
            clearSelection();
            if (game.chess.get(squareId) && game.chess.get(squareId).color === side) {
                handleSquareClick(squareId); // Retry selection
            }
        }
    }

    function clearSelection() {
        state.selectedSquare = null;
        const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        for (let x = 0; x < 8; x++) {
            for (let z = 0; z < 8; z++) {
                const id = `${letters[x]}${z + 1}`;
                const isWhite = (x + z) % 2 === 1;
                if (state.tiles[id]) setMaterialColor(state.tiles[id], isWhite ? COLORS.white : COLORS.black);
            }
        }
    }

    async function getSpaceStateValue(key) {
        const scene = BS.BanterScene.GetInstance();
        while (!scene.localUser || scene.localUser.uid === undefined) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        const spaceState = scene.spaceState;
        if (spaceState.protected && spaceState.protected[key]) return spaceState.protected[key];
        if (spaceState.public && spaceState.public[key]) return spaceState.public[key];
        return null;
    }

    async function setupBanterStateListeners() {
        if (state.listenersSetup) return;
        state.listenersSetup = true;

        const scene = BS.BanterScene.GetInstance();
        const stateKey = 'chess_game_' + config.instance;

        // Listen for space state changes
        scene.On("space-state-changed", (e) => {
            const changes = e.detail.changes;
            // The `changes` array contains objects, so we need to check the `property` of each one.
            if (changes && changes.find(c => c.property === stateKey)) {
                const spaceState = scene.spaceState;
                const val = (spaceState.public && spaceState.public[stateKey]) || (spaceState.protected && spaceState.protected[stateKey]);
                
                if (val) {
                    try {
                        const gameState = JSON.parse(val);
                        state.gameState = gameState;
                        state.lastSpaceState = gameState;
                        loadLastMove(gameState);
                        console.log("Syncing game state from space:", gameState);
                        if (gameState.fen === 'reset') {
                            chessGame.reset();
                            syncBoard();
                            clearSelection();
                        } else if (gameState.fen) {
                            chessGame.loadFen(gameState.fen);
                            syncBoard();
                        }
                        updateModernUI();
                    } catch (err) {
                        console.error("Error parsing game state:", err);
                    }
                }
            }
        });

        // Free seats if a seated player leaves the space
        scene.On("user-left", (e) => {
            const leftUid = e && e.detail && e.detail.user && e.detail.user.uid;
            if (!leftUid) return;
            const white = state.gameState?.whitePlayer;
            const black = state.gameState?.blackPlayer;
            let changed = false;
            let newWhite = white;
            let newBlack = black;
            if (white && String(white.uid) === String(leftUid)) {
                newWhite = null;
                changed = true;
            }
            if (black && String(black.uid) === String(leftUid)) {
                newBlack = null;
                changed = true;
            }
            if (changed) {
                updateSeats(newWhite, newBlack);
            }
        });

        scene.On("user-joined", () => {
            updateModernUI();
        });

        // Initial load
        const initialVal = await getSpaceStateValue(stateKey);
        if (initialVal) {
            try {
                const gameState = JSON.parse(initialVal);
                state.gameState = gameState;
                state.lastSpaceState = gameState;
                loadLastMove(gameState);
                console.log("Loaded initial game state:", gameState);
                if (gameState.fen === 'reset') {
                    chessGame.reset();
                } else if (gameState.fen) {
                    chessGame.loadFen(gameState.fen);
                }
            } catch (err) {
                console.error("Error parsing initial game state:", err);
            }
        }
        await syncBoard();
        updateModernUI();
        startSounds();
        
        // The board is now synced only through space state changes.
    }

    // --- Main Initializer ---
    let initialized = false;
    const initGame = async () => {
        if (initialized) return;
        initialized = true;
        console.log("Chess: Initializing Game...");

        await loadDependencies();
        // Initialize Game
        if (!chessGame) {
            chessGame = new ChessGame();
        }

        // Convert config arrays to BS.Vector3 now that BS is available
        config.boardPosition = new BS.Vector3(...config.boardPosition);
        config.boardRotation = new BS.Vector3(...config.boardRotation);
        config.boardScale = new BS.Vector3(...config.boardScale);
        config.resetPosition = new BS.Vector3(...config.resetPosition);
        config.resetRotation = new BS.Vector3(...config.resetRotation);
        config.resetScale = new BS.Vector3(...config.resetScale);
        config.scoreboardPosition = new BS.Vector3(...config.scoreboardPosition);
        config.scoreboardRotation = new BS.Vector3(...config.scoreboardRotation);
        config.scoreboardScale = new BS.Vector3(...config.scoreboardScale);

        // Note: Floor creation removed as per user request. 
        // Host spaces should provide their own ground/environment.
        await initializeBoard();
    };

    window.__chessDebug = () => ({
        fen: chessGame ? chessGame.getFen() : null,
        piecesCount: state.pieces ? Object.keys(state.pieces).length : 0,
        piecesKeys: state.pieces ? Object.keys(state.pieces) : null,
        tilesCount: state.tiles ? Object.keys(state.tiles).length : 0,
        renderStatus,
        lastRenderError,
        piecesRoot: !!state.piecesRoot,
        boardRoot: !!state.boardRoot,
        listenersSetup: state.listenersSetup,
        hasUI: !!(state.ui && state.ui.obj),
        uiPos: state.ui ? state.ui.savedPos : null,
        uiScale: state.ui ? state.ui.savedScale : null,
        isCulled: isCulled,
        whitePlayer: state.gameState?.whitePlayer,
        blackPlayer: state.gameState?.blackPlayer
    });

    // --- Check for BS availability ---
    if (window.BS) {
        initGame();
    } else {
        window.addEventListener("unity-loaded", initGame);
        window.addEventListener("bs-loaded", initGame);
    }

})();