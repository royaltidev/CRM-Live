<#
.SYNOPSIS
    Instala/repara o ambiente Docker Compose do CRM Live num PC Windows.

.DESCRIPTION
    Automatiza a parte repetitiva da instalação em Windows (docs/FSD.md, seção
    25, item 26 — o "detalhamento do processo de deploy" ainda não tinha um
    script até esta versão):
      1. Confere se backend/app/config/settings.js e frontend/.env existem
         (nunca são versionados — contêm credenciais). Se faltarem, cria a
         partir do exemplo e PARA para você preencher os valores reais.
      2. Confere se o Docker Desktop está respondendo; se não, tenta reiniciar
         (processo + WSL2) com retry antes de desistir.
      3. Sobe os containers (docker compose up --build -d).
      4. Roda as migrations do banco (idempotente — seguro rodar de novo).
      5. Opcionalmente popula dados de demonstração (-Seed).

    Não faz nada com segredos: não preenche client id/secret do Google nem
    senha real de banco — isso continua manual, de propósito (docs/FSD.md,
    seção 5.5).

.PARAMETER Seed
    Se passado, roda o script de dados de demonstração após as migrations.

.EXAMPLE
    .\scripts\windows-install.ps1
    .\scripts\windows-install.ps1 -Seed
#>

param(
    [switch]$Seed
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Write-Warn($msg) {
    Write-Host "!! $msg" -ForegroundColor Yellow
}

function Write-Ok($msg) {
    Write-Host "OK $msg" -ForegroundColor Green
}

# Precisa ser executado a partir da raiz do repositório (onde está o
# docker-compose.yml) — evita rodar em pasta errada por engano.
if (-not (Test-Path ".\docker-compose.yml")) {
    Write-Error "docker-compose.yml não encontrado na pasta atual. Rode este script a partir da raiz do repositório (ex.: cd C:\royal-tecnologia\crm-live)."
    exit 1
}

# --- 1. Arquivos de configuração não versionados -----------------------

Write-Step "Verificando arquivos de configuração locais"

$settingsPath = "backend\app\config\settings.js"
$settingsExamplePath = "backend\app\config\settings.example.js"
$envPath = "frontend\.env"
$missingConfig = $false

if (-not (Test-Path $settingsPath)) {
    Write-Warn "$settingsPath não existe — criando a partir do exemplo."
    Copy-Item $settingsExamplePath $settingsPath

    # Gera um session.secret aleatório de verdade (nunca reaproveitar entre
    # ambientes, ver docs/FSD.md) — 32 bytes em hex, mesmo formato sugerido
    # nos comentários do settings.example.js (crypto.randomBytes(32)).
    $secretBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($secretBytes)
    $randomSecret = ($secretBytes | ForEach-Object { $_.ToString('x2') }) -join ''
    (Get-Content $settingsPath) `
        -replace 'CHANGE_ME_WITH_A_STRONG_RANDOM_VALUE', $randomSecret `
        | Set-Content $settingsPath

    Write-Warn "Preencha em $settingsPath ANTES de continuar: crmDatabase.password, googleOAuth.clientId/clientSecret (e uniplusDatabase se for testar a sincronização real)."
    $missingConfig = $true
}

if (-not (Test-Path $envPath)) {
    Write-Warn "$envPath não existe — criando com placeholder."
    "VITE_GOOGLE_CLIENT_ID=CHANGE_ME.apps.googleusercontent.com" | Set-Content $envPath
    Write-Warn "Preencha VITE_GOOGLE_CLIENT_ID em $envPath com o mesmo Client ID usado em settings.js."
    $missingConfig = $true
}

if ($missingConfig) {
    Write-Error "Configuração incompleta. Edite os arquivos indicados acima e rode este script de novo."
    exit 1
}

Write-Ok "Arquivos de configuração presentes."

# --- 2. Docker Desktop pronto -------------------------------------------

function Test-DockerReady {
    docker info *> $null
    return $LASTEXITCODE -eq 0
}

Write-Step "Verificando Docker Desktop"

if (-not (Test-DockerReady)) {
    Write-Warn "Docker não respondeu. Tentando reiniciar o Docker Desktop..."

    Get-Process "Docker Desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
    wsl --shutdown
    Start-Sleep -Seconds 5

    $dockerExe = "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerExe) {
        Start-Process $dockerExe
    } else {
        Write-Error "Não encontrei Docker Desktop.exe em '$dockerExe'. Abra o Docker Desktop manualmente e rode este script de novo."
        exit 1
    }

    $maxRetries = 24  # ~4 minutos
    $attempt = 0
    while (-not (Test-DockerReady) -and $attempt -lt $maxRetries) {
        $attempt++
        Write-Host "  aguardando Docker Desktop iniciar... ($attempt/$maxRetries)"
        Start-Sleep -Seconds 10
    }

    if (-not (Test-DockerReady)) {
        Write-Error "Docker Desktop não respondeu a tempo. Abra a janela do Docker Desktop, veja se pede atualização ou permissão, resolva manualmente e rode este script de novo."
        exit 1
    }
}

Write-Ok "Docker Desktop respondendo."

# --- 3. Subir os containers ----------------------------------------------

Write-Step "Subindo containers (docker compose up --build -d)"
docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose up falhou — veja o erro acima."
    exit 1
}

Write-Step "Aguardando o backend ficar pronto"
# Na primeira subida (volume de node_modules vazio), o docker-entrypoint.sh
# reinstala as dependências dentro do container antes do backend escutar na
# porta 3000 — pode levar bem mais que alguns segundos. Faz polling real no
# health check em vez de uma espera fixa.
$maxHealthRetries = 30  # ~5 minutos
$healthAttempt = 0
$backendReady = $false
while (-not $backendReady -and $healthAttempt -lt $maxHealthRetries) {
    $healthAttempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
        }
    } catch {
        Write-Host "  aguardando backend responder... ($healthAttempt/$maxHealthRetries)"
        Start-Sleep -Seconds 10
    }
}

if (-not $backendReady) {
    Write-Warn "Backend ainda não respondeu no health check. Seguindo mesmo assim — se as migrations falharem, rode 'docker compose logs backend' para ver o que está acontecendo."
}

# --- 4. Migrations ---------------------------------------------------------

Write-Step "Rodando migrations do banco"
docker compose exec -T backend node app/database/migrate.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "Migrations falharam — veja o erro acima (rode 'docker compose logs backend' para mais contexto)."
    exit 1
}

# --- 5. Dados de demonstração (opcional) ------------------------------------

if ($Seed) {
    Write-Step "Populando dados de demonstração"
    docker compose exec -T backend node app/database/seed-demo-data.js
}

Write-Host ""
Write-Ok "Ambiente no ar."
Write-Host "  Frontend: http://localhost:5173"
Write-Host "  Backend health check: http://localhost:3000/health"
Write-Host "  QR code do WhatsApp: docker compose logs -f backend"
Write-Host ""
Write-Host "Primeiro login com Google vira Administrador permanente neste banco." -ForegroundColor Yellow
