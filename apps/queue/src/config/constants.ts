/**
 * Application constants
 * Centralized location for all hardcoded values
 */

// ============================================================================
// SERVER CONSTANTS
// ============================================================================

export const SERVER_CONSTANTS = {
  /** Default HTTP port */
  DEFAULT_PORT: 4200,
  /** Default WebSocket port */
  DEFAULT_WS_PORT: 8080,
  /** Default WebSocket host */
  DEFAULT_WS_HOST: "localhost",
  /** Default WebSocket URL */
  DEFAULT_WS_URL: "ws://localhost:8080",
  /** Request size limit */
  REQUEST_SIZE_LIMIT: "10mb",
  /** Graceful shutdown timeout */
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: 10000,
  /** HTTP status codes */
  STATUS_CODES: {
    SERVICE_UNAVAILABLE: 503,
  },
} as const;

// ============================================================================
// QUEUE CONSTANTS
// ============================================================================

export const QUEUE_CONSTANTS = {
  /** Default batch size for processing */
  DEFAULT_BATCH_SIZE: 10,
  /** Default maximum retries */
  DEFAULT_MAX_RETRIES: 3,
  /** Default backoff delay in milliseconds */
  DEFAULT_BACKOFF_MS: 1000,
  /** Default maximum backoff delay in milliseconds */
  DEFAULT_MAX_BACKOFF_MS: 30000,
  /** Default job attempts */
  DEFAULT_JOB_ATTEMPTS: 3,
  /** Default worker concurrency */
  DEFAULT_WORKER_CONCURRENCY: 5,
} as const;

// ============================================================================
// CACHE CONSTANTS
// ============================================================================

export const CACHE_CONSTANTS = {
  /** Default cache TTL in milliseconds (5 minutes) */
  DEFAULT_CACHE_TTL_MS: 300000,
  /** Default cache TTL for action results */
  ACTION_CACHE_TTL_MS: 300000,
} as const;

// ============================================================================
// WEBSOCKET CONSTANTS
// ============================================================================

export const WEBSOCKET_CONSTANTS = {
  /** Maximum number of WebSocket clients */
  MAX_CLIENTS: 100,
  /** Rate limit window in milliseconds */
  RATE_LIMIT_MS: 1000,
  /** Maximum messages per rate limit window */
  MAX_MESSAGES_PER_WINDOW: 10,
} as const;

// ============================================================================
// LOGGING CONSTANTS
// ============================================================================

export const LOGGING_CONSTANTS = {
  /** Default maximum log file size in MB */
  DEFAULT_MAX_LOG_SIZE_MB: 10,
  /** Default log rotation size in MB */
  DEFAULT_LOG_ROTATION_SIZE_MB: 10,
} as const;

// ============================================================================
// PROCESSING CONSTANTS
// ============================================================================

export const PROCESSING_CONSTANTS = {
  /** Ingredient parser version to use ("v1" or "v2") */
  INGREDIENT_PARSER_VERSION: "v1" as "v1" | "v2",

  /** Default image processing time in milliseconds */
  DEFAULT_IMAGE_PROCESSING_TIME_MS: 100,
  /** Default instruction processing time in milliseconds */
  DEFAULT_INSTRUCTION_PROCESSING_TIME_MS: 30,
  /** Default image size limit in bytes (100KB) */
  DEFAULT_IMAGE_SIZE_LIMIT_BYTES: 102400,
  /** Default image dimension limit */
  DEFAULT_IMAGE_DIMENSION_LIMIT: 1024,
  /** Minimum ingredient text length */
  MIN_INGREDIENT_TEXT_LENGTH: 3,
  /** Minimum instruction text length */
  MIN_INSTRUCTION_TEXT_LENGTH: 10,
  /** Default prep time string */
  DEFAULT_PREP_TIME: "30 minutes",
} as const;

// ============================================================================
// METRICS CONSTANTS
// ============================================================================

export const METRICS_CONSTANTS = {
  /** Maximum number of metrics to keep in memory */
  MAX_METRICS_VALUES: 100,
} as const;

// ============================================================================
// REDIS CONSTANTS
// ============================================================================

export const REDIS_CONSTANTS = {
  /** Default Redis port */
  DEFAULT_PORT: 6379,
} as const;

// ============================================================================
// RETRY CONSTANTS
// ============================================================================

