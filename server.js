// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const port = process.env.PORT || 3000;

// memory me simple users list
let users = [];

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('client connected:', socket.id);
    
    // WebRTC signaling
    socket.on('webrtc-offer', ({ classId, sdp }) => {
      if (!classId || !sdp) return;
      console.log('got offer for class', classId);
      socket.to(classId).emit('webrtc-offer', { sdp });
    });

    socket.on('webrtc-answer', ({ classId, sdp }) => {
      if (!classId || !sdp) return;
      console.log('got answer for class', classId);
      socket.to(classId).emit('webrtc-answer', { sdp });
    });

    socket.on('webrtc-ice-candidate', ({ classId, candidate }) => {
      if (!classId || !candidate) return;
      console.log('ice from class', classId);
      socket.to(classId).emit('webrtc-ice-candidate', { candidate });
    });

    // class join
    socket.on('join-class', ({ classId, name, role }) => {
      if (!classId) return;

      socket.join(classId);
      console.log(`${name} joined class ${classId} as ${role}`);

      // same socket ke purane entries hata do (duplicate avoid)
      users = users.filter((u) => u.socketId !== socket.id);

      const user = {
        id: `${socket.id}-${Date.now()}-${Math.random()}`,
        socketId: socket.id,
        classId,
        name: name || 'Guest',
        role: role || 'student',
      };
      users.push(user);

      const classUsers = users.filter((u) => u.classId === classId);

      io.to(classId).emit('participants-update', classUsers);

      io.to(classId).emit('chat-message', {
        from: 'System',
        text: `${user.name} joined`,
        time: new Date().toISOString(),
      });
    });

    // chat messages
    socket.on('chat-message', ({ classId, from, text }) => {
      if (!classId || !text) return;

      io.to(classId).emit('chat-message', {
        from,
        text,
        time: new Date().toISOString(),
      });
    });

    // yaha baad me whiteboard events bhi aa sakte hain
    // WHITEBOARD: draw from teacher
    socket.on('draw', ({ classId, line }) => {
        if (!classId || !line) return;

        // jisne draw kiya uske alawa usi class ke sab clients ko
        socket.to(classId).emit('draw', { line });
    });

    socket.on('clear-board', ({ classId }) => {
        if (!classId) return;
        io.to(classId).emit('clear-board');
    });

    // socket.on('draw', ({ classId, ...data }) => { ... })

    socket.on('disconnect', () => {
      const user = users.find((u) => u.socketId === socket.id);

      if (user) {
        users = users.filter((u) => u.socketId !== socket.id);

        const classUsers = users.filter((u) => u.classId === user.classId);

        io.to(user.classId).emit('participants-update', classUsers);

        io.to(user.classId).emit('chat-message', {
          from: 'System',
          text: `${user.name} left`,
          time: new Date().toISOString(),
        });
      }

      console.log('client disconnected:', socket.id);
    });
  });

  // Next.js handle
  app.use((req, res) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Server ready on http://localhost:${port}`);
  });
});
