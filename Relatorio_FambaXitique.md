# Relatório do Projeto FambaXitique

## 1. Visão Geral
**FambaXitique** é uma aplicação web moderna e responsiva focada na inclusão financeira, desenhada para digitalizar e simplificar a gestão de grupos de poupança (Xitiques) e empréstimos comunitários em Moçambique. O sistema visa automatizar e centralizar as finanças dos grupos, oferecendo segurança, transparência e relatórios detalhados.

## 2. Estrutura do Sistema
O projeto utiliza uma arquitetura moderna dividida em três módulos principais, o que facilita a manutenção e escalabilidade:

- **Frontend:** Construído com React, React-Bootstrap e Vite. É a interface do utilizador, 100% responsiva (otimizada para mobile/tablet) e utiliza um design premium (tema dark e glassmorphism). Comunica com o backend via Axios.
- **Backend:** Desenvolvido em Node.js e Express, com base de dados MySQL. Utiliza Sequelize como ORM para a gestão e interação com a base de dados e JWT para autenticação segura.
- **Bot Integrado (bot-integrated):** Um serviço de automação baseado na biblioteca Baileys, responsável pelas notificações e comunicação integrada diretamente via WhatsApp, inclusive com integração de APIs externas como OpenAI.

## 3. Funcionalidades Principais Implementadas

### Gestão de Membros e Grupos
- Capacidade de um utilizador participar em **múltiplos grupos** ao mesmo tempo.
- Sistema de **convites seguros** com códigos de uso único.
- **Configurações dinâmicas** geridas pelos administradores (valor de contribuição, taxas de juros, e frequência - Diária, Semanal, Mensal).

### Finanças e Faturação
- **Geração automática** de ciclos de faturação para os membros do grupo.
- Métodos de pagamento suportados e configuráveis (ex: M-Pesa, e-Mola).
- **Validação de pagamentos** onde os membros podem fazer o upload do comprovativo (imagem).

### Sistema de Crédito / Empréstimos
- Motor de **cálculo automático de juros** com base nas taxas predefinidas pelo grupo.
- **Verificação de limites** dependendo do saldo disponível no grupo.
- **Abatimento flexível da dívida**, permitindo aos membros amortizar qualquer valor.
- Transferências justificadas com comprovativos por parte da gestão na aprovação do crédito.

### Relatórios e Dashboard
- Painel principal em **tempo real** com visualização de lucro e estatísticas.
- **Relatórios detalhados** por membro, cobrindo faturas pendentes e histórico de empréstimos.
- Funcionalidade pronta para **exportação/impressão** dos dados do grupo.

## 4. Tecnologias Empregadas (Stack Tecnológica)
*   **Interface (Frontend):** React.js, React-Bootstrap, Vite.
*   **Servidor (Backend):** Node.js, Express.
*   **Base de Dados:** MySQL com Sequelize ORM.
*   **Segurança:** JSON Web Tokens (JWT).
*   **Automação:** WhatsApp Bot (Baileys).

## 5. Conclusão
O **FambaXitique** apresenta-se como uma plataforma robusta de gestão financeira comunitária. A clara separação de responsabilidades (Frontend, Backend, e Bot) não só torna a base de código organizada, mas também prepara o terreno para futuras atualizações e integrações contínuas, mantendo o foco na excelente experiência do utilizador e na precisão financeira.
