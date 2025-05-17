const canvas = document.getElementById("blocksCanvas");
const ctx = canvas.getContext("2d");

// Grid size configurations
const GRID_SIZES = {
    extraSmall: {
        width: 9,
        height: 16,
        cellSize: 20
    },
    small: {
        width: 18,
        height: 32,
        cellSize: 16
    },
    medium: {
        width: 27,
        height: 48,
        cellSize: 14
    }
};

// Current grid size
let currentGridSize = 'medium';
let GRID_SIZE = GRID_SIZES[currentGridSize].cellSize;
let GRID_WIDTH = GRID_SIZES[currentGridSize].width;
let GRID_HEIGHT = GRID_SIZES[currentGridSize].height;

// Set the canvas dimensions based on the container size
function resizeCanvas() {
    const container = canvas.parentElement;
    const containerHeight = container.clientHeight;
    const containerWidth = container.parentElement.clientWidth;
    
    // Calculate the maximum size that maintains the aspect ratio
    const aspectRatio = GRID_WIDTH / GRID_HEIGHT;
    let width, height;
    
    if (containerWidth / containerHeight > aspectRatio) {
        height = containerHeight;
        width = height * aspectRatio;
    } else {
        width = containerWidth;
        height = width / aspectRatio;
    }
    
    // Set the canvas size to the nearest multiple of GRID_SIZE
    canvas.width = Math.floor(width / GRID_SIZE) * GRID_SIZE;
    canvas.height = Math.floor(height / GRID_SIZE) * GRID_SIZE;
    
    // Scale the canvas to fit the container
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
}

// Initial resize
resizeCanvas();

// Resize on window resize
window.addEventListener('resize', resizeCanvas);

let gameOver = false;
let selectedObject = null; // Track selected object for placement
let isDragging = false; // Track if we're currently dragging
let isSimulationRunning = false; // Track if simulation is running

const levelStorageKey = "savedLevel";

// **Objects in the Level**
let walls = [];
let finishLines = [];
let shrinkers = [];
let pushers = []; // Array to store pusher blocks
let playerSquares = []; // Array to store player squares

// Player colors
const PLAYER_COLORS = [
    "#FF0000", // Red
    "#00FF00", // Green
    "#0000FF", // Blue
    "#FFFF00", // Yellow
    "#FF00FF", // Magenta
    "#00FFFF"  // Cyan
];

// Pusher controls
const pusherLengthInput = document.getElementById("pusherLength");
const pusherSpeedSlider = document.getElementById("pusherSpeed");
const pusherSpeedValue = document.getElementById("pusherSpeedValue");
let selectedLength = 3;
let selectedSpeed = 0.5;

pusherLengthInput.addEventListener("input", (e) => {
    let value = parseInt(e.target.value);
    if (value < 1) value = 1;
    if (value > 99) value = 99;
    selectedLength = value;
    e.target.value = value;
});

pusherSpeedSlider.addEventListener("input", (e) => {
    selectedSpeed = parseFloat(e.target.value);
    pusherSpeedValue.textContent = selectedSpeed.toFixed(1);
});

