import { Router } from "express";
import { noteTestRouter } from "./note";
import { sourceTestRouter } from "./source";
import { ingredientTestRouter } from "./ingredient";
import { instructionTestRouter } from "./instruction";
import { imageTestRouter } from "./image";
import { categorizationTestRouter } from "./categorization";

const router = Router();

// Mount all test routes
router.use("/note", noteTestRouter);
router.use("/source", sourceTestRouter);
router.use("/ingredient", ingredientTestRouter);
router.use("/instruction", instructionTestRouter);
router.use("/image", imageTestRouter);
router.use("/categorization", categorizationTestRouter);

// Test overview endpoint
router.get("/", (req: any, res: any) => {
  res.json({
    message: "Queue Test Routes",
    endpoints: {
      note: "/test/note - Test note processing",
      source: "/test/source - Test source processing",
      ingredient: "/test/ingredient - Test ingredient processing",
      instruction: "/test/instruction - Test instruction processing",
      image: "/test/image - Test image processing",
      categorization: "/test/categorization - Test categorization processing",
    },
    usage: "POST to each endpoint with appropriate test data",
  });
});

export { router as testRouter };
