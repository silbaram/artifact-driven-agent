import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getWorkspaceDir, isWorkspaceSetup } from '../utils/files.js';

export async function validate(doc) {
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('? 먼저 setup을 실행하세요.'));
    process.exit(1);
  }

  const workspace = getWorkspaceDir();
  const artifactsDir = path.join(workspace, 'artifacts');

  printSection('문서 검증');

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
    for (const validator of Object.values(validators)) {
      const result = validator(artifactsDir);
      totalPass += result.pass;
      totalFail += result.fail;
      totalWarn += result.warn;
    }
  }

  printSection('검증 결과');
  console.log(chalk.green(`  PASS: ${totalPass}`));
  console.log(chalk.red(`  FAIL: ${totalFail}`));
  console.log(chalk.yellow(`  WARN: ${totalWarn}`));
  console.log('');

  if (totalFail > 0) {
    process.exit(1);
  }
}

function validatePlan(artifactsDir) {
  const filePath = path.join(artifactsDir, 'plan.md');
  let pass = 0, fail = 0, warn = 0;

  printSection('plan.md');

  if (!fs.existsSync(filePath)) {
    logFail('파일 없음');
    return { pass: 0, fail: 1, warn: 0 };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // 필수 섹션 검사
  const requiredSections = ['서비스 개요', '기능 목록', '비기능 요구사항'];
  for (const section of requiredSections) {
    if (content.includes(section)) {
      logPass(`섹션 존재: ${section}`);
      pass++;
    } else {
      logFail(`섹션 누락: ${section}`);
      fail++;
    }
  }

  // TBD 개수 검사
  const tbdMatches = content.match(/TBD/gi) || [];
  if (tbdMatches.length > 3) {
    logWarn(`TBD 항목: ${tbdMatches.length}개 (3개 초과)`);
    warn++;
  } else {
    logPass(`TBD 항목: ${tbdMatches.length}개`);
    pass++;
  }

  console.log('');
  return { pass, fail, warn };
}

function validateProject(artifactsDir) {
  const filePath = path.join(artifactsDir, 'project.md');
  let pass = 0, fail = 0, warn = 0;

  printSection('project.md');

  if (!fs.existsSync(filePath)) {
    logFail('파일 없음');
    return { pass: 0, fail: 1, warn: 0 };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // 필수 섹션 검사
  const requiredSections = ['프로젝트 규모', '기술 스택'];
  for (const section of requiredSections) {
    if (content.includes(section)) {
      logPass(`섹션 존재: ${section}`);
      pass++;
    } else {
      logFail(`섹션 누락: ${section}`);
      fail++;
    }
  }

  // Frozen 상태 검사
  if (content.includes('Frozen') || content.includes('??')) {
    logPass('Frozen 상태 표시됨');
    pass++;
  } else {
    logWarn('Frozen 상태 미표시');
    warn++;
  }

  // 모호한 버전 검사 (예: 1.x, 2.x)
  if (/\d+\.x/i.test(content)) {
    logWarn('모호한 버전 형식 (예: 1.x)');
    warn++;
  } else {
    logPass('버전 형식 양호');
    pass++;
  }

  console.log('');
  return { pass, fail, warn };
}

export function validateBacklog(artifactsDir) {
  const backlogDir = path.join(artifactsDir, 'backlog');
  let pass = 0, fail = 0, warn = 0;

  printSection('backlog/');

  if (!fs.existsSync(backlogDir) || !fs.statSync(backlogDir).isDirectory()) {
    logWarn('backlog/ 디렉토리 없음 (Task 생성 전)');
    console.log('');
    return { pass: 0, fail: 0, warn: 1 };
  }

  const taskFiles = fs.readdirSync(backlogDir).filter(file => /^task-\d+\.md$/i.test(file));

  if (taskFiles.length > 0) {
    logPass(`Task 개수: ${taskFiles.length}개`);
    pass++;
  } else {
    logWarn('대기 Task 없음');
    warn++;
    console.log('');
    return { pass, fail, warn };
  }

  const missingAcceptance = taskFiles.filter(file => {
    const content = fs.readFileSync(path.join(backlogDir, file), 'utf-8');
    return !hasAcceptanceCriteria(content);
  });

  if (missingAcceptance.length === 0) {
    logPass(`수용 조건 존재 (${taskFiles.length}/${taskFiles.length})`);
    pass++;
  } else {
    logWarn(`수용 조건 미확인 (${taskFiles.length - missingAcceptance.length}/${taskFiles.length})`);
    warn++;
  }

  console.log('');
  return { pass, fail, warn };
}

export function validateSprint(artifactsDir) {
  const sprintsDir = path.join(artifactsDir, 'sprints');
  let pass = 0, fail = 0, warn = 0;

  printSection('sprints/');

  if (!fs.existsSync(sprintsDir) || !fs.statSync(sprintsDir).isDirectory()) {
    logWarn('sprints/ 디렉토리 없음 (스프린트 시작 전)');
    console.log('');
    return { pass: 0, fail: 0, warn: 1 };
  }

  const sprintDirs = fs.readdirSync(sprintsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && /^sprint-\d+$/.test(dirent.name))
    .map(dirent => dirent.name);

  if (sprintDirs.length === 0) {
    logWarn('스프린트 디렉토리 없음 (스프린트 시작 전)');
    warn++;
    console.log('');
    return { pass, fail, warn };
  }

  const latestSprint = sprintDirs.sort((a, b) => {
    const numA = parseInt(a.split('-')[1], 10);
    const numB = parseInt(b.split('-')[1], 10);
    return numB - numA;
  })[0];

  const metaPath = path.join(sprintsDir, latestSprint, 'meta.md');
  if (!fs.existsSync(metaPath)) {
    logFail(`${latestSprint}/meta.md 없음`);
    console.log('');
    return { pass: 0, fail: 1, warn: 0 };
  }

  const content = fs.readFileSync(metaPath, 'utf-8');
  logInfo(`최신 스프린트: ${latestSprint}`);

  const requiredFields = ['스프린트 번호', '상태', '시작일', '종료 예정', '목표'];
  requiredFields.forEach(field => {
    if (content.includes(field)) {
      logPass(`필드 존재: ${field}`);
      pass++;
    } else {
      logWarn(`필드 미확인: ${field}`);
      warn++;
    }
  });

  const hasTaskSection = content.includes('Task 요약') || content.includes('Task 목록');
  if (hasTaskSection) {
    logPass('Task 섹션 존재');
    pass++;
  } else {
    logWarn('Task 섹션 미확인');
    warn++;
  }

  const tasksDir = path.join(sprintsDir, latestSprint, 'tasks');
  if (fs.existsSync(tasksDir) && fs.statSync(tasksDir).isDirectory()) {
    const taskFiles = fs.readdirSync(tasksDir).filter(file => /^task-\d+\.md$/i.test(file));
    if (taskFiles.length > 0) {
      logPass(`Task 개수: ${taskFiles.length}개`);
      pass++;
    } else {
      logWarn('Task 없음');
      warn++;
    }
  } else {
    logWarn('tasks/ 디렉토리 없음');
    warn++;
  }

  console.log('');
  return { pass, fail, warn };
}

function hasAcceptanceCriteria(content) {
  return content.includes('수용 조건') || content.includes('Acceptance Criteria') || content.includes('AC-');
}

function printSection(title) {
  const width = 60;
  const line = '─'.repeat(width);
  const paddedTitle = ` ${title}`.padEnd(width, ' ');
  console.log('');
  console.log(chalk.cyan(`┌${line}┐`));
  console.log(chalk.cyan(`│${paddedTitle}│`));
  console.log(chalk.cyan(`└${line}┘`));
  console.log('');
}

function logPass(message) {
  console.log(chalk.green(`  [PASS] ${message}`));
}

function logWarn(message) {
  console.log(chalk.yellow(`  [WARN] ${message}`));
}

function logFail(message) {
  console.log(chalk.red(`  [FAIL] ${message}`));
}

function logInfo(message) {
  console.log(chalk.cyan(`  [INFO] ${message}`));
}
