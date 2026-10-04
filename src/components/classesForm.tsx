"use client"

import {  useState , FormEvent} from "react"


export default function ClassForm(){
    const [name, setName] = useState("")
    const [gradeLevel, setGradeLevel] = useState("")
    const [loading, setLoading] = useState(false)

     const  handleSubmit = async (e: FormEvent<HTMLFormElement>)=>{
        e.preventDefault()
        setLoading(true)

        const response = await fetch("/api/classes", {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({name, gradeLevel})
        });
        if(response.ok){
            alert("class saved")
            setName("")
            setGradeLevel("")
            setLoading(false)

        }else{
            alert("somthing went wrong")
             setLoading(false)
             
        }
        

    }
   


    return(
        <form onSubmit={handleSubmit} className="bg-gray-700 text-white p-6 rounded border space-y-4 shadow-lg">
            <h2 className="text-white text-lg font-bold  mb-1">class name</h2>

            <div>
               <label className="block text-xs text-gray-50 mb-1">
    class name
</label>
                <input 
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full p-2 border rounded text-sm"
                
                />

                <label className="block text-xs text-gray-50 mb-1  ">number .. exmp ..grade 2</label>
                <input 
                type="text"
                value={gradeLevel}
                onChange={e => setGradeLevel(e.target.value)}
                required
                className="w-full p-2 border rounded text-sm"
                
                />
            </div>

            <button type="submit"
            disabled ={loading}
            className="w-full bg-green-600 text-white p-2 rounded text-sm font-semibold hover:bg-green-700"


            
            >
                {loading? "saving ..." : "save to system" }

            </button>

        </form>
    )

}
