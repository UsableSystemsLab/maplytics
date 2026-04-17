#!/bin/bash

# --- CONFIGURATION ---
TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6IjNiMDk1NzQ3YmY4MzMxZWE0YWQ1M2YzNzBjNjMyNjAxNzliMGQyM2EiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vbWFwbHl0aWNzYXV0aCIsImF1ZCI6Im1hcGx5dGljc2F1dGgiLCJhdXRoX3RpbWUiOjE3NzYyNjY5ODAsInVzZXJfaWQiOiJ4QzlqVEVJYWZpY041cUplOVJkVzAxbW1IaTAyIiwic3ViIjoieEM5alRFSWFmaWNONXFKZTlSZFcwMW1tSGkwMiIsImlhdCI6MTc3NjQ0NTAzMCwiZXhwIjoxNzc2NDQ4NjMwLCJlbWFpbCI6InVzZXJAdXNlci5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidXNlckB1c2VyLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.pnxhI-lKQEv5gzLiM_ddejk8MLndh2kCbcm7NxiS24olCd4-o6U8EszAZLPLFRddXXSac1CITOdkBv0MmMtcmmzxfBbHyC0OvMTfkvhbx0yCQJxRg1sETza96cPRwo1utQdLiDUq6Y-CgfUPjqfHw_Quw7GMkIGvkCDySnveYuobKnEPH12TyRlwN8UtB-2MoITSICo4tYcUd2JoYziEJJAaWOka3m3JNhOz_HaTilFssK6xRLrXB0_fCZDyb82iD8NWY3CO4U8L-gLK9KW6KQ4oyq2fg9RAxAE-UoojyZP26duOeBf-tblhOH8gyax_iC1qYdMPbi_LOm-Oh1k_VA"
API_URL="http://localhost:4000/api/datasets/upload/public"
SCRIPT_DIR=$(dirname "$0")
FILES_DIR="$SCRIPT_DIR/files"

echo "Using API URL: $API_URL"
echo "-----------------------------------"

# List of files to test
FILES=("valid.json" "valid.geojson" "valid.sql" "dummy.xlsx" "invalid.txt" "invalid.py")

for FILE in "${FILES[@]}"; do
    FILE_PATH="$FILES_DIR/$FILE"
    
    echo "Testing file: $FILE"
    
    if [ ! -f "$FILE_PATH" ]; then
        echo "Error: File not found at $FILE_PATH"
        echo "-----------------------------------"
        continue
    fi

    # Send the request using curl
    RESPONSE=$(curl -s -S -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$API_URL" \
      -H "Authorization: Bearer $TOKEN" \
      -F "file=@$FILE_PATH" \
      -F "name=Test-$FILE" 2>&1)

    # Extract status
    STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
    # If STATUS is empty, curl probably failed to connect or had some other fatal error
    if [ -z "$STATUS" ] || [ "$STATUS" == "000" ]; then
        STATUS="000 (Check if server is running at $API_URL)"
        ERROR_MSG=$(echo "$RESPONSE" | grep -v "HTTP_STATUS")
        RESPONSE="cURL Error: $ERROR_MSG"
    else
        RESPONSE=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
    fi

    echo "Status: $STATUS"
    echo "Response: $RESPONSE"
    echo "-----------------------------------"
done