class Pusher {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.extension = 0;
        this.extending = true;
        this.color = "#e67e22";
        this.length = selectedLength;
        this.speed = selectedSpeed;
        this.maxExtension = this.length * GRID_SIZE;
    }

    update() {
        if (this.extending) {
            this.extension += this.speed;
            if (this.extension >= this.maxExtension) {
                this.extending = false;
            }
        } else {
            this.extension -= this.speed;
            if (this.extension <= 0) {
                this.extending = true;
            }
        }
    }

    draw() {
        // Draw base
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, GRID_SIZE, GRID_SIZE);
        
        // Draw extension
        ctx.fillStyle = "#f39c12"; // Slightly different color for extension
        switch (this.direction) {
            case 'north':
                ctx.fillRect(this.x, this.y - this.extension, GRID_SIZE, this.extension);
                break;
            case 'south':
                ctx.fillRect(this.x, this.y + GRID_SIZE, GRID_SIZE, this.extension);
                break;
            case 'east':
                ctx.fillRect(this.x + GRID_SIZE, this.y, this.extension, GRID_SIZE);
                break;
            case 'west':
                ctx.fillRect(this.x - this.extension, this.y, this.extension, GRID_SIZE);
                break;
        }
        
        // Draw direction indicator
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const arrow = {
            'north': '↑',
            'south': '↓',
            'east': '→',
            'west': '←'
        }[this.direction];
        ctx.fillText(arrow, this.x + GRID_SIZE/2, this.y + GRID_SIZE/2);
    }

    getBounds() {
        switch (this.direction) {
            case 'north':
                return {
                    x: this.x,
                    y: this.y - this.extension,
                    width: GRID_SIZE,
                    height: this.extension + GRID_SIZE
                };
            case 'south':
                return {
                    x: this.x,
                    y: this.y,
                    width: GRID_SIZE,
                    height: this.extension + GRID_SIZE
                };
            case 'east':
                return {
                    x: this.x,
                    y: this.y,
                    width: this.extension + GRID_SIZE,
                    height: GRID_SIZE
                };
            case 'west':
                return {
                    x: this.x - this.extension,
                    y: this.y,
                    width: this.extension + GRID_SIZE,
                    height: GRID_SIZE
                };
        }
    }
}

// Direction selection
let selectedDirection = null;
const directionSelector = document.getElementById("directionSelector");
const directionButtons = document.querySelectorAll(".direction-btn");

directionButtons.forEach(button => {
    button.addEventListener("click", (e) => {
        selectedDirection = e.target.dataset.direction;
        directionButtons.forEach(btn => btn.classList.remove("selected"));
        e.target.classList.add("selected");
    });
});

// Show/hide direction selector when pusher is selected
document.querySelectorAll(".item").forEach(item => {
    item.addEventListener("click", (e) => {
        // Remove selected class from all items
        document.querySelectorAll('.item').forEach(i => i.classList.remove('selected'));
        // Add selected class to clicked item
        e.target.classList.add('selected');
        selectedObject = e.target.dataset.type;
        
        // Show/hide direction selector
        if (selectedObject === "pusher") {
            directionSelector.style.display = "block";
            // If we already have a direction selected, keep it
            if (!selectedDirection) {
                // Select the first direction by default
                selectedDirection = 'north';
                directionButtons[0].classList.add("selected");
            }
        } else {
            directionSelector.style.display = "none";
            selectedDirection = null;
            directionButtons.forEach(btn => btn.classList.remove("selected"));
        }
    });
});

// Initialize player blocks
function initializePlayerBlocks(count) {
    const playerBlocksContainer = document.getElementById("playerBlocks");
    playerBlocksContainer.innerHTML = "";
    playerSquares = [];

    for (let i = 0; i < count; i++) {
        const playerBlock = document.createElement("div");
        playerBlock.className = "player-block";
        playerBlock.style.backgroundColor = PLAYER_COLORS[i];
        playerBlock.textContent = i + 1;
        playerBlock.dataset.playerIndex = i;

        // Change from dragstart to click for more reliable placement
        playerBlock.addEventListener("click", (e) => {
            selectedObject = `player${i}`;
            // Highlight the selected player block
            document.querySelectorAll('.player-block').forEach(block => {
                block.style.border = 'none';
            });
            playerBlock.style.border = '2px solid white';
        });

        playerBlocksContainer.appendChild(playerBlock);
        playerSquares.push(null); // Will store the Square instance when placed
    }
}

// Handle player count slider
const playerCountSlider = document.getElementById("playerCount");
const playerCountValue = document.getElementById("playerCountValue");

playerCountSlider.addEventListener("input", (e) => {
    const count = parseInt(e.target.value);
    playerCountValue.textContent = count;
    initializePlayerBlocks(count);
});

// Initialize with 1 player
initializePlayerBlocks(1);

