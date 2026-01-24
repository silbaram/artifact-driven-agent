import fs from 'fs-extra';
import path from 'path';
import { getWorkspaceDir } from './files.js';

const CONFIG_FILENAME = 'ada.config.json';

const DEFAULT_CONFIG = {
  version: '1.0',
  defaults: {
    tool: 'claude'
  },
  roles: {
    // 기본값은 모두 claude로 설정하되, 사용자가 변경 가능
    manager: 'claude',
    planner: 'claude',
    architect: 'claude',
    developer: 'claude',
    reviewer: 'claude',
    qa: 'claude',
    improver: 'claude',
    documenter: 'claude'
  }
};

/**
 * 설정 파일 경로 반환
 */
export function getConfigPath() {
  return path.join(getWorkspaceDir(), CONFIG_FILENAME);
}

/**
 * 설정 파일 읽기 (없으면 기본값 생성)
 */
export function readConfig() {
  const configPath = getConfigPath();
  
  if (!fs.existsSync(configPath)) {
    // 설정 파일이 없으면 기본값 저장 후 반환
    writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    // 누락된 필드가 있으면 기본값으로 채움
    return {
      ...DEFAULT_CONFIG,
      ...config,
      defaults: { ...DEFAULT_CONFIG.defaults, ...(config.defaults || {}) },
      roles: { ...DEFAULT_CONFIG.roles, ...(config.roles || {}) }
    };
  } catch (error) {
    console.warn(`⚠️  설정 파일(${CONFIG_FILENAME}) 파싱 실패, 기본값을 사용합니다.`);
    return DEFAULT_CONFIG;
  }
}

/**
 * 설정 파일 쓰기
 */
export function writeConfig(config) {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * 역할에 대한 권장 도구 반환
 */
export function getToolForRole(role) {
  const config = readConfig();
  return config.roles[role] || config.defaults.tool || 'claude';
}
