$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8787
$server = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $port)
$server.Start()

function Send-Response($stream, $status, $contentType, [byte[]]$body) {
  $statusText = if ($status -eq 200) { "OK" } else { "Not Found" }
  $header = "HTTP/1.1 $status $statusText`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  $stream.Write($body, 0, $body.Length)
}

try {
  while ($true) {
    $client = $server.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $buffer = New-Object byte[] 4096
      $read = $stream.Read($buffer, 0, $buffer.Length)
      $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
      $firstLine = ($request -split "`r`n")[0]
      $parts = $firstLine -split " "
      $requestPath = if ($parts.Length -ge 2) { $parts[1].TrimStart("/") } else { "" }
      $requestPath = [System.Uri]::UnescapeDataString(($requestPath -split "\?")[0])

      if ([string]::IsNullOrWhiteSpace($requestPath)) {
        $requestPath = "index.html"
      }

      $candidatePath = Join-Path $root $requestPath
      if (Test-Path -LiteralPath $candidatePath -PathType Container) {
        $requestPath = Join-Path $requestPath "index.html"
      }

      $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $requestPath))
      $rootFull = [System.IO.Path]::GetFullPath($root)

      if (-not $fullPath.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        Send-Response $stream 404 "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Not found"))
      } else {
        $extension = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
        $contentType = switch ($extension) {
          ".html" { "text/html; charset=utf-8" }
          ".css" { "text/css; charset=utf-8" }
          ".js" { "application/javascript; charset=utf-8" }
          ".svg" { "image/svg+xml" }
          ".png" { "image/png" }
          ".jpg" { "image/jpeg" }
          ".jpeg" { "image/jpeg" }
          ".jfif" { "image/jpeg" }
          default { "application/octet-stream" }
        }
        Send-Response $stream 200 $contentType ([System.IO.File]::ReadAllBytes($fullPath))
      }
    } finally {
      $client.Close()
    }
  }
} finally {
  $server.Stop()
}
