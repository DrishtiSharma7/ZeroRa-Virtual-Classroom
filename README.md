# ZeroRa Virtual Classroom

ZeroRa Virtual Classroom is a web-based virtual classroom platform that simplifies real-time online teaching. It provides separate views for teachers and students, an interactive whiteboard area, and a participant/control section.

Link: https://zero-ra-virtual-classroom.vercel.app/

## Features

- Dedicated views for teacher and student
- 70/30 layout: large digital whiteboard + participant/control sidebar
- Real-time classroom-oriented interface design
- Custom login page UI
- Server setup file (`server.js`) for backend integration (future enhancements)

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript / JavaScript
- **Styling:** Tailwind CSS (if used in the project)
- **Runtime:** Node.js

> Note: Update the stack list according to your actual project (for example, Tailwind, Socket.io, etc.).

## Project Structure (Key Files)

- `app/class/[classId]/TeacherView.tsx` – Classroom UI for the teacher
- `app/class/[classId]/StudentView.tsx` – Classroom UI for the student
- `app/class/[classId]/page.tsx` – Dynamic class page routing
- `app/login/page.tsx` – Login page using the App Router
- `app/pages/login.tsx` – Legacy/alternate login page
- `public/bg-login.png` – Login background image
- `server.js` – Server / backend entry point

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn installed

### Installation

```bash
# Clone the repository
git clone https://github.com/DrishtiSharma7/ZeroRa-Virtual-Classroom.git

cd ZeroRa-Virtual-Classroom

# Install dependencies
npm install
# or
yarn install

