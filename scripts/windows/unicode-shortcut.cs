using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;

public sealed class KKShortcutInfo
{
    public string Path { get; set; }
    public string Target { get; set; }
    public string Arguments { get; set; }
    public string WorkingDirectory { get; set; }
    public string Icon { get; set; }
    public int WindowStyle { get; set; }
}

public static class KKUnicodeShortcut
{
    public static void Write(string path, string executable, string directory, string description)
    {
        var link = (IShellLinkW)new ShellLink();
        try
        {
            link.SetPath(executable);
            link.SetArguments("");
            link.SetWorkingDirectory(directory);
            link.SetIconLocation(executable, 0);
            link.SetShowCmd(1);
            link.SetDescription(description);
            ((IPersistFile)link).Save(path, true);
        }
        finally { Marshal.FinalReleaseComObject(link); }
    }

    public static KKShortcutInfo Read(string path)
    {
        var link = (IShellLinkW)new ShellLink();
        try
        {
            ((IPersistFile)link).Load(path, 0);
            var target = new StringBuilder(32768);
            var arguments = new StringBuilder(32768);
            var directory = new StringBuilder(32768);
            var icon = new StringBuilder(32768);
            int iconIndex, showCommand;
            link.GetPath(target, target.Capacity, IntPtr.Zero, 4);
            link.GetArguments(arguments, arguments.Capacity);
            link.GetWorkingDirectory(directory, directory.Capacity);
            link.GetIconLocation(icon, icon.Capacity, out iconIndex);
            link.GetShowCmd(out showCommand);
            return new KKShortcutInfo {
                Path = path, Target = target.ToString(), Arguments = arguments.ToString(),
                WorkingDirectory = directory.ToString(), Icon = icon + "," + iconIndex,
                WindowStyle = showCommand
            };
        }
        finally { Marshal.FinalReleaseComObject(link); }
    }

    [ComImport, Guid("00021401-0000-0000-C000-000000000046")]
    private class ShellLink { }

    // Keep the native vtable order; every string crosses the explicit Unicode interface.
    // https://learn.microsoft.com/windows/win32/api/shobjidl_core/nn-shobjidl_core-ishelllinkw
    [ComImport, Guid("000214F9-0000-0000-C000-000000000046")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellLinkW
    {
        void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder path, int count, IntPtr data, uint flags);
        void GetIDList(out IntPtr items);
        void SetIDList(IntPtr items);
        void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder description, int count);
        void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string description);
        void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder directory, int count);
        void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string directory);
        void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder arguments, int count);
        void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string arguments);
        void GetHotkey(out ushort hotkey);
        void SetHotkey(ushort hotkey);
        void GetShowCmd(out int command);
        void SetShowCmd(int command);
        void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder icon, int count, out int index);
        void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string icon, int index);
        void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string path, uint reserved);
        void Resolve(IntPtr window, uint flags);
        void SetPath([MarshalAs(UnmanagedType.LPWStr)] string path);
    }
}
