import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import StudentsManager from "@/components/students/StudentsManager";
import { getActiveAcademicYear } from "@/db/academic-year";
import { getStudentFullName } from "@/lib/student-name"
export default async function StudentsPage() {
  await requirePermission("students.read");

  const db = await getSchoolDB();
  const academicYear = await getActiveAcademicYear();

  const students = await db.query.students.findMany({
    with: {
      parentStudents: {
        with: {
          parent: true,
        },
      },

      enrollments: {
        with: {
          class: true,
          academicYear: true,
        },
      },
    },

    orderBy: (students, { asc }) => asc(students.firstName),
  });

  const classes = await db.query.schoolClases.findMany({
    orderBy: (schoolClases, { asc }) => asc(schoolClases.gradeLevel),
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Students</h1>

        <p className="mt-2 text-gray-600">Manage students in your school.</p>

        <div className="mt-8">
          <StudentsManager
            classes={classes.map((schoolClass) => ({
              id: schoolClass.id,
              name: schoolClass.name,
              gradeLevel: schoolClass.gradeLevel,
            }))}
            academicYearName={academicYear.name}
            students={students.map((student) => {
              const enrollment = student.enrollments.find(
                (enrollment) => enrollment.academicYearId === academicYear.id,
              );

              const parentLink = student.parentStudents[0];

              const parent = parentLink?.parent;

              return {
                id: student.id,

                name: getStudentFullName(student),

                parentName: parent?.name ?? "",

                parentPhone: parent?.phone ?? "",

                classId: enrollment?.classId ?? "",

                className: enrollment?.class.name ?? "Not enrolled",
              };
            })}
          />
        </div>
      </div>
    </main>
  );
}
