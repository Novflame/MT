// "use client"

// import ReactECharts from "echarts-for-react"
// import { useEffect, useState } from "react"
// import Link from "next/link"
// import {
//     Users,
//     GraduationCap,
//     ClipboardCheck,
//     TrendingUp,
//     FileText,
//     ClipboardList,
// } from "lucide-react"


// // =========================
// // Analytics Types
// // =========================

// type AttendanceSummary = {
//     present: number
//     absent: number
//     late: number
//     excused: number
// }

// type AttendanceTrend = {
//     date: string
//     present: number
//     absent: number
//     late: number
//     excused: number
// }

// type AcademicPerformance = {
//     subjectId: string
//     subjectName: string
//     averageScore: number
//     gradesCount: number
// }

// type AnalyticsData = {
//     students: number
//     enrollments: number
//     teachers: number
//     exams: number
//     tests: number
//     grades: number
//     attendanceRecords: number
//     attendanceRate: number
//     averageScore: number

//     attendanceSummary: AttendanceSummary
//     attendanceTrend: AttendanceTrend[]

//     academicPerformance: AcademicPerformance[]
// }


// // =========================
// // Stat Card
// // =========================

// type StatCardProps = {
//     title: string
//     value: string | number
//     description: string
//     icon: React.ElementType
// }

// function StatCard({
//     title,
//     value,
//     description,
//     icon: Icon,
// }: StatCardProps) {

//     return (
//         <div className="flex min-w-0 items-start gap-3 bg-white p-3 sm:items-center sm:gap-4 sm:p-4">

//             <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 sm:h-10 sm:w-10">
//                 <Icon
//                     size={19}
//                     strokeWidth={1.8}
//                     className="text-slate-700"
//                 />
//             </div>

//             <div className="min-w-0">

//                 <p className="text-xs font-medium text-slate-500">
//                     {title}
//                 </p>

//                 <div className="mt-0.5 flex items-baseline gap-2">

//                     <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
//                         {value}
//                     </p>

//                     <p className="text-xs leading-5 text-slate-500">
//                         {description}
//                     </p>

//                 </div>

//             </div>

//         </div>
//     )
// }

// // =========================
// // Dashboard
// // =========================

// export default function DashboardOverview() {

//     const [data, setData] =
//         useState<AnalyticsData | null>(null)

//     const [loading, setLoading] =
//         useState(true)

//     const [error, setError] =
//         useState("")


//     // =========================
//     // Load Analytics
//     // =========================

//     useEffect(() => {

//         async function loadAnalytics() {

//             try {

//                 setLoading(true)
//                 setError("")

//                 const response =
//                     await fetch("/api/analytics")

//                 const result =
//                     await response.json()

//                 if (!response.ok) {

//                     throw new Error(
//                         result.error ??
//                         "Failed to load analytics",
//                     )
//                 }

//                 setData(result)

//             } catch (error) {

//                 setError(
//                     error instanceof Error
//                         ? error.message
//                         : "Failed to load analytics",
//                 )

//             } finally {

//                 setLoading(false)

//             }
//         }

//         loadAnalytics()

//     }, [])


//     // =========================
//     // Loading
//     // =========================

//     if (loading) {

//         return (
//             <section role="status" aria-live="polite">
//                 <p className="mb-3 text-sm font-medium text-slate-700">
//                     Loading analytics and charts...
//                 </p>
//                 <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
//                     {Array.from({ length: 6 }).map((_, index) => (
//                         <div
//                             key={index}
//                             className="h-32 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none"
//                             aria-hidden="true"
//                         />
//                     ))}
//                 </div>
//             </section>
//         )
//     }


//     // =========================
//     // Error
//     // =========================

//     if (error) {

//         return (
//             <div
//                 className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
//                 role="alert"
//             >

//                 {error}

//             </div>
//         )
//     }


//     if (!data) {
//         return null
//     }


//     // =========================
//     // Attendance Trend
//     // =========================

//     const attendanceTrendOption = {

//         animation: false,
//         aria: {
//             enabled: true,
//             description: "Daily attendance record counts, separated into present, absent, late, and excused statuses.",
//             decal: {
//                 show: true,
//             },
//         },

//         tooltip: {
//             trigger: "axis",
//         },

//         legend: {
//             bottom: 0,
//         },

//         grid: {
//             left: 45,
//             right: 20,
//             top: 20,
//             bottom: 60,
//         },

//         xAxis: {
//             type: "category",

//             data: data.attendanceTrend.map(
//                 item => item.date,
//             ),
//         },

//         yAxis: {
//             type: "value",

//             minInterval: 1,
//         },

//         series: [

//             {
//                 name: "Present",
//                 type: "line",
//                 smooth: true,

//                 data: data.attendanceTrend.map(
//                     item => item.present,
//                 ),
//             },

//             {
//                 name: "Absent",
//                 type: "line",
//                 smooth: true,

//                 data: data.attendanceTrend.map(
//                     item => item.absent,
//                 ),
//             },

//             {
//                 name: "Late",
//                 type: "line",
//                 smooth: true,

//                 data: data.attendanceTrend.map(
//                     item => item.late,
//                 ),
//             },

//             {
//                 name: "Excused",
//                 type: "line",
//                 smooth: true,

//                 data: data.attendanceTrend.map(
//                     item => item.excused,
//                 ),
//             },

//         ],
//     }


//     // =========================
//     // Attendance Distribution
//     // =========================

//     const attendanceDistributionOption = {

//         animation: false,
//         aria: {
//             enabled: true,
//             description: "Total attendance records by present, absent, late, and excused status.",
//             decal: {
//                 show: true,
//             },
//         },

//         tooltip: {
//             trigger: "item",
//         },

//         legend: {
//             bottom: 0,
//         },

//         series: [

//             {
//                 name: "Attendance",

//                 type: "pie",

//                 radius: [
//                     "45%",
//                     "70%",
//                 ],

//                 avoidLabelOverlap: true,

//                 itemStyle: {
//                     borderRadius: 6,
//                     borderColor: "#fff",
//                     borderWidth: 2,
//                 },

