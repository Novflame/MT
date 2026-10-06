import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link"
import { Pencil } from "lucide-react"
type StaffUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  emailVerified?: boolean | null;
  createdAt?: Date | string | null;
};

type StaffProfileData = {
  phone?: string | null;
  profileImage?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  nationalId?: string | null;
  address?: string | null;
  city?: string | null;

  employeeId?: string | null;
  position?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  qualification?: string | null;
  employmentDate?: string | null;
  specialization?: string | null;

  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

type RoleAssignment =
  | {
      type: "head_of_class";
      academicYear?: string | null;
      className?: string | null;
      gradeLevel?: string | number | null;
      studentCount?: number | null;
      status?: string | null;
    }
  | {
      type: "teacher";
      academicYear?: string | null;
      subjects?: string[];
      classes?: string[];
      assignmentCount?: number;
    }
  | {
      type: "head_of_department";
      academicYear?: string | null;
      departmentName?: string | null;
      status?: string | null;
    }
  | null;

type Props = {
  user: StaffUser;
  profile: StaffProfileData | null;
  roleAssignment?: RoleAssignment;
};

function displayValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
}

function formatRole(role?: string | null) {
  if (!role) return "Staff";

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | Date | null) {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date);
}

function getInitials(name?: string | null) {
  if (!name) return "U";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | number | null;
  href?: string;
}) {
  const empty =
    value === null ||
    value === undefined ||
    value === "";

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      {href && !empty ? (
        <a
          href={href}
          className="mt-1 block wrap-break-words text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {displayValue(value)}
        </a>
      ) : (
        <p
          className={`mt-1 wrap-break-words text-sm font-medium ${
            empty
              ? "text-slate-400 dark:text-slate-500"
              : "text-slate-900 dark:text-slate-100"
          }`}
        >
          {displayValue(value)}
        </p>
      )}
    </div>
  );
}

function AssignmentSection({ assignment }: { assignment: RoleAssignment }) {
  if (!assignment) return null;

  if (assignment.type === "head_of_class") {
    return (
      <Section title="Class Assignment">
        <Field label="Academic Year" value={assignment.academicYear} />

        <Field label="Class" value={assignment.className} />

        <Field label="Grade Level" value={assignment.gradeLevel} />

        <Field label="Students" value={assignment.studentCount} />

        <Field label="Status" value={assignment.status} />
      </Section>
    );
  }

  if (assignment.type === "teacher") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Teaching Assignment
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Academic Year" value={assignment.academicYear} />

          <Field label="Assignments" value={assignment.assignmentCount} />

          <div className="min-w-0 sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Subjects
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {assignment.subjects?.length ? (
                assignment.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {subject}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400 dark:text-slate-500">
                  Not provided
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Classes
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {assignment.classes?.length ? (
                assignment.classes.map((className) => (
                  <span
                    key={className}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {className}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400 dark:text-slate-500">
                  Not provided
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <Section title="Department Assignment">
      <Field label="Academic Year" value={assignment.academicYear} />

      <Field label="Department" value={assignment.departmentName} />

      <Field label="Status" value={assignment.status} />
    </Section>
  );
}

export default function StaffProfile({
  user,
  profile,
  roleAssignment = null,
}: Props) {
  const name = displayValue(user.name);
  const role = formatRole(user.role);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="shrink-0">
              {profile?.profileImage ? (
                <Image
                  src={profile.profileImage}
                  alt={name}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 text-xl font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                  {getInitials(user.name)}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h1 className=" wrap-break-word text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {name}
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                {role}
              </p>

              <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                {displayValue(user.email)}
              </p>
            </div>
            <Link
    href="/dashboard/profile/manage"
    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
>
    <Pencil className="size-4" />
    Manage Profile
</Link>


          </div>
        </div>
      </section>

      <Section title="Personal Information">
        <Field label="Full Name" value={user.name} />

        <Field label="Email" value={user.email} />

        <Field label="Phone" value={profile?.phone} />

        <Field label="Date of Birth" value={formatDate(profile?.dateOfBirth)} />

        <Field label="Gender" value={profile?.gender} />

        <Field label="Nationality" value={profile?.nationality} />

        <Field label="National ID" value={profile?.nationalId} />

        <Field label="City" value={profile?.city} />

        <div className="sm:col-span-2">
          <Field label="Address" value={profile?.address} />
        </div>
      </Section>

      <Section title="Professional Information">
        <Field label="Employee ID" value={profile?.employeeId} />

        <Field
          label="Position"
          value={profile?.position ?? formatRole(user.role)}
        />

        <Field label="Department" value={profile?.department?.name} />

        <Field label="Qualification" value={profile?.qualification} />

        <Field label="Specialization" value={profile?.specialization} />

        <Field
          label="Employment Date"
          value={formatDate(profile?.employmentDate)}
        />
      </Section>

      <Section title="Emergency Contact">
        <Field label="Contact Name" value={profile?.emergencyContactName} />

        <Field label="Contact Phone" value={profile?.emergencyContactPhone} />
      </Section>

      <Section title="Account Information">
        <Field label="Role" value={role} />

        <Field
          label="Email Verification"
          value={
            user.emailVerified === true
              ? "Verified"
              : user.emailVerified === false
                ? "Not verified"
                : "Not provided"
          }
        />

        <Field label="Account Created" value={formatDate(user.createdAt)} />

        <Field label="Account ID" value={user.id} />
      </Section>

      <AssignmentSection assignment={roleAssignment} />
    </div>
  );
}
