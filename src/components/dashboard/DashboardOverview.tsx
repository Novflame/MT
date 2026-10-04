"use client"

import ReactECharts from "echarts-for-react"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
    Users,
    GraduationCap,
    ClipboardCheck,
    TrendingUp,
    FileText,
    ClipboardList,
} from "lucide-react"


// =========================
// Analytics Types
// =========================

type AttendanceSummary = {
    present: number
    absent: number
    late: number
    excused: number
}

type AttendanceTrend = {
    date: string
    present: number
    absent: number
    late: number
    excused: number
}

type AcademicPerformance = {
    subjectId: string
    subjectName: string
    averageScore: number
    gradesCount: number
}

type AnalyticsData = {
    students: number
    enrollments: number
    teachers: number
    exams: number
    tests: number
    grades: number
    attendanceRecords: number
    attendanceRate: number
    averageScore: number

    attendanceSummary: AttendanceSummary
    attendanceTrend: AttendanceTrend[]

    academicPerformance: AcademicPerformance[]
}


// =========================
// Stat Card
// =========================

type StatCardProps = {
    title: string
    value: string | number
    description: string
    icon: React.ElementType
}

function StatCard({
    title,
    value,
    description,
    icon: Icon,
}: StatCardProps) {

    return (
        <div className="flex items-center gap-4 px-5 py-4">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Icon
                    size={19}
                    strokeWidth={1.8}
                    className="text-slate-700"
                />
            </div>

            <div className="min-w-0">

                <p className="text-xs font-medium text-slate-500">
                    {title}
                </p>

                <div className="mt-0.5 flex items-baseline gap-2">

                    <p className="text-2xl font-bold tracking-tight text-slate-900">
                        {value}
                    </p>

                    <p className="truncate text-xs text-slate-400">
                        {description}
                    </p>

                </div>

            </div>

        </div>
    )
}

// =========================
// Dashboard
// =========================

