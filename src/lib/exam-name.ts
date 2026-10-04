export const EXAM_TYPES = [
    "QUIZ",
    "MONTHLY",
    "MIDTERM",
    "FINAL",
] as const

export type ExamType = (typeof EXAM_TYPES)[number]

export function isExamType(
    value: string,
): value is ExamType {
    return EXAM_TYPES.includes(
        value as ExamType,
    )
}

export function createSubjectAcronym(
    subjectName: string,
) {
    const words = subjectName
        .trim()
        .split(/\s+/)
        .filter(Boolean)

    if (words.length === 0) {
        return "SUB"
    }

    if (words.length > 1) {
        return words
            .map((word) => word[0])
            .join("")
            .toUpperCase()
    }

    return words[0]
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 4)
        .toUpperCase()
}

export function createClassCode(
    className: string,
) {
    return className
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .toUpperCase()
}

export function createExamName({
    subjectName,
    gradeNumber,
    className,
    type,
    count,
}: {
    subjectName: string
    gradeNumber: number
    className: string
    type: ExamType
    count: number
}) {
    const subjectAcronym =
        createSubjectAcronym(subjectName)

    const classCode =
        createClassCode(className)

    const formattedCount = String(count).padStart(
        2,
        "0",
    )

    return [
        subjectAcronym,
        String(gradeNumber),
        classCode,
        type,
        formattedCount,
    ].join("-")
}