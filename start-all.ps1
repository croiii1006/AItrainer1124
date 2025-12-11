# ===========================================
# AI Sales Trainer 快速启动脚本（无Whisper自动启动）
# ===========================================

Write-Host "`n=== Starting AI Sales Trainer (Frontend + Backend) ===`n" -ForegroundColor Cyan

# -------------------------------
# 1. 启动后端 server（3001）
# -------------------------------
Write-Host "[1/2] Starting Backend on port 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoProfile -Command `"cd backend; node index.js`"" -WindowStyle Normal

Start-Sleep -Seconds 1

# -------------------------------
# 2. 启动前端 vite（8080）
# -------------------------------
Write-Host "[2/2] Starting Frontend on port 8080..." -ForegroundColor Yellow
Start-Process cmd "/k npm run dev" -WindowStyle Normal

# -------------------------------
# 结束提示
# -------------------------------
Write-Host "Frontend running at: http://localhost:8080"
Write-Host "Backend running at:  http://localhost:3001"
Write-Host "Whisper not auto-started. Run manually if needed:"
Write-Host "  conda activate py39env"
Write-Host "  cd your-whisper-path"
Write-Host "  uvicorn whisper_server:app --reload --port 8000"


$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