export default function DashboardOverview() {

    const [data, setData] =
        useState<AnalyticsData | null>(null)

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState("")


    // =========================
    // Load Analytics
    // =========================

    useEffect(() => {

        async function loadAnalytics() {

            try {

                setLoading(true)
                setError("")

                const response =
                    await fetch("/api/analytics")

                const result =
                    await response.json()

                if (!response.ok) {

                    throw new Error(
                        result.error ??
                        "Failed to load analytics",
                    )
                }

                setData(result)

            } catch (error) {

                setError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load analytics",
                )

            } finally {

                setLoading(false)

            }
        }

        loadAnalytics()

    }, [])


    // =========================
    // Loading
    // =========================

    if (loading) {

        return (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

                {Array.from({ length: 6 }).map(
                    (_, index) => (

                        <div
                            key={index}
                            className="h-32 animate-pulse rounded-xl bg-slate-200"
                        />

                    ),
                )}

            </div>
        )
    }


    // =========================
    // Error
    // =========================

    if (error) {

        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">

                {error}

            </div>
        )
    }


    if (!data) {
        return null
    }


    // =========================
    // Attendance Trend
    // =========================

    const attendanceTrendOption = {

        tooltip: {
            trigger: "axis",
        },

        legend: {
            bottom: 0,
        },

        grid: {
            left: 45,
            right: 20,
            top: 20,
            bottom: 60,
        },

        xAxis: {
            type: "category",

            data: data.attendanceTrend.map(
                item => item.date,
            ),
        },

        yAxis: {
            type: "value",

            minInterval: 1,
        },

        series: [

            {
                name: "Present",
                type: "line",
                smooth: true,

                data: data.attendanceTrend.map(
                    item => item.present,
                ),
            },

            {
                name: "Absent",
                type: "line",
                smooth: true,

                data: data.attendanceTrend.map(
                    item => item.absent,
                ),
            },

            {
                name: "Late",
                type: "line",
                smooth: true,

                data: data.attendanceTrend.map(
                    item => item.late,
                ),
            },

            {
                name: "Excused",
                type: "line",
                smooth: true,

                data: data.attendanceTrend.map(
                    item => item.excused,
                ),
            },

        ],
    }


    // =========================
    // Attendance Distribution
    // =========================

    const attendanceDistributionOption = {

        tooltip: {
            trigger: "item",
        },

        legend: {
            bottom: 0,
        },

        series: [

            {
                name: "Attendance",

                type: "pie",

                radius: [
                    "45%",
                    "70%",
                ],

                avoidLabelOverlap: true,

                itemStyle: {
                    borderRadius: 6,
                    borderColor: "#fff",
                    borderWidth: 2,
                },

                label: {
                    show: false,
                },

                emphasis: {

                    label: {
                        show: true,
                        fontSize: 16,
                        fontWeight: "bold",
                    },

                },

                data: [

                    {
                        value:
                            data.attendanceSummary.present,

                        name: "Present",
                    },

                    {
                        value:
                            data.attendanceSummary.absent,

                        name: "Absent",
                    },

                    {
                        value:
                            data.attendanceSummary.late,

                        name: "Late",
                    },

                    {
                        value:
                            data.attendanceSummary.excused,

                        name: "Excused",
                    },

                ],
            },

        ],
    }


    // =========================
    // Academic Performance
    // =========================

    const academicPerformanceOption = {

        tooltip: {
            trigger: "axis",

            axisPointer: {
                type: "shadow",
            },
        },

        grid: {
            left: 45,
            right: 20,
            top: 30,
            bottom: 60,
        },

        xAxis: {

            type: "category",

            data:
                data.academicPerformance.map(
                    item => item.subjectName,
                ),

            axisLabel: {

                interval: 0,

                rotate:
                    data.academicPerformance.length > 5
                        ? 30
                        : 0,
            },
        },

        yAxis: {

            type: "value",

            min: 0,
            max: 100,

            axisLabel: {
                formatter: "{value}%",
            },

        },

        series: [

            {
                name: "Average Score",

                type: "bar",

                data:
                    data.academicPerformance.map(
                        item => item.averageScore,
                    ),

                barMaxWidth: 50,

                label: {

                    show: true,

                    position: "top",

                    formatter: "{c}%",
                },

                emphasis: {
                    focus: "series",
                },
            },

        ],
    }


    // =========================
    // UI
    // =========================

    return (

        <section className="space-y-6">


            {/* ========================= */}
            {/* KPI CARDS */}
            {/* ========================= */}

            {/* ========================= */}
            {/* SCHOOL OVERVIEW */}
            {/* ========================= */}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

                <div className="border-b border-slate-100 px-5 py-4">

                    <h2 className="text-base font-semibold text-slate-900">
                        School Overview
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                        Current school statistics
                    </p>

                </div>


                <div className="grid divide-y divide-slate-800 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:divide-x xl:divide-y-0">

                    <StatCard
                        title="Students"
                        value={data.students}
                        description={`${data.enrollments} enrollments`}
                        icon={GraduationCap}
                    />

                    <StatCard
                        title="Teachers"
                        value={data.teachers}
                        description="Assigned"
                        icon={Users}
                    />

                    <StatCard
                        title="Attendance"
                        value={`${data.attendanceRate}%`}
                        description={`${data.attendanceRecords} records`}
                        icon={ClipboardCheck}
                    />

                    <StatCard
                        title="Average Score"
                        value={`${data.averageScore}%`}
                        description={`${data.grades} grades`}
                        icon={TrendingUp}
                    />

                    <StatCard
                        title="Exams"
                        value={data.exams}
                        description="Registered"
                        icon={FileText}
                    />

                    <StatCard
                        title="Tests"
                        value={data.tests}
                        description="Assessments"
                        icon={ClipboardList}
                    />

                </div>

            </div>


            {/* ========================= */}
            {/* ATTENDANCE CHARTS */}
            {/* ========================= */}

            <div className="grid gap-6 lg:grid-cols-2">


                {/* Attendance Trend */}

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div>

                        <h2 className="text-lg font-semibold text-slate-900">
                            Attendance Overview
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Student attendance over time
                        </p>

                    </div>

                    <div className="mt-4 h-72">

                        {data.attendanceTrend.length > 0 ? (

                            <ReactECharts className="bg-gray-50"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                                option={
                                    attendanceTrendOption
                                }
                            />

                        ) : (

                            <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                No attendance data available
                            </div>

                        )}

                    </div>

                </div>


                {/* Attendance Distribution */}

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div>

                        <h2 className="text-lg font-semibold text-slate-900">
                            Attendance Distribution
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Current attendance status
                        </p>

                    </div>

                    <div className="mt-4 h-72">

                        <ReactECharts
                            style={{
                                width: "100%",
                                height: "100%",
                            }}
                            option={
                                attendanceDistributionOption
                            }
                        />

                    </div>

                </div>

            </div>


            {/* ========================= */}
            {/* ACADEMIC PERFORMANCE */}
            {/* ========================= */}

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    <div>

                        <h2 className="text-lg font-semibold text-slate-900">
                            Academic Performance
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Average student performance by subject
                        </p>

                    </div>


                    <div className="flex items-center gap-6">

                        <div>

                            <p className="text-xs text-slate-500">
                                Overall Average
                            </p>

                            <p className="mt-1 text-xl font-bold text-slate-900">
                                {data.averageScore}%
                            </p>

                        </div>


                        <div className="h-9 w-px bg-slate-200" />


                        <div>

                            <p className="text-xs text-slate-500">
                                Grades
                            </p>

                            <p className="mt-1 text-xl font-bold text-slate-900">
                                {data.grades}
                            </p>

                        </div>

                    </div>

                </div>


                <div className="mt-6">

                    {data.academicPerformance.length > 0 ? (

                        <div className="h-80">

                            <ReactECharts
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                                option={academicPerformanceOption}
                            />

                        </div>

                    ) : (

                        <div className="flex h-64 items-center justify-center rounded-lg bg-slate-50">

                            <div className="text-center">

                                <p className="text-sm font-medium text-slate-600">
                                    No academic performance data
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    Grades will appear here once they are recorded.
                                </p>

                            </div>

                        </div>

                    )}

                </div>

            </div>


            {/* ========================= */}
            {/* QUICK ACTIONS */}
            {/* ========================= */}

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Quick Actions
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Frequently used school management actions
                    </p>
                </div>


                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                    <Link
                        href="/students"
                        className="group rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                        <GraduationCap
                            size={20}
                            className="text-slate-700"
                        />

                        <p className="mt-3 text-sm font-semibold text-slate-900">
                            Students
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Manage students
                        </p>
                    </Link>


                    <Link
                        href="/attendance"
                        className="group rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                        <ClipboardCheck
                            size={20}
                            className="text-slate-700"
                        />

                        <p className="mt-3 text-sm font-semibold text-slate-900">
                            Attendance
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Record attendance
                        </p>
                    </Link>


                    <Link
                        href="/grades"
                        className="group rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                        <TrendingUp
                            size={20}
                            className="text-slate-700"
                        />

                        <p className="mt-3 text-sm font-semibold text-slate-900">
                            Grades
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Enter student grades
                        </p>
                    </Link>


                    <Link
                        href="/report-cards"
                        className="group rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                        <FileText
                            size={20}
                            className="text-slate-700"
                        />

                        <p className="mt-3 text-sm font-semibold text-slate-900">
                            Report Cards
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            View and generate reports
                        </p>
                    </Link>

                </div>

            </div>

        </section>
    )
}