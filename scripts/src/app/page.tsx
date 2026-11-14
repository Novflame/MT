import { redirect } from "next/navigation"
import { requireSession } from "@/auth/session"

export default async function HomePage() {
  const session = await requireSession()
  switch (session.user.schoolRole) {
    case "principal":
    case "deputy":
      redirect("/dashboard")
    case "teacher":
    case "head_of_class":
      redirect("/teacher")
    case "head_of_department":
      redirect("/department-heads")
    case "parent":
      redirect("/parent")
    case "student":
      redirect("/student")
    default:
      redirect("/login")
  }
}
