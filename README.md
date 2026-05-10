# Sistema de Gestão de Hemocentro - ODS 3

## 🎯 Objetivo e Problema
Este projeto aborda o **ODS 3 (Saúde e Bem-Estar)**. O problema identificado é a instabilidade dos estoques de sangue em hemocentros devido à dificuldade de comunicação direta com doadores aptos.

## 💡 Solução Proposta
Uma **aplicação Web Full-Stack** composta por um dashboard administrativo para o hemocentro gerir o estoque e uma área do doador para consulta de informações e aptidão.

## 🛠 Justificativa Técnica
A escolha por uma solução Web (Angular + Node.js) visa a acessibilidade universal sem necessidade de instalação, facilitando o uso tanto para administradores em desktops quanto para doadores em navegadores mobile.

## 📋 Requisitos do Sistema
Os requisitos detalhados estão disponíveis em [docs/requirements.md](docs/requirements.md).

## 📊 Diagrama de Casos de Uso
![Casos de Uso](docs/uml-use-case.png)

## 🚀 TP3 - Estado Atual
O repositório já possui um primeiro entregável funcional com:

- API REST para login, consulta de urgências e dashboard;
- interface SPA para administrador e doador;
- persistência local em SQLite;
- pasta [Videos](Videos) criada para armazenar a demonstração do sprint.

### Como executar
1. Instale Node.js 20+.
2. Rode `npm install`.
3. Inicie a aplicação com `npm start`.
4. Acesse `http://localhost:3000`.

### Credenciais de demonstração
- Admin: `admin@hemocentro.local` / `admin123`
- Doador: `ana@doadores.local` / `donor123`
