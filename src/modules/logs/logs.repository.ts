import * as fs from 'fs';
import * as path from 'path';

export class LogsRepository {
  private logDir = 'logs';

  readLogFile(type: string): string[] {
    const logPath = path.join(this.logDir, `${type}.log`);
    if (!fs.existsSync(logPath)) {
      return [];
    }
    const content = fs.readFileSync(logPath, 'utf8');
    return content.split('\n').filter(line => line.trim());
  }

  writeLogFile(type: string, lines: string[]): void {
    const logPath = path.join(this.logDir, `${type}.log`);
    fs.writeFileSync(logPath, lines.join('\n'));
  }

  getLogTypes(): string[] {
    const files = fs.readdirSync(this.logDir);
    return files
      .filter(file => file.endsWith('.log'))
      .map(file => file.replace('.log', ''));
  }

  getLogSize(type: string): number {
    const logPath = path.join(this.logDir, `${type}.log`);
    if (!fs.existsSync(logPath)) {
      return 0;
    }
    return fs.statSync(logPath).size;
  }

  clearLogFile(type: string): void {
    const logPath = path.join(this.logDir, `${type}.log`);
    if (fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '');
    }
  }
}

export const logsRepository = new LogsRepository();