export const RETRY_CONSTANTS = {
  /** Default maximum retry attempts */
  DEFAULT_MAX_ATTEMPTS: 3,
  /** Default base delay in milliseconds */
  DEFAULT_BASE_DELAY_MS: 1000,
  /** Default maximum delay in milliseconds */
  DEFAULT_MAX_DELAY_MS: 30000,
} as const;

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

export const SECURITY_CONSTANTS = {
  /** Rate limiting */
  RATE_LIMITS: {
    GLOBAL_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    GLOBAL_MAX_REQUESTS: 100,
    IMPORT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    IMPORT_MAX_REQUESTS: 50,
    API_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    API_MAX_REQUESTS: 200,
  },
  /** Request size limits */
  REQUEST_LIMITS: {
    MAX_REQUEST_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    MAX_IMPORT_REQUEST_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  },
  /** CORS settings */
  CORS: {
    ALLOWED_ORIGINS: ["http://localhost:3000", "http://localhost:4200"],
    ALLOWED_METHODS: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    ALLOWED_HEADERS: ["Content-Type", "Authorization", "X-Requested-With"],
  },
  /** Security headers */
  SECURITY_HEADERS: {
    CONTENT_TYPE_OPTIONS: "nosniff",
    FRAME_OPTIONS: "DENY",
    XSS_PROTECTION: "1; mode=block",
    REFERRER_POLICY: "strict-origin-when-cross-origin",
    CONTENT_SECURITY_POLICY:
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  },
} as const;

// ============================================================================
// HTTP CONSTANTS
// ============================================================================

export const HTTP_CONSTANTS = {
  /** HTTP status codes */
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    TOO_MANY_REQUESTS: 429,
  },
  /** HTTP methods */
  METHODS: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE",
    PATCH: "PATCH",
  },
  /** Common headers */
  HEADERS: {
    CONTENT_TYPE: "Content-Type",
    AUTHORIZATION: "Authorization",
    USER_AGENT: "User-Agent",
  },
} as const;

// ============================================================================
// WORKER CONSTANTS
// ============================================================================

export const WORKER_CONSTANTS = {
  /** Worker names */
  NAMES: {
    NOTE: "note_processing",
    INSTRUCTION: "instruction_processing",
    INGREDIENT: "ingredient_processing",
    IMAGE: "image_processing",
    PATTERN_TRACKING: "pattern_tracking",
    CATEGORIZATION: "categorization_processing",
  },
  /** Job types */
  JOB_TYPES: {
    PROCESS_NOTE: "process-note",
  },
  /** Default job options */
  DEFAULT_JOB_OPTIONS: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 2000,
    },
  },
} as const;

// ============================================================================
// FILE CONSTANTS
// ============================================================================

export const FILE_CONSTANTS = {
  /** File extensions */
  EXTENSIONS: {
    HTML: ".html",
    JSON: ".json",
    TXT: ".txt",
  },
  /** File size limits */
  SIZE_LIMITS: {
    MAX_HTML_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    MAX_IMAGE_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  },
  /** Directory paths */
  PATHS: {
    PUBLIC_FILES: "/public/files",
    EVERNOTE_INDEX_FILE: "Evernote_index.html",
  },
} as const;

// ============================================================================
// LOGGING MESSAGES
// ============================================================================

