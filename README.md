# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Backend de autenticação

A API usa Node.js 20+, Express e MySQL 8. O cadastro fica pendente até a pessoa confirmar o e-mail; somente então os dados são movidos para `users`. As senhas são armazenadas com bcrypt e o login retorna um JWT de 24 horas.

1. Crie o banco executando `backend/schema.sql` no MySQL Workbench ou cliente MySQL.
2. Copie `backend/.env.example` para `backend/.env` e informe os dados do MySQL, um `JWT_SECRET` aleatório com pelo menos 32 caracteres e as credenciais SMTP válidas. `API_PUBLIC_URL` deve ser a URL acessível pelo destinatário do e-mail.
3. Instale e inicie a API:

   ```bash
   npm --prefix backend install
   npm run api:dev
   ```

4. Crie `.env` na raiz a partir de `.env.example`. Para web e emulador Android, `http://localhost:3000` costuma funcionar. Em um celular físico, use o IP local do computador na porta `3000`; o celular e o computador precisam estar na mesma rede.
5. Inicie o app em outro terminal com `npm start`. A confirmação de email precisa apontar para o endereço público da API configurado em `API_PUBLIC_URL`.

Endpoints disponíveis: `POST /api/auth/register`, `POST /api/auth/resend-verification`, `POST /api/auth/verify`, `POST /api/auth/login`, `GET /api/auth/me` e `GET /health`. A conta só é criada quando a pessoa confirma o link enviado por email. Para produção, configure HTTPS, SMTP real, `APP_ORIGINS` com as origens do app e segredos próprios; não use os valores de exemplo.

O catálogo e os detalhes vêm das tabelas MySQL `recipes`, `recipe_ingredients`, `recipe_steps` e `recipe_media`. Comentários, avaliações, denúncias, favoritos, listas e compras também são persistidos por usuário. A API oferece `GET /api/recipes`, `GET /api/recipes/:id`, `GET /api/recipes/mine` e operações autenticadas para criar e interagir com receitas. Áudio e vídeo (até 100 MB por arquivo) ficam em `backend/uploads/`; o desenvolvimento usa disco local, enquanto produção deve usar armazenamento de objetos.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
