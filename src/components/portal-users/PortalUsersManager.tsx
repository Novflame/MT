'use client'; import { useState } from 'react';
export default function PortalUsersManager(
    { students }: {
        students: {
            id: string;
            name: string; userId: string | null
        }[]
    }) {
    const [name, setName] = useState(''),
        [email, setEmail] = useState(''),
        [password, setPassword] = useState(''),
        [role, setRole] = useState('parent'),
        [studentId, setStudentId] = useState(''),
        [saving, setSaving] = useState(false);


    async function save() {
        setSaving(true);

        try {
            const r = await fetch('/api/portal-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    role,
                    studentId: role === 'student' ? studentId : null
                })
            });
            const d = await r.json();
            if (!r.ok) throw Error(d.error);
            alert('Portal account created');
            setName('');
            setEmail('');
            setPassword('');
            setStudentId('')
        }
        catch (e) { alert(e instanceof Error ? e.message : 'Failed') }
        finally { setSaving(false) }
    } return <section className="mt-6 min-w-0 rounded-lg border bg-white p-4 sm:p-6">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">

            <input className="rounded border px-3 py-2" placeholder="Full name"
                value={name}
                onChange={e => setName(e.target.value)} />
            <input className="rounded border px-3 py-2"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)} />

            <input className="rounded border px-3 py-2"
                type="password"
                placeholder="Temporary password"
                value={password}
                onChange={e => setPassword(e.target.value)} />
            <select className="rounded border px-3 py-2"
                value={role}
                onChange={e => setRole(e.target.value)}>
                <option value="parent">Parent</option>
                <option value="student">Student</option>
            </select>
            {role === 'student' && <select className="rounded border px-3 py-2"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}>
                <option
                    value="">Student profile
                </option>
                {students.filter(s => !s.userId).map(s => <option key={s.id}
                    value={s.id}>
                    {s.name}</option>)}</select>
            }
        </div>
        <button onClick={save}
            disabled={saving}
            className="mt-4 w-full rounded bg-black px-4 py-2 text-white sm:w-auto">
            {saving ? 'Creating...' : 'Create portal account'}
        </button>
    </section>
}
