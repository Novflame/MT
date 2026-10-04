import { NextResponse } from "next/server"
import Papa from "papaparse"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/auth/auth"
import { getSchoolDB } from "@/db"
import { getActiveAcademicYear } from "@/db/academic-year"

import {
    students,
    parents,
    parentStudents,
    studentEnrollments,
    
} from "@/db/schema"

import {
    hasPermission,
    type Role,
} from "@/auth/permissions"

import {
    canCreateStudent,
} from "@/auth/authorization"


// ============================================================
// Limits
// ============================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_ROWS = 5000


// ============================================================
// CSV row type
// ============================================================

type CSVRow = {
    admissionNumber?: string
    firstName?: string
    middleName?: string
    lastName?: string
    dateOfBirth?: string
    gender?: string
    nationality?: string
    nationalId?: string
    photo?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    parentName?: string
    parentPhone?: string
    className?: string
    notes?: string
}


// ============================================================
// Validation schema
// ============================================================

const studentImportSchema = z.object({
    admissionNumber: z.string().trim().min(1),
    firstName: z.string().trim().min(1),
    middleName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    dateOfBirth: z.string().trim().min(1),
    gender: z.string().trim().min(1),
    nationality: z.string().trim().min(1),

    nationalId: z
        .string()
        .trim()
        .optional(),

    photo: z
        .string()
        .trim()
        .optional(),

    phone: z.string().trim().min(1),

    email: z
        .string()
        .trim()
        .optional(),

    address: z.string().trim().min(1),
    city: z.string().trim().min(1),

    parentName: z.string().trim().min(1),
    parentPhone: z.string().trim().min(1),

    className: z.string().trim().min(1),

    notes: z
        .string()
        .trim()
        .optional(),
})


// ============================================================
// Helpers
// ============================================================

function clean(value: unknown) {
    return String(value ?? "").trim()
}


function normalize(value: string) {
    return value
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()
}


// ============================================================
// GET
// ============================================================

export async function GET(
    request: Request,
) {
    try {
        const session =
            await auth.api.getSession({
                headers: request.headers,
            })

        if (!session) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                },
            )
        }

        const role =
            session.user.schoolRole as Role

        if (
            !hasPermission(
                role,
                "students.create",
            )
        ) {
            return NextResponse.json(
                {
                    error: "Forbidden",
                },
                {
                    status: 403,
                },
            )
        }

        return NextResponse.json({
            success: true,
            columns: [
                "admissionNumber",
                "firstName",
                "middleName",
                "lastName",
                "dateOfBirth",
                "gender",
                "nationality",
                "nationalId",
                "photo",
                "phone",
                "email",
                "address",
                "city",
                "parentName",
                "parentPhone",
                "className",
                "notes",
            ],
        })
    } catch (error) {
        console.error(
            "GET /api/students/import",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to get import information.",
            },
            {
                status: 500,
            },
        )
    }
}


// ============================================================
// POST
//
// mode = "validate"
// mode = "import"
// ============================================================

