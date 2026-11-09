import {
    sqliteTable,
    text,
    integer,
    primaryKey,
    unique,
    check,
    index,
} from "drizzle-orm/sqlite-core"

import { relations, sql } from "drizzle-orm"

export const academicYears = sqliteTable(
    "academic_years",
    {
        id: text("id").primaryKey(),

        name: text("name").notNull(),

        startDate: text("start_date").notNull(),

        endDate: text("end_date").notNull(),

        isActive: integer("is_active", {
            mode: "boolean",
        })
            .notNull()
            .default(false),
    },
)
export const schoolClases = sqliteTable("school_classes", {
    id: text("id").primaryKey(),

    name: text("name").notNull(),

    gradeLevel: integer("grade_level").notNull(),
})
export const departments = sqliteTable("departments", {
    id: text("id").primaryKey(),

    name: text("name").notNull().unique(),
})
export const subjects = sqliteTable("subjects", {
    id: text("id").primaryKey(),

    name: text("name").notNull(),

    departmentId: text("department_id")
        .references(() => departments.id),
})
export const students = sqliteTable("students", {
    id: text("id").primaryKey(),

    admissionNumber: text("admission_number")
        .notNull()
        .unique(),

    firstName: text("first_name").notNull(),

    middleName: text("middle_name").notNull(),

    lastName: text("last_name").notNull(),

    dateOfBirth: text("date_of_birth").notNull(),

    gender: text("gender").notNull(),

    nationality: text("nationality").notNull(),

    nationalId: text("national_id"),

    photo: text("photo"),

    phone: text("phone").notNull(),

    email: text("email"),

    address: text("address").notNull(),

    city: text("city").notNull(),

    status: text("status")
        .notNull()
        .default("active"),

    notes: text("notes"),

    createdAt: text("created_at")
        .notNull(),

    updatedAt: text("updated_at")
        .notNull(),
})
export const parents = sqliteTable("parents", {
    id: text("id").primaryKey(),

     userId: text("user_id").unique(),

    name: text("name").notNull(),

    phone: text("phone").notNull(),
   
})
export const parentStudents = sqliteTable(
    "parent_students",
    {
        id: text("id").primaryKey(),

        parentId: text("parent_id")
            .notNull()
            .references(() => parents.id),

        studentId: text("student_id")
            .notNull()
            .references(() => students.id),
    },

    (table) => [
        unique(
            "parent_student_unique",
        ).on(
            table.parentId,
            table.studentId,
        ),
    ],
)
export const studentEnrollments = sqliteTable(
    "student_enrollments",
    {
        id: text("id").primaryKey(),

        studentId: text("student_id")
            .notNull()
            .references(() => students.id),

        academicYearId: text("academic_year_id")
            .notNull()
            .references(() => academicYears.id),

        classId: text("class_id")
            .notNull()
            .references(() => schoolClases.id),
    },

    (table) => [
        unique("student_academic_year_unique").on(
            table.studentId,
            table.academicYearId,
        ),
    ],
)
export const attendance = sqliteTable(
    "attendance",
    {
        id: text("id").primaryKey(),

        studentEnrollmentId: text(
            "student_enrollment_id",
        )
            .notNull()
            .references(
                () => studentEnrollments.id,
            ),

        subjectId: text("subject_id")
            .notNull()
            .references(
                () => subjects.id,
            ),

        date: text("date").notNull(),

        status: text("status").notNull(),

        note: text("note"),
    },

    (table) => [
        unique(
            "attendance_enrollment_subject_date_unique",
        ).on(
            table.studentEnrollmentId,
            table.subjectId,
            table.date,
        ),
    ],
)
export const teacherAssignments = sqliteTable(
    "teacher_assignments",
    {
        academicYearId: text("academic_year_id")
            .notNull()
            .references(() => academicYears.id),

        teacherId: text("teacher_id").notNull(),

        subjectId: text("subject_id")
            .notNull()
            .references(() => subjects.id),

        classId: text("class_id")
            .notNull()
            .references(() => schoolClases.id),
    },
    (table) => [
        primaryKey({
            columns: [
                table.academicYearId,
                table.teacherId,
                table.subjectId,
                table.classId,
            ],
        }),
    ],
)
export const classHeads = sqliteTable(
    "class_heads",
    {
        academicYearId: text("academic_year_id")
            .notNull()
            .references(() => academicYears.id),

        userId: text("user_id").notNull(),

        classId: text("class_id")
            .notNull()
            .references(() => schoolClases.id),
    },
    (table) => [
        primaryKey({
            columns: [
                table.academicYearId,
                table.userId,
                table.classId,
            ],
        }),
           unique(
            "class_head_one_per_class_per_year",
        ).on(
            table.academicYearId,
            table.classId,
        ),
    ],
)
export const departmentHeads = sqliteTable(
    "department_heads",
    {
        academicYearId: text("academic_year_id")
            .notNull()
            .references(() => academicYears.id),

        userId: text("user_id").notNull(),

        departmentId: text("department_id")
            .notNull()
            .references(() => departments.id),
    },
    (table) => [
        primaryKey({
            columns: [
                table.academicYearId,
                table.userId,
                table.departmentId,
            ],
        }),
    ],
)
export const exams = sqliteTable("exams", {
    id: text("id").primaryKey(),

    name: text("name").notNull(),

    subjectId: text("subject_id")
        .notNull()
        .references(() => subjects.id),

    classId: text("class_id")
        .notNull()
        .references(() => schoolClases.id),

    type: text("type").notNull(),

    examDate: text("exam_date").notNull(),

    maxScore: integer("max_score").notNull(),
    academicYearId: text("academic_year_id")
    .notNull()
    .references(() => academicYears.id),
})
export const tests = sqliteTable("tests", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    subjectId: text("subject_id").notNull().references(() => subjects.id),
    classId: text("class_id").notNull().references(() => schoolClases.id),
    academicYearId: text("academic_year_id").notNull().references(() => academicYears.id),
    testDate: text("test_date").notNull(),
    maxScore: integer("max_score").notNull(),
    term: text("term").notNull().default("term1"),
})

