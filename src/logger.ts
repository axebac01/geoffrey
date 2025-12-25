/**
 * Structured logging utility for Geoffrey.ai
 * 
 * For production, consider upgrading to:
 * - Winston (https://github.com/winstonjs/winston)
 * - Pino (https://github.com/pinojs/pino)
 * - Or a cloud logging service (Datadog, LogRocket, etc.)
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    context?: Record<string, any>;
    error?: {
        message: string;
        stack?: string;
        code?: string;
    };
}

class Logger {
    private minLevel: LogLevel;
    private isDevelopment: boolean;

    constructor() {
        this.minLevel = process.env.LOG_LEVEL 
            ? LogLevel[process.env.LOG_LEVEL.toUpperCase() as keyof typeof LogLevel] || LogLevel.INFO
            : LogLevel.INFO;
        this.isDevelopment = process.env.NODE_ENV !== 'production';
    }

    private formatLog(level: string, message: string, context?: Record<string, any>, error?: Error): LogEntry {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
        };

        if (context && Object.keys(context).length > 0) {
            entry.context = context;
        }

        if (error) {
            entry.error = {
                message: error.message,
                stack: this.isDevelopment ? error.stack : undefined,
                code: (error as any).code,
            };
        }

        return entry;
    }

    private log(level: LogLevel, levelName: string, message: string, context?: Record<string, any>, error?: Error) {
        if (level < this.minLevel) {
            return;
        }

        const entry = this.formatLog(levelName, message, context, error);
        const jsonOutput = JSON.stringify(entry);

        // In development, also log to console with colors
        if (this.isDevelopment) {
            const colors = {
                DEBUG: '\x1b[36m', // Cyan
                INFO: '\x1b[32m',  // Green
                WARN: '\x1b[33m',  // Yellow
                ERROR: '\x1b[31m', // Red
                RESET: '\x1b[0m',
            };
            const color = colors[levelName as keyof typeof colors] || colors.RESET;
            console.log(`${color}[${levelName}]${colors.RESET} ${message}`, context || '', error || '');
        } else {
            // In production, output structured JSON (one line per log entry)
            console.log(jsonOutput);
        }

        // TODO: In production, send to external logging service
        // if (process.env.LOG_SERVICE_URL) {
        //     this.sendToLogService(entry);
        // }
    }

    debug(message: string, context?: Record<string, any>) {
        this.log(LogLevel.DEBUG, 'DEBUG', message, context);
    }

    info(message: string, context?: Record<string, any>) {
        this.log(LogLevel.INFO, 'INFO', message, context);
    }

    warn(message: string, context?: Record<string, any>, error?: Error) {
        this.log(LogLevel.WARN, 'WARN', message, context, error);
    }

    error(message: string, context?: Record<string, any>, error?: Error) {
        this.log(LogLevel.ERROR, 'ERROR', message, context, error);
    }

    // Alias for simpler logging (message only or with context)
    logInfo(message: string, context?: Record<string, any>) {
        this.info(message, context);
    }

    // Convenience methods for common scenarios
    logApiRequest(method: string, path: string, userId?: string, duration?: number) {
        this.info('API Request', {
            method,
            path,
            userId,
            duration: duration ? `${duration}ms` : undefined,
        });
    }

    logApiError(method: string, path: string, statusCode: number, error: Error, userId?: string) {
        this.error('API Error', {
            method,
            path,
            statusCode,
            userId,
            errorMessage: error.message,
        });
    }

    logAnalysisStart(snapshot: { businessName: string }, promptCount: number, runCount: number) {
        this.info('Analysis Started', {
            businessName: snapshot.businessName,
            promptCount,
            runCount,
            totalTasks: promptCount * runCount,
        });
    }

    logAnalysisComplete(snapshot: { businessName: string }, score: number, duration: number) {
        this.info('Analysis Complete', {
            businessName: snapshot.businessName,
            score,
            duration: `${duration}ms`,
        });
    }

    logJudgeResult(prompt: string, isMentioned: boolean, rankPosition?: number) {
        this.debug('Judge Result', {
            prompt: prompt.slice(0, 50),
            isMentioned,
            rankPosition,
        });
    }
}

// Export singleton instance
export const logger = new Logger();

