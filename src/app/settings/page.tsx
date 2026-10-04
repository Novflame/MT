"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type School = {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  address: string | null;
};

export default function SchoolSettingsPage() {
  const [school, setSchool] = useState<School | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================
  // Load school
  // =========================================

  useEffect(() => {
    async function loadSchool() {
      try {
        const response = await fetch("/api/school");

        const result = await response.json();

        if (!response.ok) {
          setError(result.error ?? "Failed to load school");
          return;
        }

        setSchool(result.school);

        setName(result.school.name);
        setAddress(result.school.address ?? "");
      } catch (error) {
        console.error(error);

        setError("Failed to load school");
      } finally {
        setLoading(false);
      }
    }

    loadSchool();
  }, []);

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("logo", file);

      const response = await fetch("/api/school/logo", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Failed to upload logo");
        return;
      }

      setSchool(result.school);

      setSuccess("School logo updated successfully.");
    } catch (error) {
      console.error(error);

      setError("Failed to upload logo.");
    } finally {
      setSaving(false);

      event.target.value = "";
    }
  }

  // =========================================
  // Save school
  // =========================================

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch("/api/school", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
          address,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Failed to save changes");

        return;
      }

      setSchool(result.school);

      setName(result.school.name);

      setAddress(result.school.address ?? "");

      setSuccess("School information updated successfully.");
    } catch (error) {
      console.error(error);

      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // =========================================
  // Loading
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-slate-500">
            Loading school information...
          </p>
        </div>
      </main>
    );
  }

  // =========================================
  // Error
  // =========================================

  if (error && !school) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!school) {
    return null;
  }

  // =========================================
  // Render
  // =========================================

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">School Profile</h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your schools identity and information.
          </p>
        </div>

        {/* Form */}

        <form
          onSubmit={handleSave}
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Section header */}

          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              School Identity
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              This information will appear throughout the school management
              system.
            </p>
          </div>

          <div className="space-y-6 p-6">
            {/* Logo */}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                School Logo
              </label>

              <div className="mt-3 flex items-center gap-4">
                <div
                  className="
                                        flex h-20 w-20
                                        items-center justify-center
                                        overflow-hidden
                                        rounded-xl
                                        border border-slate-200
                                        bg-slate-50
                                    "
                >
                  {school.logo ? (
                    <Image
                      src={school.logo}
                      alt={`${school.name} logo`}
                      width={80}
                      height={80}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-slate-400">
                      Logo
                    </span>
                  )}
                </div>

                <div>
                  <label
                    className="
        inline-flex
        cursor-pointer
        rounded-lg
        border border-slate-300
        bg-white
        px-4 py-2
        text-sm font-medium
        text-slate-700
        hover:bg-slate-50
    "
                  >
                    Upload Logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoUpload}
                      disabled={saving}
                      className="hidden"
                    />
                  </label>

                  <p className="mt-2 text-xs text-slate-500">
                    PNG, JPG or WebP. Maximum 2 MB.
                  </p>
                </div>
              </div>
            </div>

            {/* School Name */}

            <div>
              <label
                htmlFor="school-name"
                className="block text-sm font-medium text-slate-700"
              >
                School Name
              </label>

              <input
                id="school-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border border-slate-300
                                    bg-white
                                    px-3 py-2.5
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    focus:border-slate-500
                                    focus:ring-2
                                    focus:ring-slate-200
                                "
              />
            </div>

            {/* Address */}

            <div>
              <label
                htmlFor="school-address"
                className="block text-sm font-medium text-slate-700"
              >
                School Address
              </label>

              <input
                id="school-address"
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="School address"
                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border border-slate-300
                                    bg-white
                                    px-3 py-2.5
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    focus:border-slate-500
                                    focus:ring-2
                                    focus:ring-slate-200
                                "
              />
            </div>

            {/* Slug */}

            <div>
              <label
                htmlFor="school-slug"
                className="block text-sm font-medium text-slate-700"
              >
                School Slug
              </label>

              <input
                id="school-slug"
                type="text"
                value={school.slug}
                readOnly
                className="
                                    mt-2
                                    w-full
                                    rounded-lg
                                    border border-slate-300
                                    bg-slate-50
                                    px-3 py-2.5
                                    text-sm
                                    text-slate-500
                                "
              />

              <p className="mt-2 text-xs text-slate-500">
                The slug identifies your school in the system.
              </p>
            </div>

            {/* Error */}

            {error && (
              <div
                className="
                                    rounded-lg
                                    border border-red-200
                                    bg-red-50
                                    px-4 py-3
                                    text-sm text-red-600
                                "
              >
                {error}
              </div>
            )}

            {/* Success */}

            {success && (
              <div
                className="
                                    rounded-lg
                                    border border-green-200
                                    bg-green-50
                                    px-4 py-3
                                    text-sm text-green-700
                                "
              >
                {success}
              </div>
            )}
          </div>

          {/* Footer */}

          <div className="flex justify-end border-t border-slate-200 p-6">
            <button
              type="submit"
              disabled={saving}
              className="
                                rounded-lg
                                bg-slate-900
                                px-5 py-2.5
                                text-sm font-medium
                                text-white
                                transition
                                hover:bg-slate-800
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
