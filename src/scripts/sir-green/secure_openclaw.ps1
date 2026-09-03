$p = 'C:\Users\kidsm\.openclaw\openclaw.json'
$acl = Get-Acl $p
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule('kidsm','FullControl','Allow')
$acl.SetAccessRule($rule)
Set-Acl $p $acl
Get-Acl $p | Format-List
