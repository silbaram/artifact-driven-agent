import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getWorkspaceDir, isWorkspaceSetup, normalizeLineEndings } from '../utils/files.js';
import { syncSprint, findActiveSprint, updateSprintMeta } from '../utils/sprintUtils.js';
import { normalizeTaskStatus } from '../utils/taskParser.js';

/**
 * 스프린트 관리 명령어
 * @param {string} action - create / add / close / list / sync
 * @param {Array} args - 추가 인자
 */
export default async function sprint(action, ...args) {
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 워크스페이스가 설정되지 않았습니다.'));
    console.log(chalk.gray('   ada setup [template]을 먼저 실행하세요.'));
    process.exit(1);
  }

  const workspace = getWorkspaceDir();
  const sprintsDir = path.join(workspace, 'artifacts', 'sprints');

  switch (action) {
    case 'create':
      await createSprint(sprintsDir);
      break;
    case 'add':
      await addTasks(sprintsDir, args);
      break;
    case 'sync':
      await syncSprint(sprintsDir);
      break;
    case 'close':
      await closeSprint(sprintsDir, args);
      break;
    case 'list':
      await listSprints(sprintsDir);
      break;
    default:
      console.log(chalk.red('❌ 알 수 없는 명령어입니다.'));
      console.log('');
      console.log(chalk.cyan('사용법:'));
      console.log(chalk.gray('  ada sprint create              - 새 스프린트 생성'));
      console.log(chalk.gray('  ada sprint add task-001 ...    - Task 추가'));
      console.log(chalk.gray('  ada sprint sync                - meta.md 상태 동기화'));
      console.log(chalk.gray('  ada sprint close               - 스프린트 종료 (작업 파일 archive)'));
      console.log(chalk.gray('  ada sprint close --auto        - 스프린트 자동 종료 (회고 기본값)'));
      console.log(chalk.gray('  ada sprint close --clean       - 스프린트 종료 (작업 파일 삭제)'));
      console.log(chalk.gray('  ada sprint close --keep-all    - 스프린트 종료 (파일 유지)'));
      console.log(chalk.gray('  ada sprint list                - 스프린트 목록'));
      process.exit(1);
  }
}

/**
 * 새 스프린트 생성
 */