export const grades = sqliteTable("grades", {
    id: text("id").primaryKey(),
    studentEnrollmentId: text("student_enrollment_id").notNull().references(() => studentEnrollments.id),
    testId: text("test_id").references(() => tests.id),
    examId: text("exam_id").references(() => exams.id),
    score: integer("score").notNull(),
    note: text("note"),
    updatedAt: text("updated_at").notNull(),
}, (table) => [
    unique("grade_enrollment_test_unique").on(table.studentEnrollmentId, table.testId),
    unique("grade_enrollment_exam_unique").on(table.studentEnrollmentId, table.examId),
    check("grade_score_nonnegative", sql`${table.score} >= 0`),
    check(
        "grade_exactly_one_assessment",
        sql`(${table.testId} IS NOT NULL AND ${table.examId} IS NULL) OR (${table.testId} IS NULL AND ${table.examId} IS NOT NULL)`,
    ),
])

export const coreSubjects = sqliteTable(
    "core_subjects",
    {
        id: text("id").primaryKey(),

        academicYearId: text(
            "academic_year_id",
        )
            .notNull()
            .references(
                () => academicYears.id,
            ),

        classId: text("class_id")
            .notNull()
            .references(
                () => schoolClases.id,
            ),

        subjectId: text("subject_id")
            .notNull()
            .references(
                () => subjects.id,
            ),
    },

    (table) => [
        unique(
            "core_subject_year_class_subject_unique",
        ).on(
            table.academicYearId,
            table.classId,
            table.subjectId,
        ),
    ],
)
export const promotionDecisions =
    sqliteTable(
        "promotion_decisions",
        {
            id: text("id").primaryKey(),

            studentId: text("student_id")
                .notNull()
                .references(
                    () => students.id,
                ),

            academicYearId: text(
                "academic_year_id",
            )
                .notNull()
                .references(
                    () => academicYears.id,
                ),

            fromClassId: text(
                "from_class_id",
            )
                .notNull()
                .references(
                    () => schoolClases.id,
                ),

            toClassId: text("to_class_id")
                .references(
                    () => schoolClases.id,
                ),

            // What the system calculated
            systemResult: text(
                "system_result",
            ).notNull(),

            // What the system would normally do
            systemDecision: text(
                "system_decision",
            ).notNull(),

            // Final decision after
            // possible administrative intervention
            finalDecision: text(
                "final_decision",
            ).notNull(),

            // principal / deputy
            decidedByUserId: text(
                "decided_by_user_id",
            ),

            reason: text("reason"),

            createdAt: text(
                "created_at",
            )
                .notNull()
                .$defaultFn(
                    () =>
                        new Date().toISOString(),
                ),
        },

        (table) => [
            unique(
                "promotion_student_year_unique",
            ).on(
                table.studentId,
                table.academicYearId,
            ),
        ],
    )
