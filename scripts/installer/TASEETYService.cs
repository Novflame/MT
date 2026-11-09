using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;
using System.Threading;
using Microsoft.Win32;

namespace TASEETY
{
    internal sealed class TASEETYService : ServiceBase
    {
        private Process child;
        private Thread monitor;
        private volatile bool stopping;
        private string installRoot;
        private string dataRoot;
        private string logPath;
        private readonly object logLock = new object();

        public TASEETYService()
        {
            ServiceName = "TASEETYService";
            CanStop = true;
            CanShutdown = true;
            AutoLog = true;
        }

        protected override void OnStart(string[] args)
        {
            try {
                stopping = false;
                installRoot = Directory.GetParent(AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar)).FullName;
                dataRoot = ReadInstallSetting("DataDir");
                if (String.IsNullOrWhiteSpace(dataRoot) || !Directory.Exists(dataRoot))
                    throw new InvalidOperationException("TASEETY data directory is not configured.");

                Directory.CreateDirectory(Path.Combine(dataRoot, "logs"));
                logPath = Path.Combine(dataRoot, "logs", "service.log");
                string configPath = Path.Combine(dataRoot, "config", ".env");
                if (!File.Exists(configPath))
                    throw new FileNotFoundException("TASEETY runtime configuration is missing.", configPath);

                WriteLog("TASEETY service starting.");
                LoadEnvironment(configPath);

                string nodePath = Path.Combine(installRoot, "node.exe");
                string serverPath = Path.Combine(installRoot, "app", "standalone", "server.js");
                if (!File.Exists(nodePath) || !File.Exists(serverPath))
                    throw new FileNotFoundException("TASEETY runtime or standalone server is missing.");

                ProcessStartInfo info = new ProcessStartInfo();
                info.FileName = nodePath;
                info.Arguments = "\"" + serverPath + "\"";
                info.WorkingDirectory = Path.Combine(installRoot, "app", "standalone");
                info.UseShellExecute = false;
                info.CreateNoWindow = true;
                info.RedirectStandardOutput = true;
                info.RedirectStandardError = true;

                child = new Process();
                child.StartInfo = info;
                child.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (e.Data != null) WriteLog("OUT " + e.Data); };
                child.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (e.Data != null) WriteLog("ERR " + e.Data); };
                if (!child.Start()) throw new InvalidOperationException("Could not start the TASEETY Node.js process.");
                child.BeginOutputReadLine();
                child.BeginErrorReadLine();
                WriteLog("TASEETY started. PID=" + child.Id);

                monitor = new Thread(MonitorChild);
                monitor.IsBackground = true;
                monitor.Start();
            }
            catch (Exception ex) {
                if (!String.IsNullOrEmpty(logPath)) WriteLog("START ERROR " + ex.GetType().FullName + ": " + ex.Message + "\n" + ex.StackTrace);
                throw;
            }
        }

        private void MonitorChild()
        {
            try
            {
                child.WaitForExit();
                if (!stopping)
                {
                    WriteLog("Node.js exited unexpectedly with code " + child.ExitCode);
                    Environment.Exit(1);
                }
            }
            catch (Exception ex) { WriteLog("Monitor error: " + ex.Message); }
        }

        protected override void OnStop()
        {
            stopping = true;
            try
            {
                if (child != null && !child.HasExited)
                {
                    try { child.Kill(); } catch { }
                    if (!child.WaitForExit(15000))
                    {
                        Process killer = Process.Start(new ProcessStartInfo("taskkill.exe", "/PID " + child.Id + " /T /F") { UseShellExecute = false, CreateNoWindow = true });
                        if (killer != null) killer.WaitForExit(10000);
                    }
                }
            }
            catch (Exception ex) { WriteLog("Stop error: " + ex.Message); }
            finally
            {
                if (child != null) child.Dispose();
                child = null;
                WriteLog("TASEETY service stopped.");
            }
        }

        protected override void OnShutdown() { OnStop(); }

        private string ReadInstallSetting(string name)
        {
            using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\TASEETY"))
                return key == null ? null : Convert.ToString(key.GetValue(name));
        }

        private void LoadEnvironment(string file)
        {
            foreach (string raw in File.ReadAllLines(file))
            {
                string line = raw.Trim();
                if (line.Length == 0 || line.StartsWith("#")) continue;
                int equals = line.IndexOf('=');
                if (equals <= 0) continue;
                string key = line.Substring(0, equals).Trim();
                string value = line.Substring(equals + 1).Trim();
                if (value.Length >= 2 && ((value[0] == '"' && value[value.Length - 1] == '"') || (value[0] == '\'' && value[value.Length - 1] == '\'')))
                    value = value.Substring(1, value.Length - 2);
                Environment.SetEnvironmentVariable(key, value, EnvironmentVariableTarget.Process);
            }
        }

        private void WriteLog(string message)
        {
            try
            {
                lock (logLock)
                {
                    if (String.IsNullOrEmpty(logPath)) return;
                    FileInfo info = new FileInfo(logPath);
                    if (info.Exists && info.Length > 10 * 1024 * 1024)
                    {
                        string previous = logPath + ".1";
                        if (File.Exists(previous)) File.Delete(previous);
                        File.Move(logPath, previous);
                    }
                    File.AppendAllText(logPath, DateTime.UtcNow.ToString("o") + " " + message + Environment.NewLine);
                }
            }
            catch { }
        }

        public static void Main()
        {
            ServiceBase.Run(new ServiceBase[] { new TASEETYService() });
        }
    }
}
