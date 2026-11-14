# TASEETY Tauri 2 scaffold

This is an additive scaffold for the approved architecture:

- Windows machine remains the authoritative TASEETY server.
- Existing Next.js standalone server, Windows service, Better Auth, and SQLite databases remain in place.
- Tauri is a client shell. It does not start another Next.js server and does not create local database copies.
- Client discovers the server over LAN multicast UDP and then loads the existing web application in its WebView.
- The last selected server is saved in the Tauri app-data directory.
- If multiple TASEETY servers are discovered, the user selects the school; no IP address entry is required.

## Important coexistence detail

The existing server is installed per-machine under `C:\Program Files\TASEETY`.
The Tauri client is configured as a per-user install under the user's LocalAppData location. This prevents the desktop client installer from overwriting or uninstalling the existing server.

The NSIS hook creates a Windows desktop shortcut named `TASEETY` and removes that shortcut when the client is uninstalled. Tauri also creates a Start Menu shortcut in the `TASEETY` group.

## 1. Tauri build entry points

Tauri is configured to load `src-tauri/bootstrap/index.html` as the desktop app's initial screen. The `tauri`, `tauri:dev`, and `tauri:build:windows` npm scripts run the Tauri CLI against that configuration.

The bootstrap screen invokes the registered `discover_servers` and `save_server` Rust commands. Its `default` capability grants `core:default` to the `main` window only; it has no remote URL grants. This lets the local bootstrap use IPC but does not grant the discovered school website native IPC access. The bootstrap JavaScript and styles are separate same-origin assets and the Tauri CSP disallows inline execution, plugins, and arbitrary network connections.

## 2. Generate the real TASEETY application icons

Use the existing brand asset, not a new placeholder logo:

```powershell
npx tauri icon "src/logo/logo.png" --output "src-tauri/icons" --fit contain
```

This generates the Windows ICO and desktop PNGs plus the macOS ICNS and mobile icon assets. The source image must be a valid PNG.

## 3. Enable server-side discovery

The new `src/instrumentation.ts` starts the UDP discovery responder inside the existing Next.js server process. It advertises the origin already configured in `BETTER_AUTH_URL`, so it must be the same reachable LAN origin used by the web application and Better Auth.

The protocol is:

- Multicast group: `239.255.77.77`
- UDP port: `47777`
- Request: `TASEETY_DISCOVER_V1`
- Response: JSON containing `service`, `protocolVersion`, `serverId`, `serverName`, and `baseUrl`.

The client validates that the advertised host is a private IPv4 address and checks that the existing server responds over HTTP before navigating to it. Health checks do not follow redirects, so an advertised LAN endpoint cannot redirect the native HTTP client to another host.

For desktop discovery, configure the server's `BETTER_AUTH_URL` (the server installer?s `PublicHost`) with its private LAN IPv4 address and the configured port, for example `http://192.168.1.10:3000`. The existing installer also accepts DNS/NetBIOS hostnames, but those cannot be advertised to this IPv4-only client and discovery will remain unavailable until the origin is configured with the matching private IPv4 address. This origin must match the one used by the web app so Better Auth accepts sign-in requests.

## 4. Configure Windows Firewall

The Windows server must allow inbound UDP 47777 to its existing `node.exe`.

The helper is `installer/Configure-TASEETY-DiscoveryFirewall.ps1`. The Windows server installer now copies it beside `Configure-TASEETY.ps1`, applies the UDP rule after the server passes its HTTP health check, and removes that rule during uninstall. The rule is scoped to the installed `node.exe`, UDP 47777, and Domain/Private network profiles.

For an already-installed server, run it from an elevated PowerShell session:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "installer\Configure-TASEETY-DiscoveryFirewall.ps1" -NodePath "C:\Program Files\TASEETY\node.exe"
```

To remove only this discovery rule:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "installer\Configure-TASEETY-DiscoveryFirewall.ps1" -Remove
```

The rule is limited to Domain and Private network profiles and to the installed TASEETY `node.exe`.

## 5. Build the Windows desktop client

```powershell
npx tauri info
npx tauri dev
```

After testing discovery and authentication:

```powershell
npx tauri build --bundles nsis
```

The generated NSIS installer is separate from the existing TASEETY server installer.

## 6. Required validation before production

1. Build the existing Next.js standalone output with the new instrumentation included.
2. Restart the existing TASEETY Windows service using the normal service-management procedure.
3. Confirm the server log contains `[TASEETY discovery] Listening on UDP 47777`.
4. Confirm the Windows Firewall rule exists and points to the installed `node.exe`.
5. Run the Tauri client on another device on the same LAN.
6. Confirm the client discovers the server and opens the existing login page.
7. Test Better Auth sign-in, session persistence, sign-out, password reset, and role-based access.
8. Confirm closing the Tauri client does not stop the Windows service.

## Security and scope notes

- Discovery is LAN-only and does not create remote access.
- This discovery protocol identifies the server; it is not a cryptographic identity or authentication mechanism. Authentication remains Better Auth on the server.
- The client does not disable TLS certificate validation and health checks do not follow redirects.
- The bundled bootstrap screen has a restrictive CSP and is served from `src-tauri/bootstrap/index.html`; its only capability is `core:default` on the `main` window. No remote URL is granted Tauri IPC access, so the school web app is treated as untrusted web content without native command access.
- The client currently accepts only private IPv4 server addresses. If the deployed LAN uses a hostname or IPv6, discovery validation must be extended deliberately.
- Do not expose UDP 47777 or the Next.js server port to the public internet.
- Android and macOS packaging are later build targets. The Rust discovery code is shared, but Android multicast permissions/network behavior and macOS signing/building still require platform-specific validation.
