# Fase de build
FROM node:lts-alpine AS builder

# Instala pnpm globalmente
RUN npm install -g pnpm

# Define o diretório de trabalho
WORKDIR /usr/src/app

# Copia os arquivos de lock e de configuração do package manager
COPY pnpm-lock.yaml ./
COPY package.json ./

# Instala as dependências do projeto
RUN pnpm install --frozen-lockfile

# Copia o restante dos arquivos do projeto
COPY . .

# Realiza o build do projeto
RUN pnpm run build

# Fase de produção
FROM node:lts-alpine

# Instala pnpm globalmente
RUN npm install -g pnpm

# Define o ambiente de produção
ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

# Diretório de trabalho
WORKDIR /usr/src/app


# Define o argumento BAILEYS_DB_URL para o build
# ARG BAILEYS_DB_URL
# ENV BAILEYS_DB_URL=${BAILEYS_DB_URL}

# Copia os arquivos da fase de build
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/pnpm-lock.yaml ./

# COPY --from=builder /usr/src/app/.env ./

# Copia o diretório prisma para acesso ao schema e migrações
# COPY prisma ./prisma

# Gera o schema Prisma
# RUN npx prisma db pull
# RUN npx prisma generate

# Expõe a porta
EXPOSE 2022

# Comando de inicialização
CMD ["node", "dist/main"]