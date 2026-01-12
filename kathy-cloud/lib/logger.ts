// Logger utility for Kathy Cloud

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogMessage {
  level: LogLevel
  message: string
  timestamp: string
  data?: any
}

function formatLog(level: LogLevel, message: string, data?: any): LogMessage {
  return {
    level,
    message: `Kathy Cloud: ${message}`,
    timestamp: new Date().toISOString(),
    data
  }
}

export const logger = {
  info: (message: string, data?: any) => {
    const log = formatLog('info', message, data)
    console.log(JSON.stringify(log))
  },
  
  warn: (message: string, data?: any) => {
    const log = formatLog('warn', message, data)
    console.warn(JSON.stringify(log))
  },
  
  error: (message: string, data?: any) => {
    const log = formatLog('error', message, data)
    console.error(JSON.stringify(log))
  },
  
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      const log = formatLog('debug', message, data)
      console.debug(JSON.stringify(log))
    }
  }
}

export default logger





