# Registro de Erros — CRM Live

Este arquivo registra erros encontrados durante o desenvolvimento, sua causa, a solução aplicada e como evitá-los no futuro. Ao terminar qualquer trabalho que tenha envolvido a resolução de um erro relevante, adicione uma nova entrada abaixo, seguindo o modelo.

Não registre aqui dados sensíveis, credenciais, tokens ou dados pessoais de clientes — apenas a descrição técnica do problema e da solução.

## Modelo de registro

```text
## <data> - <título curto do erro>
- Sintoma:
- Causa:
- Solução aplicada:
- Como evitar no futuro:
```

---

## 12/08/2026 - Botão "Entrar com Google" não aparecia na tela de login
- Sintoma: `frontend/src/views/Login.jsx` carregava normalmente, mas o botão do Google Sign-In nunca aparecia (div `#google-signin-button` ficava vazia), mesmo com `VITE_GOOGLE_CLIENT_ID` configurado corretamente.
- Causa: o script `https://accounts.google.com/gsi/client` é carregado de forma assíncrona (`script.async = true`). O `useEffect` que chama `window.google.accounts.id.initialize()` e `renderButton()` rodava só uma vez, na montagem do componente (array de dependências vazio) — se `window.google` ainda não existisse nesse instante (caso comum, já que o script é async), a checagem `window.google?.accounts?.id` falhava silenciosamente e o efeito nunca era executado de novo.
- Solução aplicada: `useGoogleSignIn()` agora expõe um estado `isLoaded`, setado via `script.onload`. O efeito de `initialize`/`renderButton` passou a depender desse estado (`useEffect(..., [isGoogleScriptLoaded])`), garantindo que só roda depois que o script termina de carregar.
- Como evitar no futuro: qualquer integração que dependa de um script externo carregado via `<script async>` precisa de um sinal explícito de "carregado" (evento `onload`, Promise, ou biblioteca de carregamento) antes de usar o objeto global que o script expõe — nunca assumir que ele já existe num efeito que roda só na montagem.

---

## 12/08/2026 - Proxy do Vite incompleto e apontando para o alvo errado dentro do Docker
- Sintoma: rodando pela primeira vez dentro do Docker Compose (não mais só sandbox com mocks), `GET /auth/me` retornava 500 em vez de 401; e, ao testar mais adiante, todas as chamadas de API das Fases 4-7 (`/customers`, `/tags`, `/sellers`, `/segments`, `/consent`, `/messages`, `/sync`, `/automation-rules`, `/winback`) não tinham nenhuma entrada de proxy configurada.
- Causa: `frontend/vite.config.js` só tinha proxy para `/auth` e `/users` (configurado na Fase 3) — nenhuma fase seguinte atualizou esse arquivo ao adicionar rotas novas, porque os testes anteriores sempre validaram via `curl` direto contra o backend (porta 3000 exposta no host), nunca através do proxy de desenvolvimento do próprio frontend. Além disso, o `target` do proxy estava fixo em `http://localhost:3000` — que, de dentro do container do frontend, aponta para o próprio container (não existe backend rodando lá), e não para o container do backend.
- Solução aplicada: todos os prefixos de rota da API foram adicionados a `apiPrefixes` em `vite.config.js`; o `target` passou a ser configurável via `process.env.VITE_BACKEND_URL` (com fallback para `http://localhost:3000`, usado fora do Docker). `docker-compose.yml` agora define `VITE_BACKEND_URL: http://backend:3000` no serviço `frontend`, usando o nome do serviço (resolvido pela rede interna do Compose).
- Como evitar no futuro: ao adicionar uma rota nova de API em qualquer Controller, adicionar o prefixo correspondente em `frontend/vite.config.js` na mesma tarefa — e testar pelo menos uma vez através da UI real (não só `curl` direto no backend), já que o proxy de desenvolvimento é uma camada adicional que `curl` não exercita.

---

## 12/08/2026 - Puppeteer (whatsapp-web.js) falhando ao inicializar em container Alpine num Mac Apple Silicon
- Sintoma: `[whatsapp] Erro ao inicializar o cliente do WhatsApp Web: Failed to launch the browser process` com `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2` no log do backend.
- Causa: o Puppeteer (dependência de `whatsapp-web.js`) baixa por padrão um binário Chromium x86_64 durante o `npm install`. A imagem `node:22-alpine` usada no `backend/Dockerfile` é baseada em musl (não glibc) e, rodando num host Apple Silicon (ARM), o container é construído nativamente para arm64 — o binário x86_64 do Chromium não roda nele, e a tentativa de tradução via Rosetta falha porque falta o linker dinâmico glibc (`/lib64/ld-linux-x86-64.so.2`) que o Alpine/musl não tem.
- Solução aplicada: `backend/Dockerfile` passou a instalar o Chromium nativo do Alpine via `apk add --no-cache chromium` e configurar `PUPPETEER_SKIP_DOWNLOAD=true` + `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser` (env vars que o pacote `puppeteer` respeita nativamente, documentadas no próprio link de troubleshooting que aparecia no erro). Isso evita o download do binário incompatível e também não depende de `storage.googleapis.com` (que já tinha falhado por rede restrita em sessão anterior, ver entrada de 08/08/2026 abaixo). Deve funcionar sem alteração em produção (PC Windows x86_64), já que o pacote `chromium` do Alpine é resolvido pela arquitetura de cada build.
- Como evitar no futuro: em qualquer projeto Node rodando Puppeteer/Chromium dentro de Docker, preferir instalar o Chromium via gerenciador de pacotes da distro base (compilado pra arquitetura correta do build) em vez de depender do download automático do Puppeteer — mais robusto tanto pra ambientes ARM quanto pra redes com acesso restrito.

