# Projeto Arquitetural - Sistema de Gestão de Hemocentro

## 🛠 Escolhas de Tecnologias
- **Frontend:** Angular (Framework SPA que permite uma interface administrativa rica e reativa).
- **Backend:** Node.js com NestJS (Escalabilidade e tipagem forte com TypeScript, ideal para regras de negócio de saúde).
- **Banco de Dados:** PostgreSQL (Relacional, garantindo a integridade dos dados de doadores e estoques).
- **Autenticação:** JWT (JSON Web Tokens) para comunicação segura entre Front e Back.

## 🏗 Projeto Arquitetural (C4 Model)
Escolhemos o C4 Model para representar a arquitetura por níveis de detalhamento.

### Nível 1: Diagrama de Contexto
O sistema de Hemocentro interage com o Doador (via Web), o Administrador e, futuramente, pode integrar com sistemas de e-mail para notificações.

### Nível 2: Diagrama de Contêineres
A aplicação é dividida em:
1. **Web Application (Angular):** Interface do usuário.
2. **API Application (NestJS):** Lógica de negócio e rotas.
3. **Database (PostgreSQL):** Persistência de dados.

## ⚖️ Justificativa do Modelo
O modelo escolhido foca na separação de responsabilidades (SoC). O uso de uma arquitetura de contêineres permite que o frontend e o backend evoluam de forma independente, facilitando a manutenção e futuros testes automatizados exigidos nos TPs seguintes.

```mermaid
graph TD
    subgraph "Sistema de Gestão de Hemocentro"
        WebApp[Web Application - Angular]
        API[API Application - NestJS]
        DB[(Database - PostgreSQL)]
    end

    User((Doador)) -- "Acessa dashboard e perfil" --> WebApp
    Admin((Administrador)) -- "Gere estoque e doadores" --> WebApp
    
    WebApp -- "Consome dados via JSON/HTTPS" --> API
    API -- "Lê/Escreve dados (SQL)" --> DB

    style WebApp fill:#2d5dab,color:#fff
    style API fill:#2d5dab,color:#fff
    style DB fill:#158212,color:#fff
