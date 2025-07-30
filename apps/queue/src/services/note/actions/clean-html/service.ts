import type { StructuredLogger } from "../../../../types";
import type { NotePipelineData } from "../../../../types/notes";
import {
  logCleaningStats,
  removeIconsTags,
  removeStyleTags,
  resolveTitle,
} from "../../../../utils/html-cleaner";

export async function cleanHtmlFile(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<NotePipelineData> {
  const title = resolveTitle(data, data.content);
  const originalLength = data.content.length;

  // Remove style tags and their content
  const beforeStyleRemoval = data.content.length;
  let cleanedContent = removeStyleTags(data.content);
  const afterStyleRemoval = cleanedContent.length;

  // Remove icons tags and their content
  const beforeIconsRemoval = cleanedContent.length;
  cleanedContent = removeIconsTags(cleanedContent);
  const afterIconsRemoval = cleanedContent.length;

  // Log the cleaning statistics
  logCleaningStats(
    logger,
    title,
    originalLength,
    cleanedContent.length,
    beforeStyleRemoval,
    afterStyleRemoval,
    beforeIconsRemoval,
    afterIconsRemoval
  );

  return {
    ...data,
    content: cleanedContent,
  };
}