---

## 12/08/2026 - Envio de mensagem WhatsApp falhando com "No LID for user"
- Sintoma: ao processar a fila de mensagens (`message-queue-job`), o envio real (`client.sendMessage`) falhava com o erro `No LID for user` para números que ainda não tinham nenhum contato/conversa prévia na sessão do WhatsApp conectada.
- Causa: `sendText`/`sendImage` em `backend/app/integrations/whatsapp/providers/whatsapp-web-provider.js` montavam o id do chat só concatenando os dígitos do telefone (`formatChatId` → `"<numero>@c.us"`) e chamavam `client.sendMessage()` direto com esse id "adivinhado". O WhatsApp exige a resolução prévia do identificador real do contato (sistema "LID") via `client.getNumberId()` antes de enviar — que `checkNumberStatus` (Fase 4) já fazia corretamente, mas que nunca tinha sido aplicado ao caminho de envio de mensagem em si, porque nenhum teste anterior enviou de fato pra um número real fora da sessão.
- Solução aplicada: nova função `resolveChatId(phoneE164)` (chama `client.getNumberId()` e lança erro claro se o número não tiver WhatsApp), usada tanto por `sendText` quanto por `sendImage` no lugar da concatenação direta.
- Como evitar no futuro: qualquer chamada a `client.sendMessage()` (ou `sendImage`) na camada de mensageria deve sempre passar por `resolveChatId()` — nunca montar o id do chat manualmente a partir do telefone. Validado enviando de verdade para 2 números reais (não cadastrados na sessão) e confirmando o recebimento.

---

## 07/08/2026 - `git commit`/`git branch -M` falhando com "index.lock: File exists" / "Another git process seems to be running"
- Sintoma: `git commit` e `git branch -M main` falhavam com erro de trava (`.git/index.lock`, `.git/HEAD.lock`, `.git/refs/heads/master.lock` "File exists"), mesmo sem nenhum processo Git realmente em execução. Já havia sido registrado como bloqueio na sessão anterior (ver `docs/STATUS.md` da Fase 1).
- Causa: o ambiente de execução (sandbox desta sessão) permite operações de escrita e de renomeação (`mv`/`rename`) dentro da pasta do projeto, mas **não permite excluir arquivos** (`rm`/`unlink`). O Git usa arquivos de trava temporários que, ao final de operações internas (gravação de objetos soltos, atualização de refs, limpeza de trava), tenta apagar (`unlink`) — e essa exclusão falha nesse ambiente, deixando travas "fantasmas" para trás que bloqueiam a próxima operação.
- Solução aplicada: em vez de `rm -f` nas travas, usar `mv` (renomear) para tirá-las do caminho esperado pelo Git (ex.: `mv .git/index.lock .git/index.lock.stale`). Como `mv` funciona normalmente nesse ambiente, isso libera a trava sem precisar excluir o arquivo. Da mesma forma, a troca de nome de branch (`git branch -M main`) foi substituída por `git checkout -b main` (cria a branch nova sem precisar apagar a `master` antiga) — a branch `master` ficou como resíduo local inofensivo, removível manualmente depois (`git branch -d master`) em um ambiente sem essa restrição.
- Como evitar no futuro: operações de Git neste projeto que dependem de exclusão de arquivo dentro da pasta (`git commit`, `git branch -M`, `git rm -r --cached`, etc.) podem falhar se executadas a partir de um ambiente sandbox com essa mesma restrição de exclusão. Nesse caso, usar `mv` para destravar em vez de `rm`, ou executar o comando diretamente no Terminal do computador do responsável, onde essa restrição não existe.

---

