import {Request,Response,NextFunction} from 'express'

import {ApiError} from '../utils/ApiError'

export const globalErrorHandler=(
err:Error | ApiError,          // The error that was thrown
    req: Request,                // Express request object
    res: Response,               // Express response object
    next: NextFunction           // Next middleware function (required for Express to recognize this as error handler)

)=>{
    console.error('Error : ',err.message);

        // If it's our custom ApiError, use its status code
    if(err instanceof ApiError)
    {
        return res.status(err.statusCode).json({
            success:false,
            message:err.message,
            

        })
    }
// For all other errors, return 500
    return res.status(500).json({
success:false,
message:err.message || 'Internal server error'

    })


}

// 404 Handler - for routes that don't exist
export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};