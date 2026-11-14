"use client"

/** @deprecated The root ApplicationShell now provides the shared application frame. */
export default function HeadOfDepartmentShell({ children }: { children: React.ReactNode; standalone?: boolean }) {
  return <>{children}</>
}
