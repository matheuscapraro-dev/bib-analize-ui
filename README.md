# BibAnalize — Plataforma de Análise Bibliométrica

**Autor:** Matheus A. Capraro  
**Orientadora:** Prof.ª Dr.ª Ana Cristina K. Vendramin  
**Programa:** Programa de Pós-Graduação em Computação Aplicada (PPGCA)  
**Instituição:** Universidade Tecnológica Federal do Paraná (UTFPR)

---

## Descrição

BibAnalize é uma plataforma web para análise bibliométrica interativa. Permite importar dados do **Web of Science** (arquivos `.txt`, `.csv`, `.bib`) ou buscar diretamente na API do **OpenAlex**, gerando automaticamente mais de 15 painéis de análise — incluindo produção temporal, autores, fontes, citações, colaboração, Open Access, distribuição geográfica, entre outros.

A plataforma também oferece um módulo de **comparação de análises**, possibilitando a comparação lado a lado de 2 a 4 conjuntos bibliográficos com 26 métricas comparativas organizadas em 8 categorias.

## Funcionalidades Principais

- **Importação flexível:** Upload de arquivos Web of Science (Tagged/Tab-delimited) ou busca via API OpenAlex
- **15+ painéis de análise:** Produção anual, autores (Lotka), fontes (Bradford), citações, colaboração, mapas geográficos, palavras-chave, Open Access, tipos de documento, idiomas, áreas do conhecimento, financiamento, explorador de artigos
- **Comparação de análises:** Seleção de 2–4 análises salvas para comparação com overlap de conjuntos, radar de perfil, rankings lado a lado, box plots e distribuições
- **Salvar e restaurar:** Análises são persistidas no navegador (IndexedDB) para acesso posterior
- **Exportação:** Gráficos exportáveis como PNG e dados como CSV
- **Interface responsiva:** Design adaptável para desktop e dispositivos móveis

## Tecnologias

- **Framework:** Next.js 16 (App Router) com React 19 e TypeScript
- **UI:** shadcn/ui + Radix UI + Tailwind CSS 4
- **Gráficos:** Recharts + SVG customizado
- **Armazenamento local:** IndexedDB (idb-keyval)
- **API de dados:** OpenAlex REST API

## Como Executar

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento
npm run dev

# Build de produção
npm run build
npm start
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

## Estrutura do Projeto

```
src/
├── app/              # Rotas (Next.js App Router)
│   ├── analise/      # Painéis de análise bibliométrica
│   └── comparar/     # Módulo de comparação de análises
├── components/       # Componentes React reutilizáveis
│   ├── charts/       # Gráficos (bar, line, pie, radar, box plot)
│   └── comparison/   # Componentes do módulo de comparação
├── hooks/            # Custom hooks
├── lib/              # Lógica de negócio e utilitários
│   └── comparison/   # Funções de análise comparativa
├── store/            # Contextos React (estado global)
└── types/            # Definições TypeScript
```

## Licença

Projeto acadêmico desenvolvido no âmbito do PPGCA/UTFPR. Todos os direitos reservados.
