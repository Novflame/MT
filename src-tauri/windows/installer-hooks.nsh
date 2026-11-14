!macro NSIS_HOOK_POSTINSTALL
  ; The server installer lives in Program Files\\TASEETY.
  ; This Tauri client is installed per-user under LocalAppData\\TASEETY,
  ; so it does not overwrite or uninstall the existing server.
  CreateShortCut "$DESKTOP\\TASEETY.lnk" "$INSTDIR\\taseety-desktop.exe"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  Delete "$DESKTOP\\TASEETY.lnk"
!macroend
