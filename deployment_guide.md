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

## 7. Solução de Erros Comuns

### Erro: Access denied for user 'root'@'localhost'
Se o PM2 der erro de conexão, rode estes comandos no terminal da VPS para permitir que o sistema use o MySQL:

```bash
sudo mysql
```
Dentro do MySQL, rode:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'SUA_SENHA_AQUI';
FLUSH PRIVILEGES;
EXIT;
```
**Depois, edite o seu `backend/.env` e coloque a mesma senha!**

### Erro: Unknown database 'fambaxitique'
Isso significa que você ainda não criou o banco de dados no MySQL da VPS. Rode:

```bash
sudo mysql -u root -p
```
E dentro do MySQL:
```sql
CREATE DATABASE fambaxitique;
EXIT;
```
**Depois, rode o setup das tabelas:**
```bash
cd ~/FambaXitique/backend
node setup-db.js
```

cd ~/FambaXitique/backend
node setup-db.js
```

### Erro: ERR_NAME_NOT_RESOLVED ou URL Malformada
Se o erro mostrar algo como `http://http//...`, a sua URL no `.env` do Frontend está com erro de digitação.

1.  **Edite o arquivo `.env` do Frontend na VPS:**
    ```bash
    cd ~/FambaXitique/frontend
    nano .env
    ```
2.  **Corrija para o formato exato (sem o `:` antes da `/` e sem `http` duplicado):**
    ```text
    VITE_API_BASE_URL=http://144.91.121.85:5001/api
    ```
3.  **Reinicie o Frontend:**
    ```bash
    pm2 restart fambaxitique-ui
    ```

## 8. Logs e Monitoramento
```bash
pm2 status
pm2 logs fambaxitique-api
```