async function createSprint(sprintsDir) {
  fs.ensureDirSync(sprintsDir);

  // 현재 활성 스프린트 확인
  const activeSprint = findActiveSprint(sprintsDir);
  if (activeSprint) {
    console.log(chalk.yellow(`⚠️  이미 활성 스프린트가 있습니다: ${activeSprint}`));
    console.log(chalk.gray('   먼저 ada sprint close로 종료하세요.'));
    process.exit(1);
  }

  // 다음 스프린트 번호 계산
  const sprints = fs.readdirSync(sprintsDir).filter(d => {
    return fs.statSync(path.join(sprintsDir, d)).isDirectory() && !d.startsWith('_');
  });

  const sprintNumbers = sprints
    .map(name => {
      const match = name.match(/^sprint-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);

  const nextNumber = sprintNumbers.length > 0 ? Math.max(...sprintNumbers) + 1 : 1;
  const sprintName = `sprint-${nextNumber}`;
  const sprintPath = path.join(sprintsDir, sprintName);

  // 스프린트 디렉토리 구조 생성
  fs.ensureDirSync(path.join(sprintPath, 'tasks'));
  fs.ensureDirSync(path.join(sprintPath, 'review-reports'));
  fs.ensureDirSync(path.join(sprintPath, 'docs'));

  // meta.md 생성 (간소화된 버전)
  const metaPath = path.join(sprintPath, 'meta.md');
  const today = new Date().toISOString().slice(0, 10);

  const metaContent = `# Sprint ${nextNumber} 메타정보

| 항목 | 값 |
|------|-----|
| 스프린트 번호 | ${nextNumber} |
| 상태 | active |
| 시작일 | ${today} |
| 종료 예정 | TBD |

## Task 목록

> Task는 \`ada sprint add task-NNN\` 명령어로 추가됩니다.
> 추가된 Task는 아래에 자동으로 나열됩니다.

(Task 없음)

## 참고

- Task 상태: BACKLOG → IN_DEV → DONE
- 리뷰 결과: review-reports/ 참고
- 최종 문서: docs/ 참고
`;

  fs.writeFileSync(metaPath, metaContent);

  console.log('');
  console.log(chalk.green('✅ 새 스프린트가 생성되었습니다!'));
  console.log('');
  console.log(chalk.cyan(`📂 ${sprintName}/`));
  console.log(chalk.gray(`   - meta.md (스프린트 정보)`));
  console.log(chalk.gray(`   - tasks/ (Task 파일)`));
  console.log(chalk.gray(`   - review-reports/ (리뷰 리포트)`));
  console.log(chalk.gray(`   - docs/ (문서)`));
  console.log('');
  console.log(chalk.cyan('다음 단계:'));
  console.log(chalk.gray(`   ada sprint add task-001 task-002  - Task 추가`));
  console.log('');
}

/**
 * Task 추가
 */
async function addTasks(sprintsDir, taskIds) {
  if (taskIds.length === 0) {
    console.log(chalk.red('❌ Task ID를 지정하세요.'));
    console.log(chalk.gray('   예: ada sprint add task-001 task-002'));
    process.exit(1);
  }

  const activeSprint = findActiveSprint(sprintsDir);
  if (!activeSprint) {
    console.log(chalk.red('❌ 활성 스프린트가 없습니다.'));
    console.log(chalk.gray('   먼저 ada sprint create로 생성하세요.'));
    process.exit(1);
  }

  const sprintPath = path.join(sprintsDir, activeSprint);
  const backlogPath = path.join(getWorkspaceDir(), 'artifacts', 'backlog');

  if (!fs.existsSync(backlogPath)) {
    console.log(chalk.red('❌ backlog/ 디렉토리가 없습니다.'));
    process.exit(1);
  }

  let addedCount = 0;
  
  for (const taskId of taskIds) {
    const taskFile = `${taskId}.md`;
    const sourcePath = path.join(backlogPath, taskFile);
    const destPath = path.join(sprintPath, 'tasks', taskFile);

    if (!fs.existsSync(sourcePath)) {
      console.log(chalk.yellow(`⚠️  ${taskId}: backlog에 없음 (건너뜀)`));
      continue;
    }

    if (fs.existsSync(destPath)) {
      console.log(chalk.yellow(`⚠️  ${taskId}: 이미 스프린트에 있음 (건너뜀)`));
      continue;
    }

    // Task 파일 복사
    fs.copyFileSync(sourcePath, destPath);
    addedCount++;

    console.log(chalk.green(`✅ ${taskId} 추가됨`));
  }

  // meta.md 업데이트 (Sync 호출)
  await syncSprint(sprintsDir, true);

  console.log('');
  console.log(chalk.cyan(`📊 ${addedCount}개 Task가 ${activeSprint}에 추가되었습니다.`));
  console.log('');
}

/**
 * 스프린트 종료
 * @param {string} sprintsDir - 스프린트 디렉토리
 * @param {Array} args - 옵션 (--clean, --keep-all, --auto)
 */
async function closeSprint(sprintsDir, args = []) {
  const activeSprint = findActiveSprint(sprintsDir);
  if (!activeSprint) {
    console.log(chalk.red('❌ 활성 스프린트가 없습니다.'));
    process.exit(1);
  }

  const sprintPath = path.join(sprintsDir, activeSprint);
  const metaPath = path.join(sprintPath, 'meta.md');

  // 옵션 파싱
  const hasClean = args.includes('--clean');
  const hasKeepAll = args.includes('--keep-all');
  const isAuto = args.includes('--auto');

  // 종료 전 마지막 동기화
  await syncSprint(sprintsDir, true);

  // meta.md 업데이트 (active → completed)
  let metaContent = normalizeLineEndings(fs.readFileSync(metaPath, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);

  metaContent = metaContent
    .replace(/상태 \| active/, `상태 | completed`)
    .replace(/종료 예정 \| .*/, `종료 예정 | ${today}`);

  fs.writeFileSync(metaPath, metaContent, 'utf-8');

  // retrospective.md 생성
  console.log('');
  console.log(chalk.cyan('📝 스프린트 회고 작성'));
  console.log(chalk.gray('━'.repeat(50)));

  let retrospectiveData;
  if (isAuto) {
    console.log(chalk.gray('🤖 자동 모드: 기본값으로 회고 작성'));
    retrospectiveData = await getRetrospectiveDataAuto(sprintPath);
  } else {
    retrospectiveData = await promptRetrospective(sprintPath);
  }
  
  createRetrospective(sprintPath, activeSprint, today, retrospectiveData);

  console.log('');
  console.log(chalk.green('✅ 회고 작성 완료'));

  // 작업 파일 정리
  if (!hasKeepAll) {
    const tasksDir = path.join(sprintPath, 'tasks');
    const reviewReportsDir = path.join(sprintPath, 'review-reports');

    if (hasClean) {
      // --clean: 완전 삭제
      console.log('');
      console.log(chalk.yellow('🗑️  작업 파일 삭제 중...'));

      let deletedCount = 0;
      if (fs.existsSync(tasksDir)) {
        const taskFiles = fs.readdirSync(tasksDir).filter(f => !f.includes('template'));
        taskFiles.forEach(f => fs.removeSync(path.join(tasksDir, f)));
        deletedCount += taskFiles.length;
      }
      if (fs.existsSync(reviewReportsDir)) {
        const reviewFiles = fs.readdirSync(reviewReportsDir).filter(f => !f.includes('template'));
        reviewFiles.forEach(f => fs.removeSync(path.join(reviewReportsDir, f)));
        deletedCount += reviewFiles.length;
      }

      console.log(chalk.gray(`   ✓ ${deletedCount}개 파일 삭제됨`));
    } else {
      // 기본: archive/ 폴더로 이동
      console.log('');
      console.log(chalk.cyan('📦 작업 파일 보관 중...'));

      const archiveDir = path.join(sprintPath, 'archive');
      fs.ensureDirSync(archiveDir);

      let archivedCount = 0;

      // tasks/ 이동
      if (fs.existsSync(tasksDir)) {
        const taskFiles = fs.readdirSync(tasksDir).filter(f => !f.includes('template'));
        if (taskFiles.length > 0) {
          const archiveTasksDir = path.join(archiveDir, 'tasks');
          fs.ensureDirSync(archiveTasksDir);
          taskFiles.forEach(f => {
            fs.moveSync(path.join(tasksDir, f), path.join(archiveTasksDir, f), { overwrite: true });
          });
          archivedCount += taskFiles.length;
        }
      }

      // review-reports/ 이동
      if (fs.existsSync(reviewReportsDir)) {
        const reviewFiles = fs.readdirSync(reviewReportsDir).filter(f => !f.includes('template'));
        if (reviewFiles.length > 0) {
          const archiveReviewsDir = path.join(archiveDir, 'review-reports');
          fs.ensureDirSync(archiveReviewsDir);
          reviewFiles.forEach(f => {
            fs.moveSync(path.join(reviewReportsDir, f), path.join(archiveReviewsDir, f), { overwrite: true });
          });
          archivedCount += reviewFiles.length;
        }
      }

      if (archivedCount > 0) {
        console.log(chalk.gray(`   ✓ ${archivedCount}개 파일 → archive/`));
      } else {
        console.log(chalk.gray(`   ✓ 정리할 파일 없음`));
      }
    }
  }

  console.log('');
  console.log(chalk.green(`✅ ${activeSprint}가 종료되었습니다!`));
  console.log('');
}

/**
 * 스프린트 목록
 */
async function listSprints(sprintsDir) {
  if (!fs.existsSync(sprintsDir)) {
    console.log(chalk.yellow('⚠️  스프린트가 없습니다.'));
    return;
  }

  const sprints = fs.readdirSync(sprintsDir)
    .filter(d => {
      return fs.statSync(path.join(sprintsDir, d)).isDirectory() && !d.startsWith('_');
    })
    .sort();

  if (sprints.length === 0) {
    console.log(chalk.yellow('⚠️  스프린트가 없습니다.'));
    return;
  }

  console.log('');
  console.log(chalk.cyan('📊 스프린트 목록'));
  console.log(chalk.cyan('━'.repeat(60)));

  for (const sprint of sprints) {
    const metaPath = path.join(sprintsDir, sprint, 'meta.md');
    if (fs.existsSync(metaPath)) {
      const content = fs.readFileSync(metaPath, 'utf-8');
      const statusMatch = content.match(/상태 \| (active|completed)/);
      const status = statusMatch ? statusMatch[1] : 'unknown';
      const statusIcon = status === 'active' ? '🟢' : '✅';
      const statusText = status === 'active' ? chalk.green('진행 중') : chalk.gray('완료');

      console.log(`${statusIcon} ${chalk.cyan(sprint)} - ${statusText}`);
    }
  }

  console.log('');
}

/**
 * 회고 데이터 자동 생성 (Auto Mode)
 */
async function getRetrospectiveDataAuto(sprintPath) {
  const { completedTasks, incompleteTasks } = getTaskStatusForRetrospective(sprintPath);

  return {
    completedTasks,
    incompleteTasks,
    keep: '자동 완료됨',
    problem: '-',
    try: '-'
  };
}

/**
 * 회고 작성 프롬프트
 */
async function promptRetrospective(sprintPath) {
  const { completedTasks, incompleteTasks } = getTaskStatusForRetrospective(sprintPath);

  console.log('');
  console.log(chalk.white(`완료된 Task: ${completedTasks.length}개`));
  console.log(chalk.white(`미완료 Task: ${incompleteTasks.length}개`));
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'keep',
      message: '잘된 점 (Keep):',
      default: '계획대로 진행됨'
    },
    {
      type: 'input',
      name: 'problem',
      message: '개선할 점 (Problem):',
      default: '-'
    },
    {
      type: 'input',
      name: 'try',
      message: '시도할 것 (Try):',
      default: '-'
    }
  ]);

  return {
    completedTasks,
    incompleteTasks,
    ...answers
  };
}

