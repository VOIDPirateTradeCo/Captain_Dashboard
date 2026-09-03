$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Cred {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public uint Flags;
        public uint Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredRead(string target, uint type, int reservedFlag, out IntPtr credentialPtr);
    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern void CredFree(IntPtr credentialPtr);
}
"@

function Read-Target($target) {
    $ptr = [IntPtr]::Zero
    $ok = [Cred]::CredRead($target, 1, 0, [ref]$ptr)
    if (-not $ok) { Write-Output "${target}=NOT_FOUND"; return }
    $cred = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type]::GetType("Cred+CREDENTIAL"))
    $blobSize = $cred.CredentialBlobSize
    $bytes = New-Object byte[] $blobSize
    if ($blobSize -gt 0) {
        [Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $blobSize)
    }
    $secret = [System.Text.Encoding]::Unicode.GetString($bytes)
    [Cred]::CredFree($ptr)
    Write-Output "${target}=${secret}"
}

$targets = @(
    'TRELLO_KEY@VOID_Pirate_Secrets',
    'TRELLO_SECRET@VOID_Pirate_Secrets',
    'TRELLO_TOKEN@VOID_Pirate_Secrets'
)
foreach ($t in $targets) { Read-Target $t }
