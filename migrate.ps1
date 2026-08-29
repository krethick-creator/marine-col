$ErrorActionPreference = "Stop"

# Create target directories
$dirs = @("client", "server", "agents", "data", "config", "shared")
foreach ($dir in $dirs) {
    $path = "d:\marine co\src\$dir"
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
    }
}
if (-not (Test-Path "d:\marine co\public")) {
    New-Item -ItemType Directory -Force -Path "d:\marine co\public" | Out-Null
}

# Move frontend/src to src/client
if (Test-Path "d:\marine co\frontend\src") {
    Get-ChildItem -Path "d:\marine co\frontend\src\*" -Recurse | Where-Object { $_.PSIsContainer -eq $false } | ForEach-Object {
        $relativePath = $_.FullName.Substring("d:\marine co\frontend\src\".Length)
        $destination = Join-Path "d:\marine co\src\client" $relativePath
        $destDir = Split-Path $destination
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        Move-Item -Path $_.FullName -Destination $destination -Force
    }
}

# Move backend/src to src/server
if (Test-Path "d:\marine co\backend\src") {
    Get-ChildItem -Path "d:\marine co\backend\src\*" -Recurse | Where-Object { $_.PSIsContainer -eq $false } | ForEach-Object {
        $relativePath = $_.FullName.Substring("d:\marine co\backend\src\".Length)
        $destination = Join-Path "d:\marine co\src\server" $relativePath
        $destDir = Split-Path $destination
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        Move-Item -Path $_.FullName -Destination $destination -Force
    }
}

# Move frontend/public to public
if (Test-Path "d:\marine co\frontend\public") {
    Get-ChildItem -Path "d:\marine co\frontend\public\*" -Recurse | Where-Object { $_.PSIsContainer -eq $false } | ForEach-Object {
        $relativePath = $_.FullName.Substring("d:\marine co\frontend\public\".Length)
        $destination = Join-Path "d:\marine co\public" $relativePath
        $destDir = Split-Path $destination
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        Move-Item -Path $_.FullName -Destination $destination -Force
    }
}

# Move specific config files
$filesToMove = @(
    @("d:\marine co\backend\.env", "d:\marine co\.env"),
    @("d:\marine co\backend\.env.example", "d:\marine co\.env.example"),
    @("d:\marine co\frontend\index.html", "d:\marine co\index.html"),
    @("d:\marine co\frontend\tailwind.config.ts", "d:\marine co\tailwind.config.ts"),
    @("d:\marine co\frontend\tsconfig.node.json", "d:\marine co\tsconfig.node.json"),
    @("d:\marine co\frontend\tsconfig.app.json", "d:\marine co\tsconfig.app.json")
)

foreach ($file in $filesToMove) {
    if (Test-Path $file[0]) {
        Move-Item -Path $file[0] -Destination $file[1] -Force
    }
}

# Patch index.html imports
$indexHtml = "d:\marine co\index.html"
if (Test-Path $indexHtml) {
    (Get-Content $indexHtml) -replace '/src/main.tsx', '/src/client/main.tsx' | Set-Content $indexHtml
}

# Remove old directories
if (Test-Path "d:\marine co\frontend") { Remove-Item -Recurse -Force "d:\marine co\frontend" }
if (Test-Path "d:\marine co\backend") { Remove-Item -Recurse -Force "d:\marine co\backend" }

Write-Host "Migration complete!"
