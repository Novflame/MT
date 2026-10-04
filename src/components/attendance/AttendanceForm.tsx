// "use client"

// import { useEffect, useState } from "react"
// import styles from "./AttendanceForm.module.css"

// type Assignment = {
//     classId: string
//     className: string
//     subjectId: string
//     subjectName: string
// }

// type AttendanceStatus =
//     | "present"
//     | "absent"
//     | "late"
//     | "excused"

// type StudentAttendance = {
//     studentEnrollmentId: string
//     studentId: string
//     studentName: string

//     attendance: {
//         id: string
//         status: AttendanceStatus
//         note: string | null
//     } | null
// }

// const statuses: AttendanceStatus[] = [
//     "present",
//     "absent",
//     "late",
//     "excused",
// ]

// const statusLabels: Record<AttendanceStatus, string> = {
//     present: "Present",
//     absent: "Absent",
//     late: "Late",
//     excused: "Excused",
// }

// export default function AttendanceForm() {
//     const [assignments, setAssignments] =
//         useState<Assignment[]>([])

//     const [classId, setClassId] =
//         useState("")

//     const [subjectId, setSubjectId] =
//         useState("")

//     const [date, setDate] =
//         useState(
//             new Date()
//                 .toISOString()
//                 .split("T")[0],
//         )

//     const [students, setStudents] =
//         useState<StudentAttendance[]>([])

//     const [loadingAssignments, setLoadingAssignments] =
//         useState(true)

//     const [loadingRoster, setLoadingRoster] =
//         useState(false)

//     const [saving, setSaving] =
//         useState(false)

//     const [error, setError] =
//         useState("")

//     const [success, setSuccess] =
//         useState("")

//     // =====================================
//     // Load assignments
//     // =====================================

//     useEffect(() => {
//         async function loadAssignments() {
//             try {
//                 setLoadingAssignments(true)
//                 setError("")

//                 const response =
//                     await fetch(
//                         "/api/teacher-assignments",
//                     )

//                 const data =
//                     await response.json()

//                 if (!response.ok) {
//                     throw new Error(
//                         data.error ??
//                         "Failed to load assignments",
//                     )
//                 }

//                 setAssignments(
//                     data.assignments ?? [],
//                 )

//             } catch (error) {
//                 console.error(error)

//                 setError(
//                     error instanceof Error
//                         ? error.message
//                         : "Failed to load assignments",
//                 )

//             } finally {
//                 setLoadingAssignments(false)
//             }
//         }

//         loadAssignments()
//     }, [])

//     // =====================================
//     // Load roster
//     // =====================================

//     async function loadRoster() {
//         if (
//             !classId ||
//             !subjectId ||
//             !date
//         ) {
//             return
//         }

//         try {
//             setLoadingRoster(true)
//             setError("")
//             setSuccess("")

//             const params =
//                 new URLSearchParams({
//                     classId,
//                     subjectId,
//                     date,
//                 })

//             const response =
//                 await fetch(
//                     `/api/attendance/roster?${params.toString()}`,
//                 )

//             const data =
//                 await response.json()

//             if (!response.ok) {
//                 throw new Error(
//                     data.error ??
//                     "Failed to load attendance roster",
//                 )
//             }

//             setStudents(
//                 data.data ?? [],
//             )

//         } catch (error) {
//             console.error(error)

//             setError(
//                 error instanceof Error
//                     ? error.message
//                     : "Failed to load attendance roster",
//             )

//             setStudents([])

//         } finally {
//             setLoadingRoster(false)
//         }
//     }

//     // =====================================
//     // Create / update attendance
//     // =====================================

//     async function handleAttendance(
//         student: StudentAttendance,
//         status: AttendanceStatus,
//     ) {
//         if (
//             !classId ||
//             !subjectId ||
//             !date
//         ) {
//             return
//         }

//         try {
//             setSaving(true)
//             setError("")
//             setSuccess("")

