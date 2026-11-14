
import LoginForm from "../../components/loginForm"

export default function LoginPage() {
    return (
        <main className="relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-slate-950 px-4 py-6 sm:px-6 sm:py-8">
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />
            <div className="absolute -bottom-40 -right-20 h-[32rem] w-[32rem] rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="relative w-full max-w-md">
                <LoginForm />
            </div>
        </main>
    )
}