## 08/08/2026 - `npm install` falhando no backend com "No matching version found for jsonwebtoken@^9.1.2"
- Sintoma: ao rodar `npm install` em `backend/` (Fase 5, durante teste de integração), o comando falhava com `ETARGET` / `No matching version found for jsonwebtoken@^9.1.2`.
- Causa: o `backend/package.json` foi criado na Fase 3 com `"jsonwebtoken": "^9.1.2"`, mas essa versão nunca existiu no npm — a última versão publicada da major 9 é `9.0.3`. Provavelmente um número de versão digitado incorretamente durante a Fase 3, e que não tinha sido detectado porque `npm install` não havia sido executado de fato até este teste da Fase 5.
- Solução aplicada: corrigido para `"jsonwebtoken": "^9.0.2"` em `backend/package.json`. `npm install` passou a funcionar normalmente.
- Como evitar no futuro: sempre que adicionar ou alterar uma dependência em `package.json`, rodar `npm install` de fato (não apenas editar o arquivo) antes de considerar a tarefa concluída — isso teria detectado o erro já na Fase 3. A partir da Fase 5, `npm install` + `npx vite build` (frontend) e `node app/main.js` (backend) passaram a fazer parte da rotina de validação antes de finalizar uma fase.

---

## 08/08/2026 - `npm install` do backend falhando ao instalar `whatsapp-web.js` (download do Chromium pelo Puppeteer bloqueado)
- Sintoma: ao rodar `npm install` em `backend/` (Fase 6, depois de adicionar `whatsapp-web.js`), o comando falhava com `Error: ERROR: Failed to set up chrome v146.0.7680.31! ... Download failed: server returned code 403` ao tentar baixar o binário do Chromium usado pelo Puppeteer (dependência do `whatsapp-web.js`).
- Causa: o ambiente sandbox desta sessão de desenvolvimento tem acesso de rede restrito (allowlist de domínios) e não conseguiu baixar o binário do Chromium a partir de `storage.googleapis.com`. Isso é uma limitação do ambiente de desenvolvimento remoto usado nesta sessão, não do código do projeto.
- Solução aplicada: rodei `PUPPETEER_SKIP_DOWNLOAD=true npm install` apenas para validar que os módulos Node.js resolvem corretamente (contrato de imports, `require('whatsapp-web.js')` funcionando) — sem o binário do Chromium, não é possível testar uma conexão real do WhatsApp Web nesta sessão. O `node app/main.js` foi executado mesmo assim: a falha de inicialização foi capturada graciosamente pelo try/catch do provider (`backend/app/integrations/whatsapp/providers/whatsapp-web-provider.js`), sem derrubar o servidor.
- Como evitar no futuro: **este erro não deve ocorrer no ambiente Docker real do usuário** (rede completa, sem restrição de allowlist) — mas, no primeiro `docker compose up --build` em qualquer ambiente novo (desenvolvimento local do responsável ou produção no PC da loja), vale conferir os logs do build do container `backend` para confirmar que o download do Chromium completou com sucesso. Se o mesmo erro 403 aparecer em um ambiente com internet normal, verificar se algum firewall/proxy corporativo está bloqueando `storage.googleapis.com`.

---

---

## 07/08/2026 - `git push` para o GitHub falhando (sem chave SSH, remoto apontando para conta/repositório errados)
- Sintoma: sequência de falhas ao conectar o repositório local ao GitHub: (1) `git remote add origin ...` retornando `error: remote origin already exists` (havia um remoto antigo, de uma sessão anterior não documentada, apontando para `https://github.com/royalti/CRM-Live.git`); (2) `git push` retornando `Permission denied (publickey)`; (3) depois de gerar a chave SSH, ainda `Permission denied (publickey)` porque a chave não tinha sido cadastrada na conta GitHub; (4) depois de cadastrar a chave, `ERROR: Repository not found` porque o repositório `royaltidev/CRM-Live` ainda não existia no GitHub (só havia sido criado localmente o remoto apontando para ele, não o repositório em si).
- Causa: (a) o computador do responsável nunca teve uma chave SSH configurada para o GitHub; (b) o repositório remoto correto (`royaltidev/CRM-Live`) não havia sido de fato criado no site do GitHub antes de configurar o remoto local; (c) o ambiente desta sessão (sandbox) não tem acesso de rede SSH de saída (só HTTPS), então o push não pôde ser feito diretamente por esta sessão, apenas pelo Terminal do responsável.
- Solução aplicada: gerada uma chave SSH nova (`ssh-keygen -t ed25519`) no computador do responsável, adicionada ao `ssh-agent`/Keychain do macOS e cadastrada em `github.com/settings/ssh/new` na conta `royaltidev`; o remoto local foi corrigido com `git remote set-url origin git@github.com:royaltidev/CRM-Live.git`; o repositório `royaltidev/CRM-Live` foi criado manualmente no GitHub (vazio, sem README/gitignore/license, para não conflitar com o histórico local); `git push -u origin main` concluído com sucesso.
- Como evitar no futuro: antes de configurar `git remote add`, sempre confirmar (1) que o repositório já existe de fato no GitHub (não só a intenção de criá-lo) e (2) que a chave SSH do computador que vai fazer o push está cadastrada na conta correta — especialmente relevante aqui porque a Royal Tecnologia usa mais de uma conta/repositório no GitHub (`royalti` e `royaltidev`), o que facilita configurar o remoto errado por engano.