//                 label: {
//                     show: false,
//                 },

//                 emphasis: {

//                     label: {
//                         show: true,
//                         fontSize: 16,
//                         fontWeight: "bold",
//                     },

//                 },

//                 data: [

//                     {
//                         value:
//                             data.attendanceSummary.present,

//                         name: "Present",
//                     },

//                     {
//                         value:
//                             data.attendanceSummary.absent,

//                         name: "Absent",
//                     },

//                     {
//                         value:
//                             data.attendanceSummary.late,

//                         name: "Late",
//                     },

//                     {
//                         value:
//                             data.attendanceSummary.excused,

//                         name: "Excused",
//                     },

//                 ],
//             },

//         ],
//     }


//     // =========================
//     // Academic Performance
//     // =========================

//     const academicPerformanceOption = {

//         animation: false,
//         aria: {
//             enabled: true,
//             description: "Average student score as a percentage for each subject.",
//             decal: {
//                 show: true,
//             },
//         },

//         tooltip: {
//             trigger: "axis",

//             axisPointer: {
//                 type: "shadow",
//             },
//         },

//         grid: {
//             left: 45,
//             right: 20,
//             top: 30,
//             bottom: 60,
//         },

//         xAxis: {

//             type: "category",

//             data:
//                 data.academicPerformance.map(
//                     item => item.subjectName,
//                 ),

//             axisLabel: {

//                 interval: 0,

//                 rotate:
//                     data.academicPerformance.length > 5
//                         ? 30
//                         : 0,
//             },
//         },

//         yAxis: {

//             type: "value",

//             min: 0,
//             max: 100,

//             axisLabel: {
//                 formatter: "{value}%",
//             },

//         },

//         series: [

//             {
//                 name: "Average Score",

//                 type: "bar",

//                 data:
//                     data.academicPerformance.map(
//                         item => item.averageScore,
//                     ),

//                 barMaxWidth: 50,

//                 label: {

//                     show: true,

//                     position: "top",

//                     formatter: "{c}%",
//                 },

//                 emphasis: {
//                     focus: "series",
//                 },
//             },

//         ],
//     }

//     const attendanceTotal =
//         data.attendanceSummary.present +
//         data.attendanceSummary.absent +
//         data.attendanceSummary.late +
//         data.attendanceSummary.excused

//     const attendanceStatuses = [
//         { name: "Present", value: data.attendanceSummary.present },
//         { name: "Absent", value: data.attendanceSummary.absent },
//         { name: "Late", value: data.attendanceSummary.late },
//         { name: "Excused", value: data.attendanceSummary.excused },
//     ]


//     // =========================
//     // UI
//     // =========================

//     return (

//         <section className="min-w-0 space-y-5 sm:space-y-6">


//             {/* ========================= */}
//             {/* KPI CARDS */}
//             {/* ========================= */}

//             {/* ========================= */}
//             {/* SCHOOL OVERVIEW */}
//             {/* ========================= */}

//             <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">

//                 <div className="border-b border-slate-100 px-4 py-4 sm:px-5">

//                     <h2 className="text-base font-semibold text-slate-900">
//                         School Overview
//                     </h2>

//                     <p className="mt-1 text-xs text-slate-500">
//                         Current school statistics
//                     </p>

//                 </div>


//                 <div className="grid grid-cols-2 gap-px bg-slate-200 lg:grid-cols-3 2xl:grid-cols-6">

//                     <StatCard
//                         title="Students"
//                         value={data.students}
//                         description={`${data.enrollments} enrollments`}
//                         icon={GraduationCap}
//                     />

//                     <StatCard
//                         title="Teachers"
//                         value={data.teachers}
//                         description="Assigned"
//                         icon={Users}
//                     />

//                     <StatCard
//                         title="Attendance"
//                         value={`${data.attendanceRate}%`}
//                         description={`${data.attendanceRecords} records`}
//                         icon={ClipboardCheck}
//                     />

//                     <StatCard
//                         title="Average Score"
//                         value={`${data.averageScore}%`}
//                         description={`${data.grades} grades`}
//                         icon={TrendingUp}
//                     />

//                     <StatCard
//                         title="Exams"
//                         value={data.exams}
//                         description="Registered"
//                         icon={FileText}
//                     />

//                     <StatCard
//                         title="Tests"
//                         value={data.tests}
//                         description="Assessments"
//                         icon={ClipboardList}
//                     />

//                 </div>

//             </div>


//             {/* ========================= */}
//             {/* ATTENDANCE CHARTS */}
//             {/* ========================= */}

//             <div className="grid min-w-0 gap-4 xl:grid-cols-2 sm:gap-6">


//                 {/* Attendance Trend */}

//                 <section
//                     className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
//                     aria-labelledby="attendance-trend-title"
//                 >

//                     <div>

//                         <h2 id="attendance-trend-title" className="text-lg font-semibold text-slate-900">
//                             Attendance Trend
//                         </h2>

//                         <p id="attendance-trend-description" className="mt-1 text-sm text-slate-600">
//                             Daily attendance record counts by status. Compare present, absent, late, and excused records across dates.
//                         </p>

//                     </div>

//                     {data.attendanceTrend.length > 0 ? (
//                         <div
//                             className="mt-4 h-64 min-w-0 sm:h-72"
//                             role="img"
//                             aria-labelledby="attendance-trend-title"
//                             aria-describedby="attendance-trend-description"
//                         >
//                             <ReactECharts
//                                 style={{ width: "100%", height: "100%" }}
//                                 option={attendanceTrendOption}
//                             />
//                         </div>
//                     ) : (
//                         <div className="mt-4 flex h-64 items-center justify-center text-sm text-slate-600 sm:h-72" role="status">
//                             No attendance data available
//                         </div>
//                     )}

