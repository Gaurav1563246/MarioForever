// Game canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Debug logging
const DEBUG = true;
function log(message, data = null) {
    if (DEBUG) {
        if (data) {
            console.log(`[Game Debug] ${message}:`, data);
        } else {
            console.log(`[Game Debug] ${message}`);
        }
    }
}

// Set canvas size
canvas.width = 800;
canvas.height = 400;

// Game state
const gameState = {
    currentLevel: 1,
    maxLevel: 3,
    levelCompleted: false,
    gameOver: false,
    levelStartX: 0,
    lives: 3,
    maxLives: 3,
    canRestart: false,
    score: 0,
    highScore: 0,
    coins: 0,
    levelBonus: 1000, // Base bonus for completing a level
    coinValue: 100    // Points per coin
};

// Add score function - moved to top level
function addScore(points) {
    try {
        const oldScore = gameState.score;
        gameState.score += points;
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
        }
        log(`Score updated: ${oldScore} -> ${gameState.score}`);
    } catch (error) {
        console.error('[Game Error] Error in addScore:', error);
    }
}

// Camera system
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height
};

// Game objects
const player = {
    x: 50,
    y: 200,
    width: 30,
    height: 30,
    speed: 5,
    jumpForce: 12,
    velocityY: 0,
    isJumping: false,
    color: '#FF0000',
    onMovingPlatform: null,
    platformVelocityX: 0,
    invincible: false,
    invincibleTimer: 0
};

const gravity = 0.5;
const levelWidth = 3000; // Width of each level
const platformTypes = {
    normal: { color: '#8B4513', height: 20 },
    moving: { color: '#A0522D', height: 20 },
    breakable: { color: '#CD853F', height: 20 },
    spike: { color: '#696969', height: 15 }
};

// Level door
const levelDoor = {
    width: 40,
    height: 60,
    color: '#FFD700',
    isActive: true
};

// Coins
let coins = [];
const coinSize = 20;

// Restart button
const restartButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2 + 50,
    width: 200,
    height: 50,
    color: '#4CAF50',
    hoverColor: '#45a049',
    isHovered: false
};

// Generate initial platforms
let platforms = [];
let lastPlatformX = 0;

function generateCoins() {
    log('Starting coin generation');
    try {
        // Create a new array instead of modifying the existing one
        const newCoins = [];
        
        // Generate coins above platforms
        platforms.forEach((platform, platformIndex) => {
            if (platform.type !== 'spike') {
                const numCoins = Math.floor(platform.width / 100);
                log(`Generating coins for platform ${platformIndex}, width: ${platform.width}, numCoins: ${numCoins}`);
                
                for (let i = 0; i < numCoins; i++) {
                    if (Math.random() < 0.7) {
                        const coin = {
                            x: platform.x + (platform.width * (i + 0.5) / numCoins),
                            y: platform.y - 40,
                            width: coinSize,
                            height: coinSize,
                            collected: false,
                            id: Math.random().toString(36).substr(2, 9)
                        };
                        newCoins.push(coin);
                        log(`Created coin at position (${coin.x}, ${coin.y}) with ID: ${coin.id}`);
                    }
                }
            }
        });
        
        // Replace the old coins array with the new one
        coins = newCoins;
        log(`Coin generation complete. Total coins: ${coins.length}`);
    } catch (error) {
        console.error('[Game Error] Error in generateCoins:', error);
    }
}

