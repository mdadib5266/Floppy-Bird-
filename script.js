document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('startButton');
    const sensitivityControl = document.getElementById('sensitivity-control');
    const sensitivitySlider = document.getElementById('sensitivitySlider');
    const sensitivityValueDisplay = document.getElementById('sensitivityValue');
    const scoreDisplay = document.getElementById('score-display');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreDisplay = document.getElementById('finalScore');
    const restartButton = document.getElementById('restartButton');

    // Game constants
    const BIRD_WIDTH = 34;
    const BIRD_HEIGHT = 24;
    const PIPE_WIDTH = 52;
    const PIPE_GAP = 120; // Gap between top and bottom pipe
    const GRAVITY = 0.3;
    const BASE_LIFT = -7; // Base upward velocity on flap
    const PIPE_SPEED = 2;
    const PIPE_SPAWN_INTERVAL = 120; // Frames between pipe spawns

    // Game variables
    let bird, pipes, score, frames, gameState, flapSensitivity, getReadyTimer;

    // --- Initialization and Reset ---
    function initGameVariables() {
        bird = {
            x: 50,
            y: canvas.height / 2 - BIRD_HEIGHT / 2,
            width: BIRD_WIDTH,
            height: BIRD_HEIGHT,
            velocity: 0,
            rotation: 0
        };
        pipes = [];
        score = 0;
        frames = 0; // For pipe spawning
        gameState = 'READY'; // READY, GET_READY, PLAYING, GAMEOVER
        flapSensitivity = parseFloat(sensitivitySlider.value);
        getReadyTimer = 0; // Countdown for "stand still"
    }

    function setupCanvas() {
        canvas.width = 320;
        canvas.height = 480;
    }
    
    setupCanvas();
    initGameVariables(); // Initialize once for the very first load

    // --- Event Listeners ---
    sensitivitySlider.addEventListener('input', (e) => {
        flapSensitivity = parseFloat(e.target.value);
        sensitivityValueDisplay.textContent = flapSensitivity.toFixed(1);
    });

    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', resetAndStartGame);

    // Player input
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            handleInput();
        }
    });
    canvas.addEventListener('click', handleInput);
    // Prevent spacebar from scrolling the page
    window.addEventListener('keydown', function(e) {
        if(e.code === 'Space' && e.target == document.body) {
          e.preventDefault();
        }
      });


    function handleInput() {
        if (gameState === 'PLAYING') {
            birdFlap();
        } else if (gameState === 'READY') {
            // Allow starting game by clicking/space if start button is not explicitly clicked
            // This is optional, startButton is the primary way
            // startGame(); 
        } else if (gameState === 'GET_READY') {
            // No flapping during get ready, but could potentially skip it if needed
        }
    }

    // --- Game State Management ---
    function startGame() {
        startScreen.style.display = 'none';
        sensitivityControl.style.display = 'none';
        scoreDisplay.style.display = 'block';
        scoreDisplay.textContent = `Score: ${score}`;
        
        gameState = 'GET_READY';
        getReadyTimer = 90; // Approx 1.5 seconds at 60FPS (3 seconds for the request)
        // For "stands for a few seconds" -> 3 seconds * 60fps = 180 frames
        getReadyTimer = 3 * 60; // 3 seconds at 60 FPS

        if (!gameLoopId) { // Start game loop if not already running
            gameLoop();
        }
    }

    function resetAndStartGame() {
        gameOverScreen.style.display = 'none';
        initGameVariables(); // Resets bird, pipes, score, etc.
        startGame(); // Transitions to GET_READY
    }

    function gameOver() {
        gameState = 'GAMEOVER';
        finalScoreDisplay.textContent = `Your Score: ${score}`;
        gameOverScreen.style.display = 'block';
        // Stop game loop or let it run to show final state. 
        // For simplicity, we'll let it run but game logic will be paused.
    }


    // --- Bird Mechanics ---
    function birdFlap() {
        bird.velocity = BASE_LIFT * flapSensitivity;
    }

    function updateBird() {
        bird.velocity += GRAVITY;
        bird.y += bird.velocity;

        // Rotation based on velocity
        if (bird.velocity < 0) { // Going up
            bird.rotation = -Math.PI / 6; // Tilt up (30 degrees)
        } else if (bird.velocity > 1) { // Going down
            bird.rotation = Math.min(Math.PI / 4, bird.rotation + Math.PI / 36); // Tilt down, max 45 deg
        }


        // Collision with top/bottom
        if (bird.y + bird.height > canvas.height) { // Hit ground
            bird.y = canvas.height - bird.height;
            bird.velocity = 0;
            gameOver();
        }
        if (bird.y < 0) { // Hit ceiling
            bird.y = 0;
            bird.velocity = 0;
            // Could also be game over, or just bounce
            gameOver(); 
        }
    }

    // --- Pipe Mechanics ---
    function spawnPipe() {
        const minHeight = 50;
        const maxHeight = canvas.height - PIPE_GAP - minHeight;
        const heightTop = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
        
        pipes.push({
            x: canvas.width,
            yTop: 0, // Top pipe starts from canvas top
            heightTop: heightTop,
            yBottom: heightTop + PIPE_GAP,
            heightBottom: canvas.height - (heightTop + PIPE_GAP),
            width: PIPE_WIDTH,
            passed: false
        });
    }

    function updatePipes() {
        frames++;
        if (frames % PIPE_SPAWN_INTERVAL === 0) {
            spawnPipe();
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= PIPE_SPEED;

            // Scoring
            if (!pipes[i].passed && pipes[i].x + pipes[i].width < bird.x) {
                pipes[i].passed = true;
                score++;
                scoreDisplay.textContent = `Score: ${score}`;
            }

            // Remove off-screen pipes
            if (pipes[i].x + pipes[i].width < 0) {
                pipes.splice(i, 1);
            }
        }
    }

    // --- Collision Detection ---
    function checkCollisions() {
        for (let pipe of pipes) {
            // Check collision with top pipe
            if (
                bird.x < pipe.x + pipe.width &&
                bird.x + bird.width > pipe.x &&
                bird.y < pipe.yTop + pipe.heightTop
            ) {
                gameOver();
                return;
            }
            // Check collision with bottom pipe
            if (
                bird.x < pipe.x + pipe.width &&
                bird.x + bird.width > pipe.x &&
                bird.y + bird.height > pipe.yBottom
            ) {
                gameOver();
                return;
            }
        }
    }

    // --- Drawing ---
    function drawBackground() {
        ctx.fillStyle = '#70c5ce'; // Sky blue
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Simple ground (optional)
        ctx.fillStyle = '#ded895'; // Sandy color
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    }
    
    function drawBird() {
        ctx.save(); // Save current canvas state
        ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2); // Move origin to bird's center
        ctx.rotate(bird.rotation); // Rotate around new origin
        
        // Draw bird (simple yellow rectangle for now)
        ctx.fillStyle = 'yellow';
        ctx.fillRect(-bird.width / 2, -bird.height / 2, bird.width, bird.height);
        
        // Simple eye
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(bird.width / 4, -bird.height / 6, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Restore canvas state
    }

    function drawPipes() {
        ctx.fillStyle = '#2e7d32'; // Green for pipes
        for (let pipe of pipes) {
            // Top pipe
            ctx.fillRect(pipe.x, pipe.yTop, pipe.width, pipe.heightTop);
            // Bottom pipe
            ctx.fillRect(pipe.x, pipe.yBottom, pipe.width, pipe.heightBottom);
        }
    }

    // --- Game Loop ---
    let gameLoopId;
    function gameLoop() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();

        if (gameState === 'READY') {
            // Show start screen (handled by CSS)
            // Draw static bird for visual cue
            drawBird();
            // Keep sensitivity slider visible (handled by CSS/HTML)
        } else if (gameState === 'GET_READY') {
            drawBird(); // Bird is visible but doesn't move
            drawPipes(); // Pipes might be visible if game was restarted quickly
            getReadyTimer--;
            if (getReadyTimer <= 0) {
                gameState = 'PLAYING';
            }
        } else if (gameState === 'PLAYING') {
            updateBird();
            updatePipes();
            checkCollisions(); // Check collisions after updates
            
            drawPipes();
            drawBird();
        } else if (gameState === 'GAMEOVER') {
            // Draw the final state
            drawPipes(); 
            drawBird(); 
            // Game over screen is shown via CSS
        }
        
        // Keep looping as long as not explicitly stopped, or if game over, show final frame
        if (gameState !== 'GAMEOVER_STOPPED') { // Add a new state if you want to fully stop rendering
             gameLoopId = requestAnimationFrame(gameLoop);
        }
    }

    // --- Initial Setup Call ---
    // Set initial sensitivity value display
    sensitivityValueDisplay.textContent = parseFloat(sensitivitySlider.value).toFixed(1);
    // Start in READY state, game loop will be invoked by startButton
    // For the first load, we can call gameLoop once to render the initial state
    // or let the user press start. Let's draw initial state.
    drawBackground();
    drawBird(); // Draw initial bird position
});
