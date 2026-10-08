using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

internal sealed class StartupProcess
{
    private readonly object gate = new object();
    private Process running;
    public bool Cancelled { get; private set; }

    public int Run(string root, string logPath)
    {
        using (var log = new StreamWriter(logPath, false, new UTF8Encoding(false)))
        {
            log.AutoFlush = true;
            var logGate = new object();
            Action<string> write = line => { if (line != null) lock (logGate) log.WriteLine(line); };
            write("KK Studio startup " + DateTimeOffset.Now.ToString("o"));
            try
            {
                var batch = Path.Combine(root, "start-kk-studio.bat");
                if (!File.Exists(batch)) throw new FileNotFoundException("Missing startup entry.", batch);
                var info = new ProcessStartInfo(Environment.GetEnvironmentVariable("COMSPEC") ?? "cmd.exe",
                    "/d /s /c \"\"start-kk-studio.bat\" --background\"")
                {
                    WorkingDirectory = root,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    RedirectStandardInput = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8
                };
                using (var child = new Process { StartInfo = info })
                {
                    child.OutputDataReceived += (sender, e) => write(e.Data);
                    child.ErrorDataReceived += (sender, e) => write(e.Data);
                    lock (gate)
                    {
                        if (Cancelled) return 2;
                        child.Start();
                        running = child;
                    }
                    child.StandardInput.Close();
                    child.BeginOutputReadLine();
                    child.BeginErrorReadLine();
                    child.WaitForExit();
                    lock (gate) running = null;
                    write("Exit code: " + child.ExitCode);
                    return Cancelled ? 2 : child.ExitCode;
                }
            }
            catch (Exception error)
            {
                lock (gate) running = null;
                write(error.ToString());
                return Cancelled ? 2 : 1;
            }
        }
    }

    public void Cancel()
    {
        lock (gate)
        {
            Cancelled = true;
            if (running == null || running.HasExited) return;
            var info = new ProcessStartInfo(Path.Combine(Environment.SystemDirectory, "taskkill.exe"),
                "/PID " + running.Id + " /T /F")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using (var killer = Process.Start(info)) killer.WaitForExit();
        }
    }
}

internal sealed class StartupWindow : Form
{
    private readonly StartupProcess startup = new StartupProcess();
    private readonly Label status = new Label();
    private readonly Button cancel = new Button();
    private bool finished;
    public int Result { get; private set; }
    public string ErrorMessage { get; private set; }
    public bool WasCancelled { get { return startup.Cancelled; } }

    public StartupWindow(string root, string logPath)
    {
        Text = "KK Studio";
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        Font = SystemFonts.MessageBoxFont;
        ClientSize = new Size(440, 155);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        Opacity = 0;
        ShowInTaskbar = false;
        status.SetBounds(20, 18, 400, 48);
        status.Text = "正在启动 KK Studio…\n更新后首次启动可能需要一些时间，请稍候。";
        var progress = new ProgressBar { Style = ProgressBarStyle.Marquee };
        progress.SetBounds(20, 75, 400, 14);
        cancel.Text = "取消";
        cancel.SetBounds(340, 110, 80, 28);
        cancel.Click += (sender, e) => Close();
        Controls.AddRange(new Control[] { status, progress, cancel });
        var delay = new System.Windows.Forms.Timer { Interval = 800 };
        delay.Tick += (sender, e) => { delay.Stop(); Opacity = 1; ShowInTaskbar = true; Activate(); };
        FormClosing += (sender, e) =>
        {
            if (finished) return;
            e.Cancel = true;
            cancel.Enabled = false;
            status.Text = "正在取消启动…";
            Task.Factory.StartNew(() => startup.Cancel());
        };
        FormClosed += (sender, e) => delay.Dispose();
        Shown += (sender, e) =>
        {
            delay.Start();
            Task.Factory.StartNew(() =>
            {
                int result;
                try { result = startup.Run(root, logPath); }
                catch (Exception error) { ErrorMessage = error.Message; result = 1; }
                BeginInvoke(new Action(() => { Result = result; finished = true; delay.Stop(); Close(); }));
            });
        };
    }
}

internal static class DesktopLauncher
{
    [STAThread]
    private static int Main()
    {
        var root = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
        string key;
        using (var hash = SHA256.Create())
            key = BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(root.ToLowerInvariant()))).Replace("-", "").Substring(0, 20);
        bool first;
        using (var mutex = new Mutex(true, "Local\\KKStudioStartup-" + key, out first))
        {
            if (!first) return 0;
            try
            {
                var logDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "KK Studio", "logs");
                Directory.CreateDirectory(logDirectory);
                var logPath = Path.Combine(logDirectory, "startup-" + DateTime.Now.ToString("yyyyMMdd-HHmmss-fff") + "-" + key + ".log");
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                using (var window = new StartupWindow(root, logPath))
                {
                    Application.Run(window);
                    if (window.Result != 0 && !window.WasCancelled)
                        MessageBox.Show("KK Studio 未能启动。请检查运行环境后重试。\n\n" +
                            (File.Exists(logPath) ? "详细原因已保存到：\n" + logPath : "日志无法写入：\n" + window.ErrorMessage),
                            "KK Studio 启动失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return window.Result;
                }
            }
            catch (Exception error)
            {
                MessageBox.Show("KK Studio 未能启动：" + error.Message, "KK Studio 启动失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
            finally { mutex.ReleaseMutex(); }
        }
    }
}
