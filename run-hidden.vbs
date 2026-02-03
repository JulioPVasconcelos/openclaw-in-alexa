' Run the VoiceMonkey proxy without opening a console window (Windows)
' Usage (from repo root): wscript.exe run-hidden.vbs

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetAbsolutePathName(".")
WshShell.Run "node voicemonkey-proxy.mjs", 0, False