function generateLevel(levelNumber) {
    log(`Generating level ${levelNumber}`);
    try {
        platforms = [];
        lastPlatformX = gameState.levelStartX;
        
        // Add ground
        platforms.push({ 
            x: gameState.levelStartX, 
            y: 350, 
            width: levelWidth, 
            height: 50, 
            color: '#8B4513', 
            type: 'normal' 
        });

        // Generate platforms for the level
        while (lastPlatformX < gameState.levelStartX + levelWidth - 200) { // Leave space for door
            const platformType = Math.random();
            const platformWidth = Math.random() * 100 + 100;
            const platformHeight = platformTypes.normal.height;
            const gap = Math.random() * 100 + 50;
            const platformY = Math.random() * 200 + 100;

            // Increased spike probability to 15%
            if (platformType < 0.65) {
                platforms.push({
                    x: lastPlatformX + gap,
                    y: platformY,
                    width: platformWidth,
                    height: platformHeight,
                    color: platformTypes.normal.color,
                    type: 'normal'
                });
            } else if (platformType < 0.80) {
                platforms.push({
                    x: lastPlatformX + gap,
                    y: platformY,
                    width: platformWidth,
                    height: platformHeight,
                    color: platformTypes.moving.color,
                    type: 'moving',
                    moveRange: 100,
                    moveSpeed: 2,
                    startX: lastPlatformX + gap,
                    direction: 1
                });
            } else if (platformType < 0.85) {
                platforms.push({
                    x: lastPlatformX + gap,
                    y: platformY,
                    width: platformWidth,
                    height: platformHeight,
                    color: platformTypes.breakable.color,
                    type: 'breakable',
                    health: 3
                });
            } else {
                platforms.push({
                    x: lastPlatformX + gap,
                    y: platformY,
                    width: platformWidth,
                    height: platformTypes.spike.height,
                    color: platformTypes.spike.color,
                    type: 'spike'
                });
            }

            lastPlatformX += gap + platformWidth;
        }

        // Add level door at the end
        levelDoor.x = gameState.levelStartX + levelWidth - 100;
        levelDoor.y = 290; // Just above the ground
        levelDoor.isActive = true;

        log(`Level ${levelNumber} platforms generated: ${platforms.length}`);
        
        // Generate coins for the level
        generateCoins();
        
        log(`Level ${levelNumber} generation complete`);
    } catch (error) {
        console.error('[Game Error] Error in generateLevel:', error);
    }
}

function resetGame() {
    log('Resetting game');
    try {
        gameState.currentLevel = 1;
        gameState.levelCompleted = false;
        gameState.gameOver = false;
        gameState.levelStartX = 0;
        gameState.lives = gameState.maxLives;
        gameState.canRestart = false;
        gameState.score = 0;
        gameState.coins = 0;
        player.x = 50;
        player.y = 200;
        player.velocityY = 0;
        player.invincible = false;
        player.invincibleTimer = 0;
        coins = []; // Clear coins array
        log('Game state reset complete');
        generateLevel(1);
    } catch (error) {
        console.error('[Game Error] Error in resetGame:', error);
    }
}

// Initialize first level
resetGame();

// Input handling
const keys = {
    right: false,
    left: false,
    up: false
};

document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowRight':
            keys.right = true;
            break;
        case 'ArrowLeft':
            keys.left = true;
            break;
        case 'ArrowUp':
        case ' ':
            keys.up = true;
            break;
        case 'r':
            if (gameState.gameOver || gameState.levelCompleted) {
                resetGame();
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key) {
        case 'ArrowRight':
            keys.right = false;
            break;
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'ArrowUp':
        case ' ':
            keys.up = false;
            break;
    }
});

// Mouse handling for restart button
canvas.addEventListener('mousemove', (e) => {
    if (gameState.gameOver || gameState.levelCompleted) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        restartButton.isHovered = 
            mouseX >= restartButton.x && 
            mouseX <= restartButton.x + restartButton.width &&
            mouseY >= restartButton.y && 
            mouseY <= restartButton.y + restartButton.height;
    }
});

canvas.addEventListener('click', (e) => {
    if ((gameState.gameOver || gameState.levelCompleted) && restartButton.isHovered) {
        resetGame();
    }
});

// Collision detection
function checkCollision(rect1, rect2) {
    try {
        const collision = rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
        return collision;
    } catch (error) {
        console.error('[Game Error] Error in checkCollision:', error);
        return false;
    }
}

// Update camera position
function updateCamera() {
    camera.x = player.x - canvas.width / 2;
    
    // Keep camera within level bounds
    if (camera.x < gameState.levelStartX) camera.x = gameState.levelStartX;
    if (camera.x > gameState.levelStartX + levelWidth - canvas.width) {
        camera.x = gameState.levelStartX + levelWidth - canvas.width;
    }
}