class Square {
    constructor(x, y, size, angle, color) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.shrunk = false;
        this.speed = 1.32; // 0.66 * 2 (original speed was 2)
        this.setVelocity(angle);
    }

    setVelocity(angle) {
        // Maintain constant speed while preserving direction
        const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if (magnitude > 0) {
            this.dx = (this.dx / magnitude) * this.speed;
            this.dy = (this.dy / magnitude) * this.speed;
        } else {
            this.dx = this.speed * Math.cos(angle);
            this.dy = this.speed * Math.sin(angle);
        }
    }

    update() {
        if (gameOver) return;

        // Store previous position
        const prevX = this.x;
        const prevY = this.y;

        this.x += this.dx;
        this.y += this.dy;

        // Bounce off the boundaries of the canvas
        if (this.x <= 0 || this.x + this.size >= canvas.width) {
            this.dx *= -1;
            this.x = Math.max(0, Math.min(canvas.width - this.size, this.x));
            this.setVelocity(Math.atan2(this.dy, this.dx));
        }
        if (this.y <= 0 || this.y + this.size >= canvas.height) {
            this.dy *= -1;
            this.y = Math.max(0, Math.min(canvas.height - this.size, this.y));
            this.setVelocity(Math.atan2(this.dy, this.dx));
        }

        // Check collision with walls
        walls.forEach(wall => {
            const bounds = { x: wall.x, y: wall.y, width: GRID_SIZE, height: GRID_SIZE };
            if (
                this.x < bounds.x + bounds.width &&
                this.x + this.size > bounds.x &&
                this.y < bounds.y + bounds.height &&
                this.y + this.size > bounds.y
            ) {
                let overlapX = Math.min(this.x + this.size - bounds.x, bounds.x + bounds.width - this.x);
                let overlapY = Math.min(this.y + this.size - bounds.y, bounds.y + bounds.height - this.y);

                if (overlapX < overlapY) {
                    this.dx *= -1;
                    this.x = prevX;
                } else {
                    this.dy *= -1;
                    this.y = prevY;
                }
                this.setVelocity(Math.atan2(this.dy, this.dx));
            }
        });

        // Check collision with pushers
        pushers.forEach(pusher => {
            const bounds = pusher.getBounds();
            if (
                this.x < bounds.x + bounds.width &&
                this.x + this.size > bounds.x &&
                this.y < bounds.y + bounds.height &&
                this.y + this.size > bounds.y
            ) {
                // Calculate which side of the pusher we hit
                const leftDist = Math.abs(this.x + this.size - bounds.x);
                const rightDist = Math.abs(bounds.x + bounds.width - this.x);
                const topDist = Math.abs(this.y + this.size - bounds.y);
                const bottomDist = Math.abs(bounds.y + bounds.height - this.y);

                const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);

                // Move the block outside the pusher based on which side it hit
                if (minDist === leftDist) {
                    this.x = bounds.x - this.size;
                    this.dx = -Math.abs(this.dx);
                } else if (minDist === rightDist) {
                    this.x = bounds.x + bounds.width;
                    this.dx = Math.abs(this.dx);
                } else if (minDist === topDist) {
                    this.y = bounds.y - this.size;
                    this.dy = -Math.abs(this.dy);
                } else {
                    this.y = bounds.y + bounds.height;
                    this.dy = Math.abs(this.dy);
                }

                // Normalize velocity to maintain constant speed
                this.setVelocity(Math.atan2(this.dy, this.dx));
            }
        });

        // Check collision with other player blocks
        playerSquares.forEach(otherSquare => {
            if (otherSquare === this) return; // Skip self

            if (
                this.x < otherSquare.x + otherSquare.size &&
                this.x + this.size > otherSquare.x &&
                this.y < otherSquare.y + otherSquare.size &&
                this.y + this.size > otherSquare.y
            ) {
                // Calculate overlap in both directions
                const overlapX = Math.min(
                    this.x + this.size - otherSquare.x,
                    otherSquare.x + otherSquare.size - this.x
                );
                const overlapY = Math.min(
                    this.y + this.size - otherSquare.y,
                    otherSquare.y + otherSquare.size - this.y
                );

                // Determine which axis has the smallest overlap
                if (overlapX < overlapY) {
                    // Horizontal collision
                    if (this.x < otherSquare.x) {
                        this.x = otherSquare.x - this.size;
                    } else {
                        this.x = otherSquare.x + otherSquare.size;
                    }
                    this.dx *= -1;
                } else {
                    // Vertical collision
                    if (this.y < otherSquare.y) {
                        this.y = otherSquare.y - this.size;
                    } else {
                        this.y = otherSquare.y + otherSquare.size;
                    }
                    this.dy *= -1;
                }

                // Normalize velocity to maintain constant speed
                this.setVelocity(Math.atan2(this.dy, this.dx));
            }
        });

        // Check collision with shrinkers
        shrinkers.forEach(shrinker => {
            if (!this.shrunk &&
                this.x < shrinker.x + GRID_SIZE &&
                this.x + this.size > shrinker.x &&
                this.y < shrinker.y + GRID_SIZE &&
                this.y + this.size > shrinker.y
            ) {
                this.size *= 0.5;
                this.shrunk = true;
            }
        });

        // Check collision with finish line
        finishLines.forEach(finish => {
            if (
                this.x < finish.x + GRID_SIZE &&
                this.x + this.size > finish.x &&
                this.y < finish.y + GRID_SIZE &&
                this.y + this.size > finish.y
            ) {
                gameOver = true;
                alert("You Win!");
            }
        });
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.size, this.size);
    }
}

