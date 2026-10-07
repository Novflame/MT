import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

import { getSchoolDB } from "@/db";
import { staffProfiles } from "@/db/schema";

import { auth } from "@/auth/auth";
import { centralDb } from "@/db/central";
import { user } from "@/db/centeral-schema";
import ManageUserForm from "@/components/settings/ManageUserForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ManageUserPage({ params }: Props) {
  // =========================================
  // Authentication
  // =========================================

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // =========================================
  // Current user
  // =========================================

  const currentUser = await centralDb
    .select({
      schoolId: user.schoolId,
      schoolRole: user.schoolRole,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!currentUser[0]) {
    redirect("/login");
  }

  // =========================================
  // Only principal / deputy
  // =========================================

  if (
    currentUser[0].schoolRole !== "principal" &&
    currentUser[0].schoolRole !== "deputy"
  ) {
    redirect("/dashboard");
  }

  // =========================================
  // Target user
  // =========================================
const { id } = await params

const targetUser =
    await centralDb
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
            schoolRole: user.schoolRole,
            banned: user.banned,
        })
        .from(user)
        .where(
            and(
                eq(user.id, id),
                eq(
                    user.schoolId,
                    currentUser[0].schoolId,
                ),
            ),
        )
        .limit(1)

if (!targetUser[0]) {
    notFound()
}

const schoolUser = targetUser[0]

const db = await getSchoolDB()

const profile =
    await db
        .select()
        .from(staffProfiles)
        .where(
            eq(
                staffProfiles.userId,
                id,
            ),
        )
        .limit(1)

const staffProfile =
    profile[0] ?? null
  // =========================================
  // Render
  // =========================================

  return (
    <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}

        <div className="mb-8">
          <Link
            href="/settings/users"
            className="
                            text-sm
                            text-slate-500
                            hover:text-slate-900
                        "
          >
            ← Back to Users
          </Link>

          <h1
            className="
                        mt-4
                        text-2xl
                        font-bold
                        text-slate-900
                    "
          >
            Manage User
          </h1>

          <p
            className="
                        mt-1
                        text-sm
                        text-slate-500
                    "
          >
            Manage this staff member&apos;s access to the school system.
          </p>
        </div>

        <ManageUserForm user={schoolUser} profile={staffProfile} />
      </div>
    </main>
  );
}
