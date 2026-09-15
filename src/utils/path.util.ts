import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

export class PathUtils {
  static ensureDirSync(dirPath?: string): void {
    if (dirPath && !fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static async ensureDir(dirPath?: string): Promise<void> {
    if (dirPath) {
      await fsp.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Resolve a relative path to absolute.
   */
  static resolve(...segments: string[]): string {
    return path.resolve(...segments);
  }

  /**
   * Check if a path exists.
   */
  static exists(dirPath?: string): boolean {
    if (!dirPath) return false;
    return fs.existsSync(dirPath);
  }
}
