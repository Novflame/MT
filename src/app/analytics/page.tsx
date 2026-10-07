import { requirePermission } from "@/auth/session";
import { getSchoolDB } from "@/db";
import { students,teacherAssignments,exams,tests,grades,attendance } from "@/db/schema"


export default async function AnalyticsPage(){
    await requirePermission('reports.read');
    const db=await getSchoolDB();
    const [s,t,e,g,a,ta] = await Promise.all([db.select()
        .from(students),db.select()
        .from(tests),db.select()
        .from(exams),db.select()
        .from(grades),db.select()
        .from(attendance),
        db.select().from(teacherAssignments)]);
        const present=a.filter(x=>x.status==='present').length;
        const ar=a.length?Math.round(present/a.length*100):0;
        return <main className="min-h-dvh bg-gray-100 p-4 sm:p-8">
            <div className="mx-auto max-w-6xl">
                <h1 className="text-3xl font-bold">
                    Analytics</h1>
                    <p className="mt-2 text-gray-600">
                        School-level operational indicators for the active data set.</p>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Metric l="Students" v={s.length}/>
                            <Metric l="Teachers" v={new Set(ta.map(x=>x.teacherId)).size}/>
                                <Metric l="Tests" v={t.length}/>
                                <Metric l="Exams" v={e.length}/>
                                <Metric l="Grades" v={g.length}/>
                                <Metric l="Attendance rate" v={`${ar}%`}/>
                                </div>
                                </div>
                                </main>}
function Metric({l,v}:{l:string;v:string|number}){
    return <div className="rounded-lg border bg-white p-5">
        <div className="text-sm text-gray-500">{l}</div>
        <div className="mt-1 text-3xl font-bold">{v}</div>
        </div>}
