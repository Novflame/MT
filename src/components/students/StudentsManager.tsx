"use client";

import { useState } from "react";
import StudentImport from "./StudentImport"
type SchoolClass = {
  id: string;
  name: string;
  gradeLevel: number;
};

type Student = {
  id: string;
  name: string;
  parentName: string;
  parentPhone: string;
  classId: string;
  className: string;
};

type ParentMatch = {
  id: string;
  name: string;
  phone: string;
};

type Props = {
  classes: SchoolClass[];
  students: Student[];
};

export default function StudentsManager({ classes, students }: Props) {
  // =========================
  // Student form
  // =========================
const [showImport, setShowImport] =
    useState(false)
  const [admissionNumber, setAdmissionNumber] = useState("");

  const [firstName, setFirstName] = useState("");

  const [middleName, setMiddleName] = useState("");

  const [lastName, setLastName] = useState("");

  const [dateOfBirth, setDateOfBirth] = useState("");

  const [gender, setGender] = useState("");

  const [nationality, setNationality] = useState("");

  const [nationalId, setNationalId] = useState("");

  const [photo, setPhoto] = useState("");

  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");

  const [address, setAddress] = useState("");

  const [city, setCity] = useState("");

  const [notes, setNotes] = useState("");

  // =========================
  // Parent
  // =========================

  const [parentName, setParentName] = useState("");

  const [parentPhone, setParentPhone] = useState("");

  // =========================
  // Enrollment
  // =========================

  const [classId, setClassId] = useState("");

  // =========================
  // UI state
  // =========================

  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [parentMatches, setParentMatches] = useState<ParentMatch[]>([]);

  const [showParentChoice, setShowParentChoice] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");

  const [filterClassId, setFilterClassId] = useState("");

  // =========================
  // Validation
  // =========================

  function validateCreateForm() {
    if (!admissionNumber.trim()) {
      alert("Admission number is required.");
      return false;
    }

    if (!firstName.trim()) {
      alert("First name is required.");
      return false;
    }

    if (!middleName.trim()) {
      alert("Middle name is required.");
      return false;
    }

    if (!lastName.trim()) {
      alert("Last name is required.");
      return false;
    }

    if (!dateOfBirth) {
      alert("Date of birth is required.");
      return false;
    }

    if (!gender.trim()) {
      alert("Gender is required.");
      return false;
    }

    if (!nationality.trim()) {
      alert("Nationality is required.");
      return false;
    }

    if (!phone.trim()) {
      alert("Student phone is required.");
      return false;
    }

    if (!address.trim()) {
      alert("Address is required.");
      return false;
    }

    if (!city.trim()) {
      alert("City is required.");
      return false;
    }

    if (!parentName.trim()) {
      alert("Parent name is required.");
      return false;
    }

    if (!parentPhone.trim()) {
      alert("Parent phone is required.");
      return false;
    }

    if (!classId) {
      alert("Please select a class.");
      return false;
    }

    return true;
  }

  // =========================
  // Check parent
  // =========================

  async function checkParent() {
    if (!validateCreateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/students/check-parent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parentName: parentName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to check parent");
      }

      if (data.exists && data.parents?.length > 0) {
        setParentMatches(data.parents);

        setShowParentChoice(true);

        return;
      }

      await createStudent("create");
    } catch (error) {
      console.error(error);

      alert(error instanceof Error ? error.message : "Failed to check parent");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // Create student
  // =========================

  async function createStudent(
    parentAction: "create" | "link",
    existingParentId?: string,
  ) {
    const response = await fetch("/api/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        admissionNumber: admissionNumber.trim(),

        firstName: firstName.trim(),

        middleName: middleName.trim(),

        lastName: lastName.trim(),

        dateOfBirth,

        gender: gender.trim(),

        nationality: nationality.trim(),

        nationalId: nationalId.trim() || null,

        photo: photo.trim() || null,

        phone: phone.trim(),

        email: email.trim() || null,

        address: address.trim(),

        city: city.trim(),

        notes: notes.trim() || null,

        parentName: parentName.trim(),

        parentPhone: parentPhone.trim(),

        classId,

        parentAction,

        existingParentId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to create student");
    }

    resetForm();

    window.location.reload();
  }

  // =========================
  // Link existing parent
  // =========================

  async function linkParent(parent: ParentMatch) {
    setShowParentChoice(false);

    setLoading(true);

    try {
      await createStudent("link", parent.id);
    } catch (error) {
      console.error(error);

      alert(error instanceof Error ? error.message : "Failed to link parent");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // Create new parent
  // =========================

  async function createNewParent() {
    setShowParentChoice(false);

    setLoading(true);

    try {
      await createStudent("create");
    } catch (error) {
      console.error(error);

      alert(error instanceof Error ? error.message : "Failed to create parent");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // Reset form
  // =========================

  function resetForm() {
    setAdmissionNumber("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setDateOfBirth("");
    setGender("");
    setNationality("");
    setNationalId("");
    setPhoto("");
    setPhone("");
    setEmail("");
    setAddress("");
    setCity("");
    setNotes("");

    setParentName("");
    setParentPhone("");

    setClassId("");

    setEditingId(null);

    setParentMatches([]);

    setShowParentChoice(false);

    setShowForm(false);
  }

  // =========================
  // Start editing
  // =========================

  function startEdit(student: Student) {
    const parts = student.name.trim().split(/\s+/);

    const first = parts[0] ?? "";

    const last = parts.length > 1 ? parts[parts.length - 1] : "";

    const middle = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";

    setEditingId(student.id);

    setFirstName(first);

    setMiddleName(middle);

    setLastName(last);

    setParentPhone(student.parentPhone);

    setClassId(student.classId);

    setShowForm(true);
  }

  // =========================
  // Update student
  // =========================

  async function updateStudent() {
    if (!editingId) {
      return;
    }

    if (!firstName.trim()) {
      alert("First name is required.");
      return;
    }

    if (!middleName.trim()) {
      alert("Middle name is required.");
      return;
    }

    if (!lastName.trim()) {
      alert("Last name is required.");
      return;
    }

    if (!classId) {
      alert("Please select a class.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/students/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim(),

          middleName: middleName.trim(),

          lastName: lastName.trim(),

          classId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update student");
      }

      resetForm();

      window.location.reload();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error ? error.message : "Failed to update student",
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // Delete student
  // =========================

  async function deleteStudent(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this student?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete student");
      }

      window.location.reload();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error ? error.message : "Failed to delete student",
      );
    }
  }

  // =========================
  // Filter students
  // =========================

  const filteredStudents = students.filter((student) => {
    const searchValue = search.trim().toLowerCase();

    const matchesSearch =
      !searchValue ||
      student.name.toLowerCase().includes(searchValue) ||
      student.parentName.toLowerCase().includes(searchValue) ||
      student.parentPhone.toLowerCase().includes(searchValue);

    const matchesClass = !filterClassId || student.classId === filterClassId;

    return matchesSearch && matchesClass;
  });

  return (
    <section className="space-y-6">
      {/* ================================= */}
      {/* Header */}
      {/* ================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Students</h2>

          <p className="mt-1 text-sm text-slate-500">
            {students.length} {students.length === 1 ? "student" : "students"}{" "}
            registered
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
          >
            + Add Student
          </button>

          <button
            type="button"
            onClick={()=> setShowImport(true)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
          >
            Import CSV
          </button>
        </div>
      </div>

      {/* ================================= */}
      {/* Search / Filter */}
      {/* ================================= */}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            ⌕
          </span>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <select
          value={filterClassId}
          onChange={(e) => setFilterClassId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:w-56"
        >
          <option value="">All classes</option>

          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name} — Grade {schoolClass.gradeLevel}
            </option>
          ))}
        </select>
      </div>

      {/* ================================= */}
      {/* Students */}
      {/* ================================= */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Desktop table */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Student
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Parent
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Class
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <p className="font-medium text-slate-700">
                      No students found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Try changing your search or filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-600">
                          {student.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {student.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            ID: {student.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-700">
                        {student.parentName}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {student.parentPhone}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                        {student.className}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(student)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteStudent(student.id)}
                          className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredStudents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-medium text-slate-700">No students found</p>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filter.
              </p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-600">
                    {student.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-slate-900">
                      {student.name}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      ID: <span className="break-all">{student.id}</span>
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-400">
                          Parent
                        </p>

                        <p className="mt-0.5 break-words text-sm text-slate-700">
                          {student.parentName}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-400">
                          Class
                        </p>

                        <span className="mt-0.5 inline-flex max-w-full whitespace-normal break-words rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                          <span className="break-words">{student.className}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-medium text-slate-400">
                        Parent phone
                      </p>

                      <p className="mt-0.5 text-sm text-slate-700">
                        {student.parentPhone}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(student)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteStudent(student.id)}
                    className="flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================================= */}
      {/* Student Modal */}
      {/* ================================= */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            {/* Modal header */}

            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? "Edit Student" : "Add Student"}
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  {editingId
                    ? "Update student information."
                    : "Add a new student to your school."}
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            {/* Modal body */}

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-6">
                {/* Student information */}

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Student Information
                  </h3>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {!editingId && (
                      <Field label="Admission number" required>
                        <input
                          value={admissionNumber}
                          onChange={(e) => setAdmissionNumber(e.target.value)}
                          placeholder="e.g. ADM-001"
                          className={inputClass}
                        />
                      </Field>
                    )}

                    <Field label="First name" required>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Middle name" required>
                      <input
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        placeholder="Middle name"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Last name" required>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className={inputClass}
                      />
                    </Field>

                    {!editingId && (
                      <>
                        <Field label="Date of birth" required>
                          <input
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Gender" required>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Select gender</option>

                            <option value="male">Male</option>

                            <option value="female">Female</option>

                            <option value="other">Other</option>
                          </select>
                        </Field>

                        <Field label="Nationality" required>
                          <input
                            value={nationality}
                            onChange={(e) => setNationality(e.target.value)}
                            placeholder="Nationality"
                            className={inputClass}
                          />
                        </Field>

                        <Field label="National ID">
                          <input
                            value={nationalId}
                            onChange={(e) => setNationalId(e.target.value)}
                            placeholder="Optional"
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Student phone" required>
                          <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Phone number"
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Email">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Optional"
                            className={inputClass}
                          />
                        </Field>

                        <Field label="City" required>
                          <input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="City"
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Address" required>
                          <input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Address"
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Photo URL">
                          <input
                            value={photo}
                            onChange={(e) => setPhoto(e.target.value)}
                            placeholder="Optional"
                            className={inputClass}
                          />
                        </Field>
                      </>
                    )}
                  </div>
                </div>

                {/* Enrollment */}

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Enrollment
                  </h3>

                  <div className="mt-3">
                    <Field label="Class" required>
                      <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select class</option>

                        {classes.map((schoolClass) => (
                          <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.name} — Grade {schoolClass.gradeLevel}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Parent */}

                {!editingId && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Parent Information
                    </h3>

                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <Field label="Parent name" required>
                        <input
                          value={parentName}
                          onChange={(e) => setParentName(e.target.value)}
                          placeholder="Parent name"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Parent phone" required>
                        <input
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value)}
                          placeholder="Parent phone"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* Notes */}

                {!editingId && (
                  <Field label="Notes">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Additional notes..."
                      className={inputClass}
                    />
                  </Field>
                )}
              </div>
            </div>

            {/* Modal footer */}

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={editingId ? updateStudent : checkParent}
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {loading
                  ? editingId
                    ? "Updating..."
                    : "Checking..."
                  : editingId
                    ? "Update Student"
                    : "Add Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================= */}
      {/* Parent Choice Modal */}
      {/* ================================= */}

      {showParentChoice && (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
          <div className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Existing parent found
                </h3>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  A parent with this name already exists. Choose whether to link
                  the student to an existing parent or create a new one.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowParentChoice(false)}
                disabled={loading}
                className="ml-4 text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {parentMatches.map((parent) => (
                <div
                  key={parent.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {parent.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {parent.phone}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => linkParent(parent)}
                    disabled={loading}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    Link
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={createNewParent}
                disabled={loading}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Create New Parent
              </button>

              <button
                type="button"
                onClick={() => setShowParentChoice(false)}
                disabled={loading}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {showImport && (
    <StudentImport
        onClose={() =>
            setShowImport(false)
        }
        onImported={() => {
            setShowImport(false)
            window.location.reload()
        }}
    />
)}
    </section>
  );
}

// =================================
// Reusable field
// =================================

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        {label}

        {required && <span className="ml-1 text-blue-600">*</span>}
      </label>

      {children}
    </div>
  );
}

// =================================
// Standard input
// =================================

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
