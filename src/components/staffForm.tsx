"use client";

import { useEffect, useState } from "react";

type StaffRole =
  | "principal"
  | "deputy"
  | "head_of_class"
  | "head_of_department"
  | "teacher";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  schoolId: number;
};

type Subject = {
  id: string;
  name: string;
};

type SchoolClass = {
  id: string;
  name: string;
  gradeLevel: number;
};

type Assignment = {
  teacherId: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  gradeLevel: number;
};
type ClassHead = {
  userId: string
  classId: string
  className: string
  academicYearId: string
  head: {
    id: string
    name: string
    email: string
    role: StaffRole
  } | null
}
export default function StaffForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("teacher");

  const [staff, setStaff] = useState<Staff[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState("");

  const [selectedClass, setSelectedClass] = useState("");

  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(
    null,
  );

  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] =
    useState<StaffRole | "all">("all")
  const [classHeads, setClassHeads] =
    useState<ClassHead[]>([])

  const [selectedHeadClass, setSelectedHeadClass] =
    useState("")



  async function loadStaff() {
    try {
      setLoadingStaff(true);

      const response = await fetch("/api/staff");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load staff");
      }

      setStaff(data.staff);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load staff");
    } finally {
      setLoadingStaff(false);
    }
  }

  async function loadAssignmentData() {
    try {
      const [subjectsResponse, classesResponse, assignmentsResponse] =
        await Promise.all([
          fetch("/api/subjects"),
          fetch("/api/classes"),
          fetch("/api/teacher-assignments"),
        ]);

      const subjectsData = await subjectsResponse.json();

      const classesData = await classesResponse.json();

      const assignmentsData = await assignmentsResponse.json();

      if (!subjectsResponse.ok) {
        throw new Error(subjectsData.error ?? "Failed to load subjects");
      }

      if (!classesResponse.ok) {
        throw new Error(classesData.error ?? "Failed to load classes");
      }

      if (!assignmentsResponse.ok) {
        throw new Error(assignmentsData.error ?? "Failed to load assignments");
      }

      setSubjects(subjectsData);
      setClasses(classesData);
      setAssignments(assignmentsData.assignments);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load assignment data",
      );
    }
  }
  //create assignment function
  async function createAssignment(teacherId: string) {
    if (!selectedSubject || !selectedClass) {
      setError("Select subject and class");
      return;
    }

    setAssignmentLoading(teacherId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/teacher-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherId,
          subjectId: selectedSubject,
          classId: selectedClass,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create assignment");
      }

      setSuccess("Teacher assignment created");

      setSelectedSubject("");
      setSelectedClass("");
      setSelectedTeacher(null);

      await loadAssignmentData();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create assignment",
      );
    } finally {
      setAssignmentLoading(null);
    }
  }
   // load class heads
  async function loadClassHeads() {
    try {
      const response =
        await fetch("/api/class-heads")

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
          "Failed to load class heads",
        )
      }

      setClassHeads(data.assignments)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load class heads",
      )
    }
  }
  async function assignClassHead(userId: string) {
    if (!selectedHeadClass) {
      setError("Select a class");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/class-heads",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId,
            classId: selectedHeadClass,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
          "Failed to assign class head",
        );
      }

      setSuccess(
        "Head of Class assigned successfully",
      );

      setSelectedHeadClass("");

      await loadClassHeads();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to assign class head",
      );
    }
  }
  useEffect(() => {
    async function loadData() {
      await loadStaff();
      await loadAssignmentData();
      await loadClassHeads();

      
    }

    loadData()

    
  }, []);



  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setName("")
    setEmail("")
    setPassword("")

    setLoading(true);

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to create staff");
        return;
      }

      setSuccess(`Staff account created: ${data.staff.email}`);

      setName("");
      setEmail("");
      setPassword("");
      setRole("teacher");

      await loadStaff();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }
 
  // any one can teach 
  const teachableRoles: StaffRole[] = [
    "principal",
    "deputy",
    "head_of_class",
    "head_of_department",
    "teacher",
  ]

  // search and fillter 
  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      member.email
        .toLowerCase()
        .includes(search.toLowerCase())

    const matchesRole =
      filterRole === "all" ||
      member.role === filterRole

    return matchesSearch && matchesRole
  })


  // new JSX fixing ui adding feteared 

  return (
    <div className="space-y-6">

      {/* =========================
        CREATE STAFF
    ========================= */}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border bg-gray-500 p-6"
      >
        <h2 className="text-xl font-semibold text-blue-600">
          Add Staff Member
        </h2>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full name"
          className="w-full rounded border p-2"
          required
        />

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="w-full rounded border p-2"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="w-full rounded border p-2"
          minLength={8}
          required
        />

        <select
          value={role}
          onChange={(event) =>
            setRole(event.target.value as StaffRole)
          }
          className="w-full rounded border p-2"
        >
          <option value="teacher">
            Teacher
          </option>

          <option value="head_of_class">
            Head of Class
          </option>

          <option value="head_of_department">
            Head of Department
          </option>

          <option value="deputy">
            Deputy
          </option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Staff"}
        </button>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-600">
            {success}
          </p>
        )}
      </form>



      {/* =========================
        STAFF LIST
    ========================= */}

      <section className="rounded-lg border p-6">

        <div className="mb-6">
          <h2 className="text-xl font-semibold">
            School Staff
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage school staff and teaching assignments.
          </p>
        </div>


        {/* =========================
          SEARCH + FILTER
      ========================= */}

        <div className="mb-6 flex flex-col gap-3 md:flex-row">

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by name or email..."
            className="flex-1 rounded border px-3 py-2"
          />

          <select
            value={filterRole}
            onChange={(event) =>
              setFilterRole(
                event.target.value as StaffRole | "all"
              )
            }
            className="rounded border px-3 py-2"
          >
            <option value="all">
              All roles
            </option>

            <option value="principal">
              Principal
            </option>

            <option value="deputy">
              Deputy
            </option>

            <option value="head_of_class">
              Head of Class
            </option>

            <option value="head_of_department">
              Head of Department
            </option>

            <option value="teacher">
              Teacher
            </option>
          </select>

        </div>


        {/* =========================
          LOADING
      ========================= */}

        {loadingStaff && (
          <p className="text-sm text-gray-500">
            Loading staff...
          </p>
        )}


        {/* =========================
          EMPTY
      ========================= */}

        {!loadingStaff &&
          filteredStaff.length === 0 && (
            <div className="rounded border p-6 text-center">
              <p className="font-medium">
                No staff members found.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or role filter.
              </p>
            </div>
          )}


        {/* =========================
          STAFF ROWS
      ========================= */}

        <div className="space-y-2">

          {!loadingStaff &&
            filteredStaff.map((member) => {

              const isSelected =
                selectedTeacher === member.id

              const memberAssignments =
                assignments.filter(
                  (assignment) =>
                    assignment.teacherId === member.id
                )
                const classHeadAssignment =
  classHeads.find(
    (assignment) =>
      assignment.userId === member.id
  )

              return (
                <div
                  key={member.id}
                  className="rounded-lg border"
                >

                  {/* =========================
                    STAFF ROW
                ========================= */}

                  <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">

                    <div className="min-w-0">

                      <p className="font-semibold">
                        {member.name}
                      </p>

                      <p className="truncate text-sm text-gray-500">
                        {member.email}
                      </p>

                      <p className="mt-1 text-sm">
                        Role:{" "}
                        <span className="font-medium">
                          {member.role}
                        </span>
                      </p>
                      {member.role === "head_of_class" && (
  <p className="mt-1 text-sm">
    Class:{" "}
    <span className="font-medium">
      {classHeadAssignment
        ? classHeadAssignment.className
        : "Not assigned"}
    </span>
  </p>
)}

                    </div>


                    {/* =========================
                      MANAGE BUTTON
                  ========================= */}

                    {teachableRoles.includes(member.role) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTeacher(null)
                            setSelectedSubject("")
                            setSelectedClass("")
                          } else {
                            setSelectedTeacher(member.id)
                            setSelectedSubject("")
                            setSelectedClass("")
                            setError("")
                            setSuccess("")
                          }
                        }}
                        className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
                      >
                        {isSelected
                          ? "Close"
                          : "Manage"}
                      </button>
                    )}




                    {member.role === "head_of_class" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeacher(
                            selectedTeacher === member.id
                              ? null
                              : member.id,
                          )

                          setSelectedHeadClass("")
                          setError("")
                          setSuccess("")
                        }}
                        className="rounded bg-green-600 px-4 py-2 text-sm text-white"
                      >
                        {selectedTeacher === member.id
                          ? "Close Class Assignment"
                          : "Assign Class"}
                      </button>


                    )}
                    {selectedTeacher === member.id &&
                      member.role === "head_of_class" && (
                        <div className="border-t bg-green-50 p-4">

                          <h3 className="font-semibold">
                            Assign Class
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            Select the class for this Head of Class.
                          </p>

                          <div className="mt-4 flex gap-3">

                            <select
                              value={selectedHeadClass}
                              onChange={(event) =>
                                setSelectedHeadClass(
                                  event.target.value,
                                )
                              }
                              className="flex-1 rounded border bg-white p-2"
                            >
                              <option value="">
                                Select class
                              </option>

                              {classes.map((schoolClass) => (
                                <option
                                  key={schoolClass.id}
                                  value={schoolClass.id}
                                >
                                  {schoolClass.name}
                                  {" — Grade "}
                                  {schoolClass.gradeLevel}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                assignClassHead(member.id)
                              }
                              disabled={!selectedHeadClass}
                              className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
                            >
                              Assign
                            </button>

                          </div>

                        </div>
                      )}

                  </div>


                  {/* =========================
                    ASSIGNMENT PANEL
                ========================= */}

                  {isSelected &&
                    teachableRoles.includes(member.role) &&
                    member.role !== "head_of_class" && (

                      <div className="border-t bg-gray-50 p-4">

                        <div className="mb-4">
                          <h3 className="font-semibold">
                            Teaching Assignments
                          </h3>

                          <p className="text-sm text-gray-500">
                            Assign this staff member to
                            subjects and classes.
                          </p>
                        </div>


                        {/* =========================
                          EXISTING ASSIGNMENTS
                      ========================= */}

                        <div className="mb-5">

                          <p className="mb-2 text-sm font-medium">
                            Current assignments
                          </p>

                          {memberAssignments.length === 0 ? (

                            <p className="rounded border bg-white p-3 text-sm text-gray-500">
                              No assignments yet.
                            </p>

                          ) : (

                            <div className="space-y-2">

                              {memberAssignments.map(
                                (assignment) => (

                                  <div
                                    key={`${assignment.teacherId}-${assignment.subjectId}-${assignment.classId}`}
                                    className="flex flex-col justify-between gap-1 rounded border bg-white p-3 sm:flex-row sm:items-center"
                                  >

                                    <span className="font-medium">
                                      {assignment.subjectName}
                                    </span>

                                    <span className="text-sm text-gray-500">
                                      {assignment.className}
                                      {" — Grade "}
                                      {assignment.gradeLevel}
                                    </span>

                                  </div>

                                )
                              )}

                            </div>

                          )}

                        </div>


                        {/* =========================
                          NEW ASSIGNMENT
                      ========================= */}

                        <div className="rounded border bg-white p-4">

                          <p className="mb-3 font-medium">
                            Add assignment
                          </p>

                          <div className="flex flex-col gap-3 md:flex-row">

                            {/* SUBJECT */}

                            <select
                              value={selectedSubject}
                              onChange={(event) =>
                                setSelectedSubject(
                                  event.target.value
                                )
                              }
                              className="flex-1 rounded border p-2"
                            >
                              <option value="">
                                Select subject
                              </option>

                              {subjects.map(
                                (subject) => (
                                  <option
                                    key={subject.id}
                                    value={subject.id}
                                  >
                                    {subject.name}
                                  </option>
                                )
                              )}

                            </select>


                            {/* CLASS */}

                            <select
                              value={selectedClass}
                              onChange={(event) =>
                                setSelectedClass(
                                  event.target.value
                                )
                              }
                              className="flex-1 rounded border p-2"
                            >
                              <option value="">
                                Select class
                              </option>

                              {classes.map(
                                (schoolClass) => (
                                  <option
                                    key={schoolClass.id}
                                    value={schoolClass.id}
                                  >
                                    {schoolClass.name}
                                    {" — Grade "}
                                    {schoolClass.gradeLevel}
                                  </option>
                                )
                              )}

                            </select>


                            {/* ASSIGN */}

                            <button
                              type="button"
                              onClick={() =>
                                createAssignment(
                                  member.id
                                )
                              }
                              disabled={
                                assignmentLoading !== null ||
                                !selectedSubject ||
                                !selectedClass
                              }
                              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                            >
                              {assignmentLoading ===
                                member.id
                                ? "Assigning..."
                                : "Assign"}
                            </button>

                          </div>

                        </div>

                      </div>

                    )}

                </div>
              )
            })}

        </div>

      </section>

    </div>
  )





}
