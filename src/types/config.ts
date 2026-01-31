import type { Tool } from './common.js';

/**
 * 역할별 도구 설정
 */
export interface RoleToolConfig {
  manager?: Tool | string;
  planner?: Tool | string;
  architect?: Tool | string;
  developer?: Tool | string;
  reviewer?: Tool | string;
  improver?: Tool | string;
  documenter?: Tool | string;
  analyzer?: Tool | string;
  [role: string]: Tool | string | undefined;
}

/**
 * 기본값 설정
 */
export interface DefaultsConfig {
  tool: Tool | string;
}

/**
 * Ada 설정 파일 구조 (ada.config.json)
 */
export interface AdaConfig {
  version: string;
  defaults: DefaultsConfig;
  roles: RoleToolConfig;
  [key: string]: unknown;
}

/**
 * 버전 정보 파일 구조 (.ada-version)
 */
export interface VersionInfo {
  packageVersion: string;
  workspaceVersion: string;
  template: string;
  lastUpgrade: string;
}
