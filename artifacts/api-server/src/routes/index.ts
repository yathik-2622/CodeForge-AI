import { Router, type IRouter } from "express";
import healthRouter from "./health";
import repositoriesRouter from "./repositories";
import sessionsRouter from "./sessions";
import agentsRouter from "./agents";
import executionsRouter from "./executions";
import securityRouter from "./security";
import deploymentsRouter from "./deployments";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import githubRouter from "./github";

const router: IRouter = Router();

router.use(authRouter);
router.use(githubRouter);
router.use(healthRouter);
router.use(repositoriesRouter);
router.use(sessionsRouter);
router.use(agentsRouter);
router.use(executionsRouter);
router.use(securityRouter);
router.use(deploymentsRouter);
router.use(dashboardRouter);

export default router;