export async function POST(
    request: Request,
) {
    try {
        // =====================================================
        // Authentication
        // =====================================================

        const session =
            await auth.api.getSession({
                headers: request.headers,
            })

        if (!session) {
            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                },
            )
        }


        // =====================================================
        // Permission
        // =====================================================

        const user = {
            id: session.user.id,
            role:
                session.user.schoolRole as Role,
        }

        if (
            !hasPermission(
                user.role,
                "students.create",
            )
        ) {
            return NextResponse.json(
                {
                    error: "Forbidden",
                },
                {
                    status: 403,
                },
            )
        }


        // =====================================================
        // FormData
        // =====================================================

        const formData =
            await request.formData()

        const file =
            formData.get("file")

        const mode =
            clean(
                formData.get("mode"),
            ) || "validate"


        if (
            mode !== "validate" &&
            mode !== "import"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Invalid import mode.",
                },
                {
                    status: 400,
                },
            )
        }


        if (!(file instanceof File)) {
            return NextResponse.json(
                {
                    error:
                        "CSV file is required.",
                },
                {
                    status: 400,
                },
            )
        }


        // =====================================================
        // File validation
        // =====================================================

        if (
            file.size >
            MAX_FILE_SIZE
        ) {
            return NextResponse.json(
                {
                    error:
                        "CSV file is too large. Maximum size is 5 MB.",
                },
                {
                    status: 400,
                },
            )
        }


        const fileName =
            file.name.toLowerCase()

        if (
            !fileName.endsWith(".csv")
        ) {
            return NextResponse.json(
                {
                    error:
                        "Only CSV files are supported.",
                },
                {
                    status: 400,
                },
            )
        }


        // =====================================================
        // Read CSV
        // =====================================================

        const csvText =
            await file.text()


        const parsed =
            Papa.parse<CSVRow>(
                csvText,
                {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (
                        header,
                    ) =>
                        header
                            .replace(
                                /^\uFEFF/,
                                "",
                            )
                            .trim(),
                },
            )


        // =====================================================
        // CSV parser errors
        // =====================================================

        if (
            parsed.errors.length > 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "CSV contains parsing errors.",

                    errors:
    parsed.errors.map(
        (error) => ({
            message:
                error.message,
            code:
                error.code,
        }),
    ),
                },
                {
                    status: 400,
                },
            )
        }


        const rows =
            parsed.data


        // =====================================================
        // Empty CSV
        // =====================================================

        if (rows.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "The CSV file is empty.",
                },
                {
                    status: 400,
                },
            )
        }


        // =====================================================
        // Row limit
        // =====================================================

        if (
            rows.length >
            MAX_ROWS
        ) {
            return NextResponse.json(
                {
                    error:
                        `Maximum ${MAX_ROWS} students can be imported at once.`,
                },
                {
                    status: 400,
                },
            )
        }


        // =====================================================
        // Database
        // =====================================================

        const db =
            await getSchoolDB()

        const academicYear =
            await getActiveAcademicYear()


        // =====================================================
        // Load classes once
        // =====================================================

        const classes =
            await db.query.schoolClases.findMany()


        // =====================================================
        // Load existing admission numbers
        // =====================================================

        const existingStudents =
            await db
                .select({
                    admissionNumber:
                        students.admissionNumber,
                })
                .from(students)


        const existingAdmissionNumbers =
            new Set(
                existingStudents.map(
                    (student) =>
                        normalize(
                            student.admissionNumber,
                        ),
                ),
            )


        // =====================================================
        // Validation results
        // =====================================================

        type ValidRow = {
            rowNumber: number
            data: {
                admissionNumber: string
                firstName: string
                middleName: string
                lastName: string
                dateOfBirth: string
                gender: string
                nationality: string
                nationalId: string | null
                photo: string | null
                phone: string
                email: string | null
                address: string
                city: string
                parentName: string
                parentPhone: string
                className: string
                classId: string
                notes: string | null
            }
        }


        type InvalidRow = {
            rowNumber: number
            errors: string[]
            data: CSVRow
        }


        const validRows: ValidRow[] = []
        const invalidRows: InvalidRow[] = []

        const csvAdmissionNumbers =
            new Set<string>()


        // =====================================================
        // Validate every row
        // =====================================================

        for (
            let index = 0;
            index < rows.length;
            index++
        ) {
            const csvRow =
                rows[index]

            const rowNumber =
                index + 2

            const raw = {
                admissionNumber:
                    clean(
                        csvRow.admissionNumber,
                    ),

                firstName:
                    clean(
                        csvRow.firstName,
                    ),

                middleName:
                    clean(
                        csvRow.middleName,
                    ),

                lastName:
                    clean(
                        csvRow.lastName,
                    ),

                dateOfBirth:
                    clean(
                        csvRow.dateOfBirth,
                    ),

                gender:
                    clean(
                        csvRow.gender,
                    ),

                nationality:
                    clean(
                        csvRow.nationality,
                    ),

                nationalId:
                    clean(
                        csvRow.nationalId,
                    ),

                photo:
                    clean(
                        csvRow.photo,
                    ),

                phone:
                    clean(
                        csvRow.phone,
                    ),

                email:
                    clean(
                        csvRow.email,
                    ),

                address:
                    clean(
                        csvRow.address,
                    ),

                city:
                    clean(
                        csvRow.city,
                    ),

                parentName:
                    clean(
                        csvRow.parentName,
                    ),

                parentPhone:
                    clean(
                        csvRow.parentPhone,
                    ),

                className:
                    clean(
                        csvRow.className,
                    ),

                notes:
                    clean(
                        csvRow.notes,
                    ),
            }


            // =================================================
            // Zod validation
            // =================================================

            const validation =
                studentImportSchema.safeParse(
                    raw,
                )

            if (!validation.success) {
                invalidRows.push({
                    rowNumber,
                    errors:
                        validation.error.issues.map(
                            (issue) =>
                                `${issue.path.join(".")}: ${issue.message}`,
                        ),
                    data: csvRow,
                })

                continue
            }


            // =================================================
            // Admission number
            // =================================================

            const admissionKey =
                normalize(
                    raw.admissionNumber,
                )


            if (
                existingAdmissionNumbers.has(
                    admissionKey,
                )
            ) {
                invalidRows.push({
                    rowNumber,
                    errors: [
                        `Admission number "${raw.admissionNumber}" already exists.`,
                    ],
                    data: csvRow,
                })

                continue
            }


            if (
                csvAdmissionNumbers.has(
                    admissionKey,
                )
            ) {
                invalidRows.push({
                    rowNumber,
                    errors: [
                        `Admission number "${raw.admissionNumber}" is duplicated inside the CSV file.`,
                    ],
                    data: csvRow,
                })

                continue
            }


            csvAdmissionNumbers.add(
                admissionKey,
            )


            // =================================================
            // Resolve class
            // =================================================

            const classMatches =
                classes.filter(
                    (schoolClass) =>
                        normalize(
                            schoolClass.name,
                        ) ===
                        normalize(
                            raw.className,
                        ),
                )


            if (
                classMatches.length ===
                0
            ) {
                invalidRows.push({
                    rowNumber,
                    errors: [
                        `Class "${raw.className}" was not found.`,
                    ],
                    data: csvRow,
                })

                continue
            }


            if (
                classMatches.length >
                1
            ) {
                invalidRows.push({
                    rowNumber,
                    errors: [
                        `Class "${raw.className}" is ambiguous because multiple classes have this name.`,
                    ],
                    data: csvRow,
                })

                continue
            }


            const schoolClass =
                classMatches[0]


            // =================================================
            // Head of class authorization
            // =================================================

            if (
                user.role ===
                "head_of_class"
            ) {
                const allowed =
                    await canCreateStudent(
                        user,
                        schoolClass.id,
                    )

                if (!allowed) {
                    invalidRows.push({
                        rowNumber,
                        errors: [
                            `You are not allowed to add students to class "${schoolClass.name}".`,
                        ],
                        data: csvRow,
                    })

                    continue
                }
            }


            // =================================================
            // Valid row
            // =================================================

            validRows.push({
                rowNumber,

                data: {
                    admissionNumber:
                        raw.admissionNumber,

                    firstName:
                        raw.firstName,

                    middleName:
                        raw.middleName,

                    lastName:
                        raw.lastName,

                    dateOfBirth:
                        raw.dateOfBirth,

                    gender:
                        raw.gender,

                    nationality:
                        raw.nationality,

                    nationalId:
                        raw.nationalId ||
                        null,

                    photo:
                        raw.photo ||
                        null,

                    phone:
                        raw.phone,

                    email:
                        raw.email ||
                        null,

                    address:
                        raw.address,

                    city:
                        raw.city,

                    parentName:
                        raw.parentName,

                    parentPhone:
                        raw.parentPhone,

                    className:
                        raw.className,

                    classId:
                        schoolClass.id,

                    notes:
                        raw.notes ||
                        null,
                },
            })
        }


        // =====================================================
        // Validation only
        // =====================================================

        if (
            mode === "validate"
        ) {
            return NextResponse.json({
                success:
                    invalidRows.length === 0,

                mode: "validate",

                totalRows:
                    rows.length,

                validRows:
                    validRows.length,

                invalidRows:
                    invalidRows.length,

                valid: validRows.map(
                    (row) => ({
                        row:
                            row.rowNumber,

                        admissionNumber:
                            row.data
                                .admissionNumber,

                        name: [
                            row.data
                                .firstName,

                            row.data
                                .middleName,

                            row.data
                                .lastName,
                        ].join(" "),

                        className:
                            row.data
                                .className,

                        parentName:
                            row.data
                                .parentName,
                    }),
                ),

                errors:
                    invalidRows.map(
                        (row) => ({
                            row:
                                row.rowNumber,

                            errors:
                                row.errors,

                            data:
                                row.data,
                        }),
                    ),
            })
        }


        // =====================================================
        // Import mode
        // =====================================================

        if (
            invalidRows.length > 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "Import cannot continue because the CSV contains invalid rows.",

                    totalRows:
                        rows.length,

                    validRows:
                        validRows.length,

                    invalidRows:
                        invalidRows.length,

                    errors:
                        invalidRows.map(
                            (row) => ({
                                row:
                                    row.rowNumber,

                                errors:
                                    row.errors,
                            }),
                        ),
                },
                {
                    status: 400,
                },
            )
        }


        if (
            validRows.length === 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "There are no valid students to import.",
                },
                {
                    status: 400,
                },
            )
        }


        // =====================================================
        // Transaction
        // =====================================================

        const result =
            db.transaction(
                (tx) => {
                    let importedStudents =
                        0

                    let createdParents =
                        0

                    let reusedParents =
                        0


                    // Cache parents during
                    // this import.
                    //
                    // key:
                    // normalized name + phone

                    const parentCache =
                        new Map<
                            string,
                            string
                        >()


                    for (
                        const row of validRows
                    ) {
                        const data =
                            row.data


                        // =====================================
                        // Parent key
                        // =====================================

                        const parentKey =
                            `${normalize(data.parentName)}::${normalize(data.parentPhone)}`


                        let parentId =
                            parentCache.get(
                                parentKey,
                            )


                        // =====================================
                        // Existing parent
                        // =====================================

                        if (!parentId) {










const existingParents =
    tx
        .select({
            id: parents.id,
            phone: parents.phone,
        })
        .from(parents)
        .where(
            eq(
                parents.name,
                data.parentName,
            ),
        )
        .all()

const existingParent =
    existingParents.find(
        (parent) =>
            parent.phone ===
            data.parentPhone,
    )








                            if (
                                existingParent
                            ) {
                                parentId =
                                    existingParent.id

                                reusedParents++
                            }
                        }


                        // =====================================
                        // Create parent
                        // =====================================

                        if (!parentId) {
                            parentId =
                                globalThis
                                    .crypto
                                    .randomUUID()

                            tx
                                .insert(
                                    parents,
                                )
                                .values({
                                    id:
                                        parentId,

                                    name:
                                        data.parentName,

                                    phone:
                                        data.parentPhone,
                                })
                                .run()

                            createdParents++
                        }


                        parentCache.set(
                            parentKey,
                            parentId,
                        )


                        // =====================================
                        // Student
                        // =====================================

                        const studentId =
                            globalThis
                                .crypto
                                .randomUUID()

                        const now =
                            new Date()
                                .toISOString()


                        tx
                            .insert(
                                students,
                            )
                            .values({
                                id:
                                    studentId,

                                admissionNumber:
                                    data.admissionNumber,

                                firstName:
                                    data.firstName,

                                middleName:
                                    data.middleName,

                                lastName:
                                    data.lastName,

                                dateOfBirth:
                                    data.dateOfBirth,

                                gender:
                                    data.gender,

                                nationality:
                                    data.nationality,

                                nationalId:
                                    data.nationalId,

                                photo:
                                    data.photo,

                                phone:
                                    data.phone,

                                email:
                                    data.email,

                                address:
                                    data.address,

                                city:
                                    data.city,

                                status:
                                    "active",

                                notes:
                                    data.notes,

                                createdAt:
                                    now,

                                updatedAt:
                                    now,
                            })
                            .run()


                        // =====================================
                        // Enrollment
                        // =====================================

                        tx
                            .insert(
                                studentEnrollments,
                            )
                            .values({
                                id:
                                    globalThis
                                        .crypto
                                        .randomUUID(),

                                studentId,

                                academicYearId:
                                    academicYear.id,

                                classId:
                                    data.classId,
                            })
                            .run()


                        // =====================================
                        // Parent ↔ Student
                        // =====================================

                        tx
                            .insert(
                                parentStudents,
                            )
                            .values({
                                id:
                                    globalThis
                                        .crypto
                                        .randomUUID(),

                                parentId,

                                studentId,
                            })
                            .run()


                        importedStudents++
                    }


                    return {
                        importedStudents,
                        createdParents,
                        reusedParents,
                    }
                },
            )


        // =====================================================
        // Success
        // =====================================================

        return NextResponse.json({
            success: true,

            mode: "import",

            academicYear: {
                id:
                    academicYear.id,

                name:
                    academicYear.name,
            },

            totalRows:
                rows.length,

            importedStudents:
                result.importedStudents,

            createdParents:
                result.createdParents,

            reusedParents:
                result.reusedParents,
        })
    } catch (error) {
        console.error(
            "POST /api/students/import",
            error,
        )


        // =====================================================
        // SQLite constraint
        // =====================================================

        if (
            error instanceof Error
        ) {
            const message =
                error.message.toLowerCase()

            if (
                message.includes(
                    "unique",
                ) &&
                message.includes(
                    "admission",
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            "One or more admission numbers already exist.",
                    },
                    {
                        status: 409,
                    },
                )
            }
        }


        return NextResponse.json(
            {
                error:
                    "Failed to import students.",
            },
            {
                status: 500,
            },
        )
    }
}