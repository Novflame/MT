
import {
    and,
    eq,
    gte,
    inArray,
    lt,
} from "drizzle-orm"

import {
    Activity,
    Award,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    FileBarChart,
    GraduationCap,
    ShieldCheck,
    TrendingUp,
    UserPlus,
    Users,
} from "lucide-react"

import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"
import {
    attendance,
    classHeads,
    departmentHeads,
    exams,
    grades,
    parentStudents,
    parents,
    promotionDecisions,
    resultCertificates,
    schoolClases,
    studentEnrollments,
    studentUsers,
    students,
    subjects,
    teacherAssignments,
    tests,
} from "@/db/schema"
import { getLocale } from "@/lib/i18n/server"
import { translations } from "@/lib/i18n/translations"
import { getStudentFullName } from "@/lib/student-name"

type Locale = "en" | "ar" | "fr"

type Scope = {
    all: boolean
    studentIds: Set<string>
    enrollmentIds: Set<string>
    classIds: Set<string>
    subjectIds: Set<string>
}

type ActivityItem = {
    id: string
    type:
        | "attendance"
        | "test"
        | "exam"
        | "grade"
        | "student-created"
        | "student-updated"
        | "result"
        | "promotion"
    title: string
    description: string
    meta: string
}

const localLabels = {
    en: {
        title: "Daily School Report",
        description:
            "A complete record of real school activity for the selected day.",
        overview: "Daily Activity Overview",
        attendance: "Attendance",
        tests: "Tests",
        exams: "Exams",
        grades: "Grades",
        students: "Student Activity",
        results: "Results Activity",
        promotions: "Promotion Decisions",
        activity: "Activity Details",
        present: "Present",
        absent: "Absent",
        late: "Late",
        excused: "Excused",
        records: "Records",
        created: "Created",
        updated: "Updated",
        issued: "Issued",
        decided: "Decided",
        newStudents: "New Students",
        updatedStudents: "Student Records Updated",
        certificates: "Result Certificates",
        noActivity: "No activity was recorded for this date.",
        noAttendance: "No attendance records were recorded.",
        noTests: "No tests were recorded for this date.",
        noExams: "No exams were recorded for this date.",
        noGrades: "No grades were added or updated for this date.",
        noStudents: "No student activity was recorded.",
        noResults: "No result certificates were issued.",
        noPromotions: "No promotion decisions were recorded.",
        noAssignments:
            "No academic assignment was found for your current role.",
        date: "Date",
        student: "Student",
        class: "Class",
        subject: "Subject",
        status: "Status",
        score: "Score",
        type: "Type",
        name: "Name",
        decision: "Decision",
        systemResult: "System Result",
        finalDecision: "Final Decision",
        certificate: "Result Certificate Issued",
        promotion: "Promotion Decision",
        studentCreated: "Student Added",
        studentUpdated: "Student Record Updated",
        attendanceRecorded: "Attendance Recorded",
        testRecorded: "Test Scheduled",
        examRecorded: "Exam Scheduled",
        gradeRecorded: "Grade Added / Updated",
        totalActivity: "Total Activity",
        school: "School",
        roleScope: "Report Scope",
        wholeSchool: "Whole School",
        department: "Department",
        assignedClasses: "Assigned Classes",
        children: "Children",
        ownRecord: "Own Record",
        noData: "No data",
    },

    ar: {
        title: "التقرير اليومي للمدرسة",
        description:
            "سجل شامل للنشاط المدرسي الفعلي في اليوم المحدد.",
        overview: "ملخص النشاط اليومي",
        attendance: "الحضور",
        tests: "الاختبارات",
        exams: "الامتحانات",
        grades: "الدرجات",
        students: "نشاط الطلاب",
        results: "نشاط النتائج",
        promotions: "قرارات الترقية",
        activity: "تفاصيل النشاط",
        present: "حاضر",
        absent: "غائب",
        late: "متأخر",
        excused: "معذور",
        records: "السجلات",
        created: "تم الإنشاء",
        updated: "تم التحديث",
        issued: "تم الإصدار",
        decided: "تم اتخاذ القرار",
        newStudents: "طلاب جدد",
        updatedStudents: "سجلات الطلاب المحدثة",
        certificates: "شهادات النتائج",
        noActivity: "لم يتم تسجيل أي نشاط لهذا التاريخ.",
        noAttendance: "لم يتم تسجيل أي سجلات حضور.",
        noTests: "لم يتم تسجيل أي اختبارات لهذا التاريخ.",
        noExams: "لم يتم تسجيل أي امتحانات لهذا التاريخ.",
        noGrades: "لم تتم إضافة أو تحديث أي درجات لهذا التاريخ.",
        noStudents: "لم يتم تسجيل نشاط للطلاب.",
        noResults: "لم يتم إصدار أي شهادات نتائج.",
        noPromotions: "لم يتم تسجيل أي قرارات ترقية.",
        noAssignments:
            "لا يوجد تكليف أكاديمي مرتبط بدورك الحالي.",
        date: "التاريخ",
        student: "الطالب",
        class: "الفصل",
        subject: "المادة",
        status: "الحالة",
        score: "الدرجة",
        type: "النوع",
        name: "الاسم",
        decision: "القرار",
        systemResult: "نتيجة النظام",
        finalDecision: "القرار النهائي",
        certificate: "إصدار شهادة نتيجة",
        promotion: "قرار ترقية",
        studentCreated: "إضافة طالب",
        studentUpdated: "تحديث سجل طالب",
        attendanceRecorded: "تسجيل الحضور",
        testRecorded: "تسجيل اختبار",
        examRecorded: "تسجيل امتحان",
        gradeRecorded: "إضافة / تحديث درجة",
        totalActivity: "إجمالي النشاط",
        school: "المدرسة",
        roleScope: "نطاق التقرير",
        wholeSchool: "المدرسة بالكامل",
        department: "القسم",
        assignedClasses: "الفصول المعيّنة",
        children: "الأبناء",
        ownRecord: "السجل الشخصي",
        noData: "لا توجد بيانات",
    },

    fr: {
        title: "Rapport quotidien de l'école",
        description:
            "Registre complet de l'activité scolaire réelle pour la date sélectionnée.",
        overview: "Résumé de l'activité quotidienne",
        attendance: "Présence",
        tests: "Tests",
        exams: "Examens",
        grades: "Notes",
        students: "Activité des élèves",
        results: "Activité des résultats",
        promotions: "Décisions de promotion",
        activity: "Détails de l'activité",
        present: "Présent",
        absent: "Absent",
        late: "En retard",
        excused: "Excusé",
        records: "Enregistrements",
        created: "Créé",
        updated: "Mis à jour",
        issued: "Émis",
        decided: "Décidé",
        newStudents: "Nouveaux élèves",
        updatedStudents: "Dossiers d'élèves mis à jour",
        certificates: "Certificats de résultats",
        noActivity:
            "Aucune activité n'a été enregistrée pour cette date.",
        noAttendance:
            "Aucun enregistrement de présence n'a été enregistré.",
        noTests: "Aucun test n'a été enregistré pour cette date.",
        noExams:
            "Aucun examen n'a été enregistré pour cette date.",
        noGrades:
            "Aucune note n'a été ajoutée ou mise à jour pour cette date.",
        noStudents:
            "Aucune activité concernant les élèves n'a été enregistrée.",
        noResults:
            "Aucun certificat de résultats n'a été émis.",
        noPromotions:
            "Aucune décision de promotion n'a été enregistrée.",
        noAssignments:
            "Aucune affectation académique n'a été trouvée pour votre rôle actuel.",
        date: "Date",
        student: "Élève",
        class: "Classe",
        subject: "Matière",
        status: "Statut",
        score: "Note",
        type: "Type",
        name: "Nom",
        decision: "Décision",
        systemResult: "Résultat système",
        finalDecision: "Décision finale",
        certificate: "Certificat de résultat émis",
        promotion: "Décision de promotion",
        studentCreated: "Élève ajouté",
        studentUpdated: "Dossier de l'élève mis à jour",
        attendanceRecorded: "Présence enregistrée",
        testRecorded: "Test planifié",
        examRecorded: "Examen planifié",
        gradeRecorded: "Note ajoutée / mise à jour",
        totalActivity: "Activité totale",
        school: "École",
        roleScope: "Périmètre du rapport",
        wholeSchool: "Toute l'école",
        department: "Département",
        assignedClasses: "Classes affectées",
        children: "Enfants",
        ownRecord: "Propre dossier",
        noData: "Aucune donnée",
    },
} as const

