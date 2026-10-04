export function getStudentFullName(student: {
    firstName: string
    middleName: string
    lastName: string
}) {
    return [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" ")
}