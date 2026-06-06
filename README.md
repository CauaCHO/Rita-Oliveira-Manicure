# Agenda Manicure

Sistema web responsivo para agendamento de manicure, feito com HTML, CSS e JavaScript puro.

## Funcionalidades

- Página pública para clientes solicitarem agendamento.
- Agenda com horários de 1 em 1 hora.
- Bloqueio de horários repetidos.
- Seleção de serviço/produto com valor.
- Painel administrativo com senha.
- Confirmação, cancelamento, conclusão e exclusão de agendamentos.
- Botão de WhatsApp para confirmação e lembrete manual.
- Cadastro de serviços/produtos com preço, duração, categoria, ativo e público/oculto.
- Relatório mensal com total recebido, pendente, serviços mais feitos e clientes que mais agendam.
- Clientes com histórico de atendimentos.
- PWA com manifest e service worker.

## Como testar

Abra `public/index.html` no navegador ou rode um servidor local na pasta `public`.

Senha inicial do painel: `1234`.

## Banco temporário

A versão atual usa `localStorage` no arquivo:

```txt
public/js/storage.js
```

Isso permite testar tudo sem Firebase.

## Como trocar para Firebase depois

Mantenha as telas e substitua as funções do `Store` em `public/js/storage.js` por chamadas do Firebase Realtime Database.

Cole sua configuração do Firebase em um arquivo próprio, por exemplo:

```txt
public/js/firebase.js
```

E use coleções/caminhos como:

```txt
settings/
services/
appointments/
clients/
```

## Hospedagem Firebase

Edite `.firebaserc` e troque `SEU_PROJETO_FIREBASE_AQUI` pelo ID do projeto.

Depois:

```bash
firebase login
firebase init hosting
firebase deploy
```