//             if (student.attendance) {
//                 const response =
//                     await fetch(
//                         "/api/attendance",
//                         {
//                             method: "PATCH",

//                             headers: {
//                                 "Content-Type":
//                                     "application/json",
//                             },

//                             body: JSON.stringify({
//                                 attendanceId:
//                                     student.attendance.id,

//                                 status,
//                             }),
//                         },
//                     )

//                 const data =
//                     await response.json()

//                 if (!response.ok) {
//                     throw new Error(
//                         data.error ??
//                         "Failed to update attendance",
//                     )
//                 }

//             } else {
//                 const response =
//                     await fetch(
//                         "/api/attendance",
//                         {
//                             method: "POST",

//                             headers: {
//                                 "Content-Type":
//                                     "application/json",
//                             },

//                             body: JSON.stringify({
//                                 studentEnrollmentId:
//                                     student.studentEnrollmentId,

//                                 subjectId,

//                                 date,

//                                 status,
//                             }),
//                         },
//                     )

//                 const data =
//                     await response.json()

//                 if (!response.ok) {
//                     throw new Error(
//                         data.error ??
//                         "Failed to create attendance",
//                     )
//                 }
//             }

//             await loadRoster()

//             setSuccess(
//                 `Attendance saved for ${student.studentName}.`,
//             )

//         } catch (error) {
//             console.error(error)

//             setError(
//                 error instanceof Error
//                     ? error.message
//                     : "Failed to save attendance",
//             )

//         } finally {
//             setSaving(false)
//         }
//     }

//     // =====================================
//     // Loading
//     // =====================================

//     if (loadingAssignments) {
//         return (
//             <section className={styles.container}>
//                 <div className={styles.book}>
//                     <div className={styles.loading}>
//                         Loading attendance...
//                     </div>
//                 </div>
//             </section>
//         )
//     }

//     // =====================================
//     // Unique classes
//     // =====================================

//     const classes =
//         assignments.filter(
//             (
//                 assignment,
//                 index,
//                 array,
//             ) =>
//                 array.findIndex(
//                     item =>
//                         item.classId ===
//                         assignment.classId,
//                 ) === index,
//         )

//     // =====================================
//     // Subjects for selected class
//     // =====================================

//     const subjects =
//         assignments.filter(
//             assignment =>
//                 assignment.classId ===
//                 classId,
//         )

//     // =====================================
//     // UI
//     // =====================================

//     return (
//         <section className={styles.container}>

//             <div className={styles.book}>

//                 <div className={styles.page}>

//                     {/* ================================= */}
//                     {/* Header */}
//                     {/* ================================= */}

//                     <header className={styles.header}>

//                         <p className={styles.eyebrow}>
//                             School Management System
//                         </p>

//                         <h1 className={styles.title}>
//                             Daily Attendance
//                         </h1>

//                         <div className={styles.divider} />

//                         <p className={styles.subtitle}>
//                             Record attendance for your class.
//                         </p>

//                     </header>

//                     {/* ================================= */}
//                     {/* Selection */}
//                     {/* ================================= */}

//                     <div className={styles.selection}>

//                         <div className={styles.field}>

//                             <label
//                                 htmlFor="attendance-class"
//                                 className={styles.label}
//                             >
//                                 Class
//                             </label>

//                             <select
//                                 id="attendance-class"
//                                 value={classId}
//                                 onChange={(event) => {
//                                     setClassId(
//                                         event.target.value,
//                                     )

//                                     setSubjectId("")
//                                     setStudents([])
//                                     setError("")
//                                     setSuccess("")
//                                 }}
//                                 className={styles.input}
//                             >

//                                 <option value="">
//                                     Select class
//                                 </option>

//                                 {classes.map(
//                                     assignment => (
//                                         <option
//                                             key={
//                                                 assignment.classId
//                                             }
//                                             value={
//                                                 assignment.classId
//                                             }
//                                         >
//                                             {
//                                                 assignment.className
//                                             }
//                                         </option>
//                                     ),
//                                 )}