export const resultCertificates = sqliteTable(
    "result_certificates",
    {
        id: text("id").primaryKey(),

        enrollmentId: text(
            "enrollment_id",
        )
            .notNull()
            .references(
                () => studentEnrollments.id,
            ),

        academicYearId: text(
            "academic_year_id",
        )
            .notNull()
            .references(
                () => academicYears.id,
            ),

        issuedAt: text(
            "issued_at",
        )
            .notNull()
            .$defaultFn(
                () => new Date().toISOString(),
            ),

        issuedByUserId: text(
            "issued_by_user_id",
        )
            .notNull(),

        notes: text("notes"),

        createdAt: text(
            "created_at",
        )
            .notNull()
            .$defaultFn(
                () => new Date().toISOString(),
            ),

        updatedAt: text(
            "updated_at",
        )
            .notNull()
            .$defaultFn(
                () => new Date().toISOString(),
            ),
    },

    (table) => [
        unique(
            "result_certificate_enrollment_unique",
        ).on(
            table.enrollmentId,
        ),
    ],
)    
export const schoolCertificates = sqliteTable(
    "school_certificates",
    {
        id: text("id").primaryKey(),

        enrollmentId: text("enrollment_id")
            .notNull()
            .references(() => studentEnrollments.id),

        academicYearId: text("academic_year_id")
            .notNull()
            .references(() => academicYears.id),

        certificateType: text("certificate_type", {
    enum: [
        "MID_TERM",
        "SCHOOL_COMPLETION",
        "APPRECIATION_ACHIEVEMENT",
    ],
}).notNull(),

        issuedAt: text("issued_at")
            .notNull()
            .$defaultFn(() => new Date().toISOString()),

        issuedByUserId: text("issued_by_user_id").notNull(),

        notes: text("notes"),

        createdAt: text("created_at")
            .notNull()
            .$defaultFn(() => new Date().toISOString()),

        updatedAt: text("updated_at")
            .notNull()
            .$defaultFn(() => new Date().toISOString()),
    },
    (table) => [
        unique("school_certificate_enrollment_year_type_unique").on(
            table.enrollmentId,
            table.academicYearId,
            table.certificateType,
        ),
    ],
)
export const studentUsers = sqliteTable("student_users", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    studentId: text("student_id").notNull().unique().references(() => students.id),
})

