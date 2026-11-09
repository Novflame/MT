# TASEETY Windows installer

This patch supplies the Windows x64 payload builder, Windows Service host, Inno Setup definition, configuration, backup, relocation, and uninstall scripts.

## Canonical installed layout

```text
C:\Program Files\TASEETY\
  node.exe
  service\TASEETYService.exe
  app\standalone\server.js
  app\standalone\drizzle\central\
  app\standalone\drizzle\school\
  app\standalone\scripts\migrate-central.cjs
  app\standalone\scripts\backup-before-upgrade.cjs
  app\standalone\scripts\relocate-central.cjs
  scripts\installer\Configure-TASEETY.ps1
  scripts\installer\Uninstall-TASEETY.ps1

C:\ProgramData\TASEETY\
  config\.env
  central-data\central.db
  databases\school_<id>.db
  uploads\
  backups\
  logs\service.log
```

The single Node runtime location is the installation root (`{app}\node.exe`). The packager, service host, and configuration script all use that same location. Do not move it into a `runtime` subfolder without changing all three components and the contract test.

## Build on Windows

Build on Windows x64 with:

- Node.js 22.x x64 and project dependencies installed (`npm ci`).
- Python 3 (the project migration tests use Python).
- Inno Setup 6.7+ or 7 (`ISCC.exe`).
- .NET Framework 4.8 Developer Pack or Visual Studio Build Tools providing `csc.exe`.

The VS Code C# extension's private .NET runtime is not a substitute for the .NET Framework compiler. A .NET SDK is not used by this build script.

From the repository root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\installer\Build-Windows.ps1
```

The build runs TypeScript checking and the project tests, builds Next.js standalone output, packages the Windows Node runtime/native module, compiles the C# service host, and compiles the Inno Setup installer. The EXE and SHA-256 sidecar are written to `dist\windows\installer`.

`-SkipChecks` skips typecheck and project tests only; it does not skip the production build, packaging, native SQLite smoke test, service compilation, or Inno compilation.

## Data and migration safety

- The packaging step does not open or migrate school databases. It rejects database files, environment files, credentials, private keys, and runtime-data directories in the deployable payload.
- Persistent data is outside Program Files. The installer rejects overlapping app/data paths and network/UNC SQLite data paths.
- On legacy installations using `<DataDir>\central.db`, the installer creates a verified backup first, then copies the central database to `central-data\central.db`. The original file is not deleted.
- Before a central migration, the backup helper snapshots the central database and every tenant database registered in the central `schools` table, validates each backup with SQLite `integrity_check`, copies uploads, verifies their SHA-256 hashes, and writes `manifest.json` with `status: complete` only after all checks pass.
- Missing registered tenant databases, unregistered `school_N.db` files, corrupt databases, upload symlinks, or failed backup validation stop setup before central migration.
- School migrations are performed by the application's existing `runSchoolMigrations` logic when each school database is first opened. The installer backs up every registered school database first, but it does not automatically restore a tenant backup if a later school migration fails. Rehearse every upgrade against disposable copies and test restore before production rollout.
- Uninstall removes the Windows service and its firewall rule but deliberately preserves the data directory, databases, uploads, backups, and secrets.

## Network

The installer configures HTTP for a trusted private LAN and creates a Windows Firewall rule restricted to Domain and Private profiles. Do not expose the application port directly to the public internet. Public access requires HTTPS termination with a trusted certificate and a corresponding `BETTER_AUTH_URL`.

## Release validation still required

This workspace is not Windows and cannot compile or execute the Windows service or Inno Setup installer. Before production use, build and test on a clean Windows x64 machine, then test clean install, LAN login, reboot auto-start, forced service recovery, upgrade, backup restoration, missing-tenant refusal, uninstall, and reinstall using disposable database copies. Do not use the real school databases for these tests.