//                             </select>

//                         </div>

//                         <div className={styles.field}>

//                             <label
//                                 htmlFor="attendance-subject"
//                                 className={styles.label}
//                             >
//                                 Subject
//                             </label>

//                             <select
//                                 id="attendance-subject"
//                                 value={subjectId}
//                                 onChange={(event) => {
//                                     setSubjectId(
//                                         event.target.value,
//                                     )

//                                     setStudents([])
//                                     setError("")
//                                     setSuccess("")
//                                 }}
//                                 disabled={!classId}
//                                 className={styles.input}
//                             >

//                                 <option value="">
//                                     Select subject
//                                 </option>

//                                 {subjects.map(
//                                     assignment => (
//                                         <option
//                                             key={
//                                                 assignment.subjectId
//                                             }
//                                             value={
//                                                 assignment.subjectId
//                                             }
//                                         >
//                                             {
//                                                 assignment.subjectName
//                                             }
//                                         </option>
//                                     ),
//                                 )}

//                             </select>

//                         </div>

//                         <div className={styles.field}>

//                             <label
//                                 htmlFor="attendance-date"
//                                 className={styles.label}
//                             >
//                                 Date
//                             </label>

//                             <input
//                                 id="attendance-date"
//                                 type="date"
//                                 value={date}
//                                 onChange={(event) => {
//                                     setDate(
//                                         event.target.value,
//                                     )

//                                     setStudents([])
//                                     setError("")
//                                     setSuccess("")
//                                 }}
//                                 className={styles.input}
//                             />

//                         </div>

//                     </div>

//                     {/* ================================= */}
//                     {/* Load */}
//                     {/* ================================= */}

//                     <button
//                         type="button"
//                         onClick={loadRoster}
//                         disabled={
//                             !classId ||
//                             !subjectId ||
//                             !date ||
//                             loadingRoster
//                         }
//                         className={styles.loadButton}
//                     >
//                         {loadingRoster
//                             ? "Opening Register..."
//                             : "Open Attendance Register"}
//                     </button>

//                     {/* ================================= */}
//                     {/* Messages */}
//                     {/* ================================= */}

//                     {error && (
//                         <div
//                             className={styles.error}
//                             role="alert"
//                         >
//                             <strong>
//                                 Something went wrong
//                             </strong>

//                             <span>
//                                 {error}
//                             </span>
//                         </div>
//                     )}

//                     {success && (
//                         <div
//                             className={styles.success}
//                             role="status"
//                         >
//                             {success}
//                         </div>
//                     )}

//                     {/* ================================= */}
//                     {/* Students */}
//                     {/* ================================= */}

//                     {!loadingRoster &&
//                         students.length > 0 && (

//                         <div className={styles.roster}>

//                             <div className={styles.rosterHeader}>

//                                 <div>
//                                     <span className={styles.rosterLabel}>
//                                         Attendance Register
//                                     </span>

//                                     <h2 className={styles.rosterTitle}>
//                                         {classes.find(
//                                             item =>
//                                                 item.classId ===
//                                                 classId,
//                                         )?.className}
//                                     </h2>
//                                 </div>

//                                 <span className={styles.studentCount}>
//                                     {students.length} students
//                                 </span>

//                             </div>

//                             <div className={styles.students}>

//                                 {students.map(
//                                     (student, index) => {

//                                         const currentStatus =
//                                             student.attendance
//                                                 ?.status

//                                         return (
//                                             <article
//                                                 key={
//                                                     student.studentEnrollmentId
//                                                 }
//                                                 className={
//                                                     styles.student
//                                                 }
//                                             >

//                                                 <div
//                                                     className={
//                                                         styles.studentInfo
//                                                     }
//                                                 >

