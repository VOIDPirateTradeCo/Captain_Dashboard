$tasks = Get-ScheduledTask | Where-Object { $_.TaskName -like "VOID*" -or $_.TaskName -like "*Fleet*" -or $_.TaskName -like "*docker*" -or $_.TaskName -like "*hive*" -or $_.TaskName -like "*dashboard*" }
$results = @()
foreach ($t in $tasks) {
    $info = Get-ScheduledTaskInfo -TaskName $t.TaskName -TaskPath $t.TaskPath
    $actions = $t.Actions
    foreach ($a in $actions) {
        $exists = Test-Path $a.Execute
        $argExists = $true
        $missingPath = ""
        if ($a.Arguments -match '"([^"]+)"') {
            $argExists = Test-Path $matches[1]
            if (-not $argExists) { $missingPath = $matches[1] }
        }
        $results += [PSCustomObject]@{
            TaskName = $t.TaskName
            State = $t.State
            LastRun = $info.LastRunTime
            NextRun = $info.NextRunTime
            Action = $a.Execute
            Args = $a.Arguments
            ActionExists = $exists
            ArgExists = $argExists
            MissingPath = $missingPath
        }
    }
}
$results | Export-Csv -Path "C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\dashboard\fleet\scheduled_tasks_audit.csv" -NoTypeInformation -Encoding UTF8
Write-Host "Exported to scheduled_tasks_audit.csv"
$results | Where-Object { $_.ArgExists -eq $false -or $_.ActionExists -eq $false } | Format-Table -AutoSize
