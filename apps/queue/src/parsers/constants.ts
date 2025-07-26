export const HTML_PARSING_CONSTANTS = {
  /** CSS selectors */
  SELECTORS: {
    EN_NOTE: "en-note",
    META_TITLE: 'meta[itemprop="title"]',
    META_CREATED: 'meta[itemprop="created"]',
    META_SOURCE: 'meta[itemprop="source-url"]',
    H1: "h1",
  },
  /** HTML patterns */
  PATTERNS: {
    BR_TAG: "<br",
    HTML_TAGS: /<[^>]*>/g,
  },
  /** Default values */
  DEFAULTS: {
    EMPTY_STRING: "",
    UNKNOWN_TITLE: "Untitled",
    LINE_SEPARATOR: "\n",
  },
  /** Error messages */
  ERRORS: {
    NO_TITLE: "HTML file does not have a title",
    INVALID_DATE: "Invalid date format in 'created' meta tag",
    EMPTY_CONTENT: "HTML content is empty or invalid",
  },
  /** Operation names */
  OPERATIONS: {
    HTML_PARSING: "html_parsing",
  },
} as const;
