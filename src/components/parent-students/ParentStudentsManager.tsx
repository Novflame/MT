"use client"
import {useState} from "react"

type Student={id:string;name:string}
type Parent={id:string;name:string;email:string}
export default function ParentStudentsManager({students,parents}:{students:Student[];parents:Parent[]}){
 const [parentUserId,setParentUserId]=useState(""); const [studentId,setStudentId]=useState(""); const [saving,setSaving]=useState(false)
 async function save(){
  if(!parentUserId||!studentId)return
  setSaving(true)
  try{const r=await fetch("/api/parent-students",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({parentUserId,studentId})});const d=await r.json();if(!r.ok)throw Error(d.error);setParentUserId("");setStudentId("");alert("Parent linked")}catch(e){alert(e instanceof Error?e.message:"Failed")}finally{setSaving(false)}
 }
 return <section className="mt-6 rounded-lg border bg-white p-6"><div className="grid gap-3 md:grid-cols-2"><select className="rounded border px-3 py-2" value={parentUserId} onChange={e=>setParentUserId(e.target.value)}><option value="">Select parent</option>{parents.map(p=><option key={p.id} value={p.id}>{p.name} — {p.email}</option>)}</select><select className="rounded border px-3 py-2" value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Select student</option>{students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div><button onClick={save} disabled={saving||!parentUserId||!studentId} className="mt-4 rounded bg-black px-4 py-2 text-white">{saving?"Saving...":"Link parent"}</button>{parents.length===0&&<p className="mt-4 text-sm text-gray-500">Create a parent portal account first.</p>}</section>
}
