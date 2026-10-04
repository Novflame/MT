"use client";

import { useEffect, useMemo, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import Image from "next/image";
type Props = {
  studentId: string;
};

type StudentProfileType = {
  student: {
    id: string;
    admissionNumber: string;
    firstName: string;
    middleName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    nationalId: string | null;
    photo: string | null;
    phone: string;
    email: string | null;
    address: string;
    city: string;
    status: string;
    notes: string | null;
  };

  currentEnrollment: {
    class: {
      name: string;
      gradeLevel: number;
    };
    academicYear: {
      name: string;
    };
  } | null;

  attendance: {
    rate: number;
    total: number;
    present: number;
    absent: number;
    late: number;
    recent: {
      id: string;
      date: string;
      status: string;
      note: string | null;
    }[];
  };

  academic: {
    average: number;
    subjects: {
      id: string;
      name: string;
      average: number;
    }[];
    recentGrades: {
      id: string;
      title: string;
      subjectName: string;
      score: number;
      maxScore: number;
      date: string;
    }[];
  };

  parents: {
    id: string;
    name: string;
    phone: string;
  }[];

  enrollments: {
    id: string;
    class: {
      name: string;
      gradeLevel: number;
    };
    academicYear: {
      name: string;
    };
  }[];

  promotion: {
    id: string;
    fromClass: {
      name: string;
    };
    toClass: {
      name: string;
    } | null;
    finalDecision: string;
    createdAt: string;
  }[];

  timeline: {
    id: string;
    date: string;
    title: string;
    description: string;
  }[];
};
type Tab = "overview" | "academic" | "attendance" | "parents" | "history";

export default function StudentProfile({ studentId }: Props) {
  const [profile, setProfile] = useState<StudentProfileType | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/students/${studentId}/profile`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load student profile.");
        }

        if (!cancelled) {
          setProfile(data);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load student profile.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const fullName = useMemo(() => {
    if (!profile) {
      return "";
    }

    return [
      profile.student.firstName,
      profile.student.middleName,
      profile.student.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  }, [profile]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-52 animate-pulse rounded-3xl bg-white/5" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
        <h2 className="font-semibold text-red-400">Failed to load student</h2>

        <p className="mt-2 text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const student = profile.student;

  const tabs: {
    id: Tab;
    label: string;
  }[] = [
    {
      id: "overview",
      label: "Overview",
    },
    {
      id: "academic",
      label: "Academic",
    },
    {
      id: "attendance",
      label: "Attendance",
    },
    {
      id: "parents",
      label: "Parents",
    },
    {
      id: "history",
      label: "History",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ========================= */}
      {/* Header */}
      {/* ========================= */}

      <motion.section
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
        }}
        className="overflow-hidden rounded-3xl border border-white/10 bg-white/4 shadow-2xl"
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-2xl font-bold">
                {student.photo ? (
                  <Image
                    src={student.photo}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  student.firstName.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold sm:text-3xl">{fullName}</h1>

                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                    {student.status}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  Admission No:
                  <span className="ml-2 text-slate-200">
                    {student.admissionNumber}
                  </span>
                </p>

                {profile.currentEnrollment && (
                  <p className="mt-1 text-sm text-slate-400">
                    {profile.currentEnrollment.class.name}

                    <span className="mx-2">•</span>

                    {profile.currentEnrollment.academicYear.name}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium transition hover:bg-white/10"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </motion.section>

      {/* ========================= */}
      {/* Stats */}
      {/* ========================= */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance" value={`${profile.attendance.rate}%`} />

        <StatCard
          label="Academic Average"
          value={`${profile.academic.average}%`}
        />

        <StatCard label="Subjects" value={profile.academic.subjects.length} />

        <StatCard label="Parents" value={profile.parents.length} />
      </div>

      {/* ========================= */}
      {/* Tabs */}
      {/* ========================= */}

      <div className="rounded-2xl border border-white/10 bg-white/3 p-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="relative whitespace-nowrap rounded-xl px-4 py-2.5 text-sm text-slate-400 transition hover:text-white"
              >
                {active && (
                  <motion.div
                    layoutId="student-profile-tab"
                    className="absolute inset-0 rounded-xl bg-white/10"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}

                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================= */}
      {/* Content */}
      {/* ========================= */}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{
            opacity: 0,
            x: 12,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          exit={{
            opacity: 0,
            x: -12,
          }}
          transition={{
            duration: 0.2,
          }}
        >
          {activeTab === "overview" && <Overview profile={profile} />}

          {activeTab === "academic" && <Academic profile={profile} />}

          {activeTab === "attendance" && <Attendance profile={profile} />}

          {activeTab === "parents" && <Parents profile={profile} />}

          {activeTab === "history" && <History profile={profile} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ================================================= */
/* STAT CARD                                         */
/* ================================================= */

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <motion.div
      whileHover={{
        y: -3,
      }}
      transition={{
        duration: 0.2,
      }}
      className="rounded-2xl border border-white/10 bg-white/4 p-5"
    >
      <p className="text-sm text-slate-400">{label}</p>

      <p className="mt-2 text-2xl font-bold">{value}</p>
    </motion.div>
  );
}

/* ================================================= */
/* OVERVIEW                                          */
/* ================================================= */

function Overview({ profile }: { profile: StudentProfileType }) {
  const student = profile.student;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Personal Information">
        <Info label="First Name" value={student.firstName} />

        <Info label="Middle Name" value={student.middleName} />

        <Info label="Last Name" value={student.lastName} />

        <Info label="Date of Birth" value={student.dateOfBirth} />

        <Info label="Gender" value={student.gender} />

        <Info label="Nationality" value={student.nationality} />
      </Section>

      <Section title="Contact Information">
        <Info label="Phone" value={student.phone} />

        <Info label="Email" value={student.email ?? "Not provided"} />

        <Info label="Address" value={student.address} />

        <Info label="City" value={student.city} />

        <Info
          label="National ID"
          value={student.nationalId ?? "Not provided"}
        />
      </Section>

      <Section title="School Information">
        {profile.currentEnrollment ? (
          <>
            <Info
              label="Academic Year"
              value={profile.currentEnrollment.academicYear.name}
            />

            <Info label="Class" value={profile.currentEnrollment.class.name} />

            <Info
              label="Grade Level"
              value={String(profile.currentEnrollment.class.gradeLevel)}
            />
          </>
        ) : (
          <p className="text-sm text-slate-400">
            Student is not currently enrolled.
          </p>
        )}
      </Section>

      <Section title="Notes">
        <p className="text-sm leading-7 text-slate-300">
          {student.notes ?? "No notes available."}
        </p>
      </Section>
    </div>
  );
}

/* ================================================= */
/* ACADEMIC                                          */
/* ================================================= */

function Academic({ profile }: { profile: StudentProfileType }) {
  return (
    <div className="space-y-6">
      <Section title="Subject Performance">
        <div className="space-y-4">
          {profile.academic.subjects.length === 0 ? (
            <Empty text="No academic records yet." />
          ) : (
            profile.academic.subjects.map((subject) => (
              <div key={subject.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{subject.name}</span>

                  <span className="text-slate-400">{subject.average}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{
                      width: 0,
                    }}
                    animate={{
                      width: `${Math.min(subject.average, 100)}%`,
                    }}
                    transition={{
                      duration: 0.7,
                    }}
                    className="h-full rounded-full bg-white"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title="Recent Tests & Exams">
        {profile.academic.recentGrades.length === 0 ? (
          <Empty text="No grades available." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="px-3 py-3">Assessment</th>

                  <th className="px-3 py-3">Subject</th>

                  <th className="px-3 py-3">Score</th>

                  <th className="px-3 py-3">Date</th>
                </tr>
              </thead>

              <tbody>
                {profile.academic.recentGrades.map((grade) => (
                  <tr key={grade.id} className="border-b border-white/5">
                    <td className="px-3 py-3">{grade.title}</td>

                    <td className="px-3 py-3 text-slate-400">
                      {grade.subjectName}
                    </td>

                    <td className="px-3 py-3">
                      {grade.score}/{grade.maxScore}
                    </td>

                    <td className="px-3 py-3 text-slate-400">{grade.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ================================================= */
/* ATTENDANCE                                        */
/* ================================================= */

function Attendance({ profile }: { profile: StudentProfileType }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={profile.attendance.total} />

        <StatCard label="Present" value={profile.attendance.present} />

        <StatCard label="Absent" value={profile.attendance.absent} />

        <StatCard label="Late" value={profile.attendance.late} />
      </div>

      <Section title="Recent Attendance">
        {profile.attendance.recent.length === 0 ? (
          <Empty text="No attendance records yet." />
        ) : (
          <div className="space-y-2">
            {profile.attendance.recent.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-xl border border-white/2 bg-white/2 p-4"
              >
                <div>
                  <p className="font-medium">{record.date}</p>

                  <p className="mt-1 text-xs text-slate-400">
                    {record.note ?? "Attendance recorded"}
                  </p>
                </div>

                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ================================================= */
/* PARENTS                                           */
/* ================================================= */

function Parents({ profile }: { profile: StudentProfileType }) {
  return (
    <Section title="Parents & Guardians">
      {profile.parents.length === 0 ? (
        <Empty text="No parents or guardians linked." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profile.parents.map((parent) => (
            <motion.div
              key={parent.id}
              whileHover={{
                y: -3,
              }}
              className="rounded-2xl border border-white/10 bg-white/3 p-5"
            >
              <h3 className="font-semibold">{parent.name}</h3>

              <p className="mt-2 text-sm text-slate-400">{parent.phone}</p>
            </motion.div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ================================================= */
/* HISTORY                                           */
/* ================================================= */

function History({ profile }: { profile: StudentProfileType }) {
  return (
    <div className="space-y-6">
      <Section title="Academic History">
        {profile.enrollments.length === 0 ? (
          <Empty text="No enrollment history." />
        ) : (
          <div className="space-y-3">
            {profile.enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="rounded-2xl border border-white/10 bg-white/3 p-5"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                  <div>
                    <h3 className="font-semibold">{enrollment.class.name}</h3>

                    <p className="mt-1 text-sm text-slate-400">
                      Grade {enrollment.class.gradeLevel}
                    </p>
                  </div>

                  <span className="text-sm text-slate-400">
                    {enrollment.academicYear.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Promotion History">
        {profile.promotion.length === 0 ? (
          <Empty text="No promotion decisions yet." />
        ) : (
          <div className="space-y-3">
            {profile.promotion.map((promotion) => (
              <div
                key={promotion.id}
                className="rounded-2xl border border-white/10 bg-white/3 p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {promotion.fromClass.name}

                      {" → "}

                      {promotion.toClass?.name ?? "Not promoted"}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {promotion.finalDecision}
                    </p>
                  </div>

                  <span className="text-xs text-slate-500">
                    {promotion.createdAt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Student Timeline">
        {profile.timeline.length === 0 ? (
          <Empty text="No timeline events yet." />
        ) : (
          <div className="relative ml-3 border-l border-white/10 pl-6">
            {profile.timeline.map((event) => (
              <div key={event.id} className="relative pb-8 last:pb-0">
                <div
                  className="absolute `left-[-31px]`top-1 h-3 w-3 rounded-full bg-white"
                />

                <p className="text-xs text-slate-500">{event.date}</p>

                <h3 className="mt-1 font-medium">{event.title}</h3>

                <p className="mt-1 text-sm text-slate-400">
                  {event.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ================================================= */
/* SHARED COMPONENTS                                 */
/* ================================================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/4 p-6">
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>

      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-white/5 py-3 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>

      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
