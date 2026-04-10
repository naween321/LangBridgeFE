import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import chatRouter from "./chat";
import documentsRouter from "./documents";
import lawyersRouter from "./lawyers";
import messagesRouter from "./messages";
import bookingsRouter from "./bookings";
import membershipRouter from "./membership";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/chat", chatRouter);
router.use("/documents", documentsRouter);
router.use("/lawyers", lawyersRouter);
router.use("/messages", messagesRouter);
router.use("/bookings", bookingsRouter);
router.use("/membership", membershipRouter);

export default router;