export const LOG_MESSAGES = {
  /** Success messages */
  SUCCESS: {
    WORKER_STARTED: "✅ {workerName} worker created and started",
    WORKER_CLOSED: "✅ {workerName} worker closed successfully",
    QUEUE_CLOSED: "✅ {queueName} queue closed successfully",
    IMPORT_COMPLETED: "✅ Import completed in {duration}ms",
    FILE_QUEUED: "✅ Queued file: {fileName} with importId: {importId}",
    NOTE_HTML_PARSING_COMPLETED:
      "✅ HTML parsing completed: {contentLength} characters",
    NOTE_CREATION_COMPLETED: "✅ Note created successfully: {fileName}",
    NOTE_COMPLETION_TRACKER_CREATED:
      "✅ Completion tracker created for note {noteId}",
    NOTE_COMPLETION_TRACKER_UPDATED:
      "✅ Completion tracker updated for note {noteId}",
    NOTE_COMPLETION_TRACKER_INCREMENTED:
      "✅ Completion tracker incremented for note {noteId}",
    NOTE_COMPLETION_CHECKED:
      "✅ Completion status checked for note {noteId}: {isComplete}",
  },
  /** Error messages */
  ERROR: {
    WORKER_FAILED: "❌ Failed to create {workerName} worker: {error}",
    WORKER_ERROR: "❌ {workerName} worker error: {error}",
    FILE_FAILED: "❌ Failed to queue file {fileName}: {error}",
    IMPORT_FAILED: "❌ Import failed: {error}",
    GRACEFUL_SHUTDOWN_TIMEOUT: "❌ Forced shutdown after timeout",
  },
  /** Info messages */
  INFO: {
    GRACEFUL_SHUTDOWN_START:
      "🛑 Received {signal}, starting graceful shutdown...",
    CLOSING_WORKERS: "🔄 Closing workers...",
    CLOSING_QUEUES: "🔄 Closing queues...",
    SERVER_STARTED: "🚀 Queue service running at http://localhost:{port}",
    BULL_BOARD_AVAILABLE:
      "📊 Bull Board available at http://localhost:{port}/bull-board",
    HEALTH_CHECK_AVAILABLE:
      "❤️ Health check available at http://localhost:{port}/health",
    WEBSOCKET_STARTED: "🔌 WebSocket server running on port {port}",
    WORKERS_STARTED: "👷 All workers started successfully",
    HTTP_SERVER_CLOSED: "✅ HTTP server closed",
    NOTE_HTML_PARSING_START:
      "📄 Parsing HTML content: {contentLength} characters",
    NOTE_CREATION_START: "📝 Creating note: {fileName}",
    NOTE_COMPLETION_TRACKER_CREATION:
      "📊 Creating completion tracker for note {noteId}: {totalJobs} jobs",
    NOTE_COMPLETION_TRACKER_UPDATE:
      "📊 Updating completion tracker for note {noteId}: {completedJobs} completed",
    NOTE_COMPLETION_TRACKER_INCREMENT:
      "📊 Incrementing completion tracker for note {noteId}",
    NOTE_COMPLETION_CHECK: "📊 Checking completion status for note {noteId}",
  },
} as const;

// ============================================================================
// CATEGORIZATION CONSTANTS
// ============================================================================