//                                                     <span
//                                                         className={
//                                                             styles.number
//                                                         }
//                                                     >
//                                                         {String(
//                                                             index + 1,
//                                                         ).padStart(
//                                                             2,
//                                                             "0",
//                                                         )}
//                                                     </span>

//                                                     <div>
//                                                         <h3
//                                                             className={
//                                                                 styles.studentName
//                                                             }
//                                                         >
//                                                             {
//                                                                 student.studentName
//                                                             }
//                                                         </h3>

//                                                         <p
//                                                             className={
//                                                                 styles.current
//                                                             }
//                                                         >
//                                                             Current:
//                                                             {" "}

//                                                             <span>
//                                                                 {
//                                                                     currentStatus
//                                                                         ? statusLabels[
//                                                                             currentStatus
//                                                                         ]
//                                                                         : "Not recorded"
//                                                                 }
//                                                             </span>
//                                                         </p>
//                                                     </div>

//                                                 </div>

//                                                 <div
//                                                     className={
//                                                         styles.statuses
//                                                     }
//                                                 >

//                                                     {statuses.map(
//                                                         status => (
//                                                             <button
//                                                                 key={
//                                                                     status
//                                                                 }
//                                                                 type="button"
//                                                                 disabled={
//                                                                     saving
//                                                                 }
//                                                                 onClick={() =>
//                                                                     handleAttendance(
//                                                                         student,
//                                                                         status,
//                                                                     )
//                                                                 }
//                                                                 className={`
//                                                                     ${styles.statusButton}
//                                                                     ${
//                                                                         currentStatus ===
//                                                                         status
//                                                                             ? styles.activeStatus
//                                                                             : ""
//                                                                     }
//                                                                 `}
//                                                             >
//                                                                 {
//                                                                     statusLabels[
//                                                                         status
//                                                                     ]
//                                                                 }
//                                                             </button>
//                                                         ),
//                                                     )}

//                                                 </div>

//                                             </article>
//                                         )
//                                     },
//                                 )}

//                             </div>

//                         </div>
//                     )}

//                     {/* ================================= */}
//                     {/* No students */}
//                     {/* ================================= */}

//                     {!loadingRoster &&
//                         classId &&
//                         subjectId &&
//                         students.length === 0 && (

//                         <div className={styles.empty}>
//                             <h3>
//                                 No students found
//                             </h3>

//                             <p>
//                                 There are no students enrolled
//                                 in this class.
//                             </p>
//                         </div>
//                     )}

//                 </div>

//             </div>

//         </section>
//     )
// }

"use client";

import { useEffect, useState } from "react";
import styles from "./AttendanceForm.module.css";

