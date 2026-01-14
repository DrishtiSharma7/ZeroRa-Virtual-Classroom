// app/class/[classId]/page.tsx

import TeacherView from './TeacherView';
import StudentView from './StudentView';

type ClassroomPageProps = {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ role?: string; name?: string }>;
};

export default async function ClassroomPage({ params, searchParams }: ClassroomPageProps) {
  const { classId } = await params;
  const sp = await searchParams;

  const role = (sp.role ?? 'student') as 'teacher' | 'student';
  const name = sp.name ?? 'Guest';
  const isTeacher = role === 'teacher';

  if (role === 'teacher') {
    return <TeacherView classId={classId} name={name} />;
  }

  return <StudentView classId={classId} name={name} />;
}

