// app/class/[classId]/TeacherView.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type TeacherViewProps = {
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

export default function TeacherView({ classId, name }: TeacherViewProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // VIDEO + AUDIO
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [mediaStarted, setMediaStarted] = useState(false);

  const rtcConfig: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  // WHITEBOARD refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const drawLine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    emit: boolean
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

    if (!emit || !socket) return;

    const w = canvas.width;
    const h = canvas.height;

    socket.emit('draw', {
      classId,
      line: {
        x0: x0 / w,
        y0: y0 / h,
        x1: x1 / w,
        y1: y1 / h,
        color,
      },
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    drawing.current = true;
    lastPoint.current = { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !lastPoint.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    drawLine(
      lastPoint.current.x,
      lastPoint.current.y,
      x,
      y,
      '#ffffff',
      true
    );
    lastPoint.current = { x, y };
  };

  const handleMouseUp = () => {
    drawing.current = false;
    lastPoint.current = null;
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket?.emit('clear-board', { classId });
  };

  // 1) Ek baar media + PeerConnection start karo
  const startMedia = async () => {
    if (mediaStarted || !socket) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc-ice-candidate', {
            classId,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc-offer', {
        classId,
        sdp: offer,
      });

      // By default camera + mic on
      setIsCameraOn(true);
      setIsMicOn(true);
      setMediaStarted(true);
    } catch (err) {
      console.error('Error starting media', err);
    }
  };

  // 2) Camera toggle (sirf video tracks enable/disable)
  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) {
      // agar media start hi nahi hua to pehle start karo
      startMedia();
      return;
    }
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return;

    const next = !isCameraOn;
    videoTracks.forEach((t) => {
      t.enabled = next;
    });
    setIsCameraOn(next);
  };

  // 3) Mic toggle (sirf audio tracks enable/disable)
  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) {
      startMedia();
      return;
    }
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    const next = !isMicOn;
    audioTracks.forEach((t) => {
      t.enabled = next;
    });
    setIsMicOn(next);
  };

  // 4) Call completely band karne ke liye
  const stopMedia = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    setIsCameraOn(false);
    setIsMicOn(false);
    setMediaStarted(false);
  };

  useEffect(() => {
    if (!socket) {
      socket = io();
    }

    socket.emit('join-class', { classId, name, role: 'teacher' });

    socket.on('webrtc-answer', async ({ sdp }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
      } catch (err) {
        console.error('Error setting remote description', err);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }) => {
      if (!pcRef.current || !candidate) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate', err);
      }
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
      socket?.off('webrtc-answer');
      socket?.off('webrtc-ice-candidate');
      stopMedia();
    };
  }, [classId, name]);

  const sendChat = () => {
    if (!socket || !chatInput.trim()) return;
    socket.emit('chat-message', {
      classId,
      from: name || 'Teacher',
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
          <p className="text-sm">{name || 'Teacher'}</p>
          <p className="text-xs text-gray-400">Teacher</p>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-4 p-4">
        {/* LEFT: whiteboard */}
        <section className="col-span-9 rounded-xl border border-gray-800 bg-gray-900/70 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Teacher whiteboard</h2>
            <button
              onClick={clearBoard}
              className="px-2 py-1 text-xs rounded bg-gray-700 text-white"
            >
              X
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={1800}
            height={1120}
            className="bg-black rounded border border-gray-100 w-full max-w-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </section>

        {/* RIGHT: participants + chat + local video */}
        <aside className="col-span-3 space-y-4 h-full">
          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3 ">
            <h3 className="text-xs font-semibold mb-2">
              Participants ({participants.length})
            </h3>
            <ul className="space-y-1 text-xs">
              {participants.map((p) => (
                <li key={p.id}>
                  {p.name} <span className="text-gray-500">({p.role})</span>
                </li>
              ))}
              {participants.length === 0 && (
                <p className="text-gray-500 text-xs">No one joined yet.</p>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3 flex flex-col h-85">
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
                className="px-3 py-1 text-xs rounded-lg bg-emerald-500 text-black"
              >
                Send
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3 flex flex-col h-64">
            <h3 className="text-xs font-semibold mb-2">Your media</h3>
            <div className="relative inline-block">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-80 h-45 bg-black rounded border border-gray-700 object-cover"
              />
              <div className="absolute bottom-1 left-1 flex gap-1">
                <button
                  onClick={toggleCamera}
                  className="px-2 py-1 text-[10px] rounded bg-emerald-500 text-black"
                >
                  {isCameraOn ? 'Camera Off' : 'Camera On'}
                </button>
                <button
                  onClick={toggleMic}
                  className="px-2 py-1 text-[10px] rounded bg-sky-500 text-black"
                >
                  {isMicOn ? 'Mic Off' : 'Mic On'}
                </button>
              </div>
            </div>
            {!mediaStarted && (
              <button
                onClick={startMedia}
                className="mt-2 px-3 py-1 text-xs rounded bg-emerald-500 text-black self-start"
              >
                Start media
              </button>
            )}
            {mediaStarted && (
              <button
                onClick={stopMedia}
                className="mt-2 px-3 py-1 text-xs rounded bg-rose-500 text-black self-start"
              >
                End call
              </button>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
