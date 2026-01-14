// app/class/[classId]/StudentView.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type StudentViewProps = {
  classId: string;
  name: string;
};

type Participant = {
  id: string;
  socketId: string;
  classId: string;
  name: string;
  role: string;
};

type ChatMessage = {
  from: string;
  text: string;
  time: string;
};

let socket: Socket | null = null;

export default function StudentView({ classId, name }: StudentViewProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [hasTeacherVideo, setHasTeacherVideo] = useState(false);

  const rtcConfig: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  const drawLine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.strokeStyle = color;
    context.lineWidth = 2;
    context.lineCap = 'round';

    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.stroke();
    context.closePath();
  };

  useEffect(() => {
    if (!socket) {
      socket = io();
    }

    socket.emit('join-class', { classId, name, role: 'student' });

    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setHasTeacherVideo(true);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          classId,
          candidate: event.candidate,
        });
      }
    };

    socket.on('webrtc-offer', async ({ sdp }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket?.emit('webrtc-answer', {
          classId,
          sdp: answer,
        });
      } catch (err) {
        console.error('Error handling offer', err);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }) => {
      if (!candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate (student)', err);
      }
    });

    socket.on('draw', ({ line }) => {
      const canvas = canvasRef.current;
      if (!canvas || !line) return;
      const w = canvas.width;
      const h = canvas.height;

      drawLine(
        line.x0 * w,
        line.y0 * h,
        line.x1 * w,
        line.y1 * h,
        line.color || '#ffffff'
      );
    });

    socket.on('clear-board', () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('participants-update', (list: Participant[]) => {
      setParticipants(list);
    });

    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket?.off('participants-update');
      socket?.off('chat-message');
      socket?.off('draw');
      socket?.off('clear-board');
      socket?.off('webrtc-offer');
      socket?.off('webrtc-ice-candidate');
      pcRef.current?.close();
    };
  }, [classId, name]);

  const sendChat = () => {
    if (!socket || !chatInput.trim()) return;
    socket.emit('chat-message', {
      classId,
      from: name || 'Student',
      text: chatInput.trim(),
    });
    setChatInput('');
  };

  return (
    <div className="min-h-screen bg-gray-400 text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-500 bg-gray-800/80 backdrop-blur">
        <div>
          <h1 className="text-xl font-semibold">Zerora Virtual classroom</h1>
          <p className="text-xs text-slate-400">
            Class ID: <span className="font-mono">{classId}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm">{name || 'Student'}</p>
          <p className="text-xs text-gray-400">Student</p>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-4 p-4">
        {/* LEFT: whiteboard */}
        <section className="col-span-9 rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <h2 className="text-sm font-semibold mb-2">Shared whiteboard</h2>
          <canvas
            ref={canvasRef}
            width={1800}
            height={1120}
            className="bg-black rounded border border-gray-100 w-full max-w-full"
          />
        </section>

        {/* RIGHT: chat + teacher video */}
        <aside className="col-span-3 space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 flex flex-col h-110">
            <h3 className="text-xs font-semibold mb-2">Class chat</h3>
            <div className="flex-1 overflow-y-auto space-y-1 text-xs mb-2">
              {messages.map((m, i) => (
                <div key={i}>
                  <span className="font-semibold">{m.from}:</span>{' '}
                  <span>{m.text}</span>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-gray-500 text-xs">No messages yet.</p>
              )}
            </div>
            <div className="flex gap-1">
              <input
                className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message"
              />
              <button
                onClick={sendChat}
                className="px-3 py-1 text-xs rounded-lg bg-blue-600"
              >
                Send
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3 flex flex-col h-64">
            <h2 className="text-xs font-semibold mb-1">Teacher video</h2>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-80 h-52 bg-black rounded border border-gray-700 object-cover"
            />
            {!hasTeacherVideo && (
              <p className="text-[10px] text-gray-500 mt-1">
                Waiting for teacher to start camera...
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
