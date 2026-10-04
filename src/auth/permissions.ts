export type Role =
  | "principal"
  | "deputy"
  | "head_of_class"
  | "head_of_department"
  | "teacher"
  | "parent"
  | "student";

export const permissions = [
   
  // School
  "school.read",
  "school.update",
  "school.delete",

  // Users / Staff
  "users.read",
  "users.create",
  "users.update",
  "users.delete",

  // Assignments
"assignments.read",
"assignments.create",
"assignments.update",
"assignments.delete",

// Class Heads
"class_heads.read",
"class_heads.create",
"class_heads.update",
"class_heads.delete",

 // Academic Years
  "academicYears.read",
  "academicYears.create",
  "academicYears.update",
  "academicYears.delete",



  // Students
  "students.read",
  "students.create",
  "students.update",
  "students.delete",

  // Classes
  "classes.read",
  "classes.create",
  "classes.update",
  "classes.delete",

  // Subjects
  "subjects.read",
  "subjects.create",
  "subjects.update",
  "subjects.delete",

  // Departments
"departments.read",
"departments.create",
"departments.update",
"departments.delete",

  // Attendance
  "attendance.read",
  "attendance.create",
  "attendance.update",

  // Tests
  "tests.read",
  "tests.create",
  "tests.update",
  "tests.delete",

  // Exams
  "exams.read",
  "exams.create",
  "exams.update",
  "exams.delete",

  // Grades
  "grades.read",
  "grades.create",
  "grades.update",
  "grades.delete",

  // Results
  "results.read",

  // Reports
  "reports.read",
  "reports.create",

  // Settings
  "settings.read",
  "settings.update",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions: Record<Role, Permission[]> = {
  // =========================
  // PRINCIPAL
  // =========================

  principal: permissions.slice(),

  // =========================
  // DEPUTY
  // =========================

  deputy: permissions.filter((permission) => permission !== "school.delete"),

  // =========================
  // HEAD OF CLASS
  // =========================

  head_of_class: [
    "students.read",
    "students.create",
    "students.update",
    "students.delete",

    "classes.read",

    "attendance.read",
    "attendance.create",
    "attendance.update",

    "tests.read",
    "grades.read",
    "results.read",
  ],

  // =========================
  // HEAD OF DEPARTMENT
  // =========================

 head_of_department: [
    "students.read",
    "classes.read",

    "departments.read",
    "departments.create",
    "departments.update",

    "subjects.read",

    "tests.read",
    "tests.create",
    "tests.update",
    "tests.delete",

    "exams.read",
    "exams.create",
    "exams.update",
    "exams.delete",

    "grades.read",
    "grades.create",
    "grades.update",
    "grades.delete",

    "results.read",

    "reports.read",
],

  // =========================
  // TEACHER
  // =========================

  parent: [
    "students.read",
    "attendance.read",
    "grades.read",
    "results.read",
    "reports.read",
  ],

  student: [
    "students.read",
    "attendance.read",
    "grades.read",
    "results.read",
    "reports.read",
  ],

  teacher: [
    "students.read",
    "classes.read",

    "subjects.read",

    "attendance.read",
    "attendance.create",
    "attendance.update",

    "tests.read",
    "tests.create",
    "tests.update",

    "exams.read",
        "exams.create",

            "exams.update",


    "grades.read",
    "grades.create",
    "grades.update",

    "results.read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}




