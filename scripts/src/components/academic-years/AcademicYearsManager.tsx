"use client";

import { useState } from "react";
import styles from "./AcademicYearsManager.module.css";

type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type Props = {
  initialAcademicYears: AcademicYear[];
};

export default function AcademicYearsManager({ initialAcademicYears }: Props) {
  const [academicYears, setAcademicYears] =
    useState<AcademicYear[]>(initialAcademicYears);

  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  async function createAcademicYear(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Academic year is required.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/academic-years", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create academic year");
      }

      setAcademicYears((current) => [...current, data.academicYear]);

      setName("");

      setSuccess("Academic year created successfully.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create academic year",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`${styles.container} min-h-dvh w-full px-4 py-6 sm:px-6`}>
      {" "}
      <div className={`${styles.book} mx-auto w-full min-w-0 max-w-6xl`}>
        ```
        {/* ========================= */}
        {/* CREATE PAGE */}
        {/* ========================= */}
        <section className={styles.createPage}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>School Management System</p>

            <h1 className={styles.title}>Academic Year</h1>

            <div className={styles.divider} />

            <p className={styles.subtitle}>
              Register a new academic year for your school.
            </p>
          </header>

          {error && (
            <div className={styles.error} role="alert">
              <strong>Something went wrong</strong>

              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className={styles.success} role="status">
              <strong>Success</strong>

              <span>{success}</span>
            </div>
          )}

          <form onSubmit={createAcademicYear} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="academic-year-name" className={styles.label}>
                Academic Year
              </label>

              <input
                id="academic-year-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="2026 / 2027"
                className={styles.input}
                required
              />
            </div>

            <p className={styles.subtitle}>
              The academic year dates will be generated automatically.
            </p>

            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? "Creating..." : "Register Academic Year"}
            </button>
          </form>
        </section>
        {/* ========================= */}
        {/* EXISTING YEARS */}
        {/* ========================= */}
        <section className={styles.listPage}>
          <header className={styles.listHeader}>
            <p className={styles.eyebrow}>Academic Records</p>

            <h2 className={styles.listTitle}>Academic Years</h2>

            <p className={styles.listSubtitle}>
              Manage the academic years registered for this school.
            </p>
          </header>

          {academicYears.length === 0 ? (
            <div className={styles.empty}>
              <p>No academic years registered.</p>
            </div>
          ) : (
            <div className={styles.yearList}>
              {academicYears.map((year) => (
                <article
                  key={year.id}
                  className={`${styles.yearCard} flex flex-wrap items-start justify-between gap-3 ${
                    year.isActive ? styles.activeCard : ""
                  }`}
                >
                  <div>
                    <h3 className={styles.yearName}>{year.name}</h3>

                    <p className={styles.dates}>
                      {year.startDate} — {year.endDate}
                    </p>
                  </div>

                  <div className={`${styles.yearActions} flex flex-wrap gap-2`}>
                    {year.isActive ? (
                      <span className={styles.active}>Active</span>
                    ) : (
                      <span className={styles.inactive}>Closed</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
