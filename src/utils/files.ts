import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';
import type { VersionInfo } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * 줄바꿈 문자를 LF로 통일
 * Windows CRLF(\r\n) → LF(\n)
 */
export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n');
}

/**
 * 패키지 루트 디렉토리 반환
 */
export function getPackageRoot(): string {
  return path.resolve(__dirname, '../..');
}

/**
 * 작업 디렉토리 (ai-dev-team) 경로 반환
 */
export function getWorkspaceDir(): string {
  return path.join(process.cwd(), 'ai-dev-team');
}

/**
 * 세션 디렉토리 경로 반환
 */
export function getSessionsDir(): string {
  return path.join(getWorkspaceDir(), '.sessions');
}

/**
 * 로그 디렉토리 경로 반환
 */
export function getLogsDir(): string {
  return path.join(getWorkspaceDir(), '.sessions', 'logs');
}

/**
 * 현재 템플릿 파일 경로 반환
 */
export function getCurrentTemplateFile(): string {
  return path.join(getWorkspaceDir(), '.current-template');
}

/**
 * 현재 세팅된 템플릿 반환
 */
export function getCurrentTemplate(): string | null {
  const templateFile = getCurrentTemplateFile();
  if (fs.existsSync(templateFile)) {
    return fs.readFileSync(templateFile, 'utf-8').trim();
  }
  return null;
}

/**
 * 세션 ID 생성
 */
export function generateSessionId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(16).slice(2, 10);
  return `${date}-${time}-${random}`;
}

/**
 * 타임스탬프 생성
 */
export function getTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * 사용 가능한 템플릿 목록
 */
export function getAvailableTemplates(): string[] {
  const templatesDir = path.join(getPackageRoot(), 'templates');
  if (!fs.existsSync(templatesDir)) {
    return [];
  }
  return fs.readdirSync(templatesDir).filter((f) => {
    return fs.statSync(path.join(templatesDir, f)).isDirectory();
  });
}

/**
 * 사용 가능한 역할 목록
 */
export function getAvailableRoles(): string[] {
  const workspaceRoles = path.join(getWorkspaceDir(), 'roles');
  if (!fs.existsSync(workspaceRoles)) {
    return [];
  }
  return fs
    .readdirSync(workspaceRoles)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''));
}

/**
 * 사용 가능한 도구 목록
 */
export function getAvailableTools(): string[] {
  return ['claude', 'codex', 'gemini', 'copilot'];
}

/**
 * 워크스페이스가 세팅되어 있는지 확인
 */
export function isWorkspaceSetup(): boolean {
  const workspace = getWorkspaceDir();
  const rolesDir = path.join(workspace, 'roles');
  return (
    fs.existsSync(rolesDir) &&
    fs.readdirSync(rolesDir).filter((f) => f.endsWith('.md')).length > 0
  );
}

/**
 * 디렉토리 복사 (머지)
 * 텍스트 파일(.md, .json)은 줄바꿈을 LF로 통일
 */
export function copyDirMerge(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;

  fs.ensureDirSync(dest);
  const items = fs.readdirSync(src);

  // 줄바꿈 정규화가 필요한 확장자
  const textExtensions = ['.md', '.json', '.txt'];

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirMerge(srcPath, destPath);
    } else {
      const ext = path.extname(item).toLowerCase();
      if (textExtensions.includes(ext)) {
        // 텍스트 파일: 줄바꿈 정규화 후 복사
        const content = fs.readFileSync(srcPath, 'utf-8');
        fs.writeFileSync(destPath, normalizeLineEndings(content), 'utf-8');
      } else {
        // 바이너리 파일: 그대로 복사
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

/**
 * 버전 파일 경로 반환
 */
export function getVersionFile(): string {
  return path.join(getWorkspaceDir(), '.ada-version');
}

/**
 * 백업 디렉토리 경로 반환
 */
export function getBackupDir(): string {
  return path.join(getWorkspaceDir(), '.backups');
}

/**
 * 패키지 버전 반환
 */
export function getPackageVersion(): string {
  const packageJson = require(path.join(getPackageRoot(), 'package.json'));
  return packageJson.version;
}

/**
 * 작업공간 버전 정보 읽기
 */
export function readVersion(): VersionInfo | null {
  const versionFile = getVersionFile();
  if (!fs.existsSync(versionFile)) {
    return null;
  }
  try {
    const content = fs.readFileSync(versionFile, 'utf-8');
    return JSON.parse(content) as VersionInfo;
  } catch {
    return null;
  }
}

/**
 * 작업공간 버전 정보 쓰기
 */
export function writeVersion(versionInfo: VersionInfo): void {
  const versionFile = getVersionFile();
  fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));
}

/**
 * 버전 비교 (semver 형식)
 * @returns a > b이면 1, a < b이면 -1, 같으면 0
 */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;

    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
}
