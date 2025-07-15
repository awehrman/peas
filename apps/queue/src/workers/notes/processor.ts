import { NoteProcessingResult, NoteProcessingDependencies } from "./types";

export class NoteProcessor {
  static async parseHTML(
    content: string,
    deps: Pick<NoteProcessingDependencies, "parseHTML">
  ): Promise<any> {
    return await deps.parseHTML(content);
  }

  static async createNote(
    file: any,
    deps: Pick<NoteProcessingDependencies, "createNote">
  ): Promise<any> {
    return await deps.createNote(file);
  }

  static async processNote(
    content: string,
    deps: NoteProcessingDependencies
  ): Promise<NoteProcessingResult> {
    const file = await this.parseHTML(content, deps);
    const note = await this.createNote(file, deps);

    return { note, file };
  }

  static getStatusMessage(file: any): string {
    return `Added note "${file.title}"`;
  }
}
