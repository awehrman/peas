import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DatabaseService, IDatabaseService } from "../../register-database";

// Mock the database package
vi.mock("@peas/database", () => ({
  createNote: vi.fn(),
}));

// Mock the prisma client
vi.mock("../../config/database", () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    note: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    status: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock the PatternTracker
vi.mock("../../workers/shared/pattern-tracker", () => ({
  PatternTracker: vi.fn().mockImplementation(() => ({
    trackPattern: vi.fn(),
  })),
}));

describe("DatabaseService Constructor", () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Instance Creation", () => {
    it("should create a DatabaseService instance", () => {
      expect(databaseService).toBeInstanceOf(DatabaseService);
    });

    it("should have required properties", () => {
      expect(databaseService).toHaveProperty("prisma");
      expect(databaseService).toHaveProperty("patternTracker");
    });

    it("should implement IDatabaseService interface", () => {
      const service: IDatabaseService = databaseService;
      expect(service).toHaveProperty("prisma");
      expect(service).toHaveProperty("patternTracker");
    });
  });

  describe("Prisma Property", () => {
    it("should return the prisma client", () => {
      const prisma = databaseService.prisma;
      expect(prisma).toBeDefined();
      expect(prisma).toHaveProperty("note");
      expect(prisma).toHaveProperty("user");
    });

    it("should have prisma client methods", () => {
      const prisma = databaseService.prisma;
      expect(typeof prisma.note.create).toBe("function");
      expect(typeof prisma.note.findMany).toBe("function");
      expect(typeof prisma.note.findUnique).toBe("function");
      expect(typeof prisma.note.update).toBe("function");
      expect(typeof prisma.note.delete).toBe("function");
    });

    it("should have note methods", () => {
      const prisma = databaseService.prisma;
      expect(typeof prisma.note.create).toBe("function");
      expect(typeof prisma.note.findMany).toBe("function");
      expect(typeof prisma.note.findUnique).toBe("function");
      expect(typeof prisma.note.update).toBe("function");
      expect(typeof prisma.note.delete).toBe("function");
    });

    it("should have user methods", () => {
      const prisma = databaseService.prisma;
      expect(typeof prisma.user.create).toBe("function");
      expect(typeof prisma.user.findMany).toBe("function");
      expect(typeof prisma.user.findUnique).toBe("function");
      expect(typeof prisma.user.update).toBe("function");
      expect(typeof prisma.user.delete).toBe("function");
    });
  });

  describe("PatternTracker Property", () => {
    it("should have patternTracker property", () => {
      expect(databaseService.patternTracker).toBeDefined();
    });

    it("should have trackPattern method", () => {
      expect(typeof databaseService.patternTracker.trackPattern).toBe(
        "function"
      );
    });

    it("should be a PatternTracker instance", () => {
      expect(databaseService.patternTracker).toBeDefined();
      expect(typeof databaseService.patternTracker.trackPattern).toBe(
        "function"
      );
    });
  });

  describe("Interface Compliance", () => {
    it("should implement all IDatabaseService properties", () => {
      const service: IDatabaseService = databaseService;

      expect(service).toHaveProperty("prisma");
      expect(service).toHaveProperty("patternTracker");
      expect(service).toHaveProperty("createNote");
      expect(service).toHaveProperty("createNoteCompletionTracker");
      expect(service).toHaveProperty("updateNoteCompletionTracker");
      expect(service).toHaveProperty("incrementNoteCompletionTracker");
      expect(service).toHaveProperty("checkNoteCompletion");
      expect(service).toHaveProperty("getNoteTitle");
    });

    it("should have correct property types", () => {
      expect(typeof databaseService.prisma).toBe("object");
      expect(typeof databaseService.patternTracker).toBe("object");
      expect(typeof databaseService.createNote).toBe("function");
      expect(typeof databaseService.createNoteCompletionTracker).toBe(
        "function"
      );
      expect(typeof databaseService.updateNoteCompletionTracker).toBe(
        "function"
      );
      expect(typeof databaseService.incrementNoteCompletionTracker).toBe(
        "function"
      );
      expect(typeof databaseService.checkNoteCompletion).toBe("function");
      expect(typeof databaseService.getNoteTitle).toBe("function");
    });
  });

  describe("Multiple Instances", () => {
    it("should create independent instances", () => {
      const service1 = new DatabaseService();
      const service2 = new DatabaseService();

      expect(service1).not.toBe(service2);
      expect(service1.prisma).toBe(service2.prisma); // Same prisma instance
      expect(service1.patternTracker).not.toBe(service2.patternTracker); // Different pattern trackers
    });

    it("should share prisma client across instances", () => {
      const service1 = new DatabaseService();
      const service2 = new DatabaseService();

      expect(service1.prisma).toBe(service2.prisma);
    });
  });
});
