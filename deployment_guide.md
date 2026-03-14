# Guia de Implantação na VPS - FambaXitique

Este guia ajudará você a colocar o seu sistema em funcionamento na sua VPS Linux (Ubuntu recomendada).

## 1. Clonar o Repositório
Para baixar o código na VPS usando o seu Personal Access Token (PAT), use o seguinte comando (substitua `[SEU_TOKEN]` pelo seu token):

```bash
git clone https://[SEU_TOKEN]@github.com/Ande08/FambaXitique.git
cd FambaXitique
```

Se você já clonou o repositório e precisa atualizar o token para fazer `pull`:
```bash
git remote set-url origin https://[SEU_TOKEN]@github.com/Ande08/FambaXitique.git
git pull origin main
```

## 2. Script de Atualização Rápida
Criei um script chamado `update.sh` para facilitar as atualizações futuras. Para usá-lo na VPS pela primeira vez:
```bash
chmod +x update.sh
./update.sh
```

## 3. Requisitos Próvios
Instale o Node.js v18 ou superior, MySQL e o gerenciador de processos PM2.
```bash
sudo apt update
sudo apt install nodejs npm mysql-server -y
sudo npm install -g pm2
```

## 2. Configuração do Banco de Dados
Crie a base de dados no MySQL:
```sql
CREATE DATABASE fambaxitique;
```

## 3. Preparação do Backend
Navegue até a pasta `backend`, instale as dependências e configure o ambiente:
```bash
cd backend
npm install
cp .env.example .env
# EDITE o .env com suas credenciais do banco
nano .env
# Execute o setup do banco de dados (tabelas)
node setup-db.js
```

Inicie o servidor com PM2:
```bash
pm2 start index.js --name fambaxitique-api
```

## 4. Preparação do Frontend
Navegue até a pasta `frontend` e compile o projeto:
```bash
cd ../frontend
npm install
cp .env .env.local
# EDITE o .env.local com o IP/Domínio real da sua VPS (porta 5001)
nano .env.local
# Gere a versão de produção
npm run build
```

## 5. Servir o Frontend (Recomendado: Nginx)
Para produção, é melhor usar o Nginx para servir a pasta `dist` gerada pelo `npm run build`.
Se preferir usar o Vite para testes rápidos na VPS:
```bash
pm2 start "npm run dev -- --host" --name fambaxitique-ui
```

## 6. Configuração de Portas
- **API (Backend)**: 5001
- **Interface (Frontend)**: 3009 (Vite) ou 80 (Nginx)

⚠️ **IMPORTANTE**: Certifique-se de que as portas 5001 e 3009 estão abertas no firewall da sua VPS!

```bash
sudo ufw allow 5001/tcp
sudo ufw allow 3009/tcp
```

## 7. Logs e Monitoramento
```bash
pm2 status
pm2 logs fambaxitique-api
```
