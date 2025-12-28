import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 패키지 루트 디렉토리 반환
 */
export function getPackageRoot() {
  return path.resolve(__dirname, '../..');
}

/**
 * 작업 디렉토리 (ai-dev-team) 경로 반환
 */
export function getWorkspaceDir() {
  return path.join(process.cwd(), 'ai-dev-team');
}

/**
 * 세션 디렉토리 경로 반환
 */
export function getSessionsDir() {
  return path.join(getWorkspaceDir(), '.sessions');
}

/**
 * 로그 디렉토리 경로 반환
 */
export function getLogsDir() {
  return path.join(process.cwd(), 'logs');
}

/**
 * 현재 템플릿 파일 경로 반환
 */
export function getCurrentTemplateFile() {
  return path.join(getWorkspaceDir(), '.current-template');
}

/**
 * 현재 세팅된 템플릿 반환
 */
export function getCurrentTemplate() {
  const templateFile = getCurrentTemplateFile();
  if (fs.existsSync(templateFile)) {
    return fs.readFileSync(templateFile, 'utf-8').trim();
  }
  return null;
}

/**
 * 세션 ID 생성
 */
export function generateSessionId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(16).slice(2, 10);
  return `${date}-${time}-${random}`;
}

/**
 * 타임스탬프 생성
 */
export function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * 사용 가능한 템플릿 목록
 */
export function getAvailableTemplates() {
  const templatesDir = path.join(getPackageRoot(), 'templates');
  if (!fs.existsSync(templatesDir)) {
    return [];
  }
  return fs.readdirSync(templatesDir).filter(f => {
    return fs.statSync(path.join(templatesDir, f)).isDirectory();
  });
}

/**
 * 사용 가능한 역할 목록
 */
export function getAvailableRoles() {
  const workspaceRoles = path.join(getWorkspaceDir(), 'roles');
  if (!fs.existsSync(workspaceRoles)) {
    return [];
  }
  return fs.readdirSync(workspaceRoles)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

/**
 * 사용 가능한 도구 목록
 */
export function getAvailableTools() {
  return ['claude', 'codex', 'gemini', 'copilot'];
}

/**
 * 워크스페이스가 세팅되어 있는지 확인
 */
export function isWorkspaceSetup() {
  const workspace = getWorkspaceDir();
  const rolesDir = path.join(workspace, 'roles');
  return fs.existsSync(rolesDir) && fs.readdirSync(rolesDir).filter(f => f.endsWith('.md')).length > 0;
}

/**
 * 디렉토리 복사 (머지)
 */
export function copyDirMerge(src, dest) {
  if (!fs.existsSync(src)) return;
  
  fs.ensureDirSync(dest);
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirMerge(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
