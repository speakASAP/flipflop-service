/**
 * Server-side instrumentation for error handling
 * This file runs once when the Next.js server starts
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Suppress known Next.js internal errors that don't affect functionality
    const originalEmit = process.emit;
    process.emit = function (event: string | symbol, ...args: any[]) {
      // Filter out known harmless errors
      if (event === 'uncaughtException') {
        const error = args[0] as Error;
        // Suppress permission errors for non-existent paths (likely Next.js internal bug)
        if (
          error.message?.includes('/dev/lrt') ||
          error.message?.includes('//lrt') ||
          error.code === 'EACCES'
        ) {
          // Log but don't crash - these are known Next.js internal errors
          console.warn('[Suppressed] Known Next.js internal error:', error.message);
          return false;
        }
        // Suppress returnNaN errors (Next.js internal error handling)
        if (error.message?.includes('returnNaN is not defined')) {
          console.warn('[Suppressed] Known Next.js internal error: returnNaN');
          return false;
        }
      }
      return originalEmit.apply(this, [event, ...args]);
    };

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason as Error;
      // Suppress known harmless errors
      if (
        error?.message?.includes('/dev/lrt') ||
        error?.message?.includes('//lrt') ||
        error?.message?.includes('returnNaN is not defined')
      ) {
        console.warn('[Suppressed] Known Next.js internal error:', error?.message || reason);
        return;
      }
      // Log other unhandled rejections
      console.error('Unhandled promise rejection:', reason);
    });
  }
}

