# BibAnalize — Plataforma de Análise Bibliométrica

**Autor:** Matheus A. Capraro  
**Orientadora:** Prof.ª Dr.ª Ana Cristina K. Vendramin  
**Programa:** Programa de Pós-Graduação em Computação Aplicada (PPGCA)  
**Instituição:** Universidade Tecnológica Federal do Paraná (UTFPR)

---

## Descrição

BibAnalize é uma plataforma web para análise bibliométrica interativa. Permite importar dados do **Web of Science** (arquivos `.txt`, `.csv`, `.tsv`, `.bib`) ou buscar diretamente na API do **OpenAlex**, gerando automaticamente **17 painéis de análise** — incluindo produção temporal, autores, fontes, citações, redes de colaboração, Open Access, distribuição geográfica, palavras-chave, leis bibliométricas (Lotka e Bradford) e um explorador de publicações com busca por relevância.

A plataforma também oferece um módulo de **comparação de análises**, possibilitando a comparação lado a lado de 2 a 4 conjuntos bibliográficos com mais de 26 métricas comparativas organizadas em 8 categorias.

Toda a aplicação roda **100% no navegador** (SPA), sem necessidade de backend próprio — apenas chamadas à API pública do OpenAlex.

---

## Funcionalidades Principais

### Importação de Dados

- **Upload de arquivos Web of Science:** formatos Tagged (`.txt`) e Tab-delimited (`.csv`, `.tsv`), com detecção automática do formato e suporte a arquivos de até 50 MB.
- **Busca via API OpenAlex:** pesquisa por tópico, autor, fonte, instituição, DOI, intervalo de anos, tipo de documento, status de Open Access e exigência de resumo. Suporta autenticação por e-mail ou chave de API.
- **Análises salvas:** carregamento de análises previamente persistidas no navegador via IndexedDB.

### Painéis de Análise (17 páginas)

| Painel | Descrição |
|--------|-----------|
| **Visão Geral** | Resumo dos principais indicadores bibliométricos (KPIs): documentos, autores, fontes, citações, período |
| **Produção Anual** | Evolução temporal de publicações e citações (gráfico de barras, linha acumulada, tabela) |
| **Fontes** | Ranking de periódicos e fontes de publicação com percentuais |
| **Autores** | Autores mais produtivos com índice h, citações e métricas de produtividade |
| **Instituições** | Organizações e universidades, incluindo redes de colaboração institucional |
| **Países** | Distribuição geográfica com mapa coroplético, gráfico de pizza, barras e redes |
| **Palavras-chave** | Frequência de termos, nuvem de palavras e rede de coocorrência (campos DE/ID) |
| **Citações** | Métricas de citação, gráficos de dispersão (citações × ano) e artigos mais citados |
| **Colaboração** | Redes de coautoria, colaboração institucional, entre países e coocorrência de palavras-chave |
| **Open Access** | Distribuição por status de OA (Gold, Green, Bronze, Hybrid, Closed) e impacto em citações |
| **Tipos de Documento** | Distribuição por tipo de publicação (pizza, treemap, tabela) |
| **Idiomas** | Distribuição por idioma de publicação |
| **Áreas do Conhecimento** | Distribuição temática pelos campos WC/SC (treemap e barras) |
| **Financiamento** | Agências financiadoras e proporção de artigos financiados por ano |
| **Lotka & Bradford** | Distribuição de produtividade dos autores (Lei de Lotka) e zonas de periódicos (Lei de Bradford) |
| **Explorador de Publicações** | Busca textual com pontuação de relevância (35% citações, 25% cit./ano, 20% FWCI, 20% percentil) |
| **Resumo e Exportação** | Resumo de KPIs e exportação de dados em CSV e ZIP |

### Módulo de Comparação (8 categorias)

Permite selecionar de 2 a 4 análises salvas e compará-las lado a lado:

| Categoria | Descrição |
|-----------|-----------|
| **Visão Geral** | KPIs comparativos e radar de perfil normalizado |
| **Produção Temporal** | Linhas sobrepostas de publicações, citações e crescimento acumulado |
| **Autores** | Sobreposição de autores (similaridade de Jaccard), ranking e intensidade de colaboração |
| **Geográfico** | Sobreposição de países e instituições, análise de Sul Global |
| **Impacto** | Box plots de citações e FWCI, artigos mais citados, distribuição por percentil |
| **Fontes** | Sobreposição de periódicos, zonas de Bradford comparadas |
| **Temático** | Sobreposição de palavras-chave e áreas, redes de coocorrência |
| **Diversidade** | Open Access, tipos de documento, idiomas e financiamento |

