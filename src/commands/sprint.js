import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getWorkspaceDir, isWorkspaceSetup, getTimestamp } from '../utils/files.js';

/**
 * 스프린트 관리 명령어
 * @param {string} action - create / add / close / list
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
      console.log(chalk.gray('  ada sprint close               - 스프린트 종료 (작업 파일 archive)'));
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

  // 템플릿 복사
  const templatePath = path.join(sprintsDir, '_template');
  if (!fs.existsSync(templatePath)) {
    console.log(chalk.red('❌ 스프린트 템플릿이 없습니다.'));
    process.exit(1);
  }

  fs.copySync(templatePath, sprintPath);

  // meta.md 업데이트
  const metaPath = path.join(sprintPath, 'meta.md');
  let metaContent = fs.readFileSync(metaPath, 'utf-8');
  const today = new Date().toISOString().slice(0, 10);

  metaContent = metaContent
    .replace(/스프린트 번호 \| N/, `스프린트 번호 | ${nextNumber}`)
    .replace(/상태 \| active \/ completed/, `상태 | active`)
    .replace(/시작일 \| YYYY-MM-DD/, `시작일 | ${today}`)
    .replace(/종료 예정 \| YYYY-MM-DD/, `종료 예정 | TBD`);

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
 * 현재 활성 스프린트 찾기
 */
function findActiveSprint(sprintsDir) {
  if (!fs.existsSync(sprintsDir)) return null;

  const sprints = fs.readdirSync(sprintsDir).filter(d => {
    return fs.statSync(path.join(sprintsDir, d)).isDirectory() && !d.startsWith('_');
  });

  for (const sprint of sprints) {
    const metaPath = path.join(sprintsDir, sprint, 'meta.md');
    if (fs.existsSync(metaPath)) {
      const content = fs.readFileSync(metaPath, 'utf-8');
      if (content.includes('상태 | active')) {
        return sprint;
      }
    }
  }

  return null;
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

  console.log('');
  console.log(chalk.cyan(`📊 ${addedCount}개 Task가 ${activeSprint}에 추가되었습니다.`));
  console.log('');
  console.log(chalk.gray(`   meta.md를 업데이트하여 Task 목록을 갱신하세요.`));
  console.log('');
}

/**
 * 스프린트 종료
 * @param {string} sprintsDir - 스프린트 디렉토리
 * @param {Array} args - 옵션 (--clean, --keep-all)
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

  // meta.md 업데이트 (active → completed)
  let metaContent = fs.readFileSync(metaPath, 'utf-8');
  const today = new Date().toISOString().slice(0, 10);

  metaContent = metaContent
    .replace(/상태 \| active/, `상태 | completed`)
    .replace(/종료 예정 \| .*/, `종료 예정 | ${today}`);

  fs.writeFileSync(metaPath, metaContent);

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

  // 정리 결과 안내
  if (hasKeepAll) {
    console.log(chalk.gray('📁 모든 파일이 유지되었습니다.'));
  } else if (hasClean) {
    console.log(chalk.gray('📁 작업 파일이 삭제되었습니다. (docs/ 문서만 유지)'));
  } else {
    console.log(chalk.gray('📁 작업 파일이 archive/에 보관되었습니다.'));
  }

  console.log('');
  console.log(chalk.cyan('다음 단계:'));
  console.log(chalk.gray(`   1. ${activeSprint}/docs/ 문서 확인`));
  console.log(chalk.gray(`   2. ada sprint create로 다음 스프린트 시작`));
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
