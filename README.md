# FambaXitique - Plataforma de Gestão de Xitique e Crédito

FambaXitique é uma aplicação web moderna e responsiva concebida para digitalizar a gestão de grupos de poupança (Xitiques) e empréstimos comunitários em Moçambique.

## 🚀 Funcionalidades Implementadas

### 👥 Gestão de Grupos
- **Multi-Grupos**: Suporte total para um utilizador pertencer a vários grupos simultaneamente.
- **Códigos de Convite**: Sistema de convites de uso único para novos membros.
- **Configuração Dinâmica**: Gestores podem definir valores de contribuição, juros e frequência (Diário, Semanal, Mensal).

### 💰 Sistema de Finanças e Faturas
- **Geração Automática**: Ciclos de faturas gerados com um clique.
- **Pagamentos Flexíveis**: Suporte para M-Pesa, e-Mola e outros métodos configuráveis.
- **Validação com Comprovativo**: Upload de imagem para prova de pagamento.

### 📈 Linha de Crédito com Abatimento Progressivo
- **Empréstimos Inteligentes**: Cálculo automático de juros com base na taxa do grupo.
- **Limites de Crédito**: Verificação automática do saldo disponível no grupo.
- **Abatimento Flexível**: Membros podem pagar qualquer valor para reduzir a "barra de progresso" da dívida.
- **Libertação de Valor**: Gestores anexam comprovativo de transferência ao aprovar crédito.

### 📊 Relatórios em Tempo Real
- **Dashboard Detalhado**: Visualização de lucro gerado por juros.
- **Relatório de Grupo**: Estado detalhado de faturas e empréstimos por membro.
- **Impressão**: Suporte para exportação de relatórios em tempo real.

### 📱 Experiência do Utilizador
- **Interface Premium**: Design moderno com tema dark e glassmorphism.
- **100% Responsivo**: Otimizado para telemóveis e tablets.
- **WhatsApp Ready**: Notificações e avisos integrados para comunicação via WhatsApp.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React, React-Bootstrap, Axios.
- **Backend**: Node.js, Express, Sequelize (ORM).
- **Base de Dados**: MySQL.
- **Autenticação**: JWT (JSON Web Tokens).

## 🏁 Como Executar

### Pré-requisitos
- Node.js instalado.
- MySQL Server ativo.

### Configuração
1. **Backend**:
   - `cd backend`
   - `npm install`
   - Configure o `.env` com as suas credenciais DB.
   - `node setup-db.js` (para criar as tabelas).
   - `npm run dev`

2. **Frontend**:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

---
© 2024 FambaXitique. Focado na inclusão financeira.
