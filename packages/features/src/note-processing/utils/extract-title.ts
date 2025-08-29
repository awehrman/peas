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
    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // First, try to find the en-note element (Evernote specific)
    const enNote = doc.querySelector("en-note");

    if (enNote) {
      // Look for h1 as a direct child of en-note (mirrors backend logic)
      const h1 = enNote.querySelector("h1");
      if (h1 && h1.textContent?.trim()) {
        const title = h1.textContent.trim();
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

    if (metaTitle?.trim()) {
      const title = metaTitle.trim();
      return {
        title,
        success: true,
      };
    }

    // Final fallback to document title
    const documentTitle = doc.title?.trim();
    if (documentTitle) {
      return {
        title: documentTitle,
        success: true,
      };
    }

    return {
      title: "Untitled Note",
      success: false,
      error: "No title found in HTML content",
    };
  } catch (error) {
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
  const titles = new Map<string, string>();

  const promises = files.map(async (file) => {
    const result = await extractTitleFromFile(file);
    titles.set(file.name, result.title);
  });

  await Promise.all(promises);
  return titles;
}
