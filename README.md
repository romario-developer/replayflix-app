# ReplayFlix — App (Expo)

App do ReplayFlix: feed de lances com player inline, likes, arenas e perfil.
Roda em Android, iOS e web (PWA). A API vive no repositório
`replayflix-backend` (leia o README de lá pro setup do Supabase/servidor).

## Rodando local

```bash
npm install
npm start          # Metro/Expo — escaneie o QR com o Expo Go
npm run web        # versão web em localhost
```

Em desenvolvimento (`__DEV__`), o app descobre o IP do Metro e chama a API em
`http://<seu-ip>:3000/api` — suba o backend local antes (`npm run dev` lá).
Em produção usa `https://replayflix-backend.onrender.com/api`
(configurado em `services/api.ts`).

## Estrutura

- `app/` — telas (expo-router): `login`, `(tabs)/index` (feed), `(tabs)/profile`, `arenas`…
- `app/+html.tsx` — shell HTML da versão web (splash, pré-fetch do feed, service worker)
- `services/api.ts` — cliente da API (axios + token JWT automático)
- `hooks/use-auto-refresh.ts` — recarrega dados quando o app volta ao 1º plano
- `public/` — manifest e service worker do PWA

## Autenticação

O login salva `token` (JWT), `userId` e `userName` no AsyncStorage.
Um interceptor do axios anexa `Authorization: Bearer <token>` em toda
requisição pra API — sem login, as ações de escrita retornam 401.

## Deploy web (Vercel)

`npm run build` gera `dist/` (expo export). O `vercel.json` já define
build e cache; basta apontar o projeto Vercel pra este repositório.
