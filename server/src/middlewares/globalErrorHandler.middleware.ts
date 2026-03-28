import {Request,Response,NextFunction} from 'express'

import {ApiError} from '../utils/ApiError'

export const globalErrorHandler=(
err:Error | ApiError,          // The error that was thrown
    req: Request,                // Express request object
    res: Response,               // Express response object
    next: NextFunction           // Next middleware function (required for Express to recognize this as error handler)

)=>{
    console.error('Error : ',err.message);

    // We check if we are in development mode to decide whether to send the error stack trace
    const isDevelopment = process.env.NODE_ENV === 'development';

    // If it's our custom ApiError, use its status code
    if(err instanceof ApiError)
    {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            // Include stack trace only if we are in development mode
            stack: isDevelopment ? err.stack : undefined 
        });
    }

    // For all other errors, return a default 500 status code
    return res.status(500).json({
        success: false,
        message: err.message || 'Internal server error',
        // Include stack trace only if we are in development mode
        stack: isDevelopment ? err.stack : undefined 
    });


}

// 404 Handler - for routes that don't exist
export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};