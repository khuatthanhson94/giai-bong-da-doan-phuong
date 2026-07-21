$body = '{"username":"admin","password":"admin123"}'
try {
    $result = Invoke-RestMethod -Uri 'https://giai-bong-da-doan-phuong-tung-thien.vercel.app/api/auth/login' -Method POST -ContentType 'application/json' -Body $body
    Write-Host "SUCCESS"
    $result | ConvertTo-Json
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Host "HTTP Status: $statusCode"
    Write-Host "Response body: $body"
}
