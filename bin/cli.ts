#!/usr/bin/env node

import { program } from 'commander';
import { setup } from '../src/commands/setup.js';
import { status } from '../src/commands/status.js';
import { reset } from '../src/commands/reset.js';
import { validate } from '../src/commands/validate.js';
import { sessions } from '../src/commands/sessions.js';
import { logs } from '../src/commands/logs.js';
import { run } from '../src/commands/run.js';
import { config } from '../src/commands/config.js';
import { interactive } from '../src/commands/interactive.js';
import { upgrade } from '../src/commands/upgrade.js';
import { monitor } from '../src/commands/monitor.js';
import sprint from '../src/commands/sprint.js';
import docs from '../src/commands/docs.js';
import { skills } from '../src/commands/skills.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

program
  .name('ada')
  .description('Artifact-Driven AI Agent Framework\nAI가 규칙을 어기지 못하게 하는 문서 기반 개발')
  .version(version)
  .option('-m, --monitor', 'UI 모드 실행 (인터랙티브 인터페이스)');

// Setup command
program
  .command('setup [template]')
  .description('프로젝트 템플릿 세팅 (web, library, game, cli)')
  .action(setup);

// Status command
program
  .command('status')
  .description('현재 세팅 상태 확인')
  .action(status);

// Reset command
program
  .command('reset')
  .description('ai-dev-team 초기화')
  .option('-f, --force', '확인 없이 강제 초기화')
  .action(reset);

// Upgrade command
program
  .command('upgrade')
  .description('작업공간을 최신 버전으로 업그레이드')
  .option('-f, --force', '확인 없이 강제 업그레이드')
  .option('--dry-run', '변경 사항 미리보기 (실제 변경 없음)')
  .option('--rollback', '이전 백업으로 롤백')
  .action(upgrade);

// Validate command
program
  .command('validate [doc]')
  .description('문서 검증 (plan, project, backlog, sprint 또는 전체)')
  .action(validate);

// Sessions command
program
  .command('sessions')
  .description('AI 실행 세션 목록')
  .option('-w, --watch', '실시간 모니터링 모드')
  .option('-c, --clean', '완료된 세션 정리')
  .action(sessions);

// Logs command
program
  .command('logs [sessionId]')
  .description('세션 로그 확인')
  .action(logs);

// Sprint command
program
  .command('sprint <action> [tasks...]')
  .description('스프린트 관리 (create, add, close, list)')
  .action(sprint);

// Docs command
program
  .command('docs <action>')
  .description('문서 관리 (init, generate, publish, serve)')
  .option('-g, --generator <type>', '문서 생성기 (mkdocs, jekyll)')
  .action(docs);

// Skills command
program
  .command('skills <action> [args...]')
  .description('스킬 관리 (list, info)')
  .action(skills);

// Monitor command (UI 모드)
program
  .command('monitor')
  .alias('m')
  .description('UI 모드 (인터랙티브 인터페이스)')
  .action(monitor);

// Config command
program
  .command('config [action] [key] [value]')
  .description('설정 조회/변경 (대화형), show, get <key>, set <key> <value>')
  .action(config);

// Run command
program
  .command('run <role> [tool]')
  .description('AI 에이전트 실행 (예: run backend [claude])')
  .action(run);

// Parse arguments
const args = process.argv.slice(2);

// 명령어 목록
const COMMANDS = ['setup', 'status', 'reset', 'upgrade', 'validate', 'sessions', 'logs', 'run', 'sprint', 'docs', 'skills', 'config', 'monitor', 'm'];

if (args.length === 0) {
  // 인자 없으면 대화형 모드
  interactive();
} else if (args.includes('-m') || args.includes('--monitor')) {
  // -m 또는 --monitor 옵션이 있으면 대시보드 실행
  monitor();
} else if (args.length === 2 && !args[0].startsWith('-') && !COMMANDS.includes(args[0])) {
  // 두 개의 인자가 명령어가 아니면 role tool로 간주 (간편 실행)
  run(args[0], args[1]);
} else if (args.length === 1 && !args[0].startsWith('-') && !COMMANDS.includes(args[0])) {
  // 인자가 하나면 role로 간주하고 도구는 자동 선택
  run(args[0]);
} else {
  program.parse();
}
