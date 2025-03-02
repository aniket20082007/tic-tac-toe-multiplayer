const socket = io("http://localhost:3000");  // Change this to your hosted server later

let roomCode = "";

function createRoom() {
    roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();  // Generate code
    socket.emit("createRoom", roomCode);
}

function joinRoom() {
    roomCode = document.getElementById("roomCodeInput").value;
    socket.emit("joinRoom", roomCode);
}

socket.on("roomCreated", (code) => {
    alert(`Room Created! Code: ${code}`);
});

socket.on("startGame", (players) => {
    alert("Game Started! You're playing with another player.");
});


const board = Array(9).fill(null);
let currentPlayer = "X";
let moveHistory = [];
let gameOver = false;

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("click", handleMove);
    });

    document.getElementById("restart").addEventListener("click", resetGame);
    document.getElementById("play-again").addEventListener("click", resetGame);
});

function handleMove(event) {
    if (gameOver) return;

    const index = event.target.dataset.index;
    if (board[index] !== null) return; // Prevent overwriting moves

    // Send the move to the server instead of placing it immediately
    socket.emit("makeMove", { roomCode, index, player: currentPlayer });
}

// Listen for move updates from the server
socket.on("updateBoard", (updatedBoard) => {
    board = updatedBoard;  // Sync board with server
    renderBoard();

    if (checkWin(currentPlayer)) {
        highlightWinningLine();
        showWinPopup(`${currentPlayer} Wins!`);
        gameOver = true;
    }

    if (moveHistory.length >= 4) {
        removeOldestMove();
    }

    // Switch turns based on server data
    currentPlayer = (currentPlayer === "X") ? "O" : "X";
});


function aiMove() {
    if (gameOver) return;

    let move = getHardMove();
    if (move === -1) return; // No moves left

    placeMove(move, "O");

    if (checkWin("O")) {
        highlightWinningLine();
        showWinPopup("O Wins!");
        gameOver = true;
        return;
    }

    if (moveHistory.length >= 4) {
        removeOldestMove();
    }

    currentPlayer = "X";
}

function placeMove(index, player) {
    board[index] = player;
    moveHistory.push(index);
    updateBoard();
}

function removeOldestMove() {
    if (moveHistory.length > 4) {  // Remove only when there are more than 4 moves
        let removedIndex = moveHistory.shift();
        board[removedIndex] = null;
        updateBoard();
    }
}

function checkWin(player) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    return winPatterns.some(pattern =>
        pattern.every(index => board[index] === player)
    );
}

function highlightWinningLine() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    winPatterns.forEach(pattern => {
        if (pattern.every(index => board[index] === currentPlayer)) {
            pattern.forEach(index => {
                document.querySelector(`.cell[data-index="${index}"]`).classList.add("winning-cell");
            });
        }
    });
}

function updateBoard() {
    document.querySelectorAll(".cell").forEach((cell, index) => {
        cell.textContent = board[index] || "";
        cell.classList.remove("winning-cell");
    });
}

function showWinPopup(message) {
    document.getElementById("win-message").textContent = message;
    document.getElementById("win-popup").style.display = "block";
}

function resetGame() {
    board.fill(null);
    moveHistory = [];
    currentPlayer = "X";
    gameOver = false;
    document.querySelectorAll(".cell").forEach(cell => {
        cell.textContent = "";
        cell.classList.remove("winning-cell");
    });
    document.getElementById("win-popup").style.display = "none";
}

function getHardMove() {
    let winMove = getWinningMove("O");
    if (winMove !== null) return winMove;

    let blockMove = getWinningMove("X");
    if (blockMove !== null) return blockMove;

    let emptyCells = board.map((val, index) => val === null ? index : null).filter(val => val !== null);
    return emptyCells.length ? emptyCells[Math.floor(Math.random() * emptyCells.length)] : -1;
}

function getWinningMove(player) {
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = player;
            if (checkWin(player)) {
                board[i] = null;
                return i;
            }
            board[i] = null;
        }
    }
    return null;
}
