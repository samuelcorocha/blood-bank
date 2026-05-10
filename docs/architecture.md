# Projeto Arquitetural - Sistema de Gestão de Hemocentro

## 🛠 Escolhas de Tecnologias
- **Frontend:** SPA em JavaScript puro, servida pelo backend, para reduzir a complexidade do primeiro entregável.
- **Backend:** Node.js com Express, por simplicidade e rapidez de entrega no TP3.
- **Banco de Dados:** SQLite, por ser relacional, leve e permitir persistência local sem dependências externas.
- **Autenticação:** token de sessão persistido no banco, suficiente para o MVP do sprint.

## 🏗 Projeto Arquitetural (C4 Model)
Escolhemos o C4 Model para representar a arquitetura por níveis de detalhamento.

### Nível 1: Diagrama de Contexto
O sistema de Hemocentro interage com o Doador (via Web), o Administrador e, futuramente, pode integrar com sistemas de e-mail para notificações.

### Nível 2: Diagrama de Contêineres
A aplicação é dividida em:
1. **Web Application (SPA em JavaScript):** Interface do usuário.
2. **API Application (Express):** Lógica de negócio e rotas REST.
3. **Database (SQLite):** Persistência relacional local.

## ⚖️ Justificativa do Modelo
O modelo escolhido foca na separação de responsabilidades (SoC). O uso de uma arquitetura de contêineres permite que o frontend e o backend evoluam de forma independente, facilitando a manutenção e a evolução para as próximas sprints.

```mermaid
graph TD
    subgraph "Sistema de Gestão de Hemocentro"
        WebApp[Web Application - SPA JavaScript]
        API[API Application - Express]
        DB[(Database - SQLite)]
    end

    User((Doador)) -- "Acessa dashboard e perfil" --> WebApp
    Admin((Administrador)) -- "Gerencia estoque e doadores" --> WebApp

    WebApp -- "Consome dados via JSON/HTTPS" --> API
    API -- "Lê/Escreve dados (SQL)" --> DB

    style WebApp fill:#2d5dab,color:#fff
    style API fill:#2d5dab,color:#fff
    style DB fill:#158212,color:#fff
