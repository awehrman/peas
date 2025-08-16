/**
 * Extract title from HTML content on the client side
 * This mirrors the backend logic in apps/queue/src/parsers/html.ts
 */

interface TitleExtractionResult {
  title: string;
  success: boolean;
  error?: string;
}

/**
 * Extract title from HTML content using DOM parsing
 */
export function extractTitleFromHTML(
  htmlContent: string
): TitleExtractionResult {
  try {
    console.log("🔍 [TITLE_EXTRACTION] Starting title extraction from HTML");

    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // First, try to find the en-note element (Evernote specific)
    const enNote = doc.querySelector("en-note");
    console.log("🔍 [TITLE_EXTRACTION] en-note element found:", !!enNote);

    if (enNote) {
      // Look for h1 as a direct child of en-note (mirrors backend logic)
      const h1 = enNote.querySelector("h1");
      console.log("🔍 [TITLE_EXTRACTION] h1 element found:", !!h1);
      if (h1 && h1.textContent?.trim()) {
        const title = h1.textContent.trim();
        console.log("🔍 [TITLE_EXTRACTION] Found title from h1:", title);
        return {
          title,
          success: true,
        };
      }
    }

    // Fallback to meta title
    const metaTitle =
      doc.querySelector('meta[name="title"]')?.getAttribute("content") ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content");
    console.log("🔍 [TITLE_EXTRACTION] Meta title found:", metaTitle);

    if (metaTitle?.trim()) {
      const title = metaTitle.trim();
      console.log("🔍 [TITLE_EXTRACTION] Found title from meta:", title);
      return {
        title,
        success: true,
      };
    }

    // Final fallback to document title
    const documentTitle = doc.title?.trim();
    console.log("🔍 [TITLE_EXTRACTION] Document title found:", documentTitle);
    if (documentTitle) {
      console.log(
        "🔍 [TITLE_EXTRACTION] Found title from document.title:",
        documentTitle
      );
      return {
        title: documentTitle,
        success: true,
      };
    }

    console.log("🔍 [TITLE_EXTRACTION] No title found, using fallback");
    return {
      title: "Untitled Note",
      success: false,
      error: "No title found in HTML content",
    };
  } catch (error) {
    console.error("🔍 [TITLE_EXTRACTION] Error extracting title:", error);
    return {
      title: "Untitled Note",
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse HTML",
    };
  }
}

/**
 * Extract title from a File object (HTML file)
 */
export async function extractTitleFromFile(
  file: File
): Promise<TitleExtractionResult> {
  try {
    const content = await file.text();
    return extractTitleFromHTML(content);
  } catch (error) {
    return {
      title: file.name.replace(/\.(html|htm)$/, ""),
      success: false,
      error: error instanceof Error ? error.message : "Failed to read file",
    };
  }
}

/**
 * Extract titles from multiple HTML files
 */
export async function extractTitlesFromFiles(
  files: File[]
): Promise<Map<string, string>> {
  console.log(
    "🔍 [TITLE_EXTRACTION] Extracting titles from",
    files.length,
    "files"
  );
  const titles = new Map<string, string>();

  const promises = files.map(async (file) => {
    console.log("🔍 [TITLE_EXTRACTION] Processing file:", file.name);
    const result = await extractTitleFromFile(file);
    console.log("🔍 [TITLE_EXTRACTION] Result for", file.name, ":", result);
    titles.set(file.name, result.title);
  });

  await Promise.all(promises);
  console.log(
    "🔍 [TITLE_EXTRACTION] Final titles map:",
    Object.fromEntries(titles)
  );
  return titles;
}
