const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",  // Allows connections from anywhere
        methods: ["GET", "POST"]
    }
});

const games = {};  // Store active game rooms

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("createRoom", (roomCode) => {
        if (!games[roomCode]) {
            games[roomCode] = { players: [socket.id], board: Array(9).fill(null) };
            socket.join(roomCode);
            socket.emit("roomCreated", roomCode);
            console.log(`Room ${roomCode} created by ${socket.id}`);
        } else {
            socket.emit("error", "Room already exists");
        }
    });

    socket.on("joinRoom", (roomCode) => {
        if (games[roomCode] && games[roomCode].players.length < 2) {
            games[roomCode].players.push(socket.id);
            socket.join(roomCode);
            io.to(roomCode).emit("startGame", games[roomCode].players);
            console.log(`Player ${socket.id} joined room ${roomCode}`);
        } else {
            socket.emit("error", "Room full or does not exist");
        }
    });

    socket.on("makeMove", ({ roomCode, index, symbol }) => {
        if (games[roomCode]) {
            games[roomCode].board[index] = symbol;
            io.to(roomCode).emit("updateBoard", games[roomCode].board);
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        Object.keys(games).forEach(roomCode => {
            const room = games[roomCode];
            room.players = room.players.filter(player => player !== socket.id);
            
            if (room.players.length === 0) {
                delete games[roomCode]; // Remove empty rooms
                console.log(`Room ${roomCode} deleted`);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
