import type { Tool } from './common.js';

/**
 * 역할 설정 (도구 + 스킬)
 */
export interface RoleConfig {
  tool: Tool | string;
  skills?: string[];
}

/**
 * 역할별 도구 설정 (문자열 또는 객체)
 */
export interface RoleToolConfig {
  manager?: Tool | string | RoleConfig;
  planner?: Tool | string | RoleConfig;
  architect?: Tool | string | RoleConfig;
  developer?: Tool | string | RoleConfig;
  reviewer?: Tool | string | RoleConfig;
  improver?: Tool | string | RoleConfig;
  documenter?: Tool | string | RoleConfig;
  analyzer?: Tool | string | RoleConfig;
  [role: string]: Tool | string | RoleConfig | undefined;
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
