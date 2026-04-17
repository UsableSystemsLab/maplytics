# --- CONFIGURATION ---
$TOKEN = "REPLACE_WITH_YOUR_FIREBASE_ID_TOKEN"
$API_URL = "http://localhost:4000/api/datasets/upload/public"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
if (!$SCRIPT_DIR) { $SCRIPT_DIR = "." }
$FILES_DIR = Join-Path $SCRIPT_DIR "files"

Write-Host "Using API URL: $API_URL" -ForegroundColor Cyan
Write-Host "-----------------------------------"

# List of files to test
$FILES = @("valid.json", "valid.geojson", "valid.sql", "dummy.xlsx", "invalid.txt", "invalid.py")

foreach ($FILE in $FILES) {
    $FILE_PATH = Join-Path $FILES_DIR $FILE
    
    Write-Host "Testing file: $FILE" -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Authorization" = "Bearer $TOKEN"
        }
        
        $response = Invoke-RestMethod -Uri $API_URL -Method Post -Headers $headers -Form @{
            file = Get-Item $FILE_PATH
            name = "Test-$FILE"
        }
        
        Write-Host "Status: Success" -ForegroundColor Green
        $response | ConvertTo-Json | Write-Host
    }
    catch {
        Write-Host "Status: Failed" -ForegroundColor Red
        $_.Exception.Message | Write-Host
        if ($_.ErrorDetails) {
            $_.ErrorDetails.Message | Write-Host
        }
    }
    
    Write-Host "-----------------------------------"
}
