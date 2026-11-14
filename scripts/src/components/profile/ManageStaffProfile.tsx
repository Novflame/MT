"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { z } from "zod";

type UserData = {
  id: string;
  name: string | null;
  email: string | null;
};

type ProfileData = {
  phone?: string | null;
  profileImage?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  nationalId?: string | null;
  address?: string | null;
  city?: string | null;
  qualification?: string | null;
  employmentDate?: string | null;
  specialization?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

type Props = {
  user: UserData;
  profile: ProfileData | null;
};

const profileSchema = z.object({
  phone: z.string().trim().max(30, "Phone number is too long."),

  dateOfBirth: z.string().trim().max(20, "Invalid date."),

  gender: z.string().trim().max(30, "Gender is too long."),

  nationality: z.string().trim().max(80, "Nationality is too long."),

  nationalId: z.string().trim().max(80, "National ID is too long."),

  address: z.string().trim().max(250, "Address is too long."),

  city: z.string().trim().max(80, "City is too long."),

  qualification: z.string().trim().max(200, "Qualification is too long."),

  employmentDate: z.string().trim().max(20, "Invalid employment date."),

  specialization: z.string().trim().max(200, "Specialization is too long."),

  emergencyContactName: z.string().trim().max(120, "Name is too long."),

  emergencyContactPhone: z.string().trim().max(30, "Phone number is too long."),
});

type FormState = {
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  nationalId: string;
  address: string;
  city: string;
  qualification: string;
  employmentDate: string;
  specialization: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

function createForm(profile: ProfileData | null): FormState {
  return {
    phone: profile?.phone ?? "",
    dateOfBirth: profile?.dateOfBirth ?? "",
    gender: profile?.gender ?? "",
    nationality: profile?.nationality ?? "",
    nationalId: profile?.nationalId ?? "",
    address: profile?.address ?? "",
    city: profile?.city ?? "",
    qualification: profile?.qualification ?? "",
    employmentDate: profile?.employmentDate ?? "",
    specialization: profile?.specialization ?? "",
    emergencyContactName: profile?.emergencyContactName ?? "",
    emergencyContactPhone: profile?.emergencyContactPhone ?? "",
  };
}

function getInitials(name: string | null) {
  if (!name?.trim()) {
    return "U";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

async function prepareImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new window.Image();

      image.onload = () => {
        const maxSize = 640;

        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height),
        );

        const width = Math.max(1, Math.round(image.width * scale));

        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Unable to process image."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = () => {
        reject(new Error("Invalid image file."));
      };

      image.src = String(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Unable to read image."));
    };

    reader.readAsDataURL(file);
  });
}

