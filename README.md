# Concurso IBGE — Jornalismo — Banco de questões (Instituto Avalia)

Site de estudo com simulados de 60 questões, gerados a partir da planilha
`data/questoes.xlsx`. Cobre o Censo Agropecuário, Florestal e Aquícola
(apostila oficial) e os Conhecimentos Específicos de Jornalismo do edital.

## O que tem em cada arquivo

- `index.html` — estrutura da página (não precisa editar)
- `style.css` — visual do site (não precisa editar)
- `app.js` — lógica do site: lê a planilha, monta os simulados, corrige, salva histórico (não precisa editar)
- `data/questoes.xlsx` — **a planilha com todas as questões. É esse arquivo que você edita para adicionar/corrigir questões.**
- `data/questoes.json` e `data/questoes.csv` — cópias da mesma planilha em outros formatos, apenas de referência (o site usa só o `.xlsx`)

## Como publicar no GitHub Pages (sem usar terminal)

1. Entre em [github.com](https://github.com) e faça login (ou crie uma conta gratuita).
2. Clique no `+` no canto superior direito → **New repository**.
3. Dê um nome, por exemplo `concurso-ibge-jornalismo`, marque como **Public** e clique em **Create repository**.
4. Na página do repositório recém-criado, clique em **uploading an existing file** (ou **Add file → Upload files**).
5. Arraste **todos os arquivos e pastas** deste projeto para a área de upload (incluindo a pasta `data` inteira, com o `questoes.xlsx` dentro). O GitHub mantém a estrutura de pastas automaticamente.
6. Role para baixo e clique em **Commit changes**.
7. Vá em **Settings** (no menu do repositório) → **Pages** (menu lateral esquerdo).
8. Em **Source**, escolha **Deploy from a branch**. Em **Branch**, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
9. Aguarde 1 a 2 minutos. O GitHub mostrará o link do site, algo como:
   `https://SEU-USUARIO.github.io/concurso-ibge-jornalismo/`
10. Pronto — esse link funciona para sempre, em qualquer dispositivo, sem precisar reabrir o Claude.

**Importante:** o site precisa ser acessado por esse link (`https://...github.io/...`), não abrindo o `index.html` direto no computador com duplo clique — a leitura da planilha só funciona quando o site está sendo servido pela internet.

## Como atualizar as questões depois de publicado

1. Abra `data/questoes.xlsx` no Excel (ou Google Sheets/LibreOffice) no seu computador.
2. Edite, adicione ou remova linhas, mantendo as colunas: `id, bloco, tema, subtema_edital, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, opcao_e, correta, explicacao`.
   - `bloco`: escreva `Censo` ou `Jornalismo`.
   - `correta`: apenas a letra A, B, C, D ou E correspondente à opção certa.
3. Salve o arquivo (mantendo o nome `questoes.xlsx`).
4. No GitHub, entre na pasta `data` do seu repositório, clique no arquivo `questoes.xlsx` → ícone de lápis/**Upload** → suba o novo arquivo substituindo o antigo → **Commit changes**.
5. O site atualiza sozinho no próximo acesso — não precisa mexer em mais nada.

## Como o site funciona

- **Painel**: mostra quantas questões existem no banco, por tema, e o botão para gerar um novo simulado.
- **Simulado**: sempre sorteia 60 questões do banco (sem repetir dentro do mesmo simulado), no formato objetivo A–E. Seu progresso fica salvo automaticamente no navegador (mesmo se fechar a aba e voltar depois) até você finalizar.
- **Biblioteca de estudo**: resumos organizados por tema, com a referência do capítulo da apostila ou do item do edital.
- **Desempenho**: histórico de todos os simulados que você já finalizou, e quais temas têm menor taxa de acerto acumulada (para saber o que revisar primeiro).

Todos os dados de progresso e histórico ficam salvos **localmente no seu navegador** (`localStorage`) — não há banco de dados externo. Isso significa que o histórico é por navegador/dispositivo: se você usar o site no computador e depois no celular, os dados não se sincronizam entre eles automaticamente.
