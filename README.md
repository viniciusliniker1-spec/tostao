# Tostão

PWA de controle financeiro com mascote animado, leitura de prints (Claude vision) e dicas de melhoria.

## Rodar local
```bash
npm install
cp .env.example .env.local   # preencha
npm run dev
```
Sem variáveis do Supabase o app roda em **modo local** (dados no aparelho, sem login).

## Configurar (produção)
1. **Supabase**: crie um projeto, rode `supabase/schema.sql` no SQL Editor. Em Authentication, desative "Allow new users to sign up" depois de criar a sua conta.
2. **Vercel**: importe o repositório e defina `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` e `ALLOWED_EMAILS` (seu e-mail).
3. No iPhone: abra a URL no Safari > Compartilhar > Adicionar à Tela de Início.

## Como funciona
- `app/api/scan`: recebe o print (já reduzido no aparelho), usa Claude com tool use para extrair valor, estabelecimento, data e categoria. Você confere antes de lançar; itens parecidos com os já lançados vêm desmarcados.
- `app/api/tips`: manda só um resumo numérico do mês e recebe 3 a 5 dicas. Há também alertas rápidos calculados no aparelho (`lib/tips.ts`).
- As rotas de API exigem login Supabase e e-mail em `ALLOWED_EMAILS`, para ninguém gastar sua chave.
- Mascote: `components/Mascot.tsx` (SVG com 6 estados, piscar, respirar, olhos que seguem o dedo). Falas em `lib/mood.ts`.