//                     {data.attendanceTrend.length > 0 && (
//                         <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200" tabIndex={0} aria-label="Attendance trend data table. Scroll horizontally to read all columns.">
//                             <table className="w-full min-w-[34rem] text-left text-sm">
//                                 <caption className="sr-only">Daily attendance record counts by status</caption>
//                                 <thead className="bg-slate-50 text-slate-700">
//                                     <tr>
//                                         <th scope="col" className="px-3 py-2 font-semibold">Date</th>
//                                         <th scope="col" className="px-3 py-2 font-semibold">Present (records)</th>
//                                         <th scope="col" className="px-3 py-2 font-semibold">Absent (records)</th>
//                                         <th scope="col" className="px-3 py-2 font-semibold">Late (records)</th>
//                                         <th scope="col" className="px-3 py-2 font-semibold">Excused (records)</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-slate-200 text-slate-900">
//                                     {data.attendanceTrend.map(item => (
//                                         <tr key={item.date}>
//                                             <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium">{item.date}</th>
//                                             <td className="px-3 py-2">{item.present}</td>
//                                             <td className="px-3 py-2">{item.absent}</td>
//                                             <td className="px-3 py-2">{item.late}</td>
//                                             <td className="px-3 py-2">{item.excused}</td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     )}

//                 </section>


//                 {/* Attendance Distribution */}

//                 <section
//                     className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
//                     aria-labelledby="attendance-distribution-title"
//                 >

//                     <div>

//                         <h2 id="attendance-distribution-title" className="text-lg font-semibold text-slate-900">
//                             Attendance Distribution
//                         </h2>

//                         <p id="attendance-distribution-description" className="mt-1 text-sm text-slate-600">
//                             Total attendance records by status. The table gives the exact count and share of all recorded statuses.
//                         </p>

//                     </div>

//                     {attendanceTotal > 0 ? (
//                         <div
//                             className="mt-4 h-64 min-w-0 sm:h-72"
//                             role="img"
//                             aria-labelledby="attendance-distribution-title"
//                             aria-describedby="attendance-distribution-description"
//                         >
//                             <ReactECharts
//                                 style={{ width: "100%", height: "100%" }}
//                                 option={attendanceDistributionOption}
//                             />
//                         </div>
//                     ) : (
//                         <div className="mt-4 flex h-64 items-center justify-center text-sm text-slate-600 sm:h-72" role="status">
//                             No attendance records are available to chart; all status counts are zero.
//                         </div>
//                     )}

//                     <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
//                         <table className="w-full text-left text-sm">
//                             <caption className="sr-only">Attendance record count and share by status</caption>
//                             <thead className="bg-slate-50 text-slate-700">
//                                 <tr>
//                                     <th scope="col" className="px-3 py-2 font-semibold">Status</th>
//                                     <th scope="col" className="px-3 py-2 font-semibold">Records</th>
//                                     <th scope="col" className="px-3 py-2 font-semibold">Share</th>
//                                 </tr>
//                             </thead>
//                             <tbody className="divide-y divide-slate-200 text-slate-900">
//                                 {attendanceStatuses.map(status => (
//                                     <tr key={status.name}>
//                                         <th scope="row" className="px-3 py-2 font-medium">{status.name}</th>
//                                         <td className="px-3 py-2">{status.value}</td>
//                                         <td className="px-3 py-2">
//                                             {attendanceTotal === 0
//                                                 ? "0%"
//                                                 : `${((status.value / attendanceTotal) * 100).toFixed(1)}%`}
//                                         </td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>

//                 </section>

//             </div>


//             {/* ========================= */}
//             {/* ACADEMIC PERFORMANCE */}
//             {/* ========================= */}

//             <section
//             className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
//             aria-labelledby="academic-performance-title"
//             >

//                 <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

//                     <div>

//                         <h2 id="academic-performance-title" className="text-lg font-semibold text-slate-900">
//                             Academic Performance
//                         </h2>

//                         <p id="academic-performance-description" className="mt-1 text-sm text-slate-600">
//                             Average grade score as a percentage for each subject. Compare subject averages; the table also shows the number of grades behind each average.
//                         </p>

//                     </div>


//                     <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:gap-6">

//                         <div>

//                             <p className="text-xs text-slate-500">
//                                 Overall Average
//                             </p>

//                             <p className="mt-1 text-xl font-bold text-slate-900">
//                                 {data.averageScore}%
//                             </p>

//                         </div>


//                         <div className="hidden h-9 w-px bg-slate-200 sm:block" />


//                         <div>

//                             <p className="text-xs text-slate-500">
//                                 Grades
//                             </p>

//                             <p className="mt-1 text-xl font-bold text-slate-900">
//                                 {data.grades}
//                             </p>

//                         </div>

//                     </div>

//                 </div>


//                 <div className="mt-6 min-w-0">
//                     {data.academicPerformance.length > 0 ? (
//                         <>
//                             <div
//                                 className="h-72 min-w-0 overflow-hidden sm:h-80"
//                                 role="img"
//                                 aria-labelledby="academic-performance-title"
//                                 aria-describedby="academic-performance-description"
//                             >
//                                 <ReactECharts
//                                     style={{ width: "100%", height: "100%" }}
//                                     option={academicPerformanceOption}
//                                 />
//                             </div>

//                             <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200" tabIndex={0} aria-label="Academic performance data table. Scroll horizontally to read all columns.">
//                                 <table className="w-full min-w-[24rem] text-left text-sm">
//                                     <caption className="sr-only">Average grade score and number of grades by subject</caption>
//                                     <thead className="bg-slate-50 text-slate-700">
//                                         <tr>
//                                             <th scope="col" className="px-3 py-2 font-semibold">Subject</th>
//                                             <th scope="col" className="px-3 py-2 font-semibold">Average score</th>
//                                             <th scope="col" className="px-3 py-2 font-semibold">Grades</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody className="divide-y divide-slate-200 text-slate-900">
//                                         {data.academicPerformance.map(item => (
//                                             <tr key={item.subjectId}>
//                                                 <th scope="row" className="px-3 py-2 font-medium">{item.subjectName}</th>
//                                                 <td className="px-3 py-2">{item.averageScore}%</td>
//                                                 <td className="px-3 py-2">{item.gradesCount}</td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                 </table>
//                             </div>
//                         </>
//                     ) : (
//                         <div className="flex h-56 items-center justify-center rounded-lg bg-slate-50 sm:h-64" role="status">
//                             <div className="text-center">
//                                 <p className="text-sm font-medium text-slate-700">
//                                     No academic performance data
//                                 </p>
//                                 <p className="mt-1 text-sm text-slate-600">
//                                     Grades will appear here once they are recorded.
//                                 </p>
//                             </div>
//                         </div>
//                     )}
//                 </div>