function isValidDate(value: string | undefined): value is string {
    if (!value) return false

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false
    }

    const date = new Date(`${value}T00:00:00Z`)

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    )
}

function getToday(): string {
    return new Date().toISOString().slice(0, 10)
}

function getDayRange(date: string) {
    const start = `${date}T00:00:00.000Z`

    const nextDay = new Date(`${date}T00:00:00.000Z`)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)

    const end = nextDay.toISOString()

    return {
        start,
        end,
    }
}

function inScope(
    scope: Scope,
    values: {
        studentId?: string
        enrollmentId?: string
        classId?: string
        subjectId?: string
    },
) {
    if (scope.all) {
        return true
    }

    if (
        values.studentId &&
        scope.studentIds.size > 0 &&
        !scope.studentIds.has(values.studentId)
    ) {
        return false
    }

    if (
        values.enrollmentId &&
        scope.enrollmentIds.size > 0 &&
        !scope.enrollmentIds.has(values.enrollmentId)
    ) {
        return false
    }

    if (
        values.classId &&
        scope.classIds.size > 0 &&
        !scope.classIds.has(values.classId)
    ) {
        return false
    }

    if (
        values.subjectId &&
        scope.subjectIds.size > 0 &&
        !scope.subjectIds.has(values.subjectId)
    ) {
        return false
    }

    return true
}

function getScopeLabel(
    role: string,
    labels: (typeof localLabels)[Locale],
) {
    switch (role) {
        case "principal":
        case "deputy":
            return labels.wholeSchool

        case "head_of_department":
            return labels.department

        case "head_of_class":
        case "teacher":
            return labels.assignedClasses

        case "parent":
            return labels.children

        case "student":
            return labels.ownRecord

        default:
            return labels.wholeSchool
    }
}

function getAttendanceLabel(
    status: string,
    labels: (typeof localLabels)[Locale],
) {
    switch (status) {
        case "present":
            return labels.present
        case "absent":
            return labels.absent
        case "late":
            return labels.late
        case "excused":
            return labels.excused
        default:
            return status
    }
}

function statusClass(status: string) {
    switch (status) {
        case "present":
            return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"

        case "absent":
            return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"

        case "late":
            return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"

        case "excused":
            return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"

        default:
            return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }
}

function activityIcon(type: ActivityItem["type"]) {
    switch (type) {
        case "attendance":
            return CheckCircle2

        case "test":
            return ClipboardCheck

        case "exam":
            return FileBarChart

        case "grade":
            return TrendingUp

        case "student-created":
            return UserPlus

        case "student-updated":
            return Users

        case "result":
            return Award

        case "promotion":
            return GraduationCap
    }
}