// Optional timetable module. These tables are independent from legacy `attendance`.
export const classTimetables = sqliteTable("class_timetables", {
    id: text("id").primaryKey(),
    academicYearId: text("academic_year_id").notNull().references(() => academicYears.id),
    classId: text("class_id").notNull().references(() => schoolClases.id),
    name: text("name").notNull().default("Main timetable"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
}, (table) => [unique("class_timetable_year_class_unique").on(table.academicYearId, table.classId)])

export const classTimetableSlots = sqliteTable("class_timetable_slots", {
    id: text("id").primaryKey(),
    timetableId: text("timetable_id").notNull().references(() => classTimetables.id, { onDelete: "cascade" }),
    academicYearId: text("academic_year_id").notNull().references(() => academicYears.id),
    classId: text("class_id").notNull().references(() => schoolClases.id),
    subjectId: text("subject_id").notNull().references(() => subjects.id),
    teacherId: text("teacher_id").notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    periodNumber: integer("period_number").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
}, (table) => [unique("class_timetable_period_unique").on(table.timetableId, table.dayOfWeek, table.periodNumber)])

export const classSessions = sqliteTable("class_sessions", {
    id: text("id").primaryKey(),
    timetableSlotId: text("timetable_slot_id").references(() => classTimetableSlots.id, { onDelete: "set null" }),
    academicYearId: text("academic_year_id").notNull().references(() => academicYears.id),
    classId: text("class_id").notNull().references(() => schoolClases.id),
    subjectId: text("subject_id").notNull().references(() => subjects.id),
    scheduledTeacherId: text("scheduled_teacher_id").notNull(),
    actualTeacherId: text("actual_teacher_id").notNull(),
    sessionDate: text("session_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    status: text("status").notNull().default("scheduled"),
    cancellationReason: text("cancellation_reason"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
}, (table) => [
    unique("class_session_slot_date_unique").on(table.timetableSlotId, table.sessionDate),
    index("class_sessions_date_class_idx").on(table.sessionDate, table.classId),
    index("class_sessions_teacher_date_idx").on(table.actualTeacherId, table.sessionDate),
])

export const sessionTeacherAttendance = sqliteTable("session_teacher_attendance", {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().unique().references(() => classSessions.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id").notNull(),
    checkedInAt: text("checked_in_at"),
    checkedOutAt: text("checked_out_at"),
    status: text("status").notNull().default("present"),
    lateMinutes: integer("late_minutes").notNull().default(0),
    note: text("note"),
    updatedAt: text("updated_at").notNull(),
})

export const sessionStudentAttendance = sqliteTable("session_student_attendance", {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => classSessions.id, { onDelete: "cascade" }),
    studentEnrollmentId: text("student_enrollment_id").notNull().references(() => studentEnrollments.id),
    status: text("status").notNull(),
    note: text("note"),
    recordedBy: text("recorded_by").notNull(),
    recordedAt: text("recorded_at").notNull(),
}, (table) => [unique("session_student_attendance_unique").on(table.sessionId, table.studentEnrollmentId)])

export const classSessionNotificationEvents = sqliteTable("class_session_notification_events", {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => classSessions.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    createdAt: text("created_at").notNull(),
}, (table) => [unique("class_session_notification_event_unique").on(table.sessionId, table.eventType)])

export const classTimetableAuditLogs = sqliteTable("class_timetable_audit_logs", {
    id: text("id").primaryKey(),
    timetableId: text("timetable_id").notNull().references(() => classTimetables.id, { onDelete: "cascade" }),
    slotId: text("slot_id").references(() => classTimetableSlots.id, { onDelete: "set null" }),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    details: text("details"),
    createdAt: text("created_at").notNull(),
})

export const classSessionAuditLogs = sqliteTable("class_session_audit_logs", {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => classSessions.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    details: text("details"),
    createdAt: text("created_at").notNull(),
})

export const notifications = sqliteTable("notifications", {
    id: text("id").primaryKey(),
    recipientUserId: text("recipient_user_id").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull().default("general"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
})

export const staffProfiles = sqliteTable(
    "staff_profiles",
    {
        id: integer("id")
            .primaryKey({
                autoIncrement: true,
            }),

        userId: text("user_id")
            .notNull()
            .unique(),

        // Personal Information
        phone: text("phone"),

        profileImage: text(
            "profile_image",
        ),

        dateOfBirth: text(
            "date_of_birth",
        ),

        gender: text("gender"),

        nationality: text(
            "nationality",
        ),

        nationalId: text(
            "national_id",
        ),

        address: text("address"),

        city: text("city"),

        // Professional Information
        employeeId: text("employee_id")
            .unique(),

        position: text("position"),

        departmentId: text("department_id")
            .references(
                () => departments.id,
            ),

        qualification: text(
            "qualification",
        ),

        employmentDate: text(
            "employment_date",
        ),

        specialization: text(
            "specialization",
        ),

        // Emergency Contact
        emergencyContactName: text(
            "emergency_contact_name",
        ),

        emergencyContactPhone: text(
            "emergency_contact_phone",
        ),

        // Timestamps
        createdAt: text("created_at")
            .notNull()
            .$defaultFn(
                () => new Date().toISOString(),
            ),

        updatedAt: text("updated_at")
            .notNull()
            .$defaultFn(
                () => new Date().toISOString(),
            ),
    },
)
// =========================
// RELATIONS
// =========================
export const academicYearsRelations = relations(
    academicYears,
    ({ many }) => ({
        studentEnrollments: many(
            studentEnrollments,
        ),

        exams: many(exams),
        tests: many(tests),

        teacherAssignments: many(
            teacherAssignments,
        ),

        classHeads: many(classHeads),

        departmentHeads: many(
            departmentHeads,
        ),
    }),
)
export const schoolClassesRelations = relations(
    schoolClases,
    ({ many, one }) => ({
        studentEnrollments: many(studentEnrollments),

        classHead: one(classHeads),

        teacherAssignments: many(
            teacherAssignments,
        ),

        exams: many(exams),
        tests: many(tests),
    }),
)
export const studentsRelations = relations(
    students,
    ({ many, one }) => ({
        enrollments: many(
            studentEnrollments,
        ),

        parentStudents: many(
            parentStudents,
        ),

        studentUser: one(
            studentUsers,
        ),
    }),
)
export const studentEnrollmentsRelations =
    relations(
        studentEnrollments,
        ({ one, many }) => ({
            student: one(students, {
                fields: [
                    studentEnrollments.studentId,
                ],
                references: [
                    students.id,
                ],
            }),

            academicYear: one(academicYears, {
                fields: [
                    studentEnrollments.academicYearId,
                ],
                references: [
                    academicYears.id,
                ],
            }),

            class: one(schoolClases, {
                fields: [
                    studentEnrollments.classId,
                ],
                references: [
                    schoolClases.id,
                ],
            }),

            attendance: many(attendance),
            grades: many(grades),
        }),
    )
export const parentsRelations = relations(
    parents,
    ({ many }) => ({
        parentStudents: many(
            parentStudents,
        ),
    }),
)
export const parentStudentsRelations =
    relations(
        parentStudents,
        ({ one }) => ({
            parent: one(
                parents,
                {
                    fields: [
                        parentStudents.parentId,
                    ],
                    references: [
                        parents.id,
                    ],
                },
            ),

            student: one(
                students,
                {
                    fields: [
                        parentStudents.studentId,
                    ],
                    references: [
                        students.id,
                    ],
                },
            ),
        }),
    )
export const departmentHeadsRelations =
    relations(
        departmentHeads,
        ({ one }) => ({
            academicYear: one(academicYears, {
                fields: [
                    departmentHeads.academicYearId,
                ],
                references: [
                    academicYears.id,
                ],
            }),

            department: one(departments, {
                fields: [
                    departmentHeads.departmentId,
                ],
                references: [
                    departments.id,
                ],
            }),
        }),
    )
export const subjectsRelations = relations(
    subjects,
    ({ one, many }) => ({
        department: one(departments, {
            fields: [subjects.departmentId],

            references: [
                departments.id,
            ],
        }),

        teacherAssignments: many(
            teacherAssignments,
        ),
        exams: many(exams),
    }),
)
export const classHeadsRelations = relations(
    classHeads,
    ({ one }) => ({
        academicYear: one(academicYears, {
            fields: [
                classHeads.academicYearId,
            ],
            references: [
                academicYears.id,
            ],
        }),

        class: one(schoolClases, {
            fields: [
                classHeads.classId,
            ],
            references: [
                schoolClases.id,
            ],
        }),
    }),
)
export const departmentsRelations = relations(
    departments,
    ({ many }) => ({
        subjects: many(subjects),

        departmentHeads: many(
            departmentHeads,
        ),
         staffProfiles: many(
            staffProfiles,
        ),
    }),
)
export const teacherAssignmentsRelations =
    relations(
        teacherAssignments,
        ({ one }) => ({
            academicYear: one(academicYears, {
                fields: [
                    teacherAssignments.academicYearId,
                ],
                references: [
                    academicYears.id,
                ],
            }),

            class: one(schoolClases, {
                fields: [
                    teacherAssignments.classId,
                ],
                references: [
                    schoolClases.id,
                ],
            }),

            subject: one(subjects, {
                fields: [
                    teacherAssignments.subjectId,
                ],
                references: [
                    subjects.id,
                ],
            }),
        }),
    )
export const attendanceRelations =
    relations(
        attendance,
        ({ one }) => ({
            studentEnrollment: one(
                studentEnrollments,
                {
                    fields: [
                        attendance.studentEnrollmentId,
                    ],
                    references: [
                        studentEnrollments.id,
                    ],
                },
            ),
        }),
    )
 export const examsRelations = relations(
    exams,
    ({ one }) => ({
        academicYear: one(academicYears, {
            fields: [
                exams.academicYearId,
            ],
            references: [
                academicYears.id,
            ],
        }),

        subject: one(subjects, {
            fields: [exams.subjectId],
            references: [subjects.id],
        }),

        class: one(schoolClases, {
            fields: [exams.classId],
            references: [schoolClases.id],
        }),
    }),
)
export const testsRelations = relations(tests, ({ one, many }) => ({
    academicYear: one(academicYears, { fields: [tests.academicYearId], references: [academicYears.id] }),
    subject: one(subjects, { fields: [tests.subjectId], references: [subjects.id] }),
    class: one(schoolClases, { fields: [tests.classId], references: [schoolClases.id] }),
    grades: many(grades),
}))

export const gradesRelations = relations(grades, ({ one }) => ({
    enrollment: one(studentEnrollments, { fields: [grades.studentEnrollmentId], references: [studentEnrollments.id] }),
    test: one(tests, { fields: [grades.testId], references: [tests.id] }),
    exam: one(exams, { fields: [grades.examId], references: [exams.id] }),
}))

export const studentUsersRelations = relations(studentUsers, ({ one }) => ({
    student: one(students, { fields: [studentUsers.studentId], references: [students.id] }),
}))


export const coreSubjectsRelations =
    relations(
        coreSubjects,
        ({ one }) => ({
            academicYear: one(
                academicYears,
                {
                    fields: [
                        coreSubjects.academicYearId,
                    ],
                    references: [
                        academicYears.id,
                    ],
                },
            ),

            class: one(
                schoolClases,
                {
                    fields: [
                        coreSubjects.classId,
                    ],
                    references: [
                        schoolClases.id,
                    ],
                },
            ),

            subject: one(
                subjects,
                {
                    fields: [
                        coreSubjects.subjectId,
                    ],
                    references: [
                        subjects.id,
                    ],
                },
            ),
        }),
    )

export const promotionDecisionsRelations =
    relations(
        promotionDecisions,
        ({ one }) => ({
            student: one(students, {
                fields: [
                    promotionDecisions.studentId,
                ],
                references: [
                    students.id,
                ],
            }),

            academicYear: one(academicYears, {
                fields: [
                    promotionDecisions.academicYearId,
                ],
                references: [
                    academicYears.id,
                ],
            }),

            fromClass: one(schoolClases, {
                fields: [
                    promotionDecisions.fromClassId,
                ],
                references: [
                    schoolClases.id,
                ],
            }),

            toClass: one(schoolClases, {
                fields: [
                    promotionDecisions.toClassId,
                ],
                references: [
                    schoolClases.id,
                ],
            }),
        }),
    )
  export const staffProfilesRelations =
    relations(
        staffProfiles,
        ({ one }) => ({
            department: one(
                departments,
                {
                    fields: [
                        staffProfiles.departmentId,
                    ],
                    references: [
                        departments.id,
                    ],
                },
            ),
        }),
    )