export default function ManageStaffProfile({ user, profile }: Props) {
  const [form, setForm] = useState<FormState>(() => createForm(profile));

  const [image, setImage] = useState<string | null>(
    profile?.profileImage ?? null,
  );

  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  const [imageError, setImageError] = useState("");

  const [saving, setSaving] = useState(false);

  const [success, setSuccess] = useState("");

  const [serverError, setServerError] = useState("");

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => {
      const next = {
        ...current,
      };

      delete next[field];

      return next;
    });

    setSuccess("");
    setServerError("");
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageError("");
    setSuccess("");
    setServerError("");

    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.");

      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image must be smaller than 10 MB.");

      event.target.value = "";
      return;
    }

    try {
      const prepared = await prepareImage(file);

      setImage(prepared);
    } catch {
      setImageError("Unable to process this image.");
    } finally {
      event.target.value = "";
    }
  }

  function removeImage() {
    setImage(null);
    setImageError("");
    setSuccess("");
    setServerError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setSuccess("");
    setServerError("");
    setErrors({});

    const validation = profileSchema.safeParse(form);

    if (!validation.success) {
      const nextErrors: Partial<Record<keyof FormState, string>> = {};

      for (const issue of validation.error.issues) {
        const field = issue.path[0] as keyof FormState;

        if (!nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }

      setErrors(nextErrors);
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/staff/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: form.phone,
          profileImage: image,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          nationality: form.nationality,
          nationalId: form.nationalId,
          address: form.address,
          city: form.city,
          qualification: form.qualification,
          employmentDate: form.employmentDate,
          specialization: form.specialization,
          emergencyContactName: form.emergencyContactName,
          emergencyContactPhone: form.emergencyContactPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to save profile.");
      }

      setSuccess("Your profile has been updated successfully.");
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Failed to save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard/profile"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="size-4 shrink-0" />
            Back to Profile
          </Link>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Manage Profile
          </h1>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Update your personal and contact information.
          </p>
        </div>
      </div>

      {(success || serverError) && (
        <div
          className={[
            "rounded-xl border p-4 text-sm",
            success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
          ].join(" ")}
          role={success ? "status" : "alert"}
        >
          <div className="flex items-start gap-3">
            {success && <CheckCircle2 className="mt-0.5 size-5 shrink-0" />}

            <span className=" wrap-break-words">{success || serverError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
              {image ? (
                <Image
                  src={image}
                  alt={`${user.name ?? "Profile"} profile`}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-3xl font-bold text-slate-500 dark:text-slate-400">
                  {getInitials(user.name)}
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Profile Photo
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Choose a photo from your device. It will be resized
                  automatically.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                  <ImagePlus className="size-4" />
                  Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    className="sr-only"
                  />
                </label>

                {image && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="size-4" />
                    Remove Photo
                  </button>
                )}
              </div>

              {imageError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {imageError}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Account Information
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              These account values are managed separately from your staff
              profile.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <ReadOnlyField
              label="Full Name"
              value={user.name ?? "Not provided"}
            />

            <ReadOnlyField label="Email" value={user.email ?? "Not provided"} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Personal Information
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Phone"
              value={form.phone}
              error={errors.phone}
              onChange={(value) => updateField("phone", value)}
              type="tel"
            />

            <Field
              label="Date of Birth"
              value={form.dateOfBirth}
              error={errors.dateOfBirth}
              onChange={(value) => updateField("dateOfBirth", value)}
              type="date"
            />

            <Field
              label="Gender"
              value={form.gender}
              error={errors.gender}
              onChange={(value) => updateField("gender", value)}
            />

            <Field
              label="Nationality"
              value={form.nationality}
              error={errors.nationality}
              onChange={(value) => updateField("nationality", value)}
            />

            <Field
              label="National ID"
              value={form.nationalId}
              error={errors.nationalId}
              onChange={(value) => updateField("nationalId", value)}
            />

            <Field
              label="City"
              value={form.city}
              error={errors.city}
              onChange={(value) => updateField("city", value)}
            />

            <div className="sm:col-span-2">
              <Field
                label="Address"
                value={form.address}
                error={errors.address}
                onChange={(value) => updateField("address", value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Professional Information
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Update the professional information available to your profile.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Qualification"
              value={form.qualification}
              error={errors.qualification}
              onChange={(value) => updateField("qualification", value)}
            />

            <Field
              label="Employment Date"
              value={form.employmentDate}
              error={errors.employmentDate}
              onChange={(value) => updateField("employmentDate", value)}
              type="date"
            />

            <div className="sm:col-span-2">
              <Field
                label="Specialization"
                value={form.specialization}
                error={errors.specialization}
                onChange={(value) => updateField("specialization", value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Emergency Contact
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Contact Name"
              value={form.emergencyContactName}
              error={errors.emergencyContactName}
              onChange={(value) => updateField("emergencyContactName", value)}
            />

            <Field
              label="Contact Phone"
              value={form.emergencyContactPhone}
              error={errors.emergencyContactPhone}
              onChange={(value) => updateField("emergencyContactPhone", value)}
              type="tel"
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/profile"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  error,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error
            ? `${label.toLowerCase().replace(/\s+/g, "-")}-error`
            : undefined
        }
        className={[
          "min-h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition",
          "text-slate-900 placeholder:text-slate-400",
          "dark:bg-slate-950 dark:text-white",
          error
            ? "border-red-400 focus:border-red-500 dark:border-red-700"
            : "border-slate-300 focus:border-indigo-500 dark:border-slate-700",
        ].join(" ")}
      />

      {error && (
        <p
          id={`${label.toLowerCase().replace(/\s+/g, "-")}-error`}
          className="mt-1.5 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <div className="min-h-11 wrap-break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        {value}
      </div>
    </div>
  );
}