// **Handles Placement**
canvas.addEventListener("mousedown", (e) => {
    if (selectedObject) {
        isDragging = true;
        placeObject(e);
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (isDragging && selectedObject) {
        placeObject(e);
    }
});

canvas.addEventListener("mouseup", () => {
    isDragging = false;
    // Only clear player selection, keep other items selected
    if (selectedObject && selectedObject.startsWith("player")) {
        const playerIndex = parseInt(selectedObject.replace("player", ""));
        const playerBlock = document.querySelector(`[data-player-index="${playerIndex}"]`);
        if (playerBlock) {
            playerBlock.style.border = 'none';
        }
        selectedObject = null;
    }
});

canvas.addEventListener("mouseleave", () => {
    isDragging = false;
    // Only clear player selection, keep other items selected
    if (selectedObject && selectedObject.startsWith("player")) {
        selectedObject = null;
    }
});

function placeObject(e) {
    // Get the exact mouse position relative to the canvas
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Calculate the grid position
    let gridX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
    let gridY = Math.floor(y / GRID_SIZE) * GRID_SIZE;

    // Check if we're within canvas bounds
    if (gridX < 0 || gridX >= canvas.width || gridY < 0 || gridY >= canvas.height) {
        return;
    }

    // Check if we already have an object at this position
    let positionOccupied = [...walls, ...finishLines, ...shrinkers, ...pushers].some(
        obj => obj.x === gridX && obj.y === gridY
    );

    if (!positionOccupied) {
        if (selectedObject === "wall") {
            walls.push({ x: gridX, y: gridY, color: "gray" });
        } else if (selectedObject === "finish") {
            finishLines.push({ x: gridX, y: gridY });
        } else if (selectedObject === "shrinker") {
            shrinkers.push({ x: gridX, y: gridY, color: "blue" });
        } else if (selectedObject === "pusher" && selectedDirection) {
            pushers.push(new Pusher(gridX, gridY, selectedDirection));
        } else if (selectedObject.startsWith("player")) {
            const playerIndex = parseInt(selectedObject.replace("player", ""));
            if (!playerSquares[playerIndex]) {
                playerSquares[playerIndex] = new Square(
                    gridX,
                    gridY,
                    GRID_SIZE,
                    Math.random() * Math.PI * 2,
                    PLAYER_COLORS[playerIndex]
                );
                const playerBlock = document.querySelector(`[data-player-index="${playerIndex}"]`);
                if (playerBlock) {
                    playerBlock.classList.add("used");
                    playerBlock.style.border = 'none';
                }
                selectedObject = null;
            }
        }
    }
}

// **Draw Grid + Level Objects**
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    for (let x = 0; x < canvas.width; x += GRID_SIZE) {
        for (let y = 0; y < canvas.height; y += GRID_SIZE) {
            ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
        }
    }

    // Draw static objects
    walls.forEach(obj => {
        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.x, obj.y, GRID_SIZE, GRID_SIZE);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(obj.x, obj.y, GRID_SIZE, GRID_SIZE);
    });

    // Draw shrinkers
    shrinkers.forEach(obj => {
        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.x, obj.y, GRID_SIZE, GRID_SIZE);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(obj.x, obj.y, GRID_SIZE, GRID_SIZE);
    });

    // Draw finish lines with checkered pattern
    finishLines.forEach(finish => {
        const CHECKER_SIZE = GRID_SIZE / 2;
        
        // Draw the four checkers
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                // White squares in top right and bottom left
                const isWhite = (i === 1 && j === 0) || (i === 0 && j === 1);
                ctx.fillStyle = isWhite ? "#FFFFFF" : "#000000";
                ctx.fillRect(
                    finish.x + (i * CHECKER_SIZE),
                    finish.y + (j * CHECKER_SIZE),
                    CHECKER_SIZE,
                    CHECKER_SIZE
                );
            }
        }
        
        // Add border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(finish.x, finish.y, GRID_SIZE, GRID_SIZE);
    });

    // Draw pushers
    pushers.forEach(pusher => {
        pusher.draw();
    });
}

