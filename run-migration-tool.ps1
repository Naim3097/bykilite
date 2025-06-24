# BYKI LITE Data Migration Script
# This script runs the data migration tool in a local web server

Write-Host "🚀 BYKI LITE Data Migration Tool" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python to run the local server." -ForegroundColor Red
    Write-Host "💡 You can also open migration-tool.html directly in your browser." -ForegroundColor Yellow
    exit 1
}

# Start local HTTP server
Write-Host "🌐 Starting local web server..." -ForegroundColor Yellow
Write-Host "📁 Server will serve files from current directory" -ForegroundColor Gray

# Try to find an available port
$port = 8080
$serverStarted = $false

for ($i = 0; $i -lt 10; $i++) {
    try {
        $testPort = $port + $i
        Write-Host "🔍 Trying port $testPort..." -ForegroundColor Gray
        
        # Start Python HTTP server in background
        $serverProcess = Start-Process -FilePath "python" -ArgumentList "-m", "http.server", $testPort -PassThru -WindowStyle Hidden
        
        # Wait a moment for server to start
        Start-Sleep -Seconds 2
        
        # Test if server is running
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$testPort" -TimeoutSec 5 -UseBasicParsing
            Write-Host "✅ Server started successfully on port $testPort" -ForegroundColor Green
            $serverStarted = $true
            $actualPort = $testPort
            break
        } catch {
            # Server didn't start properly, kill the process and try next port
            if ($serverProcess -and !$serverProcess.HasExited) {
                Stop-Process -Id $serverProcess.Id -Force
            }
        }
    } catch {
        Write-Host "⚠️ Port $testPort not available, trying next..." -ForegroundColor Yellow
    }
}

if (-not $serverStarted) {
    Write-Host "❌ Could not start server on any port. Please run manually:" -ForegroundColor Red
    Write-Host "   python -m http.server 8080" -ForegroundColor Gray
    Write-Host "   Then open: http://localhost:8080/migration-tool.html" -ForegroundColor Gray
    exit 1
}

# Open browser
$migrationUrl = "http://localhost:$actualPort/migration-tool.html"
Write-Host "🌍 Opening migration tool in browser..." -ForegroundColor Yellow
Write-Host "📍 URL: $migrationUrl" -ForegroundColor Gray

try {
    Start-Process $migrationUrl
} catch {
    Write-Host "⚠️ Could not auto-open browser. Please manually open:" -ForegroundColor Yellow
    Write-Host "   $migrationUrl" -ForegroundColor White
}

Write-Host ""
Write-Host "📋 Migration Instructions:" -ForegroundColor Cyan
Write-Host "1. The migration tool will open in your browser" -ForegroundColor White
Write-Host "2. Click 'Start Migration' to begin the process" -ForegroundColor White
Write-Host "3. Monitor the progress and logs" -ForegroundColor White
Write-Host "4. Validate the migration when complete" -ForegroundColor White
Write-Host ""
Write-Host "⚠️ IMPORTANT NOTES:" -ForegroundColor Yellow
Write-Host "• Make sure you have backups before proceeding" -ForegroundColor White
Write-Host "• The demo user (demo@byki.com) must exist in Firebase Auth" -ForegroundColor White
Write-Host "• This will migrate ALL global collections to user-scoped ones" -ForegroundColor White
Write-Host "• Use the rollback feature if something goes wrong" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Server is running. Press Ctrl+C to stop the server when done." -ForegroundColor Green

# Keep script running until user stops it
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if server process is still running
        if ($serverProcess.HasExited) {
            Write-Host "❌ Server process has stopped unexpectedly." -ForegroundColor Red
            break
        }
    }
} catch {
    # User pressed Ctrl+C
    Write-Host ""
    Write-Host "🛑 Stopping server..." -ForegroundColor Yellow
} finally {
    # Clean up server process
    if ($serverProcess -and !$serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force
        Write-Host "✅ Server stopped." -ForegroundColor Green
    }
}