### Filtros Globais

Filtros aplicados simultaneamente a todos os painéis de análise:

- **Intervalo de anos** — seletor duplo com debounce de 300 ms
- **Tipo de documento** — seleção múltipla (Article, Review, Book Chapter, Conference, etc.)
- **Idioma** — seleção múltipla (English, Portuguese, Spanish, French, German, etc.)
- **Status de Open Access** — seleção múltipla (Gold, Green, Bronze, Hybrid, Closed, Diamond)
- **Busca textual** — pesquisa com índice pré-computado sobre título, resumo, autores e palavras-chave

### Exportação

- **Gráficos:** exportação individual em PNG com resolução 2× (compatível com modo escuro)
- **Dados em CSV:** exportação separada de dados gerais, autores, estatísticas anuais, fontes e palavras-chave
- **Arquivo ZIP:** pacote compactado contendo todos os CSVs e um resumo em texto com os KPIs

### Persistência Local

- Análises completas são salvas no **IndexedDB** do navegador (sem servidor)
- Funcionalidades de salvar, carregar, renomear e excluir análises

---

## Tecnologias

### Framework e Linguagem

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| [Next.js](https://nextjs.org/) | 16.2.1 | Framework React com App Router e suporte a SSR/SSG |
| [React](https://react.dev/) | 19.2.4 | Biblioteca de componentes de interface |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Tipagem estática em todo o projeto |

### Interface e Estilização

| Tecnologia | Finalidade |
|------------|------------|
| [Tailwind CSS](https://tailwindcss.com/) 4 | Estilização baseada em classes utilitárias |
| [Radix UI](https://www.radix-ui.com/) | Componentes headless acessíveis (Dialog, Select, Tabs, Tooltip, Popover, etc.) |
| [shadcn/ui](https://ui.shadcn.com/) | Padrão de composição com `class-variance-authority`, `clsx` e `tailwind-merge` |
| [Lucide React](https://lucide.dev/) | Biblioteca de ícones SVG |
| [next-themes](https://github.com/pacocoursey/next-themes) | Alternância de modo claro/escuro |
| [Sonner](https://sonner.emilkowal.dev/) | Notificações toast |

### Visualização de Dados

| Tecnologia | Finalidade |
|------------|------------|
| [Recharts](https://recharts.org/) 3 | Gráficos de barras, linhas, pizza, dispersão, radar e treemap |
| [react-simple-maps](https://www.react-simple-maps.io/) + [topojson-client](https://github.com/topojson/topojson-client) | Mapa coroplético com distribuição geográfica |
| [d3-cloud](https://github.com/jasondavies/d3-cloud) | Algoritmo de layout para nuvem de palavras |
| Canvas API (nativo) | Grafo de rede force-directed com simulação de física |

### Análise de Grafos

| Tecnologia | Finalidade |
|------------|------------|
| [Graphology](https://graphology.github.io/) | Estrutura de dados de grafos |
| [graphology-communities-louvain](https://graphology.github.io/) | Detecção de comunidades pelo algoritmo de Louvain |
| [graphology-metrics](https://graphology.github.io/) | Métricas de grafo (centralidade, densidade, etc.) |

### Tabelas e Dados

| Tecnologia | Finalidade |
|------------|------------|
| [TanStack Table](https://tanstack.com/table/) v8 | Tabelas com ordenação, filtro global e paginação |
| [PapaParse](https://www.papaparse.com/) | Parsing e geração de CSV |
| [Fuse.js](https://www.fusejs.io/) | Busca fuzzy no explorador de publicações |

### Exportação

| Tecnologia | Finalidade |
|------------|------------|
| [html-to-image](https://github.com/nickt/html-to-image) | Captura de gráficos em PNG (2× resolução) |
| [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) | Geração de PDF com tabelas |
| [JSZip](https://stuk.github.io/jszip/) | Criação de arquivos ZIP para exportação em lote |

### Qualidade de Código

| Tecnologia | Finalidade |
|------------|------------|
| [ESLint](https://eslint.org/) 9 + eslint-config-next | Análise estática de código |
| [Prettier](https://prettier.io/) + prettier-plugin-tailwindcss | Formatação automática de código |

---

## Como Executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- npm (incluído com o Node.js)

### Instalação

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd bib-analize-ui

# Instalar dependências
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

### Build de Produção

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

---

## Estrutura do Projeto

```
src/
├── app/                        # Rotas (Next.js App Router)
│   ├── page.tsx                # Página inicial (upload, busca, análises salvas)
│   ├── layout.tsx              # Layout raiz da aplicação
│   ├── providers.tsx           # Provedores de contexto (tema, estado)
│   ├── globals.css             # Estilos globais (Tailwind)
│   ├── analise/                # Painéis de análise bibliométrica
│   │   ├── layout.tsx          # Layout com sidebar e filtros globais
│   │   ├── page.tsx            # Visão geral (KPIs)
│   │   ├── producao-anual/     # Produção anual
│   │   ├── fontes/             # Fontes e periódicos
│   │   ├── autores/            # Autores
│   │   ├── instituicoes/       # Instituições
│   │   ├── paises/             # Países
│   │   ├── palavras-chave/     # Palavras-chave
│   │   ├── citacoes/           # Citações
│   │   ├── colaboracao/        # Redes de colaboração
│   │   ├── open-access/        # Open Access
│   │   ├── tipos-documento/    # Tipos de documento
│   │   ├── idiomas/            # Idiomas
│   │   ├── areas/              # Áreas do conhecimento
│   │   ├── financiamento/      # Financiamento
│   │   ├── lotka-bradford/     # Leis de Lotka e Bradford
│   │   ├── artigos/            # Explorador de publicações
│   │   └── resumo/             # Resumo e exportação
│   ├── comparar/               # Módulo de comparação de análises
│   │   ├── layout.tsx          # Layout da comparação
│   │   ├── page.tsx            # Seleção de datasets e visão geral
│   │   ├── autores/            # Comparação de autores
│   │   ├── producao/           # Comparação temporal
│   │   ├── geografico/         # Comparação geográfica
│   │   ├── impacto/            # Comparação de impacto
│   │   ├── fontes/             # Comparação de fontes
│   │   ├── tematico/           # Comparação temática
│   │   └── diversidade/        # Comparação de diversidade
│   └── api/                    # Rotas de API (proxy para WoS)
├── components/                 # Componentes React reutilizáveis
│   ├── charts/                 # Componentes de gráficos
│   │   ├── bar-chart.tsx       # Gráfico de barras (horizontal/vertical, empilhado)
│   │   ├── line-chart.tsx      # Gráfico de linhas (múltiplas séries)
│   │   ├── pie-chart.tsx       # Gráfico de pizza/rosca
│   │   ├── scatter-chart.tsx   # Gráfico de dispersão
│   │   ├── network-graph.tsx   # Grafo de rede force-directed (Canvas)
│   │   ├── treemap.tsx         # Treemap hierárquico
│   │   ├── word-cloud.tsx      # Nuvem de palavras
│   │   ├── choropleth-map.tsx  # Mapa coroplético
│   │   ├── radar-chart.tsx     # Gráfico de radar
│   │   ├── box-plot-comparison.tsx  # Box plot comparativo
│   │   ├── comparison-bar-chart.tsx # Barras comparativas
│   │   ├── overlay-line-chart.tsx   # Linhas sobrepostas
│   │   └── chart-container.tsx # Wrapper com título e botão de exportação
│   ├── comparison/             # Componentes do módulo de comparação
│   │   ├── comparison-sidebar.tsx  # Navegação lateral da comparação
│   │   ├── dataset-selector.tsx    # Seletor de datasets
│   │   └── overlap-display.tsx     # Exibição de sobreposição de conjuntos
│   ├── ui/                     # Primitivos de UI (shadcn/ui + Radix)
│   ├── app-sidebar.tsx         # Navegação lateral principal (17 itens)
│   ├── article-drill-down.tsx  # Painel de detalhes ao clicar em categorias
│   ├── chart-export-button.tsx # Botão de exportação PNG
│   ├── data-table.tsx          # Tabela com ordenação e paginação (TanStack)
│   ├── empty-state.tsx         # Estado vazio (sem dados)
│   ├── error-boundary.tsx      # Captura de erros de renderização
│   ├── global-filters.tsx      # Barra de filtros globais
│   ├── kpi-cards.tsx           # Cartões de indicadores
│   ├── page-header.tsx         # Cabeçalho padronizado de página
│   ├── save-analysis-dialog.tsx    # Modal para salvar análise
│   ├── saved-analyses-list.tsx     # Lista de análises salvas
│   ├── top-n-selector.tsx      # Seletor de "Top N" resultados
│   └── topic-resolver.tsx      # Resolução de tópicos do OpenAlex
├── hooks/                      # Hooks personalizados
│   ├── use-drill-down.ts       # Drill-down em artigos ao clicar em categorias
│   └── use-saved-analyses.ts   # Operações CRUD de análises salvas
├── lib/                        # Lógica de negócio e utilitários
│   ├── parser.ts               # Parsing de arquivos WoS (Tagged e Tab-delimited)
│   ├── data-processing.ts      # Funções de processamento bibliométrico
│   ├── openalex-api.ts         # Cliente da API OpenAlex (busca com cache e rate-limit)
│   ├── openalex-enrich.ts      # Enriquecimento de registros WoS via OpenAlex
│   ├── boolean-filter.ts       # Filtro booleano (AND/OR/NOT)
│   ├── saved-analyses-db.ts    # Persistência em IndexedDB
│   ├── chart-config.ts         # Paletas de cores e configurações de gráficos
│   ├── constants.ts            # Mapeamentos de campos, países, idiomas e ISO codes
│   ├── utils.ts                # Utilitários gerais (cn, formatação)
│   ├── wos-api.ts              # Cliente Web of Science (proxy)
│   └── comparison/             # Funções de análise comparativa
│       ├── analyses.ts         # 12+ funções de cálculo comparativo
│       ├── types.ts            # Tipos do módulo de comparação
│       ├── utils.ts            # Utilitários (Jaccard, box plot, normalização)
│       └── index.ts            # Reexportações
├── store/                      # Gerenciamento de estado global
│   ├── bibliometric-context.tsx    # Contexto principal (works, filtros, KPIs)
│   └── comparison-context.tsx      # Contexto de comparação (datasets)
└── types/
    └── bibliometric.ts         # Definições de tipos (BibWork, KpiData, etc.)
```

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                     Fontes de Dados                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Upload WoS   │  │ API OpenAlex │  │ Análises Salvas   │  │
│  │ (.txt/.csv)  │  │ (REST)       │  │ (IndexedDB)       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
└─────────┼─────────────────┼───────────────────┼──────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│                  Camada de Processamento                      │
│  parser.ts · openalex-api.ts · openalex-enrich.ts            │
│  data-processing.ts · boolean-filter.ts · constants.ts       │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Estado Global (React Context)                    │
│  bibliometric-context.tsx  │  comparison-context.tsx          │
│  works[] · filtered[] · filters · kpis                       │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Camada de Apresentação                     │
│  17 painéis de análise  │  8 categorias de comparação        │
│  12 tipos de gráfico    │  Tabelas interativas               │
│  Filtros globais        │  Exportação (PNG, CSV, ZIP)        │
└──────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. O usuário importa dados via upload de arquivo WoS, busca na API OpenAlex ou carregamento de análise salva.
2. Os registros são parseados e normalizados para a interface `BibWork` (40+ campos).
3. Registros de WoS podem ser enriquecidos via OpenAlex (resumos, FWCI, percentil de citação, OA, SDGs, etc.).
4. Os dados são armazenados no estado global (`bibliometric-context`) com filtros reativos.
5. Cada painel consome os dados filtrados via `useBib()`, processa com funções especializadas e renderiza nos gráficos/tabelas.

### Otimizações de Desempenho

- **Índice de busca pré-computado:** `_searchText` é gerado uma única vez no carregamento para evitar chamadas repetidas a `toLowerCase()`.
- **Cache de requisições:** chamadas à API OpenAlex utilizam cache em memória com TTL de 30 minutos.
- **Memoização:** uso extensivo de `useMemo` em todos os painéis para cálculos custosos.
- **Paginação:** tabelas renderizam apenas 15–20 linhas por página por padrão.
- **Concorrência controlada:** máximo de 3 requisições paralelas à API, com rate-limit configurável.

---

## Licença

Projeto acadêmico desenvolvido no âmbito do PPGCA/UTFPR. Todos os direitos reservados.
