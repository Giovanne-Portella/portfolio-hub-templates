# Portfolio Hub Templates

Plataforma de portfólio multi-tenant full-stack construída com JavaScript puro e [Supabase](https://supabase.com). Cada usuário recebe uma página de portfólio totalmente personalizável servida a partir de um único frontend compartilhado.

---

## Funcionalidades

| Categoria | Detalhes |
|---|---|
| **Templates** | 7 nichos: Músico, Banda, Acadêmico, Negócios, Logística, Criativo, Custom |
| **Seções** | Hero, Bio/Sobre, Galeria, Música, Discografia, Eventos, Publicações, Serviços, Contato, Seção Livre |
| **Motor de Tema** | Variáveis CSS dinâmicas — gradiente, sólido ou multicor; 4 famílias de fontes; 3 modos de borda arredondada |
| **Rádio Player** | Player híbrido com suporte a arquivos MP3 (Web Audio API + visualizador) e embeds do YouTube |
| **Splash Screen** | 6 estilos de intro animada: Elegante, Glitch, Cinemático, Partículas, Terminal, Minimalista |
| **Music Reactor** | Pulso de cor em tempo real controlado por dados de frequência de áudio |
| **Painel Admin** | CRUD completo para todos os tipos de conteúdo, construtor de seções com arrastar e soltar, prévia de tema ao vivo |
| **Biblioteca de Mídia** | Upload via Supabase Storage com arrastar e soltar; miniaturas de prévia de vídeo |
| **Autenticação** | Autenticação Supabase com e-mail e senha; confirmação de senha no cadastro |

---

## Stack Tecnológica

- **Frontend**: HTML + CSS + JavaScript puro (sem framework)
- **Backend/Banco de Dados**: [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage)
- **Hospedagem**: [Netlify](https://netlify.com) (estático, `netlify.toml` incluído)
- **Dependências CDN**: Supabase JS v2, Font Awesome 6.5, Google Fonts, marked.js, DOMPurify

---

## Estrutura do Projeto

```
portfolio-hub-templates/
├── index.html              # Página pública do portfólio
├── netlify.toml            # Configuração de deploy Netlify
├── supabase-schema.sql     # Schema inicial do banco de dados
├── supabase-migration-v2.sql # Migração do schema
├── favicon.svg
│
├── admin/
│   ├── index.html          # Painel administrativo
│   └── login.html          # Página de auth (login + cadastro)
│
├── css/
│   ├── style.css           # Estilos do portfólio público
│   ├── admin.css           # Stylesheet principal do painel admin
│   ├── admin/              # Parciais de componentes admin
│   └── modules/            # Módulos CSS do portfólio público
│
└── js/
    ├── config.js           # Inicialização do cliente Supabase
    ├── auth.js             # Guard de autenticação admin
    ├── admin.js            # Ponto de entrada admin + navegação
    ├── portfolio.js        # Ponto de entrada do portfólio público
    ├── admin/              # Módulos de funcionalidades admin
    │   ├── core.js         # Utilitários compartilhados (toast, modal, upload…)
    │   ├── profile.js
    │   ├── section-builder.js
    │   ├── theme-editor.js
    │   ├── gallery-manager.js
    │   ├── radio-manager.js
    │   ├── events-manager.js
    │   ├── publications-manager.js
    │   ├── services-manager.js
    │   ├── splash-manager.js
    │   └── media-library.js
    └── modules/            # Módulos do portfólio público
        ├── utils.js        # Helpers: escapeHtml, slugify, formatDuration…
        ├── theme-engine.js # Injeção de variáveis CSS
        ├── animations.js   # IntersectionObserver reveal + scroll-top
        ├── splash.js       # Estilos da splash screen
        ├── navbar.js       # Navbar + gaveta mobile + link ativo
        ├── section-renderer.js # Renderiza todos os tipos de seção
        ├── radio.js        # Player híbrido MP3/YouTube (IIFE)
        ├── music-reactor.js # Efeitos visuais reativos ao áudio
        └── utils.js
```

---

## Como Começar

### 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Execute `supabase-schema.sql` no editor SQL do Supabase, depois `supabase-migration-v2.sql` e `supabase-migration-v3.sql`.
3. Em **Storage**, crie um bucket público chamado `media` e outro chamado `avatars`.
4. Ative o **E-mail Auth** em Authentication → Providers.

### 2. Configurar as credenciais

Edite `js/config.js` e substitua os valores de exemplo:

```js
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY';
```

### 3. Deploy no Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

Ou manualmente:

```bash
# Arraste a pasta para o dashboard do Netlify, ou:
netlify deploy --prod --dir .
```

O `netlify.toml` já inclui a regra de redirecionamento que faz as URLs amigáveis como `/p/meu-slug` funcionarem.

### 4. Primeiro login

Acesse `/admin/login.html`, crie uma conta e comece a montar seu portfólio.

---

## URL Pública do Portfólio

| Padrão | Descrição |
|---|---|
| `/?slug=meu-slug` | Portfólio pelo slug |
| `/p/meu-slug` | URL amigável (requer redirecionamento Netlify) |

Defina seu slug em **Admin → Configurações**.

---

## Seções do Admin

| Página | Hash | Descrição |
|---|---|---|
| Dashboard | `#dashboard` | Estatísticas, badge do template, URL pública |
| Template | `#setup` | Escolher um preset de template |
| Mapa de Seções | `#sections` | Construtor de seções com arrastar e soltar |
| Tema e Cores | `#theme` | Prévia de tema ao vivo + seletor de cores |
| Perfil / Bio | `#profile` | Nome, tagline, bio, avatar, redes sociais |
| Biblioteca de Mídia | `#media` | Upload e gerenciamento de arquivos |
| Galerias | `#gallery` | Criar galerias e reordenar itens |
| Rádio / Músicas | `#radio` | Playlists com faixas MP3 ou YouTube |
| Eventos | `#events` | Cards de eventos com data, local e ingressos |
| Publicações | `#publications` | Artigos, livros, teses, links DOI |
| Serviços | `#services` | Cards de serviços com recursos e preço |
| Modal de Boas-vindas | `#splash` | Configuração da splash screen + prévia ao vivo |
| Configurações | `#settings` | Slug, nome, toggle de publicação |

---

## Observações de Ambiente

- **Row Level Security (RLS)** deve estar ativado em todas as tabelas do Supabase. Cada usuário só pode ler/escrever seus próprios dados.
- O arquivo `config.js` é versionado com a chave `anon` (seguro para uso no cliente), mas **nunca exponha a chave `service_role`**.
- O formulário de contato usa um link `mailto:` como fallback; para processar mensagens no servidor, adicione uma Edge Function do Supabase ou um serviço como o Formspree.

---

## Licença

MIT — veja [LICENSE](LICENSE).