//             </section>


//             {/* ========================= */}
//             {/* QUICK ACTIONS */}
//             {/* ========================= */}

//             <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

//                 <div>
//                     <h2 className="text-lg font-semibold text-slate-900">
//                         Quick Actions
//                     </h2>

//                     <p className="mt-1 text-sm text-slate-500">
//                         Frequently used school management actions
//                     </p>
//                 </div>


//                 <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">

//                     <Link
//                         href="/students"
//                         className="group rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
//                     >
//                         <GraduationCap
//                             size={20}
//                             className="text-slate-700"
//                         />

//                         <p className="mt-3 text-sm font-semibold text-slate-900">
//                             Students
//                         </p>

//                         <p className="mt-1 text-xs text-slate-500">
//                             Manage students
//                         </p>
//                     </Link>


//                     <Link
//                         href="/attendance"
//                         className="group rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
//                     >
//                         <ClipboardCheck
//                             size={20}
//                             className="text-slate-700"
//                         />

//                         <p className="mt-3 text-sm font-semibold text-slate-900">
//                             Attendance
//                         </p>

//                         <p className="mt-1 text-xs text-slate-500">
//                             Record attendance
//                         </p>
//                     </Link>


//                     <Link
//                         href="/grades"
//                         className="group rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
//                     >
//                         <TrendingUp
//                             size={20}
//                             className="text-slate-700"
//                         />

//                         <p className="mt-3 text-sm font-semibold text-slate-900">
//                             Grades
//                         </p>

//                         <p className="mt-1 text-xs text-slate-500">
//                             Enter student grades
//                         </p>
//                     </Link>


//                     <Link
//                         href="/report-cards"
//                         className="group rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
//                     >
//                         <FileText
//                             size={20}
//                             className="text-slate-700"
//                         />

//                         <p className="mt-3 text-sm font-semibold text-slate-900">
//                             Report Cards
//                         </p>

//                         <p className="mt-1 text-xs text-slate-500">
//                             View and generate reports
//                         </p>
//                     </Link>

//                 </div>

//             </div>

//         </section>
//     )
// }





"use client"

import ReactECharts from "echarts-for-react"
import Link from "next/link"
import {
    ClipboardCheck,
    ClipboardList,
    FileText,
    GraduationCap,
    TrendingUp,
    Users,
} from "lucide-react"
import {
    useEffect,
    useState,
} from "react"

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
// Reusable UI Styles
// =========================

function getCardStyles() {
    return `
        min-w-0
        rounded-xl
        border border-slate-200
        bg-white
        shadow-sm
        dark:border-slate-800
        dark:bg-slate-900
    `
}

function getSectionTitleStyles() {
    return `
        text-base
        font-semibold
        text-slate-900
        dark:text-slate-100
    `
}

function getSectionDescriptionStyles() {
    return `
        mt-1
        text-sm
        text-slate-500
        dark:text-slate-400
    `
}

function getTableWrapperStyles() {
    return `
        overflow-x-auto
        rounded-lg
        border border-slate-200
        dark:border-slate-800
    `
}

function getTableStyles() {
    return `
        w-full
        text-left
        text-sm
        text-slate-700
        dark:text-slate-300
    `
}

function getTableHeadStyles() {
    return `
        bg-slate-50
        text-slate-700
        dark:bg-slate-800
        dark:text-slate-200
    `
}

function getTableBodyStyles() {
    return `
        divide-y
        divide-slate-200
        text-slate-900
        dark:divide-slate-800
        dark:text-slate-100
    `
}

function getTableRowStyles() {
    return `
        transition-colors
        hover:bg-slate-50
        dark:hover:bg-slate-800/70
    `
}


// =========================
// Dashboard Card
// =========================

type DashboardCardProps = {
    children: React.ReactNode
    className?: string
}