// Check level completion
function checkLevelCompletion() {
    if (levelDoor.isActive && checkCollision(player, levelDoor)) {
        if (gameState.currentLevel < gameState.maxLevel) {
            // Add level completion bonus
            const timeBonus = Math.floor(gameState.levelBonus * (1 + (gameState.coins / 10)));
            addScore(timeBonus);
            
            gameState.currentLevel++;
            gameState.levelStartX += levelWidth;
            player.x = gameState.levelStartX + 50;
            player.y = 200;
            player.velocityY = 0;
            generateLevel(gameState.currentLevel);
        } else {
            // Add final level completion bonus
            const finalBonus = gameState.levelBonus * 2;
            addScore(finalBonus);
            gameState.levelCompleted = true;
            gameState.canRestart = true;
        }
    }
}

// Handle player death
function handlePlayerDeath() {
    if (!player.invincible) {
        gameState.lives--;
        // Deduct points for death
        addScore(-500);
        if (gameState.lives <= 0) {
            gameState.gameOver = true;
            gameState.canRestart = true;
        } else {
            player.x = gameState.levelStartX + 50;
            player.y = 200;
            player.velocityY = 0;
            player.invincible = true;
            player.invincibleTimer = 120; // 2 seconds of invincibility
        }
    }
}

// Draw UI elements
function drawUI() {
    // Draw score and high score
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${gameState.score}`, 10, 120);
    ctx.fillText(`High Score: ${gameState.highScore}`, 10, 150);
    ctx.fillText(`Coins: ${gameState.coins}`, 10, 180);
    
    // Draw lives
    ctx.fillText(`Lives: ${gameState.lives}`, 10, 90);
    
    // Draw level info
    ctx.fillText(`Level: ${gameState.currentLevel}/${gameState.maxLevel}`, 10, 30);
    ctx.fillText(`Distance: ${Math.floor(player.x - gameState.levelStartX)}m`, 10, 60);

    // Draw restart button if game over or level completed
    if (gameState.gameOver || gameState.levelCompleted) {
        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw game over or completion message
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px Arial';
        const message = gameState.gameOver ? 'Game Over!' : 'Game Completed!';
        ctx.fillText(message, canvas.width/2 - 150, canvas.height/2 - 50);

        // Draw final score
        ctx.font = '36px Arial';
        ctx.fillText(`Final Score: ${gameState.score}`, canvas.width/2 - 120, canvas.height/2);
        ctx.fillText(`High Score: ${gameState.highScore}`, canvas.width/2 - 120, canvas.height/2 + 40);

        // Draw restart button
        ctx.fillStyle = restartButton.isHovered ? restartButton.hoverColor : restartButton.color;
        ctx.fillRect(restartButton.x, restartButton.y, restartButton.width, restartButton.height);
        
        // Draw button text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.fillText('Restart Game', restartButton.x + 40, restartButton.y + 32);
        
        // Draw restart hint
        ctx.font = '20px Arial';
        ctx.fillText('Press R to restart', canvas.width/2 - 80, canvas.height/2 + 120);
    }
}

// Game loop
function gameLoop() {
    try {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (gameState.gameOver || gameState.levelCompleted) {
            drawUI();
            requestAnimationFrame(gameLoop);
            return;
        }

        // Player movement
        if (keys.right) {
            player.x += player.speed;
        }
        if (keys.left) {
            player.x -= player.speed;
        }

        // Update camera
        updateCamera();

        // Handle invincibility
        if (player.invincible) {
            player.invincibleTimer--;
            if (player.invincibleTimer <= 0) {
                player.invincible = false;
            }
        }

        // Jumping
        if (keys.up && !player.isJumping) {
            player.velocityY = -player.jumpForce;
            player.isJumping = true;
        }

        // Apply gravity
        player.velocityY += gravity;
        player.y += player.velocityY;

        // Reset platform velocity
        player.platformVelocityX = 0;
        player.onMovingPlatform = null;

        // Check coin collection
        log(`Checking coin collection. Total coins: ${coins.length}`);
        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            if (!coin.collected) {
                const collision = checkCollision(player, coin);
                if (collision) {
                    log(`Coin collision detected with coin ${coin.id} at position (${coin.x}, ${coin.y})`);
                    try {
                        coin.collected = true;
                        gameState.coins++;
                        addScore(gameState.coinValue);
                        coins.splice(i, 1);
                        log(`Coin collected and removed. Remaining coins: ${coins.length}`);
                    } catch (error) {
                        console.error('[Game Error] Error collecting coin:', error, {
                            coinIndex: i,
                            coinId: coin.id,
                            coinsLength: coins.length
                        });
                    }
                }
            }
        }

        // Platform collision and updates
        player.isJumping = true;
        for (let i = platforms.length - 1; i >= 0; i--) {
            const platform = platforms[i];
            
            // Update moving platforms
            if (platform.type === 'moving') {
                const oldX = platform.x;
                platform.x += platform.moveSpeed * platform.direction;
                if (Math.abs(platform.x - platform.startX) > platform.moveRange) {
                    platform.direction *= -1;
                }
                // Calculate platform velocity for player movement
                platform.velocityX = platform.x - oldX;
            }

            if (checkCollision(player, platform)) {
                if (platform.type === 'spike' && !player.invincible) {
                    handlePlayerDeath();
                    continue;
                }
                
                if (platform.type === 'breakable' && player.velocityY > 0) {
                    platform.health--;
                    if (platform.health <= 0) {
                        platforms.splice(i, 1);
                        addScore(50); // Bonus for breaking platforms
                        continue;
                    }
                }

                // Landing on platform
                if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                    player.y = platform.y - player.height;
                    player.velocityY = 0;
                    player.isJumping = false;
                    
                    // If on moving platform, move with it
                    if (platform.type === 'moving') {
                        player.onMovingPlatform = platform;
                        player.platformVelocityX = platform.velocityX;
                    }
                }
            }
        }

        // Apply platform velocity to player
        if (player.onMovingPlatform) {
            player.x += player.platformVelocityX;
        }

        // Keep player in level bounds
        if (player.x < gameState.levelStartX) player.x = gameState.levelStartX;
        if (player.x + player.width > gameState.levelStartX + levelWidth) {
            player.x = gameState.levelStartX + levelWidth - player.width;
        }
        if (player.y + player.height > canvas.height) {
            player.y = canvas.height - player.height;
            player.velocityY = 0;
            player.isJumping = false;
        }

        // Check level completion
        checkLevelCompletion();

        // Draw platforms (only those in view)
        platforms.forEach(platform => {
            if (platform.x + platform.width > camera.x && platform.x < camera.x + camera.width) {
                ctx.fillStyle = platform.color;
                ctx.fillRect(platform.x - camera.x, platform.y, platform.width, platform.height);
                
                if (platform.type === 'spike') {
                    ctx.fillStyle = '#FF0000';
                    for (let i = 0; i < platform.width; i += 20) {
                        ctx.beginPath();
                        ctx.moveTo(platform.x - camera.x + i, platform.y);
                        ctx.lineTo(platform.x - camera.x + i + 10, platform.y - 15);
                        ctx.lineTo(platform.x - camera.x + i + 20, platform.y);
                        ctx.fill();
                    }
                }
            }
        });

        // Draw coins
        coins.forEach(coin => {
            if (!coin.collected && coin.x + coin.width > camera.x && coin.x < camera.x + camera.width) {
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(
                    coin.x - camera.x + coin.width/2,
                    coin.y + coin.height/2,
                    coin.width/2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                
                // Add shine effect
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(
                    coin.x - camera.x + coin.width/3,
                    coin.y + coin.height/3,
                    coin.width/6,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        });

        // Draw level door
        if (levelDoor.x + levelDoor.width > camera.x && levelDoor.x < camera.x + camera.width) {
            ctx.fillStyle = levelDoor.color;
            ctx.fillRect(levelDoor.x - camera.x, levelDoor.y, levelDoor.width, levelDoor.height);
            
            // Draw door frame
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(levelDoor.x - camera.x, levelDoor.y, levelDoor.width, levelDoor.height);
        }

        // Draw player with invincibility flash
        if (!player.invincible || Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x - camera.x, player.y, player.width, player.height);
        }

        // Draw UI
        drawUI();

        // Continue game loop
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('[Game Error] Error in gameLoop:', error);
    }
}

// Start the game
log('Starting game');
gameLoop(); 