import { Router, type IRouter } from "express";
import { getAvailableModels } from "../lib/ai";

const router: IRouter = Router();

router.get("/models", (_req, res) => {
  res.json(getAvailableModels());
});

export default router;
