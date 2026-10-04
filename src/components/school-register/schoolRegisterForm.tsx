"use client";
import Image from "next/image";
import logo from "@/logo/logo.png";
import { useState, type FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SchoolRegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalEmail, setPrincipalEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const normalizedSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");

    try {
      const response = await fetch("/api/register-school", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: normalizedSlug,
          principalName: principalName.trim(),
          principalEmail: principalEmail.trim().toLowerCase(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Registration failed");
        return;
      }

      router.push("/login");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="h-dvh w-full overflow-hidden bg-slate-950 px-3 py-3 text-white sm:px-5 sm:py-4">
      <div className="flex h-full w-full items-center justify-center">
        <section className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10bg-white/4 **:shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="shrink-0 border-b border-white/10 px-5 py-4 text-center sm:px-8 sm:py-5">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10 shadow-lg sm:h-16 sm:w-16">
              <Image
                src={logo}
                alt="School Management System"
                width={64}
                height={64}
                className="h-full w-full object-contain p-1.5"
                priority
              />
            </div>

            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
              School Management System
            </p>

            <h1 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">
              Register Your School
            </h1>

            <p className="mx-auto mt-1 max-w-md text-xs text-slate-400 sm:text-sm">
              Create your school account and start managing your school.
            </p>
          </div>

          {/* Form */}
          <div className="min-h-0 flex-1 px-5 py-4 sm:px-8 sm:py-5">
            {error && (
              <div
                className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2"
                role="alert"
              >
                <p className="text-xs font-semibold text-red-400">
                  Registration failed
                </p>

                <p className="mt-0.5 text-xs text-red-300">{error}</p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {/* School Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  School Name
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter school name"
                  className="h-10 w-full rounded-xl border border-white/10bg-white/6 px-3
                                 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30 focus:bg-white/8 focus:ring-2 focus:ring-white/10"
                />
              </div>

              {/* School Slug */}
              <div>
                <label
                  htmlFor="slug"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  School Slug
                </label>

                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  placeholder="my-school"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/6 px-3  text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30 focus:bg-white/8 focus:ring-2 focus:ring-white/10"
                />
              </div>

              {/* Principal Name */}
              <div>
                <label
                  htmlFor="principalName"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Principal Name
                </label>

                <input
                  id="principalName"
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  required
                  placeholder="Enter principal name"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/06 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30 focus:bg-white/8 focus:ring-2 focus:ring-white/10"
                />
              </div>

              {/* Principal Email */}
              <div>
                <label
                  htmlFor="principalEmail"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Principal Email
                </label>

                <input
                  id="principalEmail"
                  type="email"
                  value={principalEmail}
                  onChange={(e) => setPrincipalEmail(e.target.value)}
                  required
                  placeholder="principal@example.com"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/6 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30 focus:bg-white/8 focus:ring-2 focus:ring-white/10"
                />
              </div>

              {/* Password */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/6 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/30 focus:bg-white/8 focus:ring-2 focus:ring-white/10"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="h-10 w-full rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
              >
                {loading ? "Creating School..." : "Create School"}
              </button>
            </form>

            {/* Login */}
            <div className="mt-4 border-t border-white/10 pt-3 text-center">
              <p className="text-xs text-slate-500">
                Already have a school account?
              </p>

              <Link
                href="/login"
                className="mt-1 inline-block text-xs font-medium text-slate-300 transition hover:text-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
