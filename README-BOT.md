# FambaXitique - Integração com Bot WhatsApp (Baileys)

Este documento descreve os requisitos e os endpoints da API necessários para conectar o sistema SaaS ao Bot de WhatsApp.

## 🚀 Requisitos para o Bot (Node.js + Baileys)
1.  **Baileys Library**: Para conexão com o WhatsApp.
2.  **Axios**: Para chamadas à API do SaaS.
3.  **Ambiente**: Node.js instalado no servidor do Bot.

---

## 🛠 Fluxo de Navegação do Bot
Para uma melhor experiência, o Bot deve seguir este fluxo lógico:

1.  **Boas-vindas e Identificação**:
    - O Bot recebe uma mensagem e chama `GET /api/bot/user/[phone]`.
    - Se não encontrar, responde: "⚠️ Seu número não está associado a nenhuma conta. Registe-se em [Link] para começar."
2.  **Seleção de Contexto (Grupos)**:
    - Se encontrar grupos, responde: "Olá, *[Nome]*! Você pertence aos seguintes grupos. Escolha um para continuar:
      1. [Nome do Grupo A]
      2. [Nome do Grupo B]"
3.  **Menu de Opções do Grupo**:
    - Após selecionar o grupo, o Bot guarda o `groupId` na sessão e mostra:
      "Você selecionou o grupo *[Nome]*. O que desejas fazer?
      1. Ver Saldo e Dívida
      2. Pagar Quota
      3. Pedir Empréstimo
      4. Estado de Empréstimos Ativos"

---

## 🛠 Endpoints da API para o Bot

### 1. Autenticação e Menu
**GET** `/api/bot/user/:phone`
- **Descrição**: Verifica se o número de telefone está registado no sistema e retorna o nome do membro.
- **Resposta**: `{ id, firstName, lastName, groups: [...] }`

### 2. Consulta de Saldo e Dívida
**GET** `/api/bot/status/:phone`
- **Descrição**: Retorna o saldo acumulado (xitique) e o estado de dívidas (empréstimos) de todas as participações do membro.
- **Resposta**:
  ```json
  {
    "totalContribution": 5000,
    "activeLoans": [
      {
        "amount": 5500,
        "paid": 2000,
        "remaining": 3500,
        "progress": 36,
        "groupName": "Grupo A"
      }
    ]
  }
  ```

### 3. Submissão de Pagamento
**POST** `/api/bot/payment`
- **Descrição**: Envia um ID de transação (M-Pesa/e-Mola) via texto para validação.
- **Corpo**:
  ```json
  {
    "phone": "25884...",
    "transactionId": "ABC123XYZ",
    "amount": 1000,
    "groupId": "uuid-do-grupo"
  }
  ```

### 4. Solicitação de Empréstimo
**POST** `/api/bot/loan-request`
- **Descrição**: Regista uma nova solicitação de crédito.
- **Corpo**:
  ```json
  {
    "phone": "25884...",
    "amount": 5000,
    "groupId": "uuid-do-grupo",
    "notes": "Emergência familiar"
  }
  ```

---

### 5. Consulta de Notificações Pendentes
**GET** `/api/bot/notifications`
- **Descrição**: Retorna uma lista de até 50 notificações pendentes (OTPs, confirmações, lembretes).
- **Resposta**:
  ```json
  [
    {
      "id": "uuid",
      "phone": "258841234567",
      "type": "INVOICE_GENERATED",
      "content": "🔔 *Nova Fatura Gerada*...",
      "status": "pending"
    }
  ]
  ```

### 📋 Tipos de Notificações (`type`)
| Tipo | Descrição |
| :--- | :--- |
| `OTP_REGISTRATION` | Código de ativação para novos registos. |
| `OTP_RESET` | Código para recuperação de senha. |
| `PAYMENT_CONFIRMED` | Confirmação de pagamento de quota/contribuição mensal. |
| `INVOICE_GENERATED` | Alerta personalizado de nova fatura disponível. |
| `LOAN_APPROVED` | Parabéns e detalhes sobre empréstimo aprovado. |
| `LOAN_PAYMENT_CONFIRMED` | Confirmação específica de pagamento de dívida de empréstimo. |
| `LOAN_VOTING` | Alerta para membros votarem em nova solicitação de crédito. |

### 6. Confirmar Envio de Notificação
**POST** `/api/bot/notifications/:id/sent`
- **Descrição**: Marca uma notificação como processada.
- **Corpo**: `{ "status": "sent" }`

---

## 🔔 Fluxo de Notificações Ativas
O sistema utiliza **Polling**. O Bot deve consultar `/api/bot/notifications` periodicamente (ex: a cada 5 segundos).

1.  **Segurança (OTPs)**: Registos e Resets de senha.
2.  **Financeiro**: Confirmações de Quotas e Pagamentos de Empréstimo.
3.  **Gestão**: Alertas de novas Faturas e Aprovações de Crédito.
4.  **Colaboração**: Alertas de Votação Pendente para membros do grupo.

---

## 🔒 Segurança
- O Bot deve usar um **BOT_API_TOKEN** no Header `Authorization` para todas as requisições.
- O token deve ser configurado no `.env` do Backend.
