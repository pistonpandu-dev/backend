import { logsRepository } from './logs.repository';
import { logger } from '../../config/logger';
import * as fs from 'fs';
import * as path from 'path';

export class LogsService {
  private static instance: LogsService;

  private constructor() {}

  static getInstance(): LogsService {
    if (!LogsService.instance) {
      LogsService.instance = new LogsService();
    }
    return LogsService.instance;
  }

  async getLogs(query: any) {
    const { type = 'combined', page = 1, limit = 100, search, fromDate, toDate } = query;

    // Read log file
    const logPath = path.join('logs', `${type}.log`);
    
    if (!fs.existsSync(logPath)) {
      return {
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    // Parse log lines
    let logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchLower)
      );
    }

    if (fromDate) {
      const from = new Date(fromDate);
      logs = logs.filter(log => {
        const timestamp = new Date(log.timestamp || log.time);
        return timestamp >= from;
      });
    }

    if (toDate) {
      const to = new Date(toDate);
      logs = logs.filter(log => {
        const timestamp = new Date(log.timestamp || log.time);
        return timestamp <= to;
      });
    }

    // Paginate
    const total = logs.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = logs.slice(start, end);

    return {
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLogTypes() {
    const logDir = 'logs';
    const files = fs.readdirSync(logDir);
    
    return files
      .filter(file => file.endsWith('.log'))
      .map(file => file.replace('.log', ''));
  }

  async exportLogs(data: any) {
    const { type, startDate, endDate, format = 'json' } = data;

    const query = {
      type,
      fromDate: startDate,
      toDate: endDate,
      page: 1,
      limit: 10000,
    };

    const result = await this.getLogs(query);

    let exportedData;
    let mimeType;
    let extension;

    if (format === 'json') {
      exportedData = JSON.stringify(result.data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (format === 'csv') {
      // Convert to CSV (simplified)
      const headers = Object.keys(result.data[0] || {});
      const rows = result.data.map(item => 
        headers.map(h => JSON.stringify(item[h] || '')).join(',')
      );
      exportedData = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      extension = 'csv';
    } else {
      exportedData = result.data.map(item => JSON.stringify(item)).join('\n');
      mimeType = 'text/plain';
      extension = 'txt';
    }

    const filename = `logs_${type}_${new Date().toISOString().split('T')[0]}.${extension}`;

    return {
      data: exportedData,
      filename,
      mimeType,
    };
  }

  async clearLogs(type: string, olderThan: number) {
    const logPath = path.join('logs', `${type}.log`);
    
    if (!fs.existsSync(logPath)) {
      return { cleared: 0 };
    }

    if (olderThan) {
      // Clear logs older than specified days
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n');
      const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);
      
      const remainingLines = lines.filter(line => {
        if (!line.trim()) return true;
        try {
          const log = JSON.parse(line);
          const timestamp = new Date(log.timestamp || log.time);
          return timestamp >= cutoffDate;
        } catch {
          return true;
        }
      });

      fs.writeFileSync(logPath, remainingLines.join('\n'));
      return { cleared: lines.length - remainingLines.length };
    } else {
      // Clear all logs
      fs.writeFileSync(logPath, '');
      return { cleared: 0 };
    }
  }
}