type Assignment = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
};

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type StudentAttendance = {
  studentEnrollmentId: string;
  studentId: string;
  studentName: string;

  attendance: {
    id: string;
    status: AttendanceStatus;
    note: string | null;
  } | null;
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

export default function AttendanceForm() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [classId, setClassId] = useState("");

  const [subjectId, setSubjectId] = useState("");

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [students, setStudents] = useState<StudentAttendance[]>([]);

  const [loadingAssignments, setLoadingAssignments] = useState(true);

  const [loadingRoster, setLoadingRoster] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // =====================================
  // Load assignments
  // =====================================

  useEffect(() => {
    async function loadAssignments() {
      try {
        setLoadingAssignments(true);
        setError("");

        const response = await fetch("/api/teacher-assignments");

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load assignments");
        }

        setAssignments(data.assignments ?? []);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error ? error.message : "Failed to load assignments",
        );
      } finally {
        setLoadingAssignments(false);
      }
    }

    loadAssignments();
  }, []);

  // =====================================
  // Load roster
  // =====================================

  async function loadRoster() {
    if (!classId || !subjectId || !date) {
      return;
    }

    try {
      setLoadingRoster(true);
      setError("");
      setSuccess("");

      const params = new URLSearchParams({
        classId,
        subjectId,
        date,
      });

      const response = await fetch(
        `/api/attendance/roster?${params.toString()}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load attendance roster");
      }

      /*
       * Important:
       *
       * If there is no attendance record,
       * the student is PRESENT by default.
       *
       * We do not need to create a database
       * record for every student just to display
       * the default state.
       */
      setStudents(data.data ?? []);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load attendance roster",
      );

      setStudents([]);
    } finally {
      setLoadingRoster(false);
    }
  }

  // =====================================
  // Create / update attendance
  // =====================================

  async function handleAttendance(
    student: StudentAttendance,
    status: AttendanceStatus,
  ) {
    if (!classId || !subjectId || !date) {
      return;
    }

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
          throw new Error(data.error ?? "Failed to update attendance");
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
          throw new Error(data.error ?? "Failed to create attendance");
        }
      }

      await loadRoster();

      setSuccess(`${student.studentName}: ${statusLabels[status]}`);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error ? error.message : "Failed to save attendance",
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================
  // Toggle Present / Absent
  // =====================================

  function toggleStudent(student: StudentAttendance) {
    /*
     * No existing record means PRESENT by default.
     *
     * Therefore:
     *
     * PRESENT -> ABSENT
     * ABSENT  -> PRESENT
     *
     * Existing late/excused records are treated as
     * non-present and clicking the checkbox changes
     * them to PRESENT.
     */

    const currentStatus = student.attendance?.status ?? "present";

    if (currentStatus === "present") {
      void handleAttendance(student, "absent");
    } else {
      void handleAttendance(student, "present");
    }
  }

  // =====================================
  // Loading
  // =====================================

  if (loadingAssignments) {
    return (
      <section className={styles.container}>
        <div className={styles.book}>
          <div className={styles.loading}>Loading attendance...</div>
        </div>
      </section>
    );
  }

  // =====================================
  // Unique classes
  // =====================================

  const classes = assignments.filter(
    (assignment, index, array) =>
      array.findIndex((item) => item.classId === assignment.classId) === index,
  );

  // =====================================
  // Subjects for selected class
  // =====================================

  const subjects = assignments.filter(
    (assignment) => assignment.classId === classId,
  );

  // =====================================
  // Attendance statistics
  // =====================================

  const presentCount = students.filter(
    (student) => !student.attendance || student.attendance.status === "present",
  ).length;

  const absentCount = students.filter(
    (student) => student.attendance?.status === "absent",
  ).length;

  // =====================================
  // UI
  // =====================================

  return (
    <section className={styles.container}>
      <div className={styles.book}>
        <div className={styles.page}>
          {/* ================================= */}
          {/* Header */}
          {/* ================================= */}

          <header className={styles.header}>
            <p className={styles.eyebrow}>School Management System</p>

            <h1 className={styles.title}>Daily Attendance</h1>

            <div className={styles.divider} />

            <p className={styles.subtitle}>Mark students present or absent.</p>
          </header>

          {/* ================================= */}
          {/* Selection */}
          {/* ================================= */}

          <div className={styles.selection}>
            <div className={styles.field}>
              <label htmlFor="attendance-class" className={styles.label}>
                Class
              </label>

              <select
                id="attendance-class"
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value);

                  setSubjectId("");
                  setStudents([]);
                  setError("");
                  setSuccess("");
                }}
                className={styles.input}
              >
                <option value="">Select class</option>

                {classes.map((assignment) => (
                  <option key={assignment.classId} value={assignment.classId}>
                    {assignment.className}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="attendance-subject" className={styles.label}>
                Subject
              </label>

              <select
                id="attendance-subject"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);

                  setStudents([]);
                  setError("");
                  setSuccess("");
                }}
                disabled={!classId}
                className={styles.input}
              >
                <option value="">Select subject</option>

                {subjects.map((assignment) => (
                  <option
                    key={assignment.subjectId}
                    value={assignment.subjectId}
                  >
                    {assignment.subjectName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="attendance-date" className={styles.label}>
                Date
              </label>

              <input
                id="attendance-date"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);

                  setStudents([]);
                  setError("");
                  setSuccess("");
                }}
                className={styles.input}
              />
            </div>
          </div>

          {/* ================================= */}
          {/* Load */}
          {/* ================================= */}

          <button
            type="button"
            onClick={loadRoster}
            disabled={!classId || !subjectId || !date || loadingRoster}
            className={styles.loadButton}
          >
            {loadingRoster ? "Opening Register..." : "Open Attendance Register"}
          </button>

          {/* ================================= */}
          {/* Messages */}
          {/* ================================= */}

          {error && (
            <div className={styles.error} role="alert">
              <strong>Something went wrong</strong>

              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className={styles.success} role="status">
              {success}
            </div>
          )}

          {/* ================================= */}
          {/* Students */}
          {/* ================================= */}

          {!loadingRoster && students.length > 0 && (
            <div className={styles.roster}>
              {/* FIXED HEADER */}

              <div className={styles.rosterHeader}>
                <div>
                  <span className={styles.rosterLabel}>
                    Attendance Register
                  </span>

                  <h2 className={styles.rosterTitle}>
                    {
                      classes.find((item) => item.classId === classId)
                        ?.className
                    }
                  </h2>
                </div>

                <div className={styles.summary}>
                  <span className={styles.presentSummary}>
                    Present {presentCount}
                  </span>

                  <span className={styles.absentSummary}>
                    Absent {absentCount}
                  </span>
                </div>
              </div>

              {/* SCROLL ONLY THIS AREA */}

              <div className={styles.students}>
                {students.map((student, index) => {
                  /*
                   * No attendance record =
                   * PRESENT by default.
                   */

                  const currentStatus = student.attendance?.status ?? "present";

                  const isPresent = currentStatus === "present";

                  const isAbsent = currentStatus === "absent";

                  return (
                    <article
                      key={student.studentEnrollmentId}
                      className={`
                                                    ${styles.student}
                                                    ${
                                                      isPresent
                                                        ? styles.studentPresent
                                                        : ""
                                                    }
                                                    ${
                                                      isAbsent
                                                        ? styles.studentAbsent
                                                        : ""
                                                    }
                                                `}
                    >
                      <div className={styles.studentInfo}>
                        <span className={styles.number}>
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div>
                          <h3 className={styles.studentName}>
                            {student.studentName}
                          </h3>

                          <p className={styles.current}>
                            Status:{" "}
                            <span>
                              {isPresent
                                ? "Present"
                                : isAbsent
                                  ? "Absent"
                                  : statusLabels[currentStatus]}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* PRESENT / ABSENT */}

                      <label
                        className={`
                                                        ${styles.attendanceToggle}
                                                        ${
                                                          isPresent
                                                            ? styles.togglePresent
                                                            : styles.toggleAbsent
                                                        }
                                                    `}
                      >
                        <input
                          type="checkbox"
                          checked={isPresent}
                          disabled={saving}
                          onChange={() => toggleStudent(student)}
                        />

                        <span className={styles.checkbox} />

                        <span className={styles.toggleText}>
                          {isPresent ? "Present" : "Absent"}
                        </span>
                      </label>
                    </article>
                  );
                })}
              </div>

              {/* FIXED FOOTER */}

              <div className={styles.rosterFooter}>
                <div>
                  <strong>{students.length}</strong>

                  <span> students</span>
                </div>

                <div className={styles.footerStats}>
                  <span className={styles.presentSummary}>
                    Present: {presentCount}
                  </span>

                  <span className={styles.absentSummary}>
                    Absent: {absentCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================================= */}
          {/* No students */}
          {/* ================================= */}

          {!loadingRoster && classId && subjectId && students.length === 0 && (
            <div className={styles.empty}>
              <h3>No students found</h3>

              <p>There are no students enrolled in this class.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
