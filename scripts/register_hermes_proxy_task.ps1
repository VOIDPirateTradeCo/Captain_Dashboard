$action = New-ScheduledTaskAction -Execute 'hermes' -Argument 'proxy start --provider nous --port 8645 --host 127.0.0.1' -WorkingDirectory 'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control'
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

$existing = Get-ScheduledTask -TaskName 'VOID_HermesProxy' -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName 'VOID_HermesProxy' -Confirm:$false | Out-Null
    Write-Host 'Removed existing VOID_HermesProxy task'
}

Register-ScheduledTask -TaskName 'VOID_HermesProxy' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

$task = Get-ScheduledTask -TaskName 'VOID_HermesProxy'
Write-Host "Task registered: $($task.TaskName)"
Write-Host "State: $($task.State)"
Write-Host "StartBoundary: $($task.Triggers.StartBoundary)"