// **Save/Load Level**
document.getElementById("saveButton").addEventListener("click", () => {
    const playerPositions = playerSquares.map(square => 
        square ? { x: square.x, y: square.y, color: square.color } : null
    );
    
    localStorage.setItem(levelStorageKey, JSON.stringify({ 
        walls, 
        finishLines, 
        shrinkers,
        pushers: pushers.map(p => ({
            x: p.x,
            y: p.y,
            direction: p.direction,
            length: p.length,
            speed: p.speed
        })),
        playerPositions
    }));
    alert("Level saved!");
});

document.getElementById("loadButton").addEventListener("click", () => {
    const levelData = localStorage.getItem(levelStorageKey);
    if (levelData) {
        let parsedData = JSON.parse(levelData);
        walls = parsedData.walls;
        finishLines = parsedData.finishLines;
        shrinkers = parsedData.shrinkers;
        pushers = parsedData.pushers ? parsedData.pushers.map(p => {
            const pusher = new Pusher(p.x, p.y, p.direction);
            pusher.length = p.length;
            pusher.speed = p.speed;
            pusher.maxExtension = pusher.length * GRID_SIZE;
            return pusher;
        }) : [];
        
        if (parsedData.playerPositions) {
            playerSquares = parsedData.playerPositions.map(pos => 
                pos ? new Square(pos.x, pos.y, GRID_SIZE, Math.random() * Math.PI * 2, pos.color) : null
            );
        }
        
        playerSquares.forEach((square, index) => {
            if (square) {
                const playerBlock = document.querySelector(`[data-player-index="${index}"]`);
                if (playerBlock) {
                    playerBlock.classList.add("used");
                }
            }
        });
        alert("Level loaded!");
    } else alert("No saved level found!");
});

// **Simulation Control**
const simulationButton = document.getElementById("simulationButton");

simulationButton.addEventListener("click", () => {
    if (isSimulationRunning) {
        // Pause simulation
        isSimulationRunning = false;
        simulationButton.textContent = "Start Simulation";
    } else {
        // Start simulation
        if (!playerSquares.some(square => square)) {
            alert("Please place at least one player before starting the simulation!");
            return;
        }
        isSimulationRunning = true;
        simulationButton.textContent = "Pause Simulation";
    }
});

// **Clear Canvas**
document.getElementById("clearButton").addEventListener("click", () => {
    if (isSimulationRunning) {
        alert("Please pause the simulation before clearing the canvas!");
        return;
    }
    
    // Clear all objects except player squares
    walls = [];
    finishLines = [];
    shrinkers = [];
    pushers = [];
    gameOver = false;
    
    // Reset player block UI
    document.querySelectorAll('.player-block').forEach(block => {
        block.classList.remove("used");
        block.style.border = 'none';
    });
});