export const CATEGORIZATION_CONSTANTS = {
  /** Notebook to category mapping for Evernote metadata */
  NOTEBOOK_CATEGORY_MAPPING: {
    Appetizers: ["Appetizer", "Side"],
    Arancini: ["Appetizer", "Side", "Arancini"],
    Arepas: ["Main", "Arepa"],
    "BBQ Sauce": ["Condiment", "Sauce"],
    "Baked Cheeses": ["Appetizer", "Side"],
    "Baked Pasta": ["Main", "Pasta"],
    "Banh Xeo": ["Main", "Savory Pancake"],
    Bass: ["Main", "Fish"],
    Beans: ["Side"],
    Beef: ["Main"],
    "Beef Curry": ["Main", "Curry"],
    "Beef Roast": ["Main"],
    "Beef Stir-Fry": ["Main"],
    "Beef Tacos": ["Main", "Taco"],
    Bibimbap: ["Main", "Bibimbap"],
    Biryani: ["Main", "Biryani"],
    Biscuits: ["Breakfast"],
    Breakfast: ["Breakfast"],
    "Breakfast Breads": ["Breakfast", "Bread"],
    "Breakfast Sandwich": ["Breakfast", "Sandwich"],
    "Breakfast Tacos": ["Breakfast", "Taco"],
    "Breakfast Tarts & Flatbreads": ["Breakfast"],
    Brisket: ["Main", "Beef"],
    Brownies: ["Dessert"],
    Bulgogi: ["Main", "Bulgogi"],
    Buns: ["Side"],
    Burgers: ["Main", "Sandwich"],
    "Burgers Fish": ["Main", "Sandwich"],
    Burritos: ["Main", "Burrito"],
    Cakes: ["Dessert"],
    Calzones: ["Main"],
    "Cannelloni & Manicotti": ["Main", "Pasta"],
    Cannoli: ["Dessert"],
    Catfish: ["Main", "Fish"],
    "Cauliflower Pizza": ["Main", "Pizza"],
    Cheesecake: ["Dessert"],
    Cheesesteak: ["Main", "Sandwich"],
    "Chicago Style Pizza": ["Main", "Pizza"],
    Chicken: ["Main", "Poultry"],
    "Chicken Adobo": ["Main", "Poultry"],
    "Chicken Soup": ["Main", "Soup"],
    "Chicken Wings": ["Main", "Appetizer", "Side"],
    "Chicken and Dumplings": ["Main", "Soup"],
    Chilaquiles: ["Breakfast", "Main"],
    Chili: ["Main", "Soup"],
    "Chilled Soups": ["Main", "Appetizer", "Soup"],
    Chutney: ["Condiment"],
    Cocktails: ["Alcohol", "Drink"],
    Cod: ["Main", "Fish"],
    "Coffee & Tea": ["Drink"],
    "Cold Noodle Soups": ["Main", "Soup", "Noodle Soup"],
    Condiments: ["Condiment"],
    Congee: ["Main", "Soup"],
    Cookies: ["Dessert"],
    Cornbread: ["Side"],
    Crepes: ["Breakfast"],
    Croquettes: ["Side", "Appetizer"],
    Crostini: ["Appetizer"],
    "Crumbed Chicken": ["Main", "Poultry"],
    "Crumbed Pork": ["Main", "Pork"],
    Cupcakes: ["Dessert"],
    "Cured Fish": ["Appetizer", "Fish"],
    "Cured Meat": ["Appetizer"],
    Dal: ["Main", "Side"],
    Desserts: ["Dessert"],
    "Dips & Spreads": ["Appetizer", "Side"],
    Donburi: ["Main"],
    Donuts: ["Breakfast"],
    Dosa: ["Main", "Dosa"],
    Drinks: ["Drink"],
    Duck: ["Main", "Poultry"],
    "Dumpling Soup": ["Main", "Soup", "Dumpling"],
    Dumplings: ["Main", "Dumpling"],
    Eggs: ["Main", "Breakfast"],
    "Empanadas & Hand Pies": ["Main"],
    Enchiladas: ["Main"],
    Entremet: ["Dessert"],
    Falafel: ["Main"],
    Fish: ["Main", "Fish"],
    "Fish & Seafood Curry": ["Main", "Curry"],
    "Fish & Seafood Noodles": ["Main"],
    "Fish & Seafood Pasta": ["Main"],
    "Fish Cakes & Fritters": ["Appetizer", "Main"],
    "Fish Tacos": ["Main", "Taco"],
    Flatbreads: ["Side", "Bread"],
    "Flautas & Taquitos": ["Main", "Appetizer", "Taco"],
    "French Onion Soup": ["Main", "Soup"],
    "French Toast": ["Breakfast"],
    "Fried Chicken": ["Main", "Poultry"],
    Fries: ["Sides"],
    Frittatas: ["Breakfast", "Main"],
    Fritters: ["Side"],
    "Fruit Salad": ["Side", "Salad"],
    Goat: ["Main", "Goat"],
    Gnocchi: ["Main", "Pasta"],
    "Grilled Chicken": ["Main", "Poultry"],
    Grouper: ["Main", "Fish"],
    Halibut: ["Main", "Fish"],
    Ham: ["Main", "Pork"],
    Hushpuppies: ["Side"],
    "Ice Cream & Gelatin": ["Dessert"],
    Jam: ["Condiment"],
    Jeon: ["Appetizer", "Main"],
    Kebabs: ["Main", "Kebab"],
    Khachapuri: ["Main", "Khachapuri"],
    "Khao Soi": ["Main", "Noodle Soup", "Soup"],
    "Kimchi & Banchan": ["Side", "Appetizer"],
    "Kimchi Jigae": ["Main", "Soup"],
    Lahmacun: ["Main"],
    Laksa: ["Main", "Noodle Soup", "Soup"],
    Lamb: ["Main", "Lamb"],
    "Lamb Chops": ["Main"],
    "Lamb Curry": ["Main", "Curry"],
    "Lamb Ribs / Rack": ["Main"],
    "Lamb Roast": ["Main"],
    "Lamb Shanks": ["Main"],
    "Lamb Tacos": ["Main", "Taco"],
    Lasagna: ["Main", "Pasta"],
    "Layer Cakes": ["Dessert"],
    Lentils: ["Main", "Side"],
    Loaves: ["Side", "Bread"],
    "Mac & Cheese": ["Main", "Side", "Pasta"],
    Macarons: ["Dessert"],
    Mackerel: ["Main", "Fish"],
    Madeleines: ["Dessert"],
    Manti: ["Main", "Dumpling"],
    "Meatball Sandwiches": ["Main", "Sandwich"],
    "Meatball Soups": ["Main", "Soup"],
    Meatballs: ["Main"],
    "Meatballs Pasta": ["Main", "Pasta"],
    Mole: ["Main"],
    Momos: ["Main", "Dumpling"],
    Muffins: ["Breakfast"],
    Nachos: ["Appetizer"],
    "Noodle Soups": ["Main", "Noodle Soup", "Soup"],
    Noodles: ["Main", "Noodle"],
    Okonomiyaki: ["Main", "Savory Pancake"],
    Omurice: ["Main"],
    Oxtails: ["Main"],
    Pancakes: ["Breakfast"],
    "Panna Cotta": ["Dessert"],
    Pasta: ["Main", "Pasta"],
    "Pasta Dough": ["Dough"],
    Pho: ["Main", "Noodle Soup", "Soup"],
    Pickles: ["Side", "Appetizer"],
    Pierogi: ["Main", "Dumpling"],
    Pies: ["Dessert"],
    Pizza: ["Main", "Pizza"],
    "Pizza Dough": ["Dough"],
    Poke: ["Main"],
    Polenta: ["Main"],
    Popsicles: ["Dessert"],
    Pork: ["Main", "Pork"],
    "Pork Belly": ["Main"],
    "Pork Chops": ["Main"],
    "Pork Curry": ["Main", "Curry"],
    "Pork Ribs": ["Main"],
    "Pork Roast": ["Main"],
    "Pork Stir-Fry": ["Main"],
    "Pork Tacos": ["Main", "Taco"],
    "Poultry Curry": ["Main", "Curry"],
    "Poultry Stir-Fry": ["Main"],
    "Poultry Tacos": ["Main", "Taco"],
    "Pound Cake": ["Dessert"],
    Pozole: ["Main", "Soup"],
    "Pudding & Brulee": ["Dessert"],
    "Pulled Pork": ["Main", "Pork"],
    Quesadillas: ["Main", "Taco"],
    Quiche: ["Main", "Breakfast"],
    Ramen: ["Main", "Noodle Soup", "Soup"],
    Ravioli: ["Main", "Pasta"],
    "Rice & Grains": ["Main", "Side"],
    "Rice & Grains Fish": ["Main", "Side"],
    "Rice & Grains Meat": ["Main", "Side"],
    "Rice & Grains Poultry": ["Main", "Side"],
    "Rice Paper Rolls": ["Appetizer", "Side"],
    "Rice Pudding": ["Dessert"],
    Risotto: ["Main", "Risotto"],
    "Roast Chicken": ["Main", "Poultry"],
    "Rolls & Breadsticks": ["Side", "Bread"],
    "Salad Dressings": ["Condiment", "Vinaigrette"],
    Salads: ["Appetizer", "Side", "Salad"],
    Salmon: ["Main", "Fish"],
    "Salsa & Guacamole": ["Appetizer"],
    Samosas: ["Appetizer", "Side"],
    "Sandwich Fish & Seafood": ["Main", "Sandwich"],
    Sandwiches: ["Main", "Sandwich"],
    "Sauces et al": ["Sauce"],
    Sausages: ["Main"],
    "Savory Buns & Rolls": ["Appetizer", "Side"],
    "Savory Pancakes": ["Appetizer", "Main", "Savory Pancake"],
    "Savory Tarts & Pies": ["Main"],
    "Scallion Pancakes": ["Appetizer", "Side"],
    Scallops: ["Main"],
    "Short Pasta": ["Main", "Pasta"],
    "Short Ribs": ["Main"],
    "Shrimp & Prawns": ["Main"],
    Sides: ["Side"],
    "Small Savory Tarts": ["Main", "Appetizer"],
    "Smoked Chicken": ["Main", "Poultry"],
    Smoothies: ["Drink", "Breakfast"],
    Snacks: ["Appetizer", "Side"],
    Snapper: ["Main", "Fish"],
    Sole: ["Main", "Fish"],
    Soup: ["Main", "Soup"],
    "Soup Dumplings": ["Main", "Dumpling"],
    Soups: ["Main", "Soup"],
    "Spice Mixes": ["Spice Mix", "Condiment"],
    Steak: ["Main", "Beef"],
    "Steamed Buns": ["Main"],
    "Steamed Chicken": ["Main"],
    "Stocks and Broths": ["Sauce", "Broth"],
    Strata: ["Breakfast", "Main"],
    "Stuffed Chicken Breast": ["Main"],
    "Stuffed Flatbreads": ["Side", "Bread"],
    "Stuffed Shells": ["Main", "Pasta"],
    Stuffing: ["Side"],
    Sushi: ["Main"],
    Swordfish: ["Main", "Fish"],
    Tamales: ["Main"],
    Tarts: ["Dessert"],
    "Thin Crust Pizza": ["Main", "Pizza"],
    Tilapia: ["Main", "Fish"],
    Toastie: ["Main", "Sandwich"],
    Tofu: ["Main"],
    "Tomato Soup": ["Main", "Soup"],
    Torta: ["Main", "Sandwich"],
    "Tortilla Soup": ["Main", "Soup"],
    Tortillas: ["Main"],
    Tostadas: ["Main"],
    Trout: ["Main", "Fish"],
    Turkey: ["Main", "Poultry"],
    Udon: ["Main", "Noodle Soup", "Soup"],
    Veal: ["Main", "Beef"],
    "Vegetable Curry": ["Main"],
    "Vegetable Tacos": ["Main", "Taco"],
    "Vegetable Tarts": ["Main"],
    "Vegetarian Mains": ["Main"],
    "Veggie Burgers": ["Main", "Sandwich"],
    Venison: ["Main", "Venison"],
    Waffles: ["Breakfast"],
    Wraps: ["Main", "Sandwich"],
    Zongzi: ["Main"],
  } as const,

  /** Notebook to tag mapping for Evernote metadata */
  NOTEBOOK_TAG_MAPPING: {
    // Broad regions
    asian: ["asian"],
    "east asian": ["asian", "east asian"],
    "southeast asian": ["asian", "southeast asian"],
    "south asian": ["asian", "south asian"],
    "central asian": ["asian", "central asian"],
    caucasus: ["caucasus", "european", "asian"],

    // East Asian
    japanese: ["asian", "japanese", "east asian"],
    chinese: ["asian", "chinese", "east asian"],
    taiwanese: ["asian", "taiwanese", "east asian", "chinese"],
    korean: ["asian", "korean", "east asian"],
    mongolian: ["asian", "mongolian", "east asian", "central asian"],

    // Southeast Asian
    vietnamese: ["asian", "vietnamese", "southeast asian"],
    thai: ["asian", "thai", "southeast asian"],
    malaysian: ["asian", "malaysian", "southeast asian"],
    filipino: ["asian", "filipino", "southeast asian"],
    indonesian: ["asian", "indonesian", "southeast asian"],
    burmese: ["asian", "burmese", "southeast asian"],
    cambodian: ["asian", "cambodian", "khmer", "southeast asian"],
    laotian: ["asian", "laotian", "southeast asian"],

    // South Asian
    indian: ["asian", "indian", "south asian"],
    "sri lankan": ["asian", "sri lankan", "south asian"],
    nepali: ["asian", "nepali", "south asian"],
    pakistani: ["asian", "pakistani", "south asian"],
    bangladeshi: ["asian", "bangladeshi", "south asian"],
    maldivian: ["asian", "maldivian", "south asian"],

    // Central Asian
    kazakh: ["asian", "central asian", "kazakh"],
    uzbek: ["asian", "central asian", "uzbek"],
    afghan: ["asian", "central asian", "afghan", "south asian"],

    // Caucasus
    georgian: ["caucasus", "georgian", "european"],
    armenian: ["caucasus", "armenian", "european"],
    azerbaijani: ["caucasus", "azerbaijani", "european", "middle-eastern"],

    // European
    european: ["european"],
    italian: ["european", "italian"],
    french: ["european", "french"],
    german: ["european", "german"],
    polish: ["european", "polish", "eastern european"],
    mediterranean: ["european", "mediterranean"],
    greek: ["european", "greek", "mediterranean"],
    spanish: ["european", "spanish", "mediterranean"],
    portuguese: ["european", "portuguese", "mediterranean"],
    nordic: ["european", "nordic"],
    british: ["european", "british"],
    eastern_european: ["european", "eastern european"],
    russian: ["european", "russian", "eastern european"],
    hungarian: ["european", "hungarian", "eastern european"],
    swiss: ["european", "swiss"],

    // Middle Eastern
    "middle-eastern": ["middle-eastern"],
    turkish: ["middle-eastern", "turkish", "mediterranean"],
    moroccan: ["middle-eastern", "moroccan", "north african"],
    persian: ["middle-eastern", "persian", "iranian"],
    iranian: ["middle-eastern", "iranian", "persian"],
    iraqi: ["middle-eastern", "iraqi"],
    lebanese: ["middle-eastern", "lebanese", "mediterranean"],
    syrian: ["middle-eastern", "syrian"],
    jordanian: ["middle-eastern", "jordanian"],
    palestinian: ["middle-eastern", "palestinian"],
    yemeni: ["middle-eastern", "yemeni"],

    // African
    african: ["african"],
    ethiopian: ["african", "ethiopian", "east african"],
    egyptian: ["african", "egyptian", "north african", "middle-eastern"],
    nigerian: ["african", "nigerian", "west african"],
    ghanaian: ["african", "ghanaian", "west african"],
    senegalese: ["african", "senegalese", "west african"],
    somali: ["african", "somali", "east african"],
    south_african: ["african", "south african"],
    kenyan: ["african", "kenyan", "east african"],
    tunisian: ["african", "tunisian", "north african", "middle-eastern"],
    congolese: ["african", "congolese", "central african"],

    // Latin America
    latam: ["latam"],
    colombian: ["latam", "colombian", "south american"],
    brazilian: ["latam", "brazilian", "south american"],
    mexican: ["latam", "mexican", "north american"],
    peruvian: ["latam", "peruvian", "south american"],
    argentinian: ["latam", "argentinian", "south american"],
    chilean: ["latam", "chilean", "south american"],
    bolivian: ["latam", "bolivian", "south american"],
    ecuadorian: ["latam", "ecuadorian", "south american"],
    paraguayan: ["latam", "paraguayan", "south american"],
    venezuelan: ["latam", "venezuelan", "south american"],

    // Caribbean
    caribbean: ["latam", "caribbean"],
    cuban: ["latam", "caribbean", "cuban"],
    jamaican: ["latam", "caribbean", "jamaican"],
    haitian: ["latam", "caribbean", "haitian"],
    puerto_rican: ["latam", "caribbean", "puerto rican"],
    dominican: ["latam", "caribbean", "dominican"],
    trinidadian: ["latam", "caribbean", "trinidadian"],

    // Indigenous Americas
    native_american: ["native american", "american"],
    andean: ["latam", "andean", "south american"],
    quechua: ["latam", "quechua", "andean", "south american"],
    mapuche: ["latam", "mapuche", "south american"],

    // American
    american: ["american"],
    cajun: ["american", "cajun", "southern"],
    southern: ["american", "southern"],
    texmex: ["american", "tex-mex", "mexican fusion"],
    pacific_northwest: ["american", "pacific northwest"],
    midwestern: ["american", "midwestern"],
    new_england: ["american", "new england"],
    hawaiian: ["american", "hawaiian", "polynesian"],

    // Pacific / Oceania
    pacific: ["pacific"],
    polynesian: ["pacific", "polynesian"],
    samoan: ["pacific", "samoan", "polynesian"],
    maori: ["pacific", "maori", "polynesian"],
    chamorro: ["pacific", "chamorro", "micronesian"],
    australian: ["pacific", "australian"],
    new_zealand: ["pacific", "new zealand", "maori", "polynesian"],

    // Personal usage
    "made it": ["made it"],
    "loved it": ["loved it"],
  },
};

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_CONSTANTS = {
  /** Minimum lengths */
  MIN_LENGTHS: {
    INGREDIENT_TEXT: 3,
    INSTRUCTION_TEXT: 10,
    NOTE_CONTENT: 1,
  },
  /** Maximum lengths */
  MAX_LENGTHS: {
    NOTE_TITLE: 255,
    INGREDIENT_TEXT: 1000,
    INSTRUCTION_TEXT: 2000,
    SOURCE_URL: 500,
  },
  /** Regex patterns */
  PATTERNS: {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/.+/,
  },
} as const;