/**
 * 회고를 위한 Task 상태 분류 헬퍼
 */
function getTaskStatusForRetrospective(sprintPath) {
  // meta.md에서 Task 정보 읽기
  const metaPath = path.join(sprintPath, 'meta.md');
  const metaContent = fs.readFileSync(metaPath, 'utf-8');
  
  // Task 목록/요약 파싱
  const taskLines = metaContent
    .split('\n')
    .filter(line => line.trim().toLowerCase().startsWith('| task-'));
  const knownStatuses = new Set(['BACKLOG', 'IN_DEV', 'IN_REVIEW', 'DONE', 'REJECT', 'REJECTED', 'BLOCKED']);

  const completedTasks = [];
  const incompleteTasks = [];

  taskLines.forEach(line => {
    const columns = line.split('|').map(col => col.trim()).filter(col => col.length > 0);
    if (columns.length < 2) return;

    const id = columns[0];
    let status = null;

    const candidate1 = normalizeTaskStatus(columns[1]);
    if (knownStatuses.has(candidate1)) {
      status = candidate1;
    } else if (columns.length > 2) {
      const candidate2 = normalizeTaskStatus(columns[2]);
      if (knownStatuses.has(candidate2)) {
        status = candidate2;
      }
    }

    if (status === 'DONE') {
      completedTasks.push(id);
    } else {
      incompleteTasks.push(id);
    }
  });

  return { completedTasks, incompleteTasks };
}

