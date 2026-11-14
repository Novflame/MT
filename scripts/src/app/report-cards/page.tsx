import { getSchoolDB } from "@/db";
import { getStudentFullName } from "@/lib/student-name";
import ReportCardsClasses from "./reportCardsClasses";
import { requireSession } from "@/auth/session";
export default async function ReportCardsPage() {
  const session = await requireSession();
  const db = await getSchoolDB();
  let enrollments = await db.query.studentEnrollments.findMany({
    with: { student: true, class: true },
  });
  if (session.user.schoolRole === "parent") {
    const parent = await db.query.parents.findFirst({
      where: (p, { eq }) => eq(p.userId, session.user.id),
    });
    const links = parent
      ? await db.query.parentStudents.findMany({
          where: (p, { eq }) => eq(p.parentId, parent.id),
        })
      : [];
    const studentIds = new Set(links.map((link) => link.studentId));
    enrollments = enrollments.filter((enrollment) =>
      studentIds.has(enrollment.studentId),
    );
  }
  if (session.user.schoolRole === "student") {
    const link = await db.query.studentUsers.findFirst({
      where: (s, { eq }) => eq(s.userId, session.user.id),
    });
    enrollments = enrollments.filter(
      (enrollment) => enrollment.studentId === link?.studentId,
    );
  }
  const grades = await db.query.grades.findMany({
    with: { test: true, exam: true },
  });
  const gradeMap = new Map<
    string,
    {
      id: string;
      assessment: string;
      type: string;
      score: number;
      maxScore: number;
    }[]
  >();
  for (const grade of grades) {
    const assessment = grade.test ?? grade.exam;
    const entry = {
      id: grade.id,
      assessment: assessment?.name ?? "Assessment",
      type: grade.test ? "Test" : "Exam",
      score: grade.score,
      maxScore: grade.test?.maxScore ?? grade.exam?.maxScore ?? 0,
    };
    const existing = gradeMap.get(grade.studentEnrollmentId) ?? [];
    existing.push(entry);
    gradeMap.set(grade.studentEnrollmentId, existing);
  }
  const classMap = new Map<
    string,
    {
      id: string;
      name: string;
      students: {
        id: string;
        name: string;
        assessments: {
          id: string;
          assessment: string;
          type: string;
          score: number;
          maxScore: number;
        }[];
        earned: number;
        possible: number;
        percentage: number;
      }[];
    }
  >();
  for (const enrollment of enrollments) {
    const classId = enrollment.class.id;
    const assessments = gradeMap.get(enrollment.id) ?? [];
    const earned = assessments.reduce(
      (total, assessment) => total + assessment.score,
      0,
    );
    const possible = assessments.reduce(
      (total, assessment) => total + assessment.maxScore,
      0,
    );
    const percentage = possible ? Math.round((earned / possible) * 100) : 0;
    if (!classMap.has(classId)) {
      classMap.set(classId, {
        id: classId,
        name: enrollment.class.name,
        students: [],
      });
    }
    classMap
      .get(classId)!
      .students.push({
        id: enrollment.id,
        name: getStudentFullName(enrollment.student),
        assessments,
        earned,
        possible,
        percentage,
      });
  }
  const classes = Array.from(classMap.values())
    .map((schoolClass) => {
      const studentsWithGrades = schoolClass.students.filter(
        (student) => student.possible > 0,
      );
      const average =
        studentsWithGrades.length > 0
          ? Math.round(
              studentsWithGrades.reduce(
                (total, student) => total + student.percentage,
                0,
              ) / studentsWithGrades.length,
            )
          : 0;
      return {
        ...schoolClass,
        students: schoolClass.students.sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
        studentCount: schoolClass.students.length,
        average,
        assessedCount: studentsWithGrades.length,
      };
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  return (
    <main className="min-h-dvh bg-gray-50 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:p-6 lg:p-8">
      {" "}
      <div className="mx-auto max-w-7xl">
        {" "}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {" "}
          <div>
            {" "}
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {" "}
              Report Cards{" "}
            </h1>{" "}
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {" "}
              Select a class to view student report cards and academic
              results.{" "}
            </p>{" "}
          </div>{" "}
          <div className="w-fit rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            {" "}
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {" "}
              Total Classes{" "}
            </p>{" "}
            <p className="mt-1 text-2xl font-bold">{classes.length}</p>{" "}
          </div>{" "}
        </header>{" "}
        {classes.length === 0 ? (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            {" "}
            <h2 className="font-semibold">No report cards available</h2>{" "}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {" "}
              No student enrollments were found for your account.{" "}
            </p>{" "}
          </div>
        ) : (
          <ReportCardsClasses classes={classes} />
        )}{" "}
      </div>{" "}
    </main>
  );
}
