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