/**
 * retrospective.md 파일 생성
 */
function createRetrospective(sprintPath, sprintName, endDate, data) {
  const retrospectivePath = path.join(sprintPath, 'retrospective.md');
  
  // 시작일은 meta.md에서 가져오기
  const metaPath = path.join(sprintPath, 'meta.md');
  const metaContent = fs.readFileSync(metaPath, 'utf-8');
  const startDateMatch = metaContent.match(/시작일 \| ([\d-]+)/);
  const startDate = startDateMatch ? startDateMatch[1] : endDate;

  const sprintNumber = sprintName.replace('sprint-', '');
  const totalTasks = data.completedTasks.length + data.incompleteTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((data.completedTasks.length / totalTasks) * 100) : 0;

  const content = `# Sprint ${sprintNumber} 회고

## 기간
- 시작: ${startDate}
- 종료: ${endDate}

## 완료된 Task (${data.completedTasks.length}개)

${data.completedTasks.map(t => `- ${t}`).join('\n') || '- (없음)'}

## 미완료 Task (${data.incompleteTasks.length}개)

${data.incompleteTasks.map(t => `- ${t}: 이월 필요`).join('\n') || '- (없음)'}

## 잘된 점 (Keep)

- ${data.keep}

## 개선할 점 (Problem)

- ${data.problem}

## 시도할 것 (Try)

- ${data.try}

## 메트릭

- 계획 Task 수: ${totalTasks}개
- 완료 Task 수: ${data.completedTasks.length}개
- 완료율: ${completionRate}%
- 이월 Task 수: ${data.incompleteTasks.length}개
`;

  fs.writeFileSync(retrospectivePath, content);
}
