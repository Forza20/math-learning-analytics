# Run dbt locally with the connection details from .env.
# Usage:  .\dbt.ps1 build        .\dbt.ps1 test --select answers
$root = $PSScriptRoot
& "$root\.venv\Scripts\dotenv.exe" -f "$root\.env" run -- "$root\.venv\Scripts\dbt.exe" @args --project-dir "$root\dbt" --profiles-dir "$root\dbt"
exit $LASTEXITCODE
