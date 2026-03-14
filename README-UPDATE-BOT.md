# 🔄 Guia de Atualização do Bot - Sistema de Subscrição

Este documento detalha as mudanças necessárias no código do seu Bot de WhatsApp (Baileys) para suportar o novo sistema de planos e assinaturas da FambaXitique.

## 1. Mudanças na Autenticação e Menu (`getUserInfo`)
O endpoint `GET /api/bot/user/[phone]` agora retorna um objeto `subscription` adicional.

**Nova Resposta:**
```json
{
  "id": "uuid",
  "firstName": "Tiago",
  "subscription": {
    "planName": "Ouro",
    "endDate": "2026-04-14T00:00:00Z",
    "botEnabled": true
  },
  "groups": [...]
}
```

**Recomendação:**
- Ao exibir o menu inicial, verifique `subscription.botEnabled`. 
- Caso seja `false` ou `null`, você pode mostrar uma mensagem de aviso: "⚠️ Note que o seu plano atual não inclui funcionalidades automáticas do Bot em grupos."

---

## 2. Tratamento de Erros em Comandos (403 Forbidden)
Os endpoints de **Pagamento** (`POST /api/bot/payment`) e **Empréstimo** (`POST /api/bot/loan-request`) agora validam se o administrador do grupo tem o Bot ativo.

**Se o plano for inválido ou expirado, a API retornará `HTTP 403`:**
```json
{ "message": "O serviço de Bot não está ativo para este grupo. Contacte o administrador." }
```

**O que fazer no código do Bot:**
Certifique-se de que o seu bloco `try/catch` no Axios captura o erro 403 e envia a mensagem de erro da API diretamente para o usuário no WhatsApp.

---

## 3. Novo Comando Sugerido: `!plano`
Você pode implementar um comando simples que chama o perfil do usuário e exibe os detalhes da assinatura.

**Exemplo de Resposta do Bot:**
> 📋 **Sua Assinatura FambaXitique**
> - **Plano:** Ouro
> - **Válido até:** 14/04/2026
> - **Status Bot:** ✅ Ativo

---

## 4. Filtragem de Notificações
O endpoint `GET /api/bot/notifications` agora filtra automaticamente as notificações. Se um grupo pertencer a um plano que não tem o Bot habilitado, as notificações do tipo `PAYMENT_CONFIRMED`, `LOAN_VOTING`, etc., não serão enviadas para a fila do bot.

**Ação:** Nenhuma mudança necessária no código do Bot, o backend já cuida disso.

---

## 🚀 Como Aplicar
1. Verifique se o seu `.env` do backend tem o **BOT_API_TOKEN** configurado.
2. Certifique-se de que o Bot envia esse token no Header `Authorization`.
3. Reinicie o backend: `npm run dev` na pasta `backend`.
4. Atualize a lógica de resposta no seu script Baileys conforme os pontos acima.
