// /app/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'teacher' | 'student';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('ROLE BEFORE SUBMIT:', role);

    if (!classId.trim()) {
      alert('Please enter a Class ID');
      return;
    }

    // Abhi ke liye sirf route change kar rahe hain
    router.push(`/class/${classId}?role=${role}&name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[url('/bg-login.png')] bg-cover bg-center">
      <div className="w-full max-w-md rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-white mb-4 text-center">
          Zerora Virtual classroom
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`flex-1 py-2 rounded-lg border ${
                role === 'teacher'
                  ? 'bg-gray-100 text-black border-gray-100'
                  : 'border-slate-600 text-slate-200'
              }`}
            >
              Teacher
            </button>
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 py-2 rounded-lg border ${
                role === 'student'
                  ? 'bg-gray-100 text-black border-gray-100'
                  : 'border-slate-600 text-slate-200'
              }`}
            >
              Student
            </button>
          </div>

          {/* Name (optional for now) */}
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-gray-800/70 border border-slate-700 px-3 py-2 text-slate-100 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Enter your name"
            />
          </div>

          {/* Class ID */}
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Class ID</label>
            <input
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-lg bg-gray-800/70 border border-slate-700 px-3 py-2 text-slate-100 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="e.g. ABC123"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2 rounded-lg bg-gray-100 hover:bg-gray-100 text-black font-medium"
          >
            Join Classroom
          </button>
        </form>
      </div>
    </div>
  );
}
