import { LOG_MESSAGES } from "../config/constants";
import { formatLogMessage, measureExecutionTime } from "../utils/utils";
import type { IServiceContainer } from "./container";

export class InstructionService {
  constructor(private container: IServiceContainer) {}

  async updateInstructionLine(id: string, data: Record<string, unknown>) {
    const { result } = await measureExecutionTime(async () => {
      this.container.logger.log(
        formatLogMessage(LOG_MESSAGES.INFO.INSTRUCTION_DATABASE_UPDATE, {
          id,
          data: JSON.stringify(data),
        })
      );
      // TODO: Implement actual database update
      const result = { id, ...data };
      this.container.logger.log(
        formatLogMessage(LOG_MESSAGES.SUCCESS.INSTRUCTION_DATABASE_UPDATED, {
          id,
        })
      );
      return result;
    }, "instruction_database_update");
    return result;
  }

  async createInstructionSteps(steps: Array<Record<string, unknown>>) {
    const { result } = await measureExecutionTime(async () => {
      this.container.logger.log(
        formatLogMessage(LOG_MESSAGES.INFO.INSTRUCTION_STEPS_CREATION, {
          count: steps.length,
        })
      );
      // TODO: Implement actual step creation
      const result = steps;
      this.container.logger.log(
        formatLogMessage(LOG_MESSAGES.SUCCESS.INSTRUCTION_STEPS_CREATED, {
          count: steps.length,
        })
      );
      return result;
    }, "instruction_steps_creation");
    return result;
  }
}