// **Game Loop**
function animate() {
    if (gameOver) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the grid
    drawGrid();
    
    // Draw all static objects
    walls.forEach(wall => {
        ctx.fillStyle = wall.color;
        ctx.fillRect(wall.x, wall.y, GRID_SIZE, GRID_SIZE);
    });

    // Draw pushers
    pushers.forEach(pusher => {
        pusher.draw();
    });

    // Update pushers only during simulation
    if (isSimulationRunning) {
        pushers.forEach(pusher => {
            pusher.update();
        });
    }

    // Handle player squares
    playerSquares.forEach((square, index) => {
        if (square) {
            if (isSimulationRunning) {
                // Update position during simulation
                square.update();
            }
            // Always draw the square
            square.draw();
        }
    });

    requestAnimationFrame(animate);
}

animate();

// Grid size buttons
const gridSizeButtons = {
    extraSmall: document.getElementById('extraSmallGrid'),
    small: document.getElementById('smallGrid'),
    medium: document.getElementById('mediumGrid')
};

function clearGrid() {
    // Only clear non-player objects
    walls = [];
    finishLines = [];
    shrinkers = [];
    pushers = [];
    gameOver = false;
    isSimulationRunning = false;
    simulationButton.textContent = "Start Simulation";
}

// Add click handlers for grid size buttons
Object.entries(gridSizeButtons).forEach(([size, button]) => {
    button.addEventListener('click', () => {
        if (isSimulationRunning) {
            alert("Please pause the simulation before changing grid size!");
            return;
        }

        // Update selected button
        Object.values(gridSizeButtons).forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        
        // Update grid size
        currentGridSize = size;
        GRID_SIZE = GRID_SIZES[size].cellSize;
        GRID_WIDTH = GRID_SIZES[size].width;
        GRID_HEIGHT = GRID_SIZES[size].height;
        
        // Resize canvas
        resizeCanvas();
        
        // Clear all objects including player squares
        walls = [];
        finishLines = [];
        shrinkers = [];
        pushers = [];
        playerSquares = [];
        gameOver = false;
        isSimulationRunning = false;
        simulationButton.textContent = "Start Simulation";
        
        // Reset player block UI
        document.querySelectorAll('.player-block').forEach(block => {
            block.classList.remove("used");
            block.style.border = 'none';
        });
        
        // Redraw the grid
        drawGrid();
    });
});

// Premade Level
const premadeButton = document.getElementById("premadeButton");

