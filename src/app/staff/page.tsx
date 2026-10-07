import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/auth/auth";
import StaffForm from "@/components/staffForm";

export default async function StaffPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  if (
    session.user.schoolRole !== "principal" &&
    session.user.schoolRole !== "deputy"
  ) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
        <header className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-blue-900/50 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Staff
              </h1>

              <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400 sm:text-base">
                School staff members
              </p>
            </div>

            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 sm:flex">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                />
                <circle cx="9" cy="7" r="4" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                />
              </svg>
            </div>
          </div>
        </header>

        <section className="min-w-0">
          <StaffForm />
        </section>
      </div>
    </main>
  );
}
