#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif
#ifndef SourceDir
  #define SourceDir AddBackslash(SourcePath) + "..\dist\windows\TASEETY"
#endif
#ifndef OutputDir
  #define OutputDir AddBackslash(SourcePath) + "..\dist\windows\installer"
#endif

#define AppName "TASEETY"
#define AppPublisher "TASEETY"
#define ServiceName "TASEETYService"

[Setup]
AppId={{A81C6E91-9D6B-4C13-A6F1-7C5E92D7A410}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\TASEETY
DefaultGroupName=TASEETY
DisableProgramGroupPage=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64
OutputDir={#OutputDir}
OutputBaseFilename=TASEETY-Setup-{#AppVersion}-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
Uninstallable=yes
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
UninstallDisplayIcon={app}\service\TASEETYService.exe

[Dirs]
Name: "{app}\service"
Name: "{app}\scripts\installer"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\TASEETY Server Status"; Filename: "{sys}\cmd.exe"; Parameters: "/c sc query TASEETYService & pause"; WorkingDir: "{app}"

[Code]
var
  ConfigPage: TWizardPage;
  DataDirEdit: TEdit;
  HostEdit: TEdit;
  PortEdit: TEdit;
  ExistingDataDir: string;
  ExistingService: Boolean;

function ReadRegString(const Name: string): string;
var S: string;
begin
  if RegQueryStringValue(HKLM, 'SOFTWARE\TASEETY', Name, S) then Result := S else Result := '';
end;

procedure InitializeWizard;
var L: TLabel;
begin
  ExistingDataDir := ReadRegString('DataDir');
  ExistingService := RegKeyExists(HKLM, 'SYSTEM\CurrentControlSet\Services\TASEETYService');
  ConfigPage := CreateCustomPage(wpSelectDir, 'TASEETY server settings', 'Choose persistent school data storage and the LAN address used by connected devices.');
  L := TLabel.Create(WizardForm); L.Parent := ConfigPage.Surface; L.Caption := 'Persistent data directory (kept during upgrade and uninstall):'; L.Left := 0; L.Top := 8;
  DataDirEdit := TEdit.Create(WizardForm); DataDirEdit.Parent := ConfigPage.Surface; DataDirEdit.Left := 0; DataDirEdit.Top := 30; DataDirEdit.Width := ConfigPage.SurfaceWidth; DataDirEdit.Text := ExistingDataDir;
  if DataDirEdit.Text = '' then DataDirEdit.Text := ExpandConstant('{commonappdata}') + '\TASEETY';
  L := TLabel.Create(WizardForm); L.Parent := ConfigPage.Surface; L.Caption := 'LAN hostname or IPv4 address (example: TASEETY-SERVER or 192.168.1.10):'; L.Left := 0; L.Top := 76;
  HostEdit := TEdit.Create(WizardForm); HostEdit.Parent := ConfigPage.Surface; HostEdit.Left := 0; HostEdit.Top := 98; HostEdit.Width := ConfigPage.SurfaceWidth; HostEdit.Text := ReadRegString('PublicHost');
  if HostEdit.Text = '' then HostEdit.Text := GetEnv('COMPUTERNAME');
  L := TLabel.Create(WizardForm); L.Parent := ConfigPage.Surface; L.Caption := 'TCP port:'; L.Left := 0; L.Top := 144;
  PortEdit := TEdit.Create(WizardForm); PortEdit.Parent := ConfigPage.Surface; PortEdit.Left := 0; PortEdit.Top := 166; PortEdit.Width := 100; PortEdit.Text := ReadRegString('Port');
  if PortEdit.Text = '' then PortEdit.Text := '3000';
  L := TLabel.Create(WizardForm); L.Parent := ConfigPage.Surface; L.Caption := 'HTTP is intended for a trusted private LAN only. Public internet access requires HTTPS and a trusted certificate.'; L.Left := 0; L.Top := 210; L.Width := ConfigPage.SurfaceWidth; L.Height := 36;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var P, I: Integer; C: Char; DataPath, AppPath, Host: string;
begin
  Result := True;
  if CurPageID <> ConfigPage.ID then exit;
  if ExistingService and (ExistingDataDir = '') then begin MsgBox('An existing TASEETY service was found but its persistent data directory is not registered. Setup cannot safely guess where school data is stored. Restore the previous configuration before upgrading.', mbError, MB_OK); Result := False; exit; end;
  DataPath := Trim(DataDirEdit.Text);
  if Length(DataPath) < 3 then begin MsgBox('Choose a local drive folder such as C:\ProgramData\TASEETY.', mbError, MB_OK); Result := False; exit; end;
  if (DataPath[2] <> ':') or (DataPath[3] <> '\') then begin MsgBox('The data directory must be on a local Windows drive. Network/UNC paths are not supported for SQLite.', mbError, MB_OK); Result := False; exit; end;
  if Pos('"', DataPath) > 0 then begin MsgBox('The data directory cannot contain a double quote.', mbError, MB_OK); Result := False; exit; end;
  if (ExistingDataDir <> '') and (CompareText(RemoveBackslash(DataPath), RemoveBackslash(ExistingDataDir)) <> 0) then begin MsgBox('An existing installation must keep its current data directory. Moving school data requires a separate verified migration.', mbError, MB_OK); Result := False; exit; end;
  DataPath := RemoveBackslash(ExpandFileName(DataPath));
  DataDirEdit.Text := DataPath;
  DataPath := AddBackslash(Lowercase(DataPath));
  AppPath := AddBackslash(Lowercase(ExpandFileName(WizardDirValue)));
  if (Pos(AppPath, DataPath) = 1) or (Pos(DataPath, AppPath) = 1) then begin MsgBox('The application and data directories must be separate and must not contain one another.', mbError, MB_OK); Result := False; exit; end;
  Host := Trim(HostEdit.Text);
  if Host = '' then begin MsgBox('Enter the LAN hostname or IPv4 address of this server.', mbError, MB_OK); Result := False; exit; end;
  for I := 1 to Length(Host) do begin
    C := Host[I];
    if not (((C >= 'A') and (C <= 'Z')) or ((C >= 'a') and (C <= 'z')) or ((C >= '0') and (C <= '9')) or (C = '.') or (C = '-')) then begin MsgBox('Use only letters, numbers, dots, and hyphens in the LAN hostname/IP field.', mbError, MB_OK); Result := False; exit; end;
  end;
  P := StrToIntDef(Trim(PortEdit.Text), 0);
  if (P < 1) or (P > 65535) then begin MsgBox('Enter a valid TCP port from 1 to 65535.', mbError, MB_OK); Result := False; exit; end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var ResultCode: Integer;
begin
  Result := '';
  if ExistingService then begin
    Exec(ExpandConstant('{sys}\sc.exe'), 'stop TASEETYService', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), '-NoProfile -Command "$ErrorActionPreference=''Stop''; $s=Get-Service TASEETYService -ErrorAction SilentlyContinue; if($s){ if($s.Status -ne ''Stopped''){ Stop-Service TASEETYService -Force; (Get-Service TASEETYService).WaitForStatus(''Stopped'', [TimeSpan]::FromSeconds(60)) } }"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) or (ResultCode <> 0) then
      Result := 'TASEETY service did not stop. Upgrade cancelled to protect the school databases.';
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var ResultCode: Integer; Params: string;
begin
  if CurStep = ssPostInstall then begin
    Params := '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\scripts\installer\Configure-TASEETY.ps1') + '" -InstallDir "' + ExpandConstant('{app}') + '" -DataDir "' + DataDirEdit.Text + '" -PublicHost "' + Trim(HostEdit.Text) + '" -Port ' + Trim(PortEdit.Text);
    if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Params, ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode) or (ResultCode <> 0) then
      RaiseException('TASEETY could not complete configuration or startup. School data has not been intentionally deleted. Check the installer log and the selected data directory logs.');
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var ResultCode: Integer; ScriptPath: string;
begin
  if CurUninstallStep = usUninstall then begin
    ScriptPath := ExpandConstant('{app}\scripts\installer\Uninstall-TASEETY.ps1');
    if FileExists(ScriptPath) then begin
      if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + ScriptPath + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) or (ResultCode <> 0) then
        RaiseException('TASEETY service cleanup failed. Uninstall has been stopped to avoid leaving a running service. Persistent data remains untouched.');
    end else begin
      RaiseException('The TASEETY uninstall helper is missing. Uninstall has been stopped to avoid leaving a Windows service pointing to removed files. Persistent data remains untouched.');
    end;
  end;
end;
