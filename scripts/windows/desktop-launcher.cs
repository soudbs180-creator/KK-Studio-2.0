using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
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
    private readonly Label subtitle = new Label();
    private readonly Button cancel = new Button();
    private bool finished;
    public int Result { get; private set; }
    public string ErrorMessage { get; private set; }
    public bool WasCancelled { get { return startup.Cancelled; } }

    public StartupWindow(string root, string logPath)
    {
        Text = "KK Studio";
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        Font = new Font("Microsoft YaHei UI", 16f, FontStyle.Regular, GraphicsUnit.Pixel);
        ClientSize = new Size(680, 360);
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(26, 26, 26);
        ForeColor = Color.FromArgb(219, 219, 219);
        DoubleBuffered = true;
        KeyPreview = true;
        Opacity = 0;
        ShowInTaskbar = false;
        var mark = new PictureBox
        {
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = BackColor
        };
        using (var icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath))
        {
            if (icon != null) mark.Image = icon.ToBitmap();
        }
        var title = new Label
        {
            Text = "KK Studio",
            TextAlign = ContentAlignment.MiddleCenter,
            ForeColor = Color.FromArgb(219, 219, 219),
            BackColor = BackColor,
            Font = new Font(Font.FontFamily, 28f, FontStyle.Bold, GraphicsUnit.Pixel)
        };
        subtitle.Text = "正在启动工作空间";
        subtitle.TextAlign = ContentAlignment.MiddleCenter;
        subtitle.ForeColor = Color.FromArgb(160, 160, 160);
        subtitle.BackColor = BackColor;
        subtitle.Font = new Font(Font.FontFamily, 16f, FontStyle.Bold, GraphicsUnit.Pixel);
        var caption = new Label
        {
            Text = "展示品牌并读取本地启动参数",
            TextAlign = ContentAlignment.MiddleCenter,
            ForeColor = Color.FromArgb(160, 160, 160),
            BackColor = BackColor,
            Font = new Font(Font.FontFamily, 12f, FontStyle.Regular, GraphicsUnit.Pixel)
        };
        cancel.Text = "取消";
        cancel.FlatStyle = FlatStyle.Flat;
        cancel.FlatAppearance.BorderSize = 0;
        cancel.BackColor = Color.FromArgb(27, 27, 27);
        cancel.ForeColor = Color.FromArgb(160, 160, 160);
        cancel.Font = new Font(Font.FontFamily, 16f, FontStyle.Regular, GraphicsUnit.Pixel);
        cancel.Cursor = Cursors.Hand;
        cancel.Click += (sender, e) => Close();
        KeyDown += (sender, e) => { if (e.KeyCode == Keys.Escape) Close(); };
        const int width = 680;
        var top = 70;
        mark.SetBounds((width - 56) / 2, top, 56, 56);
        top += 68;
        title.SetBounds(40, top, width - 80, 36);
        top += 48;
        subtitle.SetBounds(40, top, width - 80, 24);
        top += 36;
        caption.SetBounds(40, top, width - 80, 16);
        top += 28;
        cancel.SetBounds((width - 96) / 2, top, 96, 40);
        using (var pill = Rounded(new Rectangle(0, 0, 96, 40), 20))
            cancel.Region = new Region(pill);
        Controls.AddRange(new Control[] { mark, title, subtitle, caption, cancel });
        using (var outline = Rounded(new Rectangle(0, 0, width, 360), 16))
            Region = new Region(outline);
        var delay = new System.Windows.Forms.Timer { Interval = 800 };
        delay.Tick += (sender, e) => { delay.Stop(); Opacity = 1; ShowInTaskbar = true; Activate(); };
        FormClosing += (sender, e) =>
        {
            if (finished) return;
            e.Cancel = true;
            cancel.Enabled = false;
            subtitle.Text = "正在取消启动…";
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

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        using (var pen = new Pen(Color.FromArgb(60, 60, 60)))
        using (var outline = Rounded(new Rectangle(0, 0, Width - 1, Height - 1), 16))
            e.Graphics.DrawPath(pen, outline);
        using (var pen = new Pen(Color.FromArgb(60, 60, 60)))
        using (var outline = Rounded(cancel.Bounds, 20))
            e.Graphics.DrawPath(pen, outline);
    }

    private static GraphicsPath Rounded(Rectangle bounds, int radius)
    {
        var path = new GraphicsPath();
        var diameter = radius * 2;
        path.AddArc(bounds.X, bounds.Y, diameter, diameter, 180, 90);
        path.AddArc(bounds.Right - diameter, bounds.Y, diameter, diameter, 270, 90);
        path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(bounds.X, bounds.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
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