export default async function DailyReportPage({
    searchParams,
}: {
    searchParams: Promise<{
        date?: string
    }>
}) {
    const session = await requirePermission("reports.read")

    const locale = await getLocale()
    const t = translations[locale]
    const labels = localLabels[locale]

    const params = await searchParams

    const reportDate = isValidDate(params.date)
        ? params.date
        : getToday()

    const { start, end } = getDayRange(reportDate)

    const db = await getSchoolDB()
    const academicYear = await getActiveAcademicYear()

    const role = session.user.schoolRole

    const scope: Scope = {
        all: role === "principal" || role === "deputy",
        studentIds: new Set(),
        enrollmentIds: new Set(),
        classIds: new Set(),
        subjectIds: new Set(),
    }

    /*
     * ---------------------------------------------------------
     * BUILD ROLE SCOPE
     * ---------------------------------------------------------
     */

    const activeEnrollments =
        await db.query.studentEnrollments.findMany({
            where: eq(
                studentEnrollments.academicYearId,
                academicYear.id,
            ),
            with: {
                student: true,
                class: true,
            },
        })

    if (!scope.all) {
        if (role === "head_of_department") {
            const departmentHead =
                await db.query.departmentHeads.findFirst({
                    where: and(
                        eq(
                            departmentHeads.userId,
                            session.user.id,
                        ),
                        eq(
                            departmentHeads.academicYearId,
                            academicYear.id,
                        ),
                    ),
                })

            if (departmentHead) {
                const departmentSubjects =
                    await db.query.subjects.findMany({
                        where: eq(
                            subjects.departmentId,
                            departmentHead.departmentId,
                        ),
                    })

                const subjectIds =
                    departmentSubjects.map(
                        subject => subject.id,
                    )

                subjectIds.forEach(id =>
                    scope.subjectIds.add(id),
                )

                if (subjectIds.length > 0) {
                    const assignments =
                        await db.query.teacherAssignments.findMany(
                            {
                                where: and(
                                    eq(
                                        teacherAssignments.academicYearId,
                                        academicYear.id,
                                    ),
                                    inArray(
                                        teacherAssignments.subjectId,
                                        subjectIds,
                                    ),
                                ),
                            },
                        )

                    assignments.forEach(assignment => {
                        scope.classIds.add(
                            assignment.classId,
                        )
                    })
                }
            }
        }

        if (role === "head_of_class") {
            const assignments =
                await db.query.classHeads.findMany({
                    where: and(
                        eq(
                            classHeads.userId,
                            session.user.id,
                        ),
                        eq(
                            classHeads.academicYearId,
                            academicYear.id,
                        ),
                    ),
                })

            assignments.forEach(assignment => {
                scope.classIds.add(
                    assignment.classId,
                )
            })
        }

        if (role === "teacher") {
            const assignments =
                await db.query.teacherAssignments.findMany(
                    {
                        where: and(
                            eq(
                                teacherAssignments.teacherId,
                                session.user.id,
                            ),
                            eq(
                                teacherAssignments.academicYearId,
                                academicYear.id,
                            ),
                        ),
                    },
                )

            assignments.forEach(assignment => {
                scope.classIds.add(
                    assignment.classId,
                )

                scope.subjectIds.add(
                    assignment.subjectId,
                )
            })
        }

        if (role === "parent") {
            const parent =
                await db.query.parents.findFirst({
                    where: eq(
                        parents.userId,
                        session.user.id,
                    ),
                })

            if (parent) {
                const links =
                    await db.query.parentStudents.findMany(
                        {
                            where: eq(
                                parentStudents.parentId,
                                parent.id,
                            ),
                        },
                    )

                links.forEach(link => {
                    scope.studentIds.add(
                        link.studentId,
                    )
                })
            }
        }

        if (role === "student") {
            const studentUser =
                await db.query.studentUsers.findFirst({
                    where: eq(
                        studentUsers.userId,
                        session.user.id,
                    ),
                })

            if (studentUser) {
                scope.studentIds.add(
                    studentUser.studentId,
                )
            }
        }

        activeEnrollments.forEach(enrollment => {
            const matchesStudent =
                scope.studentIds.has(
                    enrollment.studentId,
                )

            const matchesClass =
                scope.classIds.has(
                    enrollment.classId,
                )

            if (matchesStudent || matchesClass) {
                scope.enrollmentIds.add(
                    enrollment.id,
                )
            }
        })
    } else {
        activeEnrollments.forEach(enrollment => {
            scope.studentIds.add(
                enrollment.studentId,
            )

            scope.enrollmentIds.add(
                enrollment.id,
            )

            scope.classIds.add(
                enrollment.classId,
            )
        })
    }

    /*
     * ---------------------------------------------------------
     * ATTENDANCE
     * ---------------------------------------------------------
     */

    const attendanceRows =
        await db
            .select({
                id: attendance.id,
                enrollmentId:
                    attendance.studentEnrollmentId,
                studentId:
                    studentEnrollments.studentId,
                studentName:
                    students.firstName,
                studentMiddleName:
                    students.middleName,
                studentLastName:
                    students.lastName,
                classId:
                    studentEnrollments.classId,
                className:
                    schoolClases.name,
                subjectId: attendance.subjectId,
                subjectName: subjects.name,
                status: attendance.status,
                note: attendance.note,
            })
            .from(attendance)
            .innerJoin(
                studentEnrollments,
                eq(
                    attendance.studentEnrollmentId,
                    studentEnrollments.id,
                ),
            )
            .innerJoin(
                students,
                eq(
                    studentEnrollments.studentId,
                    students.id,
                ),
            )
            .innerJoin(
                schoolClases,
                eq(
                    studentEnrollments.classId,
                    schoolClases.id,
                ),
            )
            .innerJoin(
                subjects,
                eq(
                    attendance.subjectId,
                    subjects.id,
                ),
            )
            .where(
                eq(
                    attendance.date,
                    reportDate,
                ),
            )

    const filteredAttendance =
        attendanceRows.filter(row =>
            inScope(scope, {
                studentId: row.studentId,
                enrollmentId: row.enrollmentId,
                classId: row.classId,
                subjectId: row.subjectId,
            }),
        )

    /*
     * ---------------------------------------------------------
     * TESTS
     * ---------------------------------------------------------
     */

    const testRows =
        await db
            .select({
                id: tests.id,
                name: tests.name,
                subjectId: tests.subjectId,
                subjectName: subjects.name,
                classId: tests.classId,
                className: schoolClases.name,
                testDate: tests.testDate,
                maxScore: tests.maxScore,
                term: tests.term,
            })
            .from(tests)
            .innerJoin(
                subjects,
                eq(
                    tests.subjectId,
                    subjects.id,
                ),
            )
            .innerJoin(
                schoolClases,
                eq(
                    tests.classId,
                    schoolClases.id,
                ),
            )
            .where(
                and(
                    eq(
                        tests.academicYearId,
                        academicYear.id,
                    ),
                    eq(
                        tests.testDate,
                        reportDate,
                    ),
                ),
            )

    const filteredTests = testRows.filter(row =>
        inScope(scope, {
            classId: row.classId,
            subjectId: row.subjectId,
        }),
    )

    /*
     * ---------------------------------------------------------
     * EXAMS
     * ---------------------------------------------------------
     */

    const examRows =
        await db
            .select({
                id: exams.id,
                name: exams.name,
                type: exams.type,
                subjectId: exams.subjectId,
                subjectName: subjects.name,
                classId: exams.classId,
                className: schoolClases.name,
                examDate: exams.examDate,
                maxScore: exams.maxScore,
            })
            .from(exams)
            .innerJoin(
                subjects,
                eq(
                    exams.subjectId,
                    subjects.id,
                ),
            )
            .innerJoin(
                schoolClases,
                eq(
                    exams.classId,
                    schoolClases.id,
                ),
            )
            .where(
                and(
                    eq(
                        exams.academicYearId,
                        academicYear.id,
                    ),
                    eq(
                        exams.examDate,
                        reportDate,
                    ),
                ),
            )

    const filteredExams = examRows.filter(row =>
        inScope(scope, {
            classId: row.classId,
            subjectId: row.subjectId,
        }),
    )

    /*
     * ---------------------------------------------------------
     * GRADES
     *
     * Grades have no separate createdAt. Their real activity
     * timestamp is updatedAt.
     * ---------------------------------------------------------
     */

    const gradeRows =
        await db
            .select({
                id: grades.id,
                enrollmentId:
                    grades.studentEnrollmentId,
                studentId:
                    studentEnrollments.studentId,
                studentFirstName:
                    students.firstName,
                studentMiddleName:
                    students.middleName,
                studentLastName:
                    students.lastName,
                classId:
                    studentEnrollments.classId,
                className:
                    schoolClases.name,
                score: grades.score,
                note: grades.note,
                updatedAt: grades.updatedAt,
                testId: grades.testId,
                testName: tests.name,
                testSubjectId: tests.subjectId,
                testSubjectName: subjects.name,
                examId: grades.examId,
                examName: exams.name,
                examSubjectId: exams.subjectId,
            })
            .from(grades)
            .innerJoin(
                studentEnrollments,
                eq(
                    grades.studentEnrollmentId,
                    studentEnrollments.id,
                ),
            )
            .innerJoin(
                students,
                eq(
                    studentEnrollments.studentId,
                    students.id,
                ),
            )
            .innerJoin(
                schoolClases,
                eq(
                    studentEnrollments.classId,
                    schoolClases.id,
                ),
            )
            .leftJoin(
                tests,
                eq(
                    grades.testId,
                    tests.id,
                ),
            )
            .leftJoin(
                exams,
                eq(
                    grades.examId,
                    exams.id,
                ),
            )
            .leftJoin(
                subjects,
                eq(
                    subjects.id,
                    tests.subjectId,
                ),
            )
            .where(
                and(
                    gte(
                        grades.updatedAt,
                        start,
                    ),
                    lt(
                        grades.updatedAt,
                        end,
                    ),
                ),
            )

    const filteredGrades =
        gradeRows.filter(row =>
            inScope(scope, {
                studentId: row.studentId,
                enrollmentId: row.enrollmentId,
                classId: row.classId,
                subjectId:
                    row.testSubjectId ??
                    row.examSubjectId ??
                    undefined,
            }),
        )

    /*
     * ---------------------------------------------------------
     * STUDENT ACTIVITY
     *
     * createdAt is a real creation date.
     * updatedAt only means the record changed. We deliberately
     * do NOT call this a death/withdrawal/status event because
     * the schema has no status-history table.
     * ---------------------------------------------------------
     */

    const createdStudentRows =
        await db
            .select({
                id: students.id,
                admissionNumber:
                    students.admissionNumber,
                firstName: students.firstName,
                middleName: students.middleName,
                lastName: students.lastName,
                status: students.status,
                createdAt: students.createdAt,
            })
            .from(students)
            .where(
                and(
                    gte(
                        students.createdAt,
                        start,
                    ),
                    lt(
                        students.createdAt,
                        end,
                    ),
                ),
            )

    const filteredCreatedStudents =
        createdStudentRows.filter(row =>
            inScope(scope, {
                studentId: row.id,
            }),
        )

    const updatedStudentRows =
        await db
            .select({
                id: students.id,
                admissionNumber:
                    students.admissionNumber,
                firstName: students.firstName,
                middleName: students.middleName,
                lastName: students.lastName,
                status: students.status,
                updatedAt: students.updatedAt,
            })
            .from(students)
            .where(
                and(
                    gte(
                        students.updatedAt,
                        start,
                    ),
                    lt(
                        students.updatedAt,
                        end,
                    ),
                ),
            )

    const filteredUpdatedStudents =
        updatedStudentRows.filter(row =>
            inScope(scope, {
                studentId: row.id,
            }),
        )

    /*
     * ---------------------------------------------------------
     * RESULT CERTIFICATES
     * ---------------------------------------------------------
     */

    const certificateRows =
        await db
            .select({
                id: resultCertificates.id,
                enrollmentId:
                    resultCertificates.enrollmentId,
                studentId:
                    studentEnrollments.studentId,
                studentFirstName:
                    students.firstName,
                studentMiddleName:
                    students.middleName,
                studentLastName:
                    students.lastName,
                classId:
                    studentEnrollments.classId,
                className:
                    schoolClases.name,
                issuedAt:
                    resultCertificates.issuedAt,
                issuedByUserId:
                    resultCertificates.issuedByUserId,
            })
            .from(resultCertificates)
            .innerJoin(
                studentEnrollments,
                eq(
                    resultCertificates.enrollmentId,
                    studentEnrollments.id,
                ),
            )
            .innerJoin(
                students,
                eq(
                    studentEnrollments.studentId,
                    students.id,
                ),
            )
            .innerJoin(
                schoolClases,
                eq(
                    studentEnrollments.classId,
                    schoolClases.id,
                ),
            )
            .where(
                and(
                    eq(
                        resultCertificates.academicYearId,
                        academicYear.id,
                    ),
                    gte(
                        resultCertificates.issuedAt,
                        start,
                    ),
                    lt(
                        resultCertificates.issuedAt,
                        end,
                    ),
                ),
            )

    const filteredCertificates =
        certificateRows.filter(row =>
            inScope(scope, {
                studentId: row.studentId,
                enrollmentId: row.enrollmentId,
                classId: row.classId,
            }),
        )

    /*
     * ---------------------------------------------------------
     * PROMOTION DECISIONS
     * ---------------------------------------------------------
     */

    const promotionRows =
        await db
            .select({
                id: promotionDecisions.id,
                studentId:
                    promotionDecisions.studentId,
                studentFirstName:
                    students.firstName,
                studentMiddleName:
                    students.middleName,
                studentLastName:
                    students.lastName,
                fromClassId:
                    promotionDecisions.fromClassId,
                fromClassName:
                    schoolClases.name,
                toClassId:
                    promotionDecisions.toClassId,
                finalDecision:
                    promotionDecisions.finalDecision,
                systemResult:
                    promotionDecisions.systemResult,
                systemDecision:
                    promotionDecisions.systemDecision,
                createdAt:
                    promotionDecisions.createdAt,
            })
            .from(promotionDecisions)
            .innerJoin(
                students,
                eq(
                    promotionDecisions.studentId,
                    students.id,
                ),
            )
            .innerJoin(
                schoolClases,
                eq(
                    promotionDecisions.fromClassId,
                    schoolClases.id,
                ),
            )
            .where(
                and(
                    eq(
                        promotionDecisions.academicYearId,
                        academicYear.id,
                    ),
                    gte(
                        promotionDecisions.createdAt,
                        start,
                    ),
                    lt(
                        promotionDecisions.createdAt,
                        end,
                    ),
                ),
            )

    const filteredPromotions =
        promotionRows.filter(row =>
            inScope(scope, {
                studentId: row.studentId,
                classId: row.fromClassId,
            }),
        )

    /*
     * ---------------------------------------------------------
     * ACTIVITY FEED
     * ---------------------------------------------------------
     */

    const activities: ActivityItem[] = []

    filteredAttendance.forEach(row => {
        activities.push({
            id: `attendance-${row.id}`,
            type: "attendance",
            title: labels.attendanceRecorded,
            description:
                `${getStudentFullName({
                    firstName: row.studentName,
                    middleName: row.studentMiddleName,
                    lastName: row.studentLastName,
                })} — ${row.subjectName}`,
            meta:
                `${row.className} • ${getAttendanceLabel(
                    row.status,
                    labels,
                )}`,
        })
    })

    filteredTests.forEach(row => {
        activities.push({
            id: `test-${row.id}`,
            type: "test",
            title: labels.testRecorded,
            description: row.name,
            meta:
                `${row.className} • ${row.subjectName} • ${row.maxScore}`,
        })
    })

    filteredExams.forEach(row => {
        activities.push({
            id: `exam-${row.id}`,
            type: "exam",
            title: labels.examRecorded,
            description: row.name,
            meta:
                `${row.className} • ${row.subjectName} • ${row.type}`,
        })
    })

    filteredGrades.forEach(row => {
        const studentName =
            getStudentFullName({
                firstName:
                    row.studentFirstName,
                middleName:
                    row.studentMiddleName,
                lastName:
                    row.studentLastName,
            })

        const assessmentName =
            row.testName ??
            row.examName ??
            labels.noData

        activities.push({
            id: `grade-${row.id}`,
            type: "grade",
            title: labels.gradeRecorded,
            description:
                `${studentName} • ${assessmentName}`,
            meta:
                `${row.className} • ${labels.score}: ${row.score}`,
        })
    })

    filteredCreatedStudents.forEach(row => {
        activities.push({
            id: `student-created-${row.id}`,
            type: "student-created",
            title: labels.studentCreated,
            description:
                getStudentFullName({
                    firstName: row.firstName,
                    middleName: row.middleName,
                    lastName: row.lastName,
                }),
            meta:
                `${row.admissionNumber} • ${row.status}`,
        })
    })

    const createdStudentIds = new Set(
        filteredCreatedStudents.map(
            student => student.id,
        ),
    )

    filteredUpdatedStudents.forEach(row => {
        if (createdStudentIds.has(row.id)) {
            return
        }

        activities.push({
            id: `student-updated-${row.id}`,
            type: "student-updated",
            title: labels.studentUpdated,
            description:
                getStudentFullName({
                    firstName: row.firstName,
                    middleName: row.middleName,
                    lastName: row.lastName,
                }),
            meta:
                `${row.admissionNumber} • ${row.status}`,
        })
    })

    filteredCertificates.forEach(row => {
        activities.push({
            id: `certificate-${row.id}`,
            type: "result",
            title: labels.certificate,
            description:
                getStudentFullName({
                    firstName:
                        row.studentFirstName,
                    middleName:
                        row.studentMiddleName,
                    lastName:
                        row.studentLastName,
                }),
            meta:
                `${row.className} • ${labels.issued}`,
        })
    })

    filteredPromotions.forEach(row => {
        activities.push({
            id: `promotion-${row.id}`,
            type: "promotion",
            title: labels.promotion,
            description:
                getStudentFullName({
                    firstName:
                        row.studentFirstName,
                    middleName:
                        row.studentMiddleName,
                    lastName:
                        row.studentLastName,
                }),
            meta:
                `${row.fromClassName} • ${row.finalDecision}`,
        })
    })

    const attendanceCounts = {
        present: filteredAttendance.filter(
            row => row.status === "present",
        ).length,

        absent: filteredAttendance.filter(
            row => row.status === "absent",
        ).length,

        late: filteredAttendance.filter(
            row => row.status === "late",
        ).length,

        excused: filteredAttendance.filter(
            row => row.status === "excused",
        ).length,
    }

    const totalActivity = activities.length

    const hasAnyData =
        filteredAttendance.length > 0 ||
        filteredTests.length > 0 ||
        filteredExams.length > 0 ||
        filteredGrades.length > 0 ||
        filteredCreatedStudents.length > 0 ||
        filteredUpdatedStudents.length > 0 ||
        filteredCertificates.length > 0 ||
        filteredPromotions.length > 0

    const formatDate = new Intl.DateTimeFormat(
        locale === "ar"
            ? "ar"
            : locale === "fr"
              ? "fr-FR"
              : "en-US",
        {
            year: "numeric",
            month: "long",
            day: "numeric",
        },
    )

    const fullReportDate = formatDate.format(
        new Date(`${reportDate}T00:00:00Z`),
    )

    return (
        <main
            dir={
                locale === "ar"
                    ? "rtl"
                    : "ltr"
            }
            className="min-h-dvh bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8"
        >
            <div className="mx-auto w-full max-w-7xl space-y-6">
                {/* Header */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                <FileBarChart className="size-6" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {labels.title}
                                </h1>

                                <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                                    {labels.description}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        <CalendarDays className="size-4" />
                                        {fullReportDate}
                                    </span>

                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                        <ShieldCheck className="size-4" />
                                        {getScopeLabel(
                                            role,
                                            labels,
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <form
                            method="get"
                            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end"
                        >
                            <div className="flex flex-col gap-1.5">
                                <label
                                    htmlFor="report-date"
                                    className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                                >
                                    {labels.date}
                                </label>

                                <input
                                    id="report-date"
                                    name="date"
                                    type="date"
                                    defaultValue={reportDate}
                                    className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                                />
                            </div>

                            <button
                                type="submit"
                                className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                                {t.reports.reportDate}
                            </button>
                        </form>
                    </div>
                </section>

                {/* Overview */}
                <section>
                    <div className="mb-3 flex items-center gap-2">
                        <Activity className="size-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-lg font-bold">
                            {labels.overview}
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        <SummaryCard
                            icon={Activity}
                            label={labels.totalActivity}
                            value={totalActivity}
                            tone="blue"
                        />

                        <SummaryCard
                            icon={CheckCircle2}
                            label={labels.attendance}
                            value={filteredAttendance.length}
                            tone="green"
                        />

                        <SummaryCard
                            icon={ClipboardCheck}
                            label={labels.tests}
                            value={filteredTests.length}
                            tone="indigo"
                        />

                        <SummaryCard
                            icon={FileBarChart}
                            label={labels.exams}
                            value={filteredExams.length}
                            tone="indigo"
                        />

                        <SummaryCard
                            icon={TrendingUp}
                            label={labels.grades}
                            value={filteredGrades.length}
                            tone="blue"
                        />

                        <SummaryCard
                            icon={Users}
                            label={labels.students}
                            value={
                                filteredCreatedStudents.length +
                                filteredUpdatedStudents.filter(
                                    row =>
                                        !createdStudentIds.has(
                                            row.id,
                                        ),
                                ).length
                            }
                            tone="slate"
                        />
                    </div>
                </section>

                {/* Attendance */}
                <ReportSection
                    icon={CheckCircle2}
                    title={labels.attendance}
                    count={filteredAttendance.length}
                >
                    {filteredAttendance.length === 0 ? (
                        <EmptyState
                            message={labels.noAttendance}
                        />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-4">
                                <StatusStat
                                    label={labels.present}
                                    value={
                                        attendanceCounts.present
                                    }
                                    className="text-emerald-600 dark:text-emerald-400"
                                />

                                <StatusStat
                                    label={labels.absent}
                                    value={
                                        attendanceCounts.absent
                                    }
                                    className="text-red-600 dark:text-red-400"
                                />

                                <StatusStat
                                    label={labels.late}
                                    value={
                                        attendanceCounts.late
                                    }
                                    className="text-amber-600 dark:text-amber-400"
                                />

                                <StatusStat
                                    label={labels.excused}
                                    value={
                                        attendanceCounts.excused
                                    }
                                    className="text-blue-600 dark:text-blue-400"
                                />
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-190 text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                            <th className="px-4 py-3">
                                                {labels.student}
                                            </th>
                                            <th className="px-4 py-3">
                                                {labels.class}
                                            </th>
                                            <th className="px-4 py-3">
                                                {labels.subject}
                                            </th>
                                            <th className="px-4 py-3">
                                                {labels.status}
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredAttendance.map(
                                            row => (
                                                <tr
                                                    key={row.id}
                                                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                                >
                                                    <td className="px-4 py-3 font-medium">
                                                        {getStudentFullName(
                                                            {
                                                                firstName:
                                                                    row.studentName,
                                                                middleName:
                                                                    row.studentMiddleName,
                                                                lastName:
                                                                    row.studentLastName,
                                                            },
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                        {
                                                            row.className
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                        {
                                                            row.subjectName
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                                                                row.status,
                                                            )}`}
                                                        >
                                                            {getAttendanceLabel(
                                                                row.status,
                                                                labels,
                                                            )}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </ReportSection>

                {/* Tests */}
                <ReportSection
                    icon={ClipboardCheck}
                    title={labels.tests}
                    count={filteredTests.length}
                >
                    {filteredTests.length === 0 ? (
                        <EmptyState
                            message={labels.noTests}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-190 text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                        <th className="px-4 py-3">
                                            {labels.name}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.subject}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.class}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.score}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.type}
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredTests.map(
                                        row => (
                                            <tr
                                                key={row.id}
                                                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                            >
                                                <td className="px-4 py-3 font-semibold">
                                                    {
                                                        row.name
                                                    }
                                                </td>

                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {
                                                        row.subjectName
                                                    }
                                                </td>

                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {
                                                        row.className
                                                    }
                                                </td>

                                                <td className="px-4 py-3">
                                                    {
                                                        row.maxScore
                                                    }
                                                </td>

                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {
                                                        row.term
                                                    }
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ReportSection>

                {/* Exams */}
                <ReportSection
                    icon={FileBarChart}
                    title={labels.exams}
                    count={filteredExams.length}
                >
                    {filteredExams.length === 0 ? (
                        <EmptyState
                            message={labels.noExams}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-190 text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                        <th className="px-4 py-3">
                                            {labels.name}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.type}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.subject}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.class}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.score}
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredExams.map(
                                        row => (
                                            <tr
                                                key={row.id}
                                                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                            >
                                                <td className="px-4 py-3 font-semibold">
                                                    {
                                                        row.name
                                                    }
                                                </td>

                                                <td className="px-4 py-3">
                                                    {
                                                        row.type
                                                    }
                                                </td>

                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {
                                                        row.subjectName
                                                    }
                                                </td>

                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {
                                                        row.className
                                                    }
                                                </td>

                                                <td className="px-4 py-3">
                                                    {
                                                        row.maxScore
                                                    }
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ReportSection>

                {/* Grades */}
                <ReportSection
                    icon={TrendingUp}
                    title={labels.grades}
                    count={filteredGrades.length}
                >
                    {filteredGrades.length === 0 ? (
                        <EmptyState
                            message={labels.noGrades}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-190 text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                        <th className="px-4 py-3">
                                            {labels.student}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.class}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.name}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.score}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.updated}
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredGrades.map(
                                        row => (
                                            <tr
                                                key={row.id}
                                                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {getStudentFullName(
                                                        {
                                                            firstName:
                                                                row.studentFirstName,
                                                            middleName:
                                                                row.studentMiddleName,
                                                            lastName:
                                                                row.studentLastName,
                                                        },
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {
                                                        row.className
                                                    }
                                                </td>

                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {
                                                        row.testName ??
                                                        row.examName ??
                                                        labels.noData
                                                    }
                                                </td>

                                                <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                                                    {
                                                        row.score
                                                    }
                                                </td>

                                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                                    {new Intl.DateTimeFormat(
                                                        locale ===
                                                            "ar"
                                                            ? "ar"
                                                            : locale ===
                                                                "fr"
                                                              ? "fr-FR"
                                                              : "en-US",
                                                        {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        },
                                                    ).format(
                                                        new Date(
                                                            row.updatedAt,
                                                        ),
                                                    )}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ReportSection>

                {/* Student Activity */}
                <ReportSection
                    icon={Users}
                    title={labels.students}
                    count={
                        filteredCreatedStudents.length +
                        filteredUpdatedStudents.filter(
                            row =>
                                !createdStudentIds.has(
                                    row.id,
                                ),
                        ).length
                    }
                >
                    {!filteredCreatedStudents.length &&
                    !filteredUpdatedStudents.filter(
                        row =>
                            !createdStudentIds.has(
                                row.id,
                            ),
                    ).length ? (
                        <EmptyState
                            message={labels.noStudents}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-190 text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                        <th className="px-4 py-3">
                                            {labels.student}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.type}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.status}
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredCreatedStudents.map(
                                        row => (
                                            <tr
                                                key={`created-${row.id}`}
                                                className="border-b border-slate-100 dark:border-slate-800"
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {getStudentFullName(
                                                        {
                                                            firstName:
                                                                row.firstName,
                                                            middleName:
                                                                row.middleName,
                                                            lastName:
                                                                row.lastName,
                                                        },
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {
                                                        labels.newStudents
                                                    }
                                                </td>

                                                <td className="px-4 py-3">
                                                    {
                                                        row.status
                                                    }
                                                </td>
                                            </tr>
                                        ),
                                    )}

                                    {filteredUpdatedStudents
                                        .filter(
                                            row =>
                                                !createdStudentIds.has(
                                                    row.id,
                                                ),
                                        )
                                        .map(row => (
                                            <tr
                                                key={`updated-${row.id}`}
                                                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {getStudentFullName(
                                                        {
                                                            firstName:
                                                                row.firstName,
                                                            middleName:
                                                                row.middleName,
                                                            lastName:
                                                                row.lastName,
                                                        },
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">
                                                    {
                                                        labels.updatedStudents
                                                    }
                                                </td>

                                                <td className="px-4 py-3">
                                                    {
                                                        row.status
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ReportSection>

                {/* Results */}
                <ReportSection
                    icon={Award}
                    title={labels.results}
                    count={filteredCertificates.length}
                >
                    {filteredCertificates.length === 0 ? (
                        <EmptyState
                            message={labels.noResults}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-190 text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                        <th className="px-4 py-3">
                                            {labels.student}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.class}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.status}
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredCertificates.map(
                                        row => (
                                            <tr
                                                key={row.id}
                                                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {getStudentFullName(
                                                        {
                                                            firstName:
                                                                row.studentFirstName,
                                                            middleName:
                                                                row.studentMiddleName,
                                                            lastName:
                                                                row.studentLastName,
                                                        },
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {
                                                        row.className
                                                    }
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                        <CheckCircle2 className="size-3.5" />
                                                        {
                                                            labels.issued
                                                        }
                                                    </span>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ReportSection>

                {/* Promotion Decisions */}
                <ReportSection
                    icon={GraduationCap}
                    title={labels.promotions}
                    count={filteredPromotions.length}
                >
                    {filteredPromotions.length === 0 ? (
                        <EmptyState
                            message={labels.noPromotions}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-190 text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                        <th className="px-4 py-3">
                                            {labels.student}
                                        </th>
                                        <th className="px-4 py-3">
                                            {labels.class}
                                        </th>
                                        <th className="px-4 py-3">
                                            {
                                                labels.systemResult
                                            }
                                        </th>
                                        <th className="px-4 py-3">
                                            {
                                                labels.finalDecision
                                            }
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredPromotions.map(
                                        row => (
                                            <tr
                                                key={row.id}
                                                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {getStudentFullName(
                                                        {
                                                            firstName:
                                                                row.studentFirstName,
                                                            middleName:
                                                                row.studentMiddleName,
                                                            lastName:
                                                                row.studentLastName,
                                                        },
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                    {
                                                        row.fromClassName
                                                    }
                                                </td>

                                                <td className="px-4 py-3">
                                                    {
                                                        row.systemResult
                                                    }
                                                </td>

                                                <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">
                                                    {
                                                        row.finalDecision
                                                    }
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ReportSection>

                {/* Full Activity */}
                <ReportSection
                    icon={Activity}
                    title={labels.activity}
                    count={activities.length}
                >
                    {!hasAnyData ? (
                        <EmptyState
                            message={
                                labels.noActivity
                            }
                        />
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {activities.map(
                                item => {
                                    const Icon =
                                        activityIcon(
                                            item.type,
                                        )

                                    return (
                                        <div
                                            key={item.id}
                                            className="flex gap-3 p-4 sm:gap-4"
                                        >
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                <Icon className="size-5" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                                    <p className="font-semibold">
                                                        {
                                                            item.title
                                                        }
                                                    </p>

                                                    <span className="text-xs text-slate-400">
                                                        {
                                                            reportDate
                                                        }
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                                                    {
                                                        item.description
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    {
                                                        item.meta
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )
                                },
                            )}
                        </div>
                    )}
                </ReportSection>
            </div>
        </main>
    )
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Activity
    label: string
    value: number
    tone:
        | "blue"
        | "green"
        | "indigo"
        | "slate"
}) {
    const toneClasses = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
        green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
        indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
        slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div
                className={`mb-3 flex size-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}
            >
                <Icon className="size-4.5" />
            </div>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-2xl font-bold tracking-tight">
                {value}
            </p>
        </div>
    )
}

function StatusStat({
    label,
    value,
    className,
}: {
    label: string
    value: number
    className: string
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {label}
            </p>

            <p
                className={`mt-1 text-xl font-bold ${className}`}
            >
                {value}
            </p>
        </div>
    )
}

function ReportSection({
    icon: Icon,
    title,
    count,
    children,
}: {
    icon: typeof Activity
    title: string
    count: number
    children: React.ReactNode
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                        <Icon className="size-5" />
                    </div>

                    <h2 className="truncate text-base font-bold">
                        {title}
                    </h2>
                </div>

                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {count}
                </span>
            </div>

            {children}
        </section>
    )
}

function EmptyState({
    message,
}: {
    message: string
}) {
    return (
        <div className="flex min-h-28 items-center justify-center px-5 py-8 text-center">
            <div>
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                    <BookOpen className="size-5" />
                </div>

                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    {message}
                </p>
            </div>
        </div>
    )
}

