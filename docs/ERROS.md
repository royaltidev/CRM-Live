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

## 07/08/2026 - `git commit`/`git branch -M` falhando com "index.lock: File exists" / "Another git process seems to be running"
- Sintoma: `git commit` e `git branch -M main` falhavam com erro de trava (`.git/index.lock`, `.git/HEAD.lock`, `.git/refs/heads/master.lock` "File exists"), mesmo sem nenhum processo Git realmente em execução. Já havia sido registrado como bloqueio na sessão anterior (ver `docs/STATUS.md` da Fase 1).
- Causa: o ambiente de execução (sandbox desta sessão) permite operações de escrita e de renomeação (`mv`/`rename`) dentro da pasta do projeto, mas **não permite excluir arquivos** (`rm`/`unlink`). O Git usa arquivos de trava temporários que, ao final de operações internas (gravação de objetos soltos, atualização de refs, limpeza de trava), tenta apagar (`unlink`) — e essa exclusão falha nesse ambiente, deixando travas "fantasmas" para trás que bloqueiam a próxima operação.
- Solução aplicada: em vez de `rm -f` nas travas, usar `mv` (renomear) para tirá-las do caminho esperado pelo Git (ex.: `mv .git/index.lock .git/index.lock.stale`). Como `mv` funciona normalmente nesse ambiente, isso libera a trava sem precisar excluir o arquivo. Da mesma forma, a troca de nome de branch (`git branch -M main`) foi substituída por `git checkout -b main` (cria a branch nova sem precisar apagar a `master` antiga) — a branch `master` ficou como resíduo local inofensivo, removível manualmente depois (`git branch -d master`) em um ambiente sem essa restrição.
- Como evitar no futuro: operações de Git neste projeto que dependem de exclusão de arquivo dentro da pasta (`git commit`, `git branch -M`, `git rm -r --cached`, etc.) podem falhar se executadas a partir de um ambiente sandbox com essa mesma restrição de exclusão. Nesse caso, usar `mv` para destravar em vez de `rm`, ou executar o comando diretamente no Terminal do computador do responsável, onde essa restrição não existe.

---

## 07/08/2026 - `git push` para o GitHub falhando (sem chave SSH, remoto apontando para conta/repositório errados)
- Sintoma: sequência de falhas ao conectar o repositório local ao GitHub: (1) `git remote add origin ...` retornando `error: remote origin already exists` (havia um remoto antigo, de uma sessão anterior não documentada, apontando para `https://github.com/royalti/CRM-Live.git`); (2) `git push` retornando `Permission denied (publickey)`; (3) depois de gerar a chave SSH, ainda `Permission denied (publickey)` porque a chave não tinha sido cadastrada na conta GitHub; (4) depois de cadastrar a chave, `ERROR: Repository not found` porque o repositório `royaltidev/CRM-Live` ainda não existia no GitHub (só havia sido criado localmente o remoto apontando para ele, não o repositório em si).
- Causa: (a) o computador do responsável nunca teve uma chave SSH configurada para o GitHub; (b) o repositório remoto correto (`royaltidev/CRM-Live`) não havia sido de fato criado no site do GitHub antes de configurar o remoto local; (c) o ambiente desta sessão (sandbox) não tem acesso de rede SSH de saída (só HTTPS), então o push não pôde ser feito diretamente por esta sessão, apenas pelo Terminal do responsável.
- Solução aplicada: gerada uma chave SSH nova (`ssh-keygen -t ed25519`) no computador do responsável, adicionada ao `ssh-agent`/Keychain do macOS e cadastrada em `github.com/settings/ssh/new` na conta `royaltidev`; o remoto local foi corrigido com `git remote set-url origin git@github.com:royaltidev/CRM-Live.git`; o repositório `royaltidev/CRM-Live` foi criado manualmente no GitHub (vazio, sem README/gitignore/license, para não conflitar com o histórico local); `git push -u origin main` concluído com sucesso.
- Como evitar no futuro: antes de configurar `git remote add`, sempre confirmar (1) que o repositório já existe de fato no GitHub (não só a intenção de criá-lo) e (2) que a chave SSH do computador que vai fazer o push está cadastrada na conta correta — especialmente relevante aqui porque a Royal Tecnologia usa mais de uma conta/repositório no GitHub (`royalti` e `royaltidev`), o que facilita configurar o remoto errado por engano.
