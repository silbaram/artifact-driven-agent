import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getWorkspaceDir, isWorkspaceSetup } from '../utils/files.js';

export async function validate(doc) {
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 먼저 setup을 실행하세요.'));
    process.exit(1);
  }

  const workspace = getWorkspaceDir();
  const artifactsDir = path.join(workspace, 'artifacts');

  console.log('');
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.cyan.bold('📋 문서 검증'));
  console.log(chalk.cyan('━'.repeat(50)));
  console.log('');

  let totalPass = 0;
  let totalFail = 0;
  let totalWarn = 0;

  const validators = {
    plan: validatePlan,
    project: validateProject,
    backlog: validateBacklog,
    sprint: validateSprint
  };

  if (doc && validators[doc]) {
    // 특정 문서만 검증
    const result = validators[doc](artifactsDir);
    totalPass += result.pass;
    totalFail += result.fail;
    totalWarn += result.warn;
  } else {
    // 전체 검증
    for (const [name, validator] of Object.entries(validators)) {
      const result = validator(artifactsDir);
      totalPass += result.pass;
      totalFail += result.fail;
      totalWarn += result.warn;
    }
  }

  // 결과 요약
  console.log('');
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.white.bold('📊 검증 결과'));
  console.log(chalk.cyan('━'.repeat(50)));
  console.log('');
  console.log(chalk.green(`  ✓ PASS: ${totalPass}`));
  console.log(chalk.red(`  ✗ FAIL: ${totalFail}`));
  console.log(chalk.yellow(`  ⚠ WARN: ${totalWarn}`));
  console.log('');

  if (totalFail > 0) {
    process.exit(1);
  }
}

function validatePlan(artifactsDir) {
  const filePath = path.join(artifactsDir, 'plan.md');
  let pass = 0, fail = 0, warn = 0;

  console.log(chalk.white.bold('📄 plan.md'));

  if (!fs.existsSync(filePath)) {
    console.log(chalk.red('  ✗ 파일 없음'));
    return { pass: 0, fail: 1, warn: 0 };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // 필수 섹션 검사
  const requiredSections = ['서비스 개요', '기능 목록', '비기능 요구사항'];
  for (const section of requiredSections) {
    if (content.includes(section)) {
      console.log(chalk.green(`  ✓ 섹션 존재: ${section}`));
      pass++;
    } else {
      console.log(chalk.red(`  ✗ 섹션 누락: ${section}`));
      fail++;
    }
  }

  // TBD 개수 검사
  const tbdMatches = content.match(/TBD/gi) || [];
  if (tbdMatches.length > 3) {
    console.log(chalk.yellow(`  ⚠ TBD 항목: ${tbdMatches.length}개 (3개 초과)`));
    warn++;
  } else {
    console.log(chalk.green(`  ✓ TBD 항목: ${tbdMatches.length}개`));
    pass++;
  }

  console.log('');
  return { pass, fail, warn };
}

function validateProject(artifactsDir) {
  const filePath = path.join(artifactsDir, 'project.md');
  let pass = 0, fail = 0, warn = 0;

  console.log(chalk.white.bold('📄 project.md'));

  if (!fs.existsSync(filePath)) {
    console.log(chalk.red('  ✗ 파일 없음'));
    return { pass: 0, fail: 1, warn: 0 };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // 필수 섹션 검사
  const requiredSections = ['프로젝트 규모', '기술 스택'];
  for (const section of requiredSections) {
    if (content.includes(section)) {
      console.log(chalk.green(`  ✓ 섹션 존재: ${section}`));
      pass++;
    } else {
      console.log(chalk.red(`  ✗ 섹션 누락: ${section}`));
      fail++;
    }
  }

  // Frozen 상태 검사
  if (content.includes('Frozen') || content.includes('🔒')) {
    console.log(chalk.green('  ✓ Frozen 상태 표시됨'));
    pass++;
  } else {
    console.log(chalk.yellow('  ⚠ Frozen 상태 미표시'));
    warn++;
  }

  // 모호한 버전 검사 (예: 1.x, 2.x)
  if (/\d+\.x/i.test(content)) {
    console.log(chalk.yellow('  ⚠ 모호한 버전 형식 (예: 1.x)'));
    warn++;
  } else {
    console.log(chalk.green('  ✓ 버전 형식 양호'));
    pass++;
  }

  console.log('');
  return { pass, fail, warn };
}

function validateBacklog(artifactsDir) {
  const filePath = path.join(artifactsDir, 'backlog.md');
  let pass = 0, fail = 0, warn = 0;

  console.log(chalk.white.bold('📄 backlog.md'));

  if (!fs.existsSync(filePath)) {
    console.log(chalk.red('  ✗ 파일 없음'));
    return { pass: 0, fail: 1, warn: 0 };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Task 개수 검사
  const taskMatches = content.match(/TASK-\d+/gi) || [];
  if (taskMatches.length > 0) {
    console.log(chalk.green(`  ✓ Task 개수: ${taskMatches.length}개`));
    pass++;
  } else {
    console.log(chalk.red('  ✗ Task 없음'));
    fail++;
  }

  // 수용 조건 존재 검사
  if (content.includes('수용 조건') || content.includes('AC-') || content.includes('Acceptance')) {
    console.log(chalk.green('  ✓ 수용 조건 존재'));
    pass++;
  } else {
    console.log(chalk.yellow('  ⚠ 수용 조건 미확인'));
    warn++;
  }

  console.log('');
  return { pass, fail, warn };
}

function validateSprint(artifactsDir) {
  const filePath = path.join(artifactsDir, 'current-sprint.md');
  let pass = 0, fail = 0, warn = 0;

  console.log(chalk.white.bold('📄 current-sprint.md'));

  if (!fs.existsSync(filePath)) {
    console.log(chalk.gray('  - 파일 없음 (스프린트 시작 전)'));
    return { pass: 0, fail: 0, warn: 0 };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // 스프린트 번호 검사
  if (/Sprint\s*#?\d+/i.test(content) || /스프린트\s*#?\d+/.test(content)) {
    console.log(chalk.green('  ✓ 스프린트 번호 존재'));
    pass++;
  } else {
    console.log(chalk.yellow('  ⚠ 스프린트 번호 미확인'));
    warn++;
  }

  // 목표 섹션 검사
  if (content.includes('목표') || content.includes('Goal')) {
    console.log(chalk.green('  ✓ 목표 섹션 존재'));
    pass++;
  } else {
    console.log(chalk.yellow('  ⚠ 목표 섹션 미확인'));
    warn++;
  }

  console.log('');
  return { pass, fail, warn };
}
