"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

type SchoolUser = {
    id: string
    name: string
    email: string
    schoolRole: string
    banned: boolean | null
    emailVerified?: boolean
    mustChangePassword?: boolean
    provisioningStatus?: string
}


type StaffProfile = {
    id: number
    userId: string
    phone: string | null
    profileImage: string | null
    dateOfBirth: string | null
    address: string | null
    qualification: string | null
    employmentDate: string | null
    specialization: string | null
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    createdAt: string
    updatedAt: string
}


type Props = {
    user: SchoolUser
    profile: StaffProfile | null
}


export default function ManageUserForm({
    user,
    profile,
}: Props) {

    const router = useRouter()


    // =========================================
    // Account
    // =========================================

    const [role, setRole] =
        useState(user.schoolRole)

    const [banned, setBanned] =
        useState(Boolean(user.banned))


    // =========================================
    // Staff profile
    // =========================================

    const [phone, setPhone] =
        useState(profile?.phone ?? "")

    const [dateOfBirth, setDateOfBirth] =
        useState(profile?.dateOfBirth ?? "")

    const [address, setAddress] =
        useState(profile?.address ?? "")

    const [qualification, setQualification] =
        useState(profile?.qualification ?? "")

    const [employmentDate, setEmploymentDate] =
        useState(profile?.employmentDate ?? "")

    const [specialization, setSpecialization] =
        useState(profile?.specialization ?? "")

    const [emergencyContactName, setEmergencyContactName] =
        useState(
            profile?.emergencyContactName ?? "",
        )

    const [emergencyContactPhone, setEmergencyContactPhone] =
        useState(
            profile?.emergencyContactPhone ?? "",
        )


    // =========================================
    // UI state
    // =========================================

    const [saving, setSaving] =
        useState(false)

    const [deleting, setDeleting] =
        useState(false)

    const [resetting, setResetting] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [repairing, setRepairing] = useState(false)

    const [error, setError] =
        useState("")

    const [success, setSuccess] =
        useState("")


    // =========================================
    // Save
    // =========================================

    async function handleSave() {

        setError("")
        setSuccess("")
        setSaving(true)

        try {

            const response =
                await fetch(
                    `/api/settings/users/${user.id}`,
                    {
                        method: "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({

                            // Central DB
                            schoolRole: role,
                            banned,

                            // School DB
                            phone,
                            dateOfBirth,
                            address,
                            qualification,
                            employmentDate,
                            specialization,
                            emergencyContactName,
                            emergencyContactPhone,
                        }),
                    },
                )


            const result =
                await response.json()


            if (!response.ok) {

                setError(
                    result.error ??
                    "Failed to update user.",
                )

                return
            }


            setSuccess(
                "User updated successfully.",
            )

            router.refresh()

        } catch (error) {

            console.error(
                "Failed to update user:",
                error,
            )

            setError(
                "Something went wrong.",
            )

        } finally {

            setSaving(false)
        }
    }


    // =========================================
    // Delete
    // =========================================

    async function handleDelete() {

        const confirmed =
            window.confirm(
                `Disable ${user.name}? Their school records will be preserved, but they will no longer be able to sign in.` ,
            )


        if (!confirmed) {
            return
        }


        setError("")
        setSuccess("")
        setDeleting(true)


        try {

            const response =
                await fetch(
                    `/api/settings/users/${user.id}`,
                    {
                        method: "DELETE",
                    },
                )


            const result =
                await response.json()


            if (!response.ok) {

                setError(
                    result.error ??
                    "Failed to delete user.",
                )

                return
            }


            router.push(
                "/settings/users",
            )

            router.refresh()

        } catch (error) {

            console.error(
                "Failed to delete user:",
                error,
            )

            setError(
                "Something went wrong.",
            )

        } finally {

            setDeleting(false)
        }
    }


    async function handleRepairAccount() {
        setError("")
        setSuccess("")
        setRepairing(true)
        try {
            const response = await fetch(`/api/settings/users/${user.id}/repair`, { method: "POST" })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error ?? "Account repair failed")
            setSuccess(result.message ?? "Account repaired and reset requested.")
            router.refresh()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Account repair failed")
        } finally {
            setRepairing(false)
        }
    }

    async function handleRequestVerification() {
        setError("")
        setSuccess("")
        setVerifying(true)
        try {
            const response = await fetch(`/api/settings/users/${user.id}/verify-email`, { method: "POST" })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error ?? "Email verification could not be requested")
            setSuccess(result.message ?? "Verification request accepted by the provider.")
            router.refresh()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Email verification could not be requested")
        } finally {
            setVerifying(false)
        }
    }

    async function handleResetPassword() {
        setError("")
        setSuccess("")
        setResetting(true)
        try {
            const response = await fetch(`/api/settings/users/${user.id}`, { method: "POST" })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error ?? "Password reset could not be requested")
            setSuccess(result.message ?? "Password-reset request accepted by the configured provider.")
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Password reset could not be requested")
        } finally {
            setResetting(false)
        }
    }

    const disabled =
        saving || deleting || resetting || verifying || repairing


    return (
        <section className="
            rounded-xl
            border
            border-slate-200
            bg-white
            shadow-sm
        ">

            {/* ================================= */}
            {/* Account */}
            {/* ================================= */}

            <div className="
                border-b
                border-slate-200
                p-4 sm:p-6
            ">

                <h2 className="
                    text-lg
                    font-semibold
                    text-slate-900
                ">
                    Account
                </h2>

            </div>


            <div className="
                space-y-6
                p-4 sm:p-6
            ">

                {/* Name */}

                <div>

                    <p className="
                        text-xs
                        font-medium
                        uppercase
                        tracking-wide
                        text-slate-500
                    ">
                        Name
                    </p>

                    <p className="
                        mt-1
                        text-sm
                        font-medium
                        text-slate-900
                    ">
                        {user.name}
                    </p>

                </div>


                {/* Email */}

                <div>

                    <p className="
                        text-xs
                        font-medium
                        uppercase
                        tracking-wide
                        text-slate-500
                    ">
                        Email
                    </p>

                    <p className="
                        mt-1
                        text-sm
                        text-slate-700
                    ">
                        {user.email}
                    </p>

                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                    <p>Email verification: <strong>{user.emailVerified ? "Verified" : "Not verified"}</strong></p>
                    <p>Initial password change: <strong>{user.mustChangePassword ? "Required" : "Complete"}</strong></p>
                    <p>Provisioning: <strong>{user.provisioningStatus ?? "unknown"}</strong></p>
                </div>

                {/* Role */}

                <div>

                    <label
                        htmlFor="school-role"
                        className="
                            block
                            text-sm
                            font-medium
                            text-slate-700
                        "
                    >
                        School Role
                    </label>

                    <select
                        id="school-role"
                        value={role}
                        onChange={(event) =>
                            setRole(
                                event.target.value,
                            )
                        }
                        disabled={disabled}
                        className="
                            mt-2
                            w-full
                            rounded-lg
                            border
                            border-slate-300
                            bg-white
                            px-3
                            py-2.5
                            text-sm
                            text-slate-900
                            outline-none
                            focus:border-slate-500
                            focus:ring-2
                            focus:ring-slate-200
                            disabled:cursor-not-allowed
                            disabled:bg-slate-50
                        "
                    >

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


                {/* Status */}

                <div>

                    <p className="
                        text-sm
                        font-medium
                        text-slate-700
                    ">
                        Account Status
                    </p>

                    <label className="
                        mt-3
                        flex
                        items-center
                        gap-3
                    ">

                        <input
                            type="checkbox"
                            checked={!banned}
                            onChange={(event) =>
                                setBanned(
                                    !event.target.checked,
                                )
                            }
                            disabled={disabled}
                            className="
                                h-4
                                w-4
                            "
                        />

                        <span className="
                            text-sm
                            text-slate-700
                        ">
                            Account is active
                        </span>

                    </label>

                </div>

            </div>


            {/* ================================= */}
            {/* Staff Information */}
            {/* ================================= */}

            <div className="
                border-y
                border-slate-200
                p-4 sm:p-6
            ">

                <h2 className="
                    text-lg
                    font-semibold
                    text-slate-900
                ">
                    Staff Information
                </h2>

                <p className="
                    mt-1
                    text-sm
                    text-slate-500
                ">
                    Personal and employment information.
                </p>

            </div>


            <div className="
                grid
                gap-6
                p-6
                md:grid-cols-2
            ">

                {/* Phone */}

                <Field
                    label="Phone"
                    value={phone}
                    onChange={setPhone}
                    disabled={disabled}
                    type="tel"
                />


                {/* Date of birth */}

                <Field
                    label="Date of Birth"
                    value={dateOfBirth}
                    onChange={setDateOfBirth}
                    disabled={disabled}
                    type="date"
                />


                {/* Address */}

                <Field
                    label="Address"
                    value={address}
                    onChange={setAddress}
                    disabled={disabled}
                />


                {/* Qualification */}

                <Field
                    label="Qualification"
                    value={qualification}
                    onChange={setQualification}
                    disabled={disabled}
                />


                {/* Employment date */}

                <Field
                    label="Employment Date"
                    value={employmentDate}
                    onChange={setEmploymentDate}
                    disabled={disabled}
                    type="date"
                />


                {/* Specialization */}

                <Field
                    label="Specialization"
                    value={specialization}
                    onChange={setSpecialization}
                    disabled={disabled}
                />


                {/* Emergency name */}

                <Field
                    label="Emergency Contact Name"
                    value={emergencyContactName}
                    onChange={setEmergencyContactName}
                    disabled={disabled}
                />


                {/* Emergency phone */}

                <Field
                    label="Emergency Contact Phone"
                    value={emergencyContactPhone}
                    onChange={setEmergencyContactPhone}
                    disabled={disabled}
                    type="tel"
                />

            </div>


            {/* ================================= */}
            {/* Messages */}
            {/* ================================= */}

            <div className="space-y-3 px-4 sm:px-6">

                {error && (

                    <div className="
                        rounded-lg
                        border
                        border-red-200
                        bg-red-50
                        px-4
                        py-3
                        text-sm
                        text-red-600
                    ">
                        {error}
                    </div>

                )}


                {success && (

                    <div className="
                        rounded-lg
                        border
                        border-green-200
                        bg-green-50
                        px-4
                        py-3
                        text-sm
                        text-green-700
                    ">
                        {success}
                    </div>

                )}

            </div>


            {/* ================================= */}
            {/* Footer */}
            {/* ================================= */}

            <div className="
                mt-6
                flex flex-col-reverse
                items-stretch gap-3 sm:flex-row
                sm:items-center sm:justify-between
                border-t
                border-slate-200
                p-4 sm:p-6
            ">

                {user.provisioningStatus === "failed" && (
                    <button type="button" onClick={handleRepairAccount} disabled={disabled} className="w-full sm:w-auto rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50">
                        {repairing ? "Repairing account…" : "Repair Account & Send Reset Link"}
                    </button>
                )}

                {!user.emailVerified && (
                    <button type="button" onClick={handleRequestVerification} disabled={disabled} className="w-full sm:w-auto rounded-lg border border-blue-200 bg-white px-5 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">
                        {verifying ? "Requesting verification…" : "Send Verification Email"}
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={disabled}
                    className="w-full sm:w-auto rounded-lg border border-blue-200 bg-white px-5 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {resetting ? "Requesting reset…" : "Send Password Reset Link"}
                </button>

                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={disabled}
                    className="
                        w-full sm:w-auto
                        rounded-lg
                        border
                        border-red-200
                        bg-white
                        px-5
                        py-2.5
                        text-sm
                        font-medium
                        text-red-600
                        hover:bg-red-50
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                >
                    {deleting
                        ? "Disabling..."
                        : "Disable User"}
                </button>


                <button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled}
                    className="
                        w-full sm:w-auto
                        rounded-lg
                        bg-slate-900
                        px-5
                        py-2.5
                        text-sm
                        font-medium
                        text-white
                        hover:bg-slate-800
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                >
                    {saving
                        ? "Saving..."
                        : "Save Changes"}
                </button>

            </div>

        </section>
    )
}


// =============================================
// Reusable field
// =============================================

type FieldProps = {
    label: string
    value: string
    onChange: (value: string) => void
    disabled: boolean
    type?: "text" | "date" | "tel"
}


function Field({
    label,
    value,
    onChange,
    disabled,
    type = "text",
}: FieldProps) {

    return (
        <div>

            <label className="
                block
                text-sm
                font-medium
                text-slate-700
            ">
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={(event) =>
                    onChange(
                        event.target.value,
                    )
                }
                disabled={disabled}
                className="
                    mt-2
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-slate-900
                    outline-none
                    focus:border-slate-500
                    focus:ring-2
                    focus:ring-slate-200
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                "
            />

        </div>
    )
}
