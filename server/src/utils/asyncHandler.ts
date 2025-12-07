import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * asyncHandler with try/catch inside.
 *
 * This ensures:
 *  - No need to write try/catch in every controller
 *  - All errors go to next() -> handled by global error handler
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);  // run controller
    } catch (error) {
      next(error);               // forward error to global handler
    }
  };

export default asyncHandler;