function loadPremadeLevel() {
    // Check if we're on the small grid size
    if (currentGridSize !== 'small') {
        alert("Premade level only works on the small grid size. Please switch to small grid first.");
        return;
    }

    // Clear existing level objects but preserve player squares
    walls = [];
    finishLines = [];
    shrinkers = [];
    pushers = [];
    gameOver = false;
    isSimulationRunning = false;
    simulationButton.textContent = "Start Simulation";
    
    // Reset player block UI
    document.querySelectorAll('.player-block').forEach(block => {
        block.classList.remove("used");
        block.style.border = 'none';
    });

    // Create Pac-Man style maze pattern
    const maze = [
        "",
        "",
        "",
        "",
        "",
        "      ##########################",
        "      ##########################",
        "      ##########################",
        "      ##########################",
        "",
        "",
        "",
        "",
        "",
        "##########################   ",
        "##########################   ",
        "##########################   ",
        "##########################   ",
        "",
        "",
        "",
        "",
        "",
        "      ##########################",
        "      ##########################",
        "      ##########################",
        "      ##########################",
        "",
        "",
        "",
        "",
        "",
        "##########################   ",
        "##########################   ",
        "##########################   ",
        "##########################   ",
        "",
        "",
        "",
        "",
        "",
        "      ##########################",
        "      ##########################",
        "      ##########################",
        "      ##########################",
    ];

    // Convert maze pattern to walls
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            if (maze[y][x] === '#') {
                walls.push({ 
                    x: x * GRID_SIZE, 
                    y: y * GRID_SIZE, 
                    color: "gray" 
                });
            }
        }
    }

    // Add pushers at strategic points (like ghost positions)
    const pusherPositions = [
        // First block of walls
        { x: 6, y: 9, direction: 'south', length: 4, speed: 0.2 },
        { x: 7, y: 9, direction: 'south', length: 4, speed: 0.2 },
        { x: 8, y: 9, direction: 'south', length: 4, speed: 0.2 },
        { x: 9, y: 9, direction: 'south', length: 4, speed: 0.2 },
        // Second block of walls
        { x: 22, y: 18, direction: 'south', length: 4, speed: 0.2 },
        { x: 23, y: 18, direction: 'south', length: 4, speed: 0.2 },
        { x: 24, y: 18, direction: 'south', length: 4, speed: 0.2 },
        { x: 25, y: 18, direction: 'south', length: 4, speed: 0.2 },
        // Third block of walls
        { x: 6, y: 27, direction: 'south', length: 4, speed: 0.2 },
        { x: 7, y: 27, direction: 'south', length: 4, speed: 0.2 },
        { x: 8, y: 27, direction: 'south', length: 4, speed: 0.2 },
        { x: 9, y: 27, direction: 'south', length: 4, speed: 0.2 },
        // Fourth block of walls
        { x: 22, y: 36, direction: 'south', length: 4, speed: 0.2 },
        { x: 23, y: 36, direction: 'south', length: 4, speed: 0.2 },
        { x: 24, y: 36, direction: 'south', length: 4, speed: 0.2 },
        { x: 25, y: 36, direction: 'south', length: 4, speed: 0.2 },
        // Fifth block of walls
        { x: 6, y: 45, direction: 'south', length: 4, speed: 0.2 },
        { x: 7, y: 45, direction: 'south', length: 4, speed: 0.2 },
        { x: 8, y: 45, direction: 'south', length: 4, speed: 0.2 },
        { x: 9, y: 45, direction: 'south', length: 4, speed: 0.2 }
    ];
    
    pusherPositions.forEach(pos => {
        const pusher = new Pusher(
            pos.x * GRID_SIZE,
            pos.y * GRID_SIZE,
            pos.direction
        );
        pusher.length = pos.length;
        pusher.speed = pos.speed;
        pusher.maxExtension = pusher.length * GRID_SIZE;
        pushers.push(pusher);
    });

    // Add finish lines in different positions
    const finishLinePositions = [
        { x: 15, y: 15 },  // Top left
        { x: 15, y: 30 },  // Bottom left
        { x: 30, y: 15 },  // Top right
        { x: 30, y: 30 }   // Bottom right
    ];
    
    finishLinePositions.forEach(pos => {
        finishLines.push({ 
            x: pos.x * GRID_SIZE, 
            y: pos.y * GRID_SIZE
        });
    });

    // Only add new players if there are no existing players
    if (!playerSquares.some(square => square)) {
        // Add 4 players in the bottom right
        const playerStartPositions = [
            { x: 35, y: 35 },  // Bottom right corner
            { x: 35, y: 36 },  // One block up
            { x: 36, y: 35 },  // One block left
            { x: 36, y: 36 }   // One block up and left
        ];

        playerStartPositions.forEach((pos, index) => {
            playerSquares[index] = new Square(
                pos.x * GRID_SIZE,
                pos.y * GRID_SIZE,
                GRID_SIZE,
                Math.random() * Math.PI * 2,
                PLAYER_COLORS[index]
            );
            
            // Update player block UI
            const playerBlock = document.querySelector(`[data-player-index="${index}"]`);
            if (playerBlock) {
                playerBlock.classList.add("used");
            }
        });
    }
}

premadeButton.addEventListener("click", () => {
    if (isSimulationRunning) {
        alert("Please pause the simulation before loading the premade level!");
        return;
    }

    // Switch to small grid size if not already on it
    if (currentGridSize !== 'small') {
        // Update selected button
        Object.values(gridSizeButtons).forEach(btn => btn.classList.remove('selected'));
        gridSizeButtons.small.classList.add('selected');
        
        // Update grid size
        currentGridSize = 'small';
        GRID_SIZE = GRID_SIZES.small.cellSize;
        GRID_WIDTH = GRID_SIZES.small.width;
        GRID_HEIGHT = GRID_SIZES.small.height;
        
        // Resize canvas
        resizeCanvas();
        
        // Clear the grid
        clearGrid();
    }

    // Load the premade level
    loadPremadeLevel();
});
