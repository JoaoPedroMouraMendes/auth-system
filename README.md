# 🔒 Auth System

Todo site que entramos costuma pedir para fazer login ou criar uma conta. Este sistema está presente em todo lugar, seja em um site de roupas ou em uma loja virtual de jogos. Dessa forma, criei esta API para testar meus conhecimentos.

### Funcionalidades:

- 🆕 Criação de um novo usuário.
- 📧 Envio de confirmação por e-mail.
- 🔑 Recuperação de senha.
- 📬 Envio de e-mail para troca de senha.

## 👩‍💻 Parte técnica

Para quem deseja entender o que acontece por baixo dos panos ou as pendências ao clonar o projeto, esta seção aborda como e com o que o projeto foi criado.

### Banco de dados

Para salvar os registros dos usuários, foi utilizado o banco de dados MongoDB (NoSQL). Para facilitar a comunicação entre a aplicação e o banco de dados, implementei o Prisma (ORM).

### Arquivo `.env`

Neste projeto há um arquivo `.env` que armazena variáveis importantes, seja para a comunicação com o banco de dados ou até a URL do projeto. Você pode encontrar um arquivo `.env.example` no projeto e adicionar as variáveis a um `.env`, seguindo a estrutura abaixo:

``````env
# URL para comunicação com o banco de dados
DATABASE_URL=URL_DO_MONGODB

# Dados do email
EMAIL_ADDRESS=ENDEREÇO_DO_EMAIL
EMAIL_PASSWORD=SENHA_DO_EMAIL

# JWT
SECRET=SEU_SECRET

# URL da aplicação
URL=SUA_URL
``````

- **DATABASE_URL**: é a URL do banco de dados fornecida pelo MongoDB.
- **EMAIL_ADDRESS**: é o email responsável por enviar mensagens.
- **EMAIL_PASSWORD**: é a senha do email, uma senha específica que o provedor de email fornece para aplicações.
- **SECRET**: é a chave secreta para o JWT, pode ser qualquer string (ex: "123").
- **URL**: é a URL do projeto. Se for usar na própria máquina, pode ser "http://localhost:3000".

### Principais tecnologias

- 🟦 **TypeScript**: Torna o código mais fácil de entender e manter.
- 🚏 **Express**: Utilizado para criação de rotas.
- 📧 **Nodemailer**: Usado para envio de e-mails.

