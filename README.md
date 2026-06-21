<p align="center">
  <img src="public/assets/brand.png" alt="Rita Oliveira Manicure" width="180" style="border-radius: 50%;" />
</p>

<h1 align="center">Rita Oliveira Manicure</h1>

<p align="center">
  Sistema web responsivo para agendamento, controle de clientes, pacotes mensais, relatórios e apoio comercial via WhatsApp Business.
</p>

<p align="center">
  <a href="https://rita-oliveira-manicure.web.app/">Acessar sistema</a>
  ·
  <a href="https://rita-oliveira-manicure.web.app/admin/login.html">Painel administrativo</a>
</p>

---

## Sobre o projeto

O **Rita Oliveira Manicure** é uma agenda digital criada para facilitar o atendimento de clientes de manicure, organizando horários disponíveis, solicitações de agendamento, confirmações pelo WhatsApp, pacotes mensais, relatórios financeiros e histórico de clientes.

O projeto foi desenvolvido com foco em uso real no celular, visual moderno em **Glassmorphism** e integração prática com o **WhatsApp Business**, sem depender de sistemas complexos ou aplicativos pagos.

---

## Principais funcionalidades

### Agenda pública

- Página pública para clientes solicitarem horários.
- Escolha de data e horário disponível.
- Solicitação de atendimento avulso.
- Solicitação de pacote mensal.
- Botão rápido para tirar dúvidas no WhatsApp.
- Atualização automática quando horários são preenchidos.
- Prevenção de conflito quando duas pessoas tentam solicitar o mesmo horário.
- Indicador visual para mostrar que há mais conteúdo abaixo.
- Rodapé comercial com contato e acesso ao painel.

### Painel administrativo

- Login administrativo.
- Visualização da agenda por data.
- Aprovação e negativa de solicitações.
- Edição, conclusão e exclusão de atendimentos.
- Separação entre atendimentos reais e bloqueios/folgas.
- Bloqueio de horários por folga ou indisponibilidade.
- Cadastro manual de atendimentos.
- Criação e remoção de horários personalizados.
- Horários únicos para uma data específica.
- Horários fixos para dias da semana.

### Pacote mensal

- Pacote composto por:
  - 4 mãos.
  - 2 pés.
- Cada item do pacote possui data e horário próprios.
- Regra para não permitir 2 mãos na mesma semana.
- Regra para não permitir 2 pés na mesma semana.
- Permite mão e pé na mesma semana.
- Permite mão e pé no mesmo dia, desde que em horários diferentes.
- Aprovação ou negativa do pacote inteiro na aba de solicitações.
- Valor do pacote configurável na aba de serviços/produtos.

### Clientes e relatórios

- Clientes separados pelo número de WhatsApp.
- Histórico de atendimentos por cliente.
- Relatório mensal com:
  - Total recebido.
  - Total pendente.
  - Agendamentos do mês.
  - Serviços mais feitos.
  - Clientes que mais agendam.
  - Pacotes mensais vendidos.
  - Valor total em pacotes.
  - Atendimentos inclusos em pacotes.

### WhatsApp Business

- Aba exclusiva para apoio comercial via WhatsApp.
- Mensagens prontas para:
  - Confirmar horário.
  - Enviar lembrete.
  - Confirmar pacote mensal.
  - Cobrar pagamento pendente.
  - Pedir avaliação.
  - Recuperar cliente sumida.
  - Enviar catálogo.
- Geração de texto para Status com horários disponíveis.
- Botões para copiar mensagem ou abrir conversa diretamente no WhatsApp.
- Campo para salvar link do catálogo e Instagram.

---

## Tecnologias utilizadas

- **HTML5**
- **CSS3**
- **JavaScript puro**
- **Firebase Hosting**
- **Firebase Realtime Database**
- **PWA** com `manifest.json` e `service-worker.js`
- **Font Awesome** para ícones

---

## Estrutura do projeto

```txt
public/
├── admin/
│   ├── agenda.html
│   ├── clientes.html
│   ├── config.html
│   ├── login.html
│   ├── relatorios.html
│   ├── servicos.html
│   ├── solicitacoes.html
│   └── whatsapp.html
├── assets/
│   └── brand.png
├── css/
│   ├── style.css
│   └── mobile-fix.css
├── js/
│   ├── agenda-publica.js
│   ├── admin-agenda.js
│   ├── admin-common.js
│   ├── admin-horarios.js
│   ├── admin-pacote-mensal.js
│   ├── clientes.js
│   ├── config.js
│   ├── firebase.js
│   ├── horarios-utils.js
│   ├── pacote-publico.js
│   ├── pacote-utils.js
│   ├── public-enhancements.js
│   ├── relatorios.js
│   ├── servicos.js
│   ├── solicitacoes.js
│   ├── storage.js
│   ├── utils.js
│   └── whatsapp.js
├── index.html
├── manifest.json
└── service-worker.js
```

---

## Imagem da marca

A identidade visual do sistema usa o arquivo:

```txt
public/assets/brand.png
```

Essa imagem é usada como:

- Fundo do sistema.
- Logo circular.
- Ícone do PWA.
- Imagem principal do README.

Para trocar a identidade visual, basta substituir esse arquivo mantendo o mesmo nome:

```txt
brand.png
```

Recomendação: usar uma imagem quadrada em `512x512` ou `1024x1024`.

---

## Como rodar localmente

Clone o repositório:

```bash
git clone https://github.com/CauaCHO/Rita-Oliveira-Manicure.git
cd Rita-Oliveira-Manicure
```

Rode um servidor local apontando para a pasta `public`.

Exemplo com Python:

```bash
cd public
python -m http.server 5500
```

Acesse:

```txt
http://localhost:5500
```

---

## Deploy no Firebase

Depois de alterar o projeto, rode:

```bash
git pull
firebase deploy
```

Para forçar atualização no navegador/celular, acesse com parâmetro de versão:

```txt
https://rita-oliveira-manicure.web.app/?v=15
```

---

## Acesso administrativo

Página do painel:

```txt
/admin/login.html
```

A senha pode ser alterada dentro da aba de configurações do painel.

> Observação: para uso em produção, o ideal é evoluir a segurança para Firebase Authentication e regras mais restritas no Realtime Database.

---

## Desenvolvedor

Desenvolvido por **Cauã Henrique de Oliveira**.

Projeto criado como solução comercial personalizada para organização de agenda, atendimento e relacionamento com clientes de manicure.
