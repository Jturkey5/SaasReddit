const canvas = document.getElementById("blocksCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1920;
canvas.height = 1080;

const SPEED = 4; // Constant speed for all squares

class Square {
    constructor(x, y, size, angle, color) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.mass = 1; // Assume all squares have the same mass
        this.setVelocity(angle);
    }

    setVelocity(angle) {
        this.dx = SPEED * Math.cos(angle);
        this.dy = SPEED * Math.sin(angle);
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;

        // Bounce off walls
        if (this.x <= 0 || this.x + this.size >= canvas.width) {
            this.dx *= -1;
        }
        if (this.y <= 0 || this.y + this.size >= canvas.height) {
            this.dy *= -1;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);

        // Draw white border
        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.strokeRect(this.x, this.y, this.size, this.size);
    }
}

// Create four squares with different colors and random angles
const squares = [
    new Square(100, 100, 100, Math.random() * Math.PI * 2, "red"),
    new Square(300, 200, 100, Math.random() * Math.PI * 2, "green"),
    new Square(500, 400, 100, Math.random() * Math.PI * 2, "blue"),
    new Square(700, 500, 100, Math.random() * Math.PI * 2, "yellow"),
];

function checkCollisions() {
    for (let i = 0; i < squares.length; i++) {
        for (let j = i + 1; j < squares.length; j++) {
            let a = squares[i];
            let b = squares[j];

            if (
                a.x < b.x + b.size &&
                a.x + a.size > b.x &&
                a.y < b.y + b.size &&
                a.y + a.size > b.y
            ) {
                resolveCollision(a, b);
            }
        }
    }
}

// Proper 2D elastic collision physics
function resolveCollision(a, b) {
    let collisionAngle = Math.atan2(b.y - a.y, b.x - a.x);

    // Rotate velocities into collision axis
    let v1 = rotate(a.dx, a.dy, collisionAngle);
    let v2 = rotate(b.dx, b.dy, collisionAngle);

    // Swap x components of velocity (elastic collision)
    [v1.x, v2.x] = [v2.x, v1.x];

    // Rotate back to original coordinate system
    let newV1 = rotate(v1.x, v1.y, -collisionAngle);
    let newV2 = rotate(v2.x, v2.y, -collisionAngle);

    // Apply new velocities
    a.dx = newV1.x;
    a.dy = newV1.y;
    b.dx = newV2.x;
    b.dy = newV2.y;

    // Ensure speed remains constant
    normalizeSpeed(a);
    normalizeSpeed(b);

    // Move them apart slightly to avoid overlap
    while (
        a.x < b.x + b.size &&
        a.x + a.size > b.x &&
        a.y < b.y + b.size &&
        a.y + a.size > b.y
    ) {
        a.x += a.dx * 0.5;
        a.y += a.dy * 0.5;
        b.x += b.dx * 0.5;
        b.y += b.dy * 0.5;
    }
}

// Rotates velocity by an angle
function rotate(dx, dy, angle) {
    return {
        x: dx * Math.cos(angle) - dy * Math.sin(angle),
        y: dx * Math.sin(angle) + dy * Math.cos(angle)
    };
}

// Keeps speed constant
function normalizeSpeed(square) {
    let magnitude = Math.sqrt(square.dx ** 2 + square.dy ** 2);
    square.dx = (square.dx / magnitude) * SPEED;
    square.dy = (square.dy / magnitude) * SPEED;
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    checkCollisions();

    squares.forEach(square => {
        square.update();
        square.draw();
    });

    requestAnimationFrame(animate);
}

animate();
