#!/bin/sh
# Entrypoint do container do backend.
#
# O volume nomeado "crm_live_backend_node_modules" (docker-compose.yml)
# persiste entre rebuilds da imagem — necessário para não sobrescrever o
# node_modules do container com o node_modules do host (arquitetura
# diferente em desenvolvimento local, macOS vs Linux). Só que isso também
# significa que um `docker compose up --build` num ambiente que JÁ tinha
# esse volume não atualiza node_modules automaticamente quando uma
# dependência nova é adicionada em package.json — o volume antigo continua
# montado por cima do que a imagem acabou de instalar, e o processo cai
# com "Cannot find module" no boot.
#
# Aqui comparamos um hash de package-lock.json com o hash salvo da última
# instalação (dentro do próprio volume) e reinstalamos automaticamente
# quando divergem — importante para o requisito de rodar 24/7 sem
# supervisão (AGENTS.md): depois de um `git pull` + restart em produção,
# isso se autocorrige sem precisar de intervenção manual no volume.

set -e

# Locks órfãos do Chromium (whatsapp-web.js/Puppeteer) do container
# anterior. O perfil do Chromium (backend/app/storage/whatsapp-session/) é
# persistido fora do container (bind mount), mas os arquivos Singleton* que
# o Chromium usa pra evitar dois processos concorrentes no MESMO perfil
# ficam "presos" quando o container anterior morre sem encerrar o Chromium
# de forma graciosa (ex.: `docker compose up --build`/recreate) — o erro
# resultante é "The profile appears to be in use by another Chromium
# process (...) on another computer". Como esta é uma arquitetura de
# instância única (um único backend rodando por vez, FSD seção 3), um
# container que está subindo agora nunca vai conflitar de verdade com um
# processo de um container anterior (que já não existe mais) — é sempre
# seguro limpar esses locks no boot.
rm -f app/storage/whatsapp-session/session/SingletonLock \
      app/storage/whatsapp-session/session/SingletonCookie \
      app/storage/whatsapp-session/session/SingletonSocket \
      2>/dev/null || true

STAMP_FILE="node_modules/.install-hash"
CURRENT_HASH=$(md5sum package-lock.json | awk '{print $1}')

if [ ! -f "$STAMP_FILE" ] || [ "$(cat "$STAMP_FILE" 2>/dev/null)" != "$CURRENT_HASH" ]; then
  echo "[entrypoint] Dependências desatualizadas (package-lock.json mudou) — rodando npm install..."
  npm install --omit=dev
  echo "$CURRENT_HASH" > "$STAMP_FILE"
fi

exec "$@"
