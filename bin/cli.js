#!/usr/bin/env node

import { program } from 'commander';
import { setup } from '../src/commands/setup.js';
import { status } from '../src/commands/status.js';
import { reset } from '../src/commands/reset.js';
import { validate } from '../src/commands/validate.js';
import { sessions } from '../src/commands/sessions.js';
import { logs } from '../src/commands/logs.js';
import { run } from '../src/commands/run.js';
import { interactive } from '../src/commands/interactive.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');
program
  .name('ada')
  .description('Artifact-Driven AI Agent Framework\nAI가 규칙을 어기지 못하게 하는 문서 기반 개발')
  .version(version);

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
  .action(sessions);

// Logs command
program
  .command('logs [sessionId]')
  .description('세션 로그 확인')
  .action(logs);

// Run command
program
  .command('run <role> <tool>')
  .description('AI 에이전트 실행 (예: run backend claude)')
  .action(run);

// Parse arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // 인자 없으면 대화형 모드
  interactive();
} else if (args.length === 2 && !args[0].startsWith('-') && !['setup', 'status', 'reset', 'validate', 'sessions', 'logs', 'run'].includes(args[0])) {
  // 두 개의 인자가 명령어가 아니면 role tool로 간주
  run(args[0], args[1]);
} else {
  program.parse();
}
