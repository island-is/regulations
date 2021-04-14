export const template = {
  order: 0,
  index_patterns: ['regulations'],
  settings: {
    analysis: {
      filter: {
        icelandicStemmer: {
          type: 'stemmer_override',
          rules: ['gg'],
          // rules_path: 'analyzers/{STEMMER}',
        },
        icelandicStop: {
          type: 'stop',
          stopwords: ['gg'],
          // stopwords_path: 'analyzers/{STOPWORDS}',
        },
        icelandicKeyword: {
          type: 'keyword_marker',
          ignore_case: true,
          keywords: ['gg'],
          // keywords_path: 'analyzers/{KEYWORDS}',
        },
        icelandicSynonym: {
          type: 'synonym',
          lenient: true,
          synonyms: ['gg'],
          // synonyms_path: 'analyzers/{SYNONYMS}',
        },
        icelandicDeCompounded: {
          type: 'dictionary_decompounder',
          word_list: ['gg'],
          // word_list_path: 'analyzers/{HYPHENWHITELIST}',
          max_subword_size: 18,
          min_subword_size: 4,
        },
      },
      analyzer: {
        baseIcelandic: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'icelandicSynonym',
            'icelandicStop',
            'icelandicKeyword',
            'icelandicStemmer',
          ],
        },
        compoundIcelandic: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'icelandicSynonym',
            'icelandicStop',
            'icelandicKeyword',
            'icelandicDeCompounded',
            'icelandicStemmer',
          ],
        },
        termIcelandic: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'icelandicSynonym', 'icelandicStop'],
        },
      },
    },
  },
  mappings: {
    properties: {
      title: {
        type: 'text',
        fields: {
          sort: {
            type: 'icu_collation_keyword',
            index: false,
            language: 'is',
            country: 'is',
          },
          stemmed: {
            type: 'text',
            analyzer: 'baseIcelandic',
          },
          compound: {
            type: 'text',
            analyzer: 'compoundIcelandic',
          },
          keyword: {
            type: 'keyword',
          },
        },
      },
      text: {
        type: 'text',
        fields: {
          stemmed: {
            type: 'text',
            analyzer: 'baseIcelandic',
          },
        },
      },
      type: {
        type: 'keyword',
      },
      name: {
        type: 'keyword',
      },
      publishedDate: {
        type: 'date',
      },
    },
  },
};
