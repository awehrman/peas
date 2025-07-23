import { noteTestRouter } from "./note";

import { Request, Response, Router } from "express";

const router = Router();

// Mount test routes
router.use("/note", noteTestRouter);

// Test overview endpoint
router.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Queue Test Routes",
    endpoints: {
      note: "/test/note - Test note processing",
    },
    usage: "POST to each endpoint with appropriate test data",
  });
});

export { router as testRouter };
