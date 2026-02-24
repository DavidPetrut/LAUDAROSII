const rooms = new Map();

const quizQuestions = [
  {
    question: "Cine a scris Psalmul 23?",
    options: ["Moise", "David", "Solomon", "Isaia"],
    correct: 1,
  },
  {
    question: "Câte carți are Noul Testament?",
    options: ["27", "39", "66", "22"],
    correct: 0,
  },
  {
    question: "Cine a fost aruncat în groapa cu lei?",
    options: ["Iona", "Daniel", "Ilie", "Ieremia"],
    correct: 1,
  },
  {
    question: "Care a fost primul miracol al lui Isus?",
    options: [
      "Vindecarea orbului",
      "Înmulțirea pâinilor",
      "Apa în vin",
      "Umblatul pe apa",
    ],
    correct: 2,
  },
  {
    question: "Câți ucenici a avut Isus?",
    options: ["10", "12", "7", "14"],
    correct: 1,
  },
  {
    question: "Cine a construit arca?",
    options: ["Avraam", "Moise", "Noe", "Iacov"],
    correct: 2,
  },
  {
    question: "Care e cea mai scurta carte din Biblie?",
    options: ["Iuda", "3 Ioan", "2 Ioan", "Filimon"],
    correct: 2,
  },
  {
    question: "Câte zile a stat Isus în pustie?",
    options: ["30", "40", "50", "7"],
    correct: 1,
  },
];

const setupGameSockets = (io) => {
  io.on("connection", (socket) => {
    socket.on("createRoom", ({ gameKey, odId, userName }) => {
      const roomId = `${gameKey}_${Date.now()}`;
      rooms.set(roomId, {
        gameKey,
        host: odId,
        players: [{ odId, userName, score: 0, odId }],
        status: "waiting",
        currentQuestion: 0,
      });
      socket.join(roomId);
      socket.roomId = roomId;
      socket.odId = odId;
      socket.emit("roomCreated", {
        roomId,
        players: rooms.get(roomId).players,
      });
    });

    socket.on("joinRoom", ({ roomId, odId, userName }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit("error", { message: "Camera nu exista" });
        return;
      }
      if (room.status !== "waiting") {
        socket.emit("error", { message: "Jocul a început deja" });
        return;
      }
      if (room.players.length >= 10) {
        socket.emit("error", { message: "Camera este plina" });
        return;
      }

      room.players.push({ odId, userName, score: 0 });
      socket.join(roomId);
      socket.roomId = roomId;
      socket.odId = odId;

      io.to(roomId).emit("playerJoined", { players: room.players });
    });

    socket.on("startGame", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.host !== socket.odId) return;

      room.status = "playing";
      room.currentQuestion = 0;
      room.answers = new Map();

      io.to(roomId).emit("gameStarted", {
        totalQuestions: quizQuestions.length,
      });

      setTimeout(() => sendQuestion(io, roomId, room), 1000);
    });

    socket.on("submitAnswer", ({ roomId, odId, answerIndex, timeLeft }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing") return;
      if (room.answers.has(odId)) return;

      room.answers.set(odId, answerIndex);

      const question = quizQuestions[room.currentQuestion];
      const player = room.players.find((p) => p.odId === odId);

      if (player && answerIndex === question.correct) {
        const bonus = Math.floor(timeLeft * 10);
        player.score += 100 + bonus;
      }

      io.to(roomId).emit("playerAnswered", { odId, total: room.answers.size });

      if (room.answers.size === room.players.length) {
        showResults(io, roomId, room);
      }
    });

    socket.on("leaveRoom", () => {
      handleDisconnect(socket, io);
    });

    socket.on("disconnect", () => {
      handleDisconnect(socket, io);
    });
  });
};

const sendQuestion = (io, roomId, room) => {
  if (room.currentQuestion >= quizQuestions.length) {
    endGame(io, roomId, room);
    return;
  }

  room.answers = new Map();
  const q = quizQuestions[room.currentQuestion];

  io.to(roomId).emit("question", {
    questionNumber: room.currentQuestion + 1,
    total: quizQuestions.length,
    question: q.question,
    options: q.options,
    timeLimit: 15,
  });

  room.timer = setTimeout(() => {
    showResults(io, roomId, room);
  }, 16000);
};

const showResults = (io, roomId, room) => {
  if (room.timer) clearTimeout(room.timer);

  const question = quizQuestions[room.currentQuestion];

  io.to(roomId).emit("questionResult", {
    correctAnswer: question.correct,
    scores: room.players.map((p) => ({ name: p.userName, score: p.score })),
  });

  room.currentQuestion++;

  setTimeout(() => {
    if (room.currentQuestion < quizQuestions.length) {
      sendQuestion(io, roomId, room);
    } else {
      endGame(io, roomId, room);
    }
  }, 3000);
};

const endGame = (io, roomId, room) => {
  room.status = "finished";
  const sorted = [...room.players].sort((a, b) => b.score - a.score);

  io.to(roomId).emit("gameEnded", {
    leaderboard: sorted,
    winner: sorted[0],
  });

  setTimeout(() => rooms.delete(roomId), 60000);
};

const handleDisconnect = (socket, io) => {
  if (!socket.roomId) return;

  const room = rooms.get(socket.roomId);
  if (!room) return;

  room.players = room.players.filter((p) => p.odId !== socket.odId);

  if (room.players.length === 0) {
    rooms.delete(socket.roomId);
  } else {
    io.to(socket.roomId).emit("playerLeft", {
      odId: socket.odId,
      players: room.players,
    });
  }
};

module.exports = { setupGameSockets };
