import { Router, type IRouter } from "express";
import healthRouter from "./health";
import appRouter from "./routes";
import execRouter from "./exec";

const router: IRouter = Router();

router.use(healthRouter);
router.use(execRouter);
router.use(appRouter);

export default router;
