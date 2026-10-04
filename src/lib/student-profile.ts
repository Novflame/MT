export type StudentProfileStudent = {
    id: string
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

    status: string
    notes: string | null

    createdAt: string
    updatedAt: string
}


export type StudentProfileParent = {
    id: string
    name: string
    phone: string

    relationship: string | null
    isPrimary: boolean
}


export type StudentProfileAcademicYear = {
    id: string
    name: string
    startDate: string
    endDate: string
    isActive: boolean
}


export type StudentProfileClass = {
    id: string
    name: string
    gradeLevel: number
}


export type StudentProfileEnrollment = {
    id: string

    academicYear: StudentProfileAcademicYear

    class: StudentProfileClass
}


export type StudentProfileAttendanceRecord = {
    id: string
    date: string
    status: string
    note: string | null
    subjectName: string
}


export type StudentProfileAttendance = {
    total: number
    present: number
    absent: number
    late: number
    excused: number
    rate: number

    recent: StudentProfileAttendanceRecord[]
}


export type StudentProfileSubject = {
    id: string
    name: string
    average: number
}


export type StudentProfileRecentGrade = {
    id: string

    score: number
    note: string | null

    type: "test" | "exam"

    title: string
    subjectName: string
    date: string
    maxScore: number
}


export type StudentProfileAcademic = {
    totalGrades: number
    average: number

    subjects: StudentProfileSubject[]

    recentGrades: StudentProfileRecentGrade[]
}


export type StudentProfilePromotion = {
    id: string

    academicYearId: string

    fromClass: StudentProfileClass

    toClass: StudentProfileClass | null

    systemResult: string
    systemDecision: string
    finalDecision: string

    reason: string | null

    createdAt: string
}


export type StudentProfileCertificate = {
    id: string

    enrollmentId: string
    academicYearId: string

    issuedAt: string
    issuedByUserId: string

    notes: string | null

    createdAt: string
    updatedAt: string
}


export type StudentProfileTimelineEvent = {
    id: string

    type:
        | "enrollment"
        | "attendance"
        | "grade"
        | "promotion"
        | "certificate"

    title: string
    description: string
    date: string
}


export type StudentProfile = {
    student: StudentProfileStudent

    parents: StudentProfileParent[]

    currentEnrollment:
        | StudentProfileEnrollment
        | null

    enrollments: StudentProfileEnrollment[]

    attendance: StudentProfileAttendance

    academic: StudentProfileAcademic

    promotion: StudentProfilePromotion[]

    certificates: StudentProfileCertificate[]

    timeline: StudentProfileTimelineEvent[]
}