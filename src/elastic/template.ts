import fetch from 'node-fetch';

const getDictionaryFile = async (sha: string, locale: 'is', analyzer: string) => {
  return await fetch(
    `https://github.com/island-is/elasticsearch-dictionaries/blob/${sha}/${locale}/${analyzer}.txt?raw=true`,
  )
    .then((response) => response.text())
    .then((response) => {
      if (response) {
        return response.split(/\n/).filter(Boolean);
      } else {
        return [];
      }
    });
};

export const getSettingsTemplate = async (sha: string, locale: 'is') => {
  const [
    stemmer,
    keywords,
    synonyms,
    stopwords,
    hyphenwhitelist,
    //autocompletestop,
  ] = await Promise.all([
    getDictionaryFile(sha, locale, 'stemmer'),
    getDictionaryFile(sha, locale, 'keywords'),
    getDictionaryFile(sha, locale, 'synonyms'),
    getDictionaryFile(sha, locale, 'stopwords'),
    getDictionaryFile(sha, locale, 'hyphenwhitelist'),
    //getDictionaryFile(sha, locale, 'autocompletestop'),
  ]);

  return {
    settings: {
      analysis: {
        filter: {
          icelandicStemmer: {
            type: 'stemmer_override',
            rules: stemmer,
          },
          icelandicStop: {
            type: 'stop',
            stopwords: stopwords,
          },
          icelandicKeyword: {
            type: 'keyword_marker',
            ignore_case: true,
            keywords: keywords,
          },
          icelandicSynonym: {
            type: 'synonym',
            lenient: true,
            synonyms: synonyms,
          },
          icelandicDeCompounded: {
            type: 'dictionary_decompounder',
            word_list: hyphenwhitelist,
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
  };
};

export const mappingTemplate = {
  properties: {
    title: {
      type: 'text',
      fields: {
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
};