function DashboardCard({
    children,
    className = "",
}: DashboardCardProps) {
    return (
        <div
            className={`${getCardStyles()} ${className}`}
        >
            {children}
        </div>
    )
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
        <div
            className="
                flex min-w-0
                items-start
                gap-3
                bg-white
                p-4
                sm:items-center
                sm:gap-4
                sm:p-4
                dark:bg-slate-900
            "
        >
            <div
                className="
                    flex h-10 w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-slate-100
                    text-slate-700
                    dark:bg-slate-800
                    dark:text-slate-200
                "
            >
                <Icon
                    size={19}
                    strokeWidth={1.8}
                />
            </div>

            <div className="min-w-0 flex-1">
                <p
                    className="
                        truncate
                        text-xs
                        font-medium
                        text-slate-500
                        dark:text-slate-400
                    "
                >
                    {title}
                </p>

                <div
                    className="
                        mt-1
                        flex min-w-0
                        flex-wrap
                        items-baseline
                        gap-x-2
                        gap-y-0.5
                    "
                >
                    <p
                        className="
                            text-xl
                            font-bold
                            tracking-tight
                            text-slate-900
                            dark:text-slate-100
                            sm:text-2xl
                        "
                    >
                        {value}
                    </p>

                    <p
                        className="
                            text-xs
                            leading-5
                            text-slate-500
                            dark:text-slate-400
                        "
                    >
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

    /*
     * Keep the dashboard charts synchronized with
     * the global .dark class controlled by TopNavbar.
     */
    const [isDark, setIsDark] =
        useState(false)

    useEffect(() => {
        const updateTheme = () => {
            setIsDark(
                document.documentElement.classList.contains(
                    "dark",
                ),
            )
        }

        updateTheme()

        const observer =
            new MutationObserver(updateTheme)

        observer.observe(
            document.documentElement,
            {
                attributes: true,
                attributeFilter: ["class"],
            },
        )

        return () => {
            observer.disconnect()
        }
    }, [])


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
    // Chart Theme
    // =========================

    const chartTextColor = isDark
        ? "#cbd5e1"
        : "#475569"

    const chartSecondaryTextColor = isDark
        ? "#94a3b8"
        : "#64748b"

    const chartBorderColor = isDark
        ? "#334155"
        : "#e2e8f0"

    const chartBackgroundColor = isDark
        ? "#0f172a"
        : "#ffffff"

    const chartSplitLineColor = isDark
        ? "#1e293b"
        : "#e2e8f0"


    // =========================
    // Loading
    // =========================

    if (loading) {
        return (
            <section
                role="status"
                aria-live="polite"
                className="min-w-0"
            >
                <p
                    className="
                        mb-3
                        text-sm
                        font-medium
                        text-slate-700
                        dark:text-slate-300
                    "
                >
                    Loading analytics and charts...
                </p>

                <div
                    className="
                        grid
                        grid-cols-1
                        gap-4
                        sm:grid-cols-2
                        xl:grid-cols-3
                    "
                >
                    {Array.from({
                        length: 6,
                    }).map((_, index) => (
                        <div
                            key={index}
                            className="
                                h-28
                                animate-pulse
                                rounded-xl
                                bg-slate-200
                                motion-reduce:animate-none
                                dark:bg-slate-800
                                sm:h-32
                            "
                            aria-hidden="true"
                        />
                    ))}
                </div>
            </section>
        )
    }


    // =========================
    // Error
    // =========================

    if (error) {
        return (
            <div
                className="
                    rounded-xl
                    border border-red-200
                    bg-red-50
                    p-4
                    text-sm
                    text-red-700
                    dark:border-red-900/70
                    dark:bg-red-950/40
                    dark:text-red-300
                    sm:p-5
                "
                role="alert"
            >
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
        animation: false,

        backgroundColor:
            chartBackgroundColor,

        aria: {
            enabled: true,
            description:
                "Daily attendance record counts, separated into present, absent, late, and excused statuses.",
            decal: {
                show: true,
            },
        },

        tooltip: {
            trigger: "axis",

            backgroundColor: isDark
                ? "#0f172a"
                : "#ffffff",

            borderColor:
                chartBorderColor,

            textStyle: {
                color:
                    isDark
                        ? "#f8fafc"
                        : "#0f172a",
            },
        },

        legend: {
            bottom: 0,

            textStyle: {
                color: chartTextColor,
            },
        },

        grid: {
            left: 45,
            right: 20,
            top: 20,
            bottom: 60,
        },

        xAxis: {
            type: "category",

            data:
                data.attendanceTrend.map(
                    item => item.date,
                ),

            axisLabel: {
                color:
                    chartSecondaryTextColor,
            },

            axisLine: {
                lineStyle: {
                    color:
                        chartBorderColor,
                },
            },
        },

        yAxis: {
            type: "value",

            minInterval: 1,

            axisLabel: {
                color:
                    chartSecondaryTextColor,
            },

            axisLine: {
                lineStyle: {
                    color:
                        chartBorderColor,
                },
            },

            splitLine: {
                lineStyle: {
                    color:
                        chartSplitLineColor,
                },
            },
        },

        series: [
            {
                name: "Present",
                type: "line",
                smooth: true,

                data:
                    data.attendanceTrend.map(
                        item => item.present,
                    ),

                itemStyle: {
                    color: "#16a34a",
                },

                lineStyle: {
                    color: "#16a34a",
                },
            },

            {
                name: "Absent",
                type: "line",
                smooth: true,

                data:
                    data.attendanceTrend.map(
                        item => item.absent,
                    ),

                itemStyle: {
                    color: "#dc2626",
                },

                lineStyle: {
                    color: "#dc2626",
                },
            },

            {
                name: "Late",
                type: "line",
                smooth: true,

                data:
                    data.attendanceTrend.map(
                        item => item.late,
                    ),

                itemStyle: {
                    color: "#d97706",
                },

                lineStyle: {
                    color: "#d97706",
                },
            },

            {
                name: "Excused",
                type: "line",
                smooth: true,

                data:
                    data.attendanceTrend.map(
                        item => item.excused,
                    ),

                itemStyle: {
                    color: "#4f46e5",
                },

                lineStyle: {
                    color: "#4f46e5",
                },
            },
        ],
    }


    // =========================
    // Attendance Distribution
    // =========================

    const attendanceDistributionOption = {
        animation: false,

        backgroundColor:
            chartBackgroundColor,

        aria: {
            enabled: true,
            description:
                "Total attendance records by present, absent, late, and excused status.",
            decal: {
                show: true,
            },
        },

        tooltip: {
            trigger: "item",

            backgroundColor: isDark
                ? "#0f172a"
                : "#ffffff",

            borderColor:
                chartBorderColor,

            textStyle: {
                color:
                    isDark
                        ? "#f8fafc"
                        : "#0f172a",
            },
        },

        legend: {
            bottom: 0,

            textStyle: {
                color: chartTextColor,
            },
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
                    borderColor:
                        isDark
                            ? "#0f172a"
                            : "#ffffff",
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

                        color:
                            isDark
                                ? "#f8fafc"
                                : "#0f172a",
                    },
                },

                data: [
                    {
                        value:
                            data
                                .attendanceSummary
                                .present,

                        name: "Present",

                        itemStyle: {
                            color: "#16a34a",
                        },
                    },

                    {
                        value:
                            data
                                .attendanceSummary
                                .absent,

                        name: "Absent",

                        itemStyle: {
                            color: "#dc2626",
                        },
                    },

                    {
                        value:
                            data
                                .attendanceSummary
                                .late,

                        name: "Late",

                        itemStyle: {
                            color: "#d97706",
                        },
                    },

                    {
                        value:
                            data
                                .attendanceSummary
                                .excused,

                        name: "Excused",

                        itemStyle: {
                            color: "#4f46e5",
                        },
                    },
                ],
            },
        ],
    }


    // =========================
    // Academic Performance
    // =========================

    const academicPerformanceOption = {
        animation: false,

        backgroundColor:
            chartBackgroundColor,

        aria: {
            enabled: true,
            description:
                "Average student score as a percentage for each subject.",
            decal: {
                show: true,
            },
        },

        tooltip: {
            trigger: "axis",

            axisPointer: {
                type: "shadow",
            },

            backgroundColor: isDark
                ? "#0f172a"
                : "#ffffff",

            borderColor:
                chartBorderColor,

            textStyle: {
                color:
                    isDark
                        ? "#f8fafc"
                        : "#0f172a",
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
                    data.academicPerformance
                        .length > 5
                        ? 30
                        : 0,

                color:
                    chartSecondaryTextColor,
            },

            axisLine: {
                lineStyle: {
                    color:
                        chartBorderColor,
                },
            },
        },

        yAxis: {
            type: "value",

            min: 0,
            max: 100,

            axisLabel: {
                formatter: "{value}%",

                color:
                    chartSecondaryTextColor,
            },

            axisLine: {
                lineStyle: {
                    color:
                        chartBorderColor,
                },
            },

            splitLine: {
                lineStyle: {
                    color:
                        chartSplitLineColor,
                },
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

                itemStyle: {
                    color: "#4f46e5",

                    borderRadius: [
                        5,
                        5,
                        0,
                        0,
                    ],
                },

                label: {
                    show: true,

                    position: "top",

                    formatter: "{c}%",

                    color:
                        chartTextColor,
                },

                emphasis: {
                    focus: "series",
                },
            },
        ],
    }


    // =========================
    // Calculated UI Data
    // =========================

    const attendanceTotal =
        data.attendanceSummary.present +
        data.attendanceSummary.absent +
        data.attendanceSummary.late +
        data.attendanceSummary.excused

    const attendanceStatuses = [
        {
            name: "Present",
            value:
                data.attendanceSummary.present,
        },
        {
            name: "Absent",
            value:
                data.attendanceSummary.absent,
        },
        {
            name: "Late",
            value:
                data.attendanceSummary.late,
        },
        {
            name: "Excused",
            value:
                data.attendanceSummary.excused,
        },
    ]


    // =========================
    // UI
    // =========================

    return (
        <section
            className="
                min-w-0
                space-y-5
                sm:space-y-6
            "
        >

            {/* ========================= */}
            {/* SCHOOL OVERVIEW */}
            {/* ========================= */}

            <DashboardCard className="overflow-hidden">
                <div
                    className="
                        border-b
                        border-slate-100
                        px-4 py-4
                        dark:border-slate-800
                        sm:px-5
                    "
                >
                    <h2
                        className={getSectionTitleStyles()}
                    >
                        School Overview
                    </h2>

                    <p
                        className="
                            mt-1
                            text-xs
                            text-slate-500
                            dark:text-slate-400
                        "
                    >
                        Current school statistics
                    </p>
                </div>

                <div
                    className="
                        grid
                        grid-cols-1
                        gap-px
                        bg-slate-200
                        sm:grid-cols-2
                        lg:grid-cols-3
                        2xl:grid-cols-6
                        dark:bg-slate-800
                    "
                >
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
            </DashboardCard>


            {/* ========================= */}
            {/* ATTENDANCE CHARTS */}
            {/* ========================= */}

            <div
                className="
                    grid
                    min-w-0
                    grid-cols-1
                    gap-4
                    sm:gap-6
                    xl:grid-cols-2
                "
            >

                {/* Attendance Trend */}

                <DashboardCard
                    className="p-4 sm:p-6"
                >
                    <section
                        aria-labelledby="attendance-trend-title"
                    >
                        <div className="min-w-0">
                            <h2
                                id="attendance-trend-title"
                                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                            >
                                Attendance Trend
                            </h2>

                            <p
                                id="attendance-trend-description"
                                className={getSectionDescriptionStyles()}
                            >
                                Daily attendance record counts by status. Compare present, absent, late, and excused records across dates.
                            </p>
                        </div>

                        {data.attendanceTrend.length > 0 ? (
                            <div
                                className="
                                    mt-4
                                    h-64
                                    min-w-0
                                    sm:h-72
                                "
                                role="img"
                                aria-labelledby="attendance-trend-title"
                                aria-describedby="attendance-trend-description"
                            >
                                <ReactECharts
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                    }}
                                    option={
                                        attendanceTrendOption
                                    }
                                />
                            </div>
                        ) : (
                            <div
                                className="
                                    mt-4
                                    flex h-64
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-slate-50
                                    px-4
                                    text-center
                                    text-sm
                                    text-slate-600
                                    dark:bg-slate-800
                                    dark:text-slate-400
                                    sm:h-72
                                "
                                role="status"
                            >
                                No attendance data available
                            </div>
                        )}

                        {data.attendanceTrend.length > 0 && (
                            <div
                                className={`${getTableWrapperStyles()} mt-4`}
                                tabIndex={0}
                                aria-label="Attendance trend data table. Scroll horizontally to read all columns."
                            >
                                <table
                                    className={`
                                        ${getTableStyles()}
                                        min-w-136
                                    `}
                                >
                                    <caption className="sr-only">
                                        Daily attendance record counts by status
                                    </caption>

                                    <thead
                                        className={getTableHeadStyles()}
                                    >
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-3 py-2 font-semibold"
                                            >
                                                Date
                                            </th>

                                            <th
                                                scope="col"
                                                className="px-3 py-2 font-semibold"
                                            >
                                                Present (records)
                                            </th>

                                            <th
                                                scope="col"
                                                className="px-3 py-2 font-semibold"
                                            >
                                                Absent (records)
                                            </th>

                                            <th
                                                scope="col"
                                                className="px-3 py-2 font-semibold"
                                            >
                                                Late (records)
                                            </th>

                                            <th
                                                scope="col"
                                                className="px-3 py-2 font-semibold"
                                            >
                                                Excused (records)
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody
                                        className={getTableBodyStyles()}
                                    >
                                        {data.attendanceTrend.map(
                                            item => (
                                                <tr
                                                    key={item.date}
                                                    className={getTableRowStyles()}
                                                >
                                                    <th
                                                        scope="row"
                                                        className="whitespace-nowrap px-3 py-2 font-medium"
                                                    >
                                                        {item.date}
                                                    </th>

                                                    <td className="px-3 py-2 font-medium text-green-700 dark:text-green-400">
                                                        {item.present}
                                                    </td>

                                                    <td className="px-3 py-2 font-medium text-red-700 dark:text-red-400">
                                                        {item.absent}
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        {item.late}
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        {item.excused}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </DashboardCard>


                {/* Attendance Distribution */}

                <DashboardCard
                    className="p-4 sm:p-6"
                >
                    <section
                        aria-labelledby="attendance-distribution-title"
                    >
                        <div className="min-w-0">
                            <h2
                                id="attendance-distribution-title"
                                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                            >
                                Attendance Distribution
                            </h2>

                            <p
                                id="attendance-distribution-description"
                                className={getSectionDescriptionStyles()}
                            >
                                Total attendance records by status. The table gives the exact count and share of all recorded statuses.
                            </p>
                        </div>

                        {attendanceTotal > 0 ? (
                            <div
                                className="
                                    mt-4
                                    h-64
                                    min-w-0
                                    sm:h-72
                                "
                                role="img"
                                aria-labelledby="attendance-distribution-title"
                                aria-describedby="attendance-distribution-description"
                            >
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
                        ) : (
                            <div
                                className="
                                    mt-4
                                    flex h-64
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-slate-50
                                    px-4
                                    text-center
                                    text-sm
                                    text-slate-600
                                    dark:bg-slate-800
                                    dark:text-slate-400
                                    sm:h-72
                                "
                                role="status"
                            >
                                No attendance records are available to chart; all status counts are zero.
                            </div>
                        )}

                        <div
                            className={`${getTableWrapperStyles()} mt-4`}
                        >
                            <table
                                className={getTableStyles()}
                            >
                                <caption className="sr-only">
                                    Attendance record count and share by status
                                </caption>

                                <thead
                                    className={getTableHeadStyles()}
                                >
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-3 py-2 font-semibold"
                                        >
                                            Status
                                        </th>

                                        <th
                                            scope="col"
                                            className="px-3 py-2 font-semibold"
                                        >
                                            Records
                                        </th>

                                        <th
                                            scope="col"
                                            className="px-3 py-2 font-semibold"
                                        >
                                            Share
                                        </th>
                                    </tr>
                                </thead>

                                <tbody
                                    className={getTableBodyStyles()}
                                >
                                    {attendanceStatuses.map(
                                        status => (
                                            <tr
                                                key={status.name}
                                                className={getTableRowStyles()}
                                            >
                                                <th
                                                    scope="row"
                                                    className={`
                                                        px-3 py-2
                                                        font-medium
                                                        ${
                                                            status.name ===
                                                            "Present"
                                                                ? "text-green-700 dark:text-green-400"
                                                                : status.name ===
                                                                    "Absent"
                                                                  ? "text-red-700 dark:text-red-400"
                                                                  : "text-slate-700 dark:text-slate-300"
                                                        }
                                                    `}
                                                >
                                                    {status.name}
                                                </th>

                                                <td className="px-3 py-2">
                                                    {status.value}
                                                </td>

                                                <td className="px-3 py-2">
                                                    {attendanceTotal ===
                                                    0
                                                        ? "0%"
                                                        : `${((status.value / attendanceTotal) * 100).toFixed(1)}%`}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </DashboardCard>

            </div>


            {/* ========================= */}
            {/* ACADEMIC PERFORMANCE */}
            {/* ========================= */}

            <DashboardCard
                className="p-4 sm:p-6"
            >
                <section
                    aria-labelledby="academic-performance-title"
                >
                    <div
                        className="
                            flex min-w-0
                            flex-col
                            gap-4
                            sm:flex-row
                            sm:items-start
                            sm:justify-between
                        "
                    >
                        <div className="min-w-0">
                            <h2
                                id="academic-performance-title"
                                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                            >
                                Academic Performance
                            </h2>

                            <p
                                id="academic-performance-description"
                                className={getSectionDescriptionStyles()}
                            >
                                Average grade score as a percentage for each subject. Compare subject averages; the table also shows the number of grades behind each average.
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                shrink-0
                                flex-wrap
                                items-center
                                gap-x-5
                                gap-y-3
                                sm:gap-6
                            "
                        >
                            <div>
                                <p
                                    className="
                                        text-xs
                                        text-slate-500
                                        dark:text-slate-400
                                    "
                                >
                                    Overall Average
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-xl
                                        font-bold
                                        text-indigo-700
                                        dark:text-indigo-400
                                    "
                                >
                                    {data.averageScore}%
                                </p>
                            </div>

                            <div
                                className="
                                    hidden
                                    h-9 w-px
                                    bg-slate-200
                                    dark:bg-slate-700
                                    sm:block
                                "
                            />

                            <div>
                                <p
                                    className="
                                        text-xs
                                        text-slate-500
                                        dark:text-slate-400
                                    "
                                >
                                    Grades
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-xl
                                        font-bold
                                        text-slate-900
                                        dark:text-slate-100
                                    "
                                >
                                    {data.grades}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 min-w-0">
                        {data.academicPerformance.length > 0 ? (
                            <>
                                <div
                                    className="
                                        h-72
                                        min-w-0
                                        overflow-hidden
                                        sm:h-80
                                    "
                                    role="img"
                                    aria-labelledby="academic-performance-title"
                                    aria-describedby="academic-performance-description"
                                >
                                    <ReactECharts
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                        }}
                                        option={
                                            academicPerformanceOption
                                        }
                                    />
                                </div>

                                <div
                                    className={`${getTableWrapperStyles()} mt-4`}
                                    tabIndex={0}
                                    aria-label="Academic performance data table. Scroll horizontally to read all columns."
                                >
                                    <table
                                        className={`
                                            ${getTableStyles()}
                                            min-w-96
                                        `}
                                    >
                                        <caption className="sr-only">
                                            Average grade score and number of grades by subject
                                        </caption>

                                        <thead
                                            className={getTableHeadStyles()}
                                        >
                                            <tr>
                                                <th
                                                    scope="col"
                                                    className="px-3 py-2 font-semibold"
                                                >
                                                    Subject
                                                </th>

                                                <th
                                                    scope="col"
                                                    className="px-3 py-2 font-semibold"
                                                >
                                                    Average score
                                                </th>

                                                <th
                                                    scope="col"
                                                    className="px-3 py-2 font-semibold"
                                                >
                                                    Grades
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody
                                            className={getTableBodyStyles()}
                                        >
                                            {data.academicPerformance.map(
                                                item => (
                                                    <tr
                                                        key={item.subjectId}
                                                        className={getTableRowStyles()}
                                                    >
                                                        <th
                                                            scope="row"
                                                            className="px-3 py-2 font-medium"
                                                        >
                                                            {item.subjectName}
                                                        </th>

                                                        <td
                                                            className="
                                                                px-3 py-2
                                                                font-semibold
                                                                text-indigo-700
                                                                dark:text-indigo-400
                                                            "
                                                        >
                                                            {
                                                                item.averageScore
                                                            }
                                                            %
                                                        </td>

                                                        <td className="px-3 py-2">
                                                            {
                                                                item.gradesCount
                                                            }
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div
                                className="
                                    flex h-56
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-slate-50
                                    px-4
                                    text-center
                                    dark:bg-slate-800
                                    sm:h-64
                                "
                                role="status"
                            >
                                <div>
                                    <p
                                        className="
                                            text-sm
                                            font-medium
                                            text-slate-700
                                            dark:text-slate-200
                                        "
                                    >
                                        No academic performance data
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            text-sm
                                            text-slate-600
                                            dark:text-slate-400
                                        "
                                    >
                                        Grades will appear here once they are recorded.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </DashboardCard>


            {/* ========================= */}
            {/* QUICK ACTIONS */}
            {/* ========================= */}

            <DashboardCard
                className="p-4 sm:p-6"
            >
                <div>
                    <h2
                        className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                    >
                        Quick Actions
                    </h2>

                    <p
                        className="
                            mt-1
                            text-sm
                            text-slate-500
                            dark:text-slate-400
                        "
                    >
                        Frequently used school management actions
                    </p>
                </div>

                <div
                    className="
                        mt-5
                        grid
                        min-w-0
                        grid-cols-1
                        gap-3
                        sm:grid-cols-2
                        xl:grid-cols-4
                    "
                >
                    <Link
                        href="/students"
                        className="
                            group
                            min-w-0
                            rounded-lg
                            border
                            border-slate-200
                            p-4
                            transition
                            hover:border-slate-300
                            hover:bg-slate-50
                            dark:border-slate-700
                            dark:hover:border-slate-600
                            dark:hover:bg-slate-800
                        "
                    >
                        <GraduationCap
                            size={20}
                            className="
                                text-slate-700
                                dark:text-slate-200
                            "
                        />

                        <p
                            className="
                                mt-3
                                text-sm
                                font-semibold
                                text-slate-900
                                dark:text-slate-100
                            "
                        >
                            Students
                        </p>

                        <p
                            className="
                                mt-1
                                text-xs
                                text-slate-500
                                dark:text-slate-400
                            "
                        >
                            Manage students
                        </p>
                    </Link>


                    <Link
                        href="/attendance"
                        className="
                            group
                            min-w-0
                            rounded-lg
                            border
                            border-slate-200
                            p-4
                            transition
                            hover:border-slate-300
                            hover:bg-slate-50
                            dark:border-slate-700
                            dark:hover:border-slate-600
                            dark:hover:bg-slate-800
                        "
                    >
                        <ClipboardCheck
                            size={20}
                            className="
                                text-green-700
                                dark:text-green-400
                            "
                        />

                        <p
                            className="
                                mt-3
                                text-sm
                                font-semibold
                                text-slate-900
                                dark:text-slate-100
                            "
                        >
                            Attendance
                        </p>

                        <p
                            className="
                                mt-1
                                text-xs
                                text-slate-500
                                dark:text-slate-400
                            "
                        >
                            Record attendance
                        </p>
                    </Link>


                    <Link
                        href="/grades"
                        className="
                            group
                            min-w-0
                            rounded-lg
                            border
                            border-slate-200
                            p-4
                            transition
                            hover:border-slate-300
                            hover:bg-slate-50
                            dark:border-slate-700
                            dark:hover:border-slate-600
                            dark:hover:bg-slate-800
                        "
                    >
                        <TrendingUp
                            size={20}
                            className="
                                text-indigo-700
                                dark:text-indigo-400
                            "
                        />

                        <p
                            className="
                                mt-3
                                text-sm
                                font-semibold
                                text-slate-900
                                dark:text-slate-100
                            "
                        >
                            Grades
                        </p>

                        <p
                            className="
                                mt-1
                                text-xs
                                text-slate-500
                                dark:text-slate-400
                            "
                        >
                            Enter student grades
                        </p>
                    </Link>


                    <Link
                        href="/report-cards"
                        className="
                            group
                            min-w-0
                            rounded-lg
                            border
                            border-slate-200
                            p-4
                            transition
                            hover:border-slate-300
                            hover:bg-slate-50
                            dark:border-slate-700
                            dark:hover:border-slate-600
                            dark:hover:bg-slate-800
                        "
                    >
                        <FileText
                            size={20}
                            className="
                                text-slate-700
                                dark:text-slate-200
                            "
                        />

                        <p
                            className="
                                mt-3
                                text-sm
                                font-semibold
                                text-slate-900
                                dark:text-slate-100
                            "
                        >
                            Report Cards
                        </p>

                        <p
                            className="
                                mt-1
                                text-xs
                                text-slate-500
                                dark:text-slate-400
                            "
                        >
                            View and generate reports
                        </p>
                    </Link>
                </div>
            </DashboardCard>

        </section>
    )
}

