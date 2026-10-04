

"use client";
import { getStudentFullName } from "@/lib/student-name";
import { useEffect, useState } from "react";
import styles from "./teacher-attendance.module.css";
type AttendanceStatus = "present" | "absent" | "late" | "excused";

type StudentAttendance = {
  studentEnrollmentId: string;
  studentId: string;
   firstName: string
    middleName: string
    lastName: string
  studentName: string;
  attendance: {
    id: string;
    status: AttendanceStatus;
    note: string | null;
  } | null;
};

type PageProps = {
  params: Promise<{
    classId: string;
    subjectId: string;
  }>;
};

export default function AttendancePage({ params }: PageProps) {
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [students, setStudents] = useState<StudentAttendance[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    params.then(({ classId, subjectId }) => {
      setClassId(classId);
      setSubjectId(subjectId);
    });
  }, [params]);

  useEffect(() => {
    if (!classId || !subjectId || !date) return;

    async function loadRoster() {
      try {
        setLoading(true);
        setError("");

        const searchParams = new URLSearchParams({
          classId,
          subjectId,
          date,
        });

        const response = await fetch(
          `/api/attendance/roster?${searchParams.toString()}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load students");
        }

        setStudents(data.data ?? []);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error ? error.message : "Failed to load students",
        );

        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    loadRoster();
  }, [classId, subjectId, date]);

  async function handleAttendance(
    student: StudentAttendance,
    status: AttendanceStatus,
  ) {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (student.attendance) {
        const response = await fetch("/api/attendance", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attendanceId: student.attendance.id,
            status,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update attendance");
        }
      } else {
        const response = await fetch("/api/attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentEnrollmentId: student.studentEnrollmentId,
            subjectId,
            date,
            status,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create attendance");
        }
      }

      const searchParams = new URLSearchParams({
        classId,
        subjectId,
        date,
      });

      const response = await fetch(
        `/api/attendance/roster?${searchParams.toString()}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reload roster");
      }

      setStudents(data.data ?? []);

      setSuccess(
    `${getStudentFullName(student)} marked ${
        status === "present"
            ? "Present"
            : "Absent"
    }`,
)
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error ? error.message : "Failed to save attendance",
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleStudent(student: StudentAttendance) {
    const currentStatus = student.attendance?.status ?? "present";

    const nextStatus = currentStatus === "present" ? "absent" : "present";

    void handleAttendance(student, nextStatus);
  }

  const presentCount = students.filter(
    (student) => !student.attendance || student.attendance.status === "present",
  ).length;

  const absentCount = students.filter(
    (student) => student.attendance?.status === "absent",
  ).length;

  if (loading) {
    return (
      <main className={styles.attendancePage}>
        <div className={styles.attendanceCard}>
          <div className={styles.loading}>Loading attendance...</div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.attendancePage}>
      <div className={styles.attendanceCard}>
        {/* HEADER — approximately 1/5 */}
        <header className={styles.attendanceHeader}>
          <div>
            <p className={styles.headerLabel}>ATTENDANCE</p>

            <h1 className={styles.headerTitle}>Daily Attendance</h1>

            <p className={styles.headerSubtitle}>
              Mark students present or absent.
            </p>
          </div>

          <div className={styles.dateContainer}>
            <label htmlFor="attendance-date" className={styles.dateLabel}>
              Date
            </label>

            <input
              id="attendance-date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setError("");
                setSuccess("");
              }}
              className={styles.dateInput}
            />
          </div>
        </header>

        {/* SUMMARY */}
        <div className={styles.attendanceSummary}>
          <div>
            <span className={styles.summaryLabel}>Students</span>

            <strong>{students.length}</strong>
          </div>

          <div className={styles.presentBox}>
            <span>Present</span>
            <strong>{presentCount}</strong>
          </div>

          <div className={styles.absentBox}>
            <span>Absent</span>
            <strong>{absentCount}</strong>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {success && <div className={styles.successMessage}>{success}</div>}

        {/* STUDENT LIST */}
        <section className={styles.studentSection}>
          <div className={styles.studentListHeader}>
            <span>#</span>

            <span>Student</span>

            <span>Attendance</span>
          </div>

         <div className={styles.studentList}>
  {students.length === 0 ? (
    <div className={styles.emptyState}>
      No students found.
    </div>
  ) : (
    students.map((student, index) => {
      const isPresent =
        !student.attendance ||
        student.attendance.status === "present";

      return (
        <label
          key={student.studentEnrollmentId}
          className={`
            ${styles.studentRow}
            ${
              isPresent
                ? styles.rowPresent
                : styles.rowAbsent
            }
          `}
        >
          <span className={styles.studentNumber}>
            {String(index + 1).padStart(2, "0")}
          </span>

          <span className={styles.studentName}>
            {getStudentFullName(student)}
          </span>

          <span className={styles.attendanceControl}>
            <input
              type="checkbox"
              checked={isPresent}
              disabled={saving}
              onChange={() =>
                toggleStudent(student)
              }
            />

            <span className={styles.customCheckbox} />

            <span className={styles.statusText}>
              {isPresent ? "Present" : "Absent"}
            </span>
          </span>
        </label>
      );
    })
  )}
</div>








        </section>

        {/* FOOTER */}
        <footer className={styles.attendanceFooter}>
          <span>{students.length} students</span>

          <span>
            {presentCount} Present
            {" · "}
            {absentCount} Absent
          </span>
        </footer>
      </div>
    </main>
  );
}
