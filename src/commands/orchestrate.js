import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';
import { executeAgentSession } from './run.js';
import { getAvailableRoles, getWorkspaceDir, isWorkspaceSetup } from '../utils/files.js';
import { consultManager } from '../orchestrator/consultant.js';
import { readStatus, getActiveSessions } from '../utils/sessionState.js';
import { parseTaskMetadata } from '../utils/taskParser.js';
import { syncSprint } from '../utils/sprintUtils.js';

/**
 * [CLI] 오케스트레이션 명령어 핸들러
 * 여러 AI 에이전트를 시나리오에 맞춰 순차적/조건부로 실행
 */
export async function orchestrate(mode) {
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('🎼 ADA Orchestrator'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  // 모드가 없으면 선택
  if (!mode) {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'mode',
      message: '실행할 오케스트레이션 모드를 선택하세요:',
      choices: [
        { name: '🤝 매니저 가이드 모드 (AI 제안 → 사용자 승인)', value: 'guided' },
        { name: '🏃 스프린트 루틴 (Planner → Developer → Reviewer)', value: 'sprint_routine' },
        { name: '✨ 기능 구현 (Developer → Reviewer)', value: 'feature_impl' },
        { name: '🧪 QA 패스 (QA → Developer)', value: 'qa_pass' },
        { name: '📝 문서화 (All → Documenter)', value: 'documentation' }
      ]
    }]);
    mode = answer.mode;
  }

  try {
    switch (mode) {
      case 'guided':
        await runGuidedMode();
        break;
      case 'auto':
        console.log(chalk.yellow('⚠️  \'auto\' 모드는 \'guided\' 모드로 변경되었습니다.'));
        await runGuidedMode();
        break;
      case 'sprint_routine':
        await runSprintRoutine();
        break;
      case 'feature_impl':
        await runFeatureImplementation();
        break;
      case 'qa_pass':
        await runQAPass();
        break;
      case 'documentation':
        await runDocumentation();
        break;
      default:
        console.log(chalk.red(`❌ 알 수 없는 모드입니다: ${mode}`));
    }
  } catch (error) {
    console.error(chalk.red('\n❌ 오케스트레이션 중단됨:'));
    console.error(chalk.white(error.message));
    process.exit(1);
  }
}

/**
 * 프로젝트 상태 체크 (Setup 여부, 핵심 문서, 스프린트 등)
 */
function checkProjectReadiness() {
  const result = {
    isReady: false,
    setupComplete: false,
    template: null,
    hasProject: false,
    hasPlan: false,
    hasDecision: false,
    currentSprint: null,
    tasks: {
      backlog: [],
      inDev: [],
      inReview: [],
      inQa: [],
      done: [],
      reject: [],
      blocked: []
    },
    backlogTasks: [],
    issues: [],
    nextAction: null
  };

  // 1. Setup 확인
  if (!isWorkspaceSetup()) {
    result.issues.push({
      type: 'error',
      message: 'Setup이 완료되지 않았습니다',
      solution: 'ada setup <template> 실행 (예: ada setup cli)'
    });
    return result;
  }

  const workspace = getWorkspaceDir();
  result.setupComplete = true;

  // 템플릿 확인
  const templateFile = path.join(workspace, '.current-template');
  if (fs.existsSync(templateFile)) {
    result.template = fs.readFileSync(templateFile, 'utf-8').trim();
  }

  // roles 디렉토리 확인
  const rolesDir = path.join(workspace, 'roles');
  const roleFiles = fs.existsSync(rolesDir)
    ? fs.readdirSync(rolesDir).filter(f => f.endsWith('.md'))
    : [];

  if (roleFiles.length === 0) {
    result.issues.push({
      type: 'error',
      message: '역할(roles) 파일이 없습니다',
      solution: 'ada setup <template> 재실행 또는 ada upgrade 실행'
    });
    return result;
  }

  // 2. 핵심 문서 확인
  const artifactsDir = path.join(workspace, 'artifacts');

  result.hasProject = fs.existsSync(path.join(artifactsDir, 'project.md'));
  result.hasPlan = fs.existsSync(path.join(artifactsDir, 'plan.md'));
  result.hasDecision = fs.existsSync(path.join(artifactsDir, 'decision.md'));

  // 3. 스프린트 확인
  const sprintsDir = path.join(artifactsDir, 'sprints');
  if (fs.existsSync(sprintsDir)) {
    const sprints = fs.readdirSync(sprintsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^sprint-\d+$/.test(d.name))
      .map(d => d.name)
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[1]);
        const numB = parseInt(b.split('-')[1]);
        return numB - numA;
      });

    if (sprints.length > 0) {
      const currentSprintName = sprints[0];
      const sprintDir = path.join(sprintsDir, currentSprintName);

      result.currentSprint = {
        name: currentSprintName,
        tasksDir: path.join(sprintDir, 'tasks')
      };

      // 스프린트 Task 읽기
      const tasksDir = path.join(sprintDir, 'tasks');
      const reviewReportsDir = path.join(sprintDir, 'review-reports');

      if (fs.existsSync(tasksDir)) {
        const taskFiles = fs.readdirSync(tasksDir)
          .filter(f => f.endsWith('.md') && f.startsWith('task-'));

        taskFiles.forEach(taskFile => {
          const taskPath = path.join(tasksDir, taskFile);
          const content = fs.readFileSync(taskPath, 'utf-8');
          const taskInfo = parseTaskMetadata(content, taskFile);

          // 실제 review-reports 디렉토리에서 리뷰 리포트 파일 존재 여부 확인
          const reviewReportPath = path.join(reviewReportsDir, taskFile);
          if (fs.existsSync(reviewReportPath)) {
            taskInfo.hasReviewReport = true;
          }

          // status 정규화 (대소문자 무시)
          const status = taskInfo.status.toUpperCase();

          if (status === 'BACKLOG') result.tasks.backlog.push(taskInfo);
          else if (status === 'IN_DEV') result.tasks.inDev.push(taskInfo);
          else if (status === 'IN_REVIEW') result.tasks.inReview.push(taskInfo);
          else if (status === 'IN_QA') result.tasks.inQa.push(taskInfo);
          else if (status === 'DONE') result.tasks.done.push(taskInfo);
          else if (status === 'REJECTED' || status === 'REJECT') result.tasks.reject.push(taskInfo);
          else if (status === 'BLOCKED') result.tasks.blocked.push(taskInfo);
          else result.tasks.backlog.push(taskInfo); // 기본값
        });
      }
    }
  }

  // 4. Backlog 확인
  const backlogDir = path.join(artifactsDir, 'backlog');
  if (fs.existsSync(backlogDir)) {
    const backlogFiles = fs.readdirSync(backlogDir)
      .filter(f => f.endsWith('.md') && f.startsWith('task-'));

    backlogFiles.forEach(taskFile => {
      const taskPath = path.join(backlogDir, taskFile);
      const content = fs.readFileSync(taskPath, 'utf-8');
      result.backlogTasks.push(parseTaskMetadata(content, taskFile));
    });
  }

  // 5. 문제점 및 다음 액션 결정
  if (!result.hasPlan) {
    result.issues.push({
      type: 'warning',
      message: 'plan.md가 없습니다',
      solution: 'Planner 역할로 기획을 먼저 수행하세요'
    });
    result.nextAction = { role: 'planner', reason: 'plan.md 작성 필요' };
  } else if (!result.currentSprint) {
    result.issues.push({
      type: 'warning',
      message: '활성 스프린트가 없습니다',
      solution: 'ada sprint create 실행 후 Task 추가'
    });
    result.nextAction = { action: 'manual', reason: '스프린트 생성 필요 (ada sprint create)' };
  } else {
    const totalTasks = result.tasks.backlog.length + result.tasks.inDev.length +
                       result.tasks.inReview.length + result.tasks.inQa.length +
                       result.tasks.done.length + result.tasks.reject.length +
                       result.tasks.blocked.length;

    if (totalTasks === 0) {
      result.issues.push({
        type: 'warning',
        message: '스프린트에 Task가 없습니다',
        solution: 'ada sprint add <task-id> 실행'
      });
      result.nextAction = { action: 'manual', reason: 'Task 추가 필요 (ada sprint add)' };
    } else if (result.tasks.blocked.length > 0) {
      result.issues.push({
        type: 'warning',
        message: `BLOCKED Task ${result.tasks.blocked.length}개 존재`,
        solution: '차단 사유 확인 후 수동 조치 필요'
      });
      result.nextAction = { action: 'manual', reason: `BLOCKED Task ${result.tasks.blocked.length}개 해결 필요` };
    } else if (result.tasks.reject.length > 0) {
      result.nextAction = { role: 'developer', reason: `REJECT된 Task ${result.tasks.reject.length}개 수정 필요` };
    } else if (result.tasks.inReview.length > 0) {
      result.nextAction = { role: 'reviewer', reason: `IN_REVIEW Task ${result.tasks.inReview.length}개 리뷰 필요` };
    } else if (result.tasks.inQa.length > 0) {
      result.nextAction = { role: 'qa', reason: `IN_QA Task ${result.tasks.inQa.length}개 검증 필요` };
    } else if (result.tasks.backlog.length > 0 && result.tasks.inDev.length === 0) {
      result.nextAction = { role: 'developer', reason: `BACKLOG Task ${result.tasks.backlog.length}개 개발 시작` };
    } else if (result.tasks.inDev.length > 0) {
      result.nextAction = { role: 'developer', reason: `IN_DEV Task ${result.tasks.inDev.length}개 개발 계속` };
    } else if (result.tasks.done.length > 0) {
      // DONE 중 리뷰 안된 것 확인
      const needsReview = result.tasks.done.filter(t => !t.hasReviewReport);
      if (needsReview.length > 0) {
        result.nextAction = { role: 'reviewer', reason: `완료된 Task ${needsReview.length}개 리뷰 필요` };
      } else {
        result.nextAction = { role: 'documenter', reason: '모든 Task 완료, 문서화 진행' };
      }
    }
  }

  // 에러가 없으면 준비 완료
  result.isReady = !result.issues.some(i => i.type === 'error');

  return result;
}

/**
 * 상태 리포트 출력
 */
function printStatusReport(status) {
  console.log(chalk.cyan('\n📊 프로젝트 상태 분석'));
  console.log(chalk.cyan('─'.repeat(50)));

  // Setup 상태
  if (status.setupComplete) {
    const templateStr = status.template ? `(${status.template} 템플릿)` : '';
    console.log(chalk.green(`  ✅ Setup 완료 ${chalk.gray(templateStr)}`));
  } else {
    console.log(chalk.red('  ❌ Setup 미완료'));
  }

  // 핵심 문서 상태
  console.log('');
  console.log(chalk.white('  📄 핵심 문서'));
  console.log(`     ${status.hasProject ? chalk.green('✅') : chalk.yellow('⬜')} project.md`);
  console.log(`     ${status.hasPlan ? chalk.green('✅') : chalk.yellow('⬜')} plan.md`);
  console.log(`     ${status.hasDecision ? chalk.green('✅') : chalk.gray('⬜')} decision.md`);

  // 스프린트 상태
  console.log('');
  if (status.currentSprint) {
    const totalTasks = status.tasks.backlog.length + status.tasks.inDev.length +
                       status.tasks.done.length + status.tasks.reject.length;
    console.log(chalk.white(`  🏃 현재 스프린트: ${chalk.cyan(status.currentSprint.name)}`));
    console.log(`     총 ${totalTasks}개 Task`);

    if (status.tasks.backlog.length > 0) {
      console.log(chalk.gray(`     ├─ BACKLOG: ${status.tasks.backlog.length}개`));
      status.tasks.backlog.slice(0, 3).forEach(t => {
        console.log(chalk.gray(`     │  └─ ${t.id}: ${truncate(t.title, 30)}`));
      });
    }
    if (status.tasks.inDev.length > 0) {
      console.log(chalk.yellow(`     ├─ IN_DEV: ${status.tasks.inDev.length}개`));
      status.tasks.inDev.forEach(t => {
        console.log(chalk.yellow(`     │  └─ ${t.id}: ${truncate(t.title, 30)}`));
      });
    }
    if (status.tasks.inReview.length > 0) {
      console.log(chalk.yellow(`     ├─ IN_REVIEW: ${status.tasks.inReview.length}개`));
    }
    if (status.tasks.inQa.length > 0) {
      console.log(chalk.yellow(`     ├─ IN_QA: ${status.tasks.inQa.length}개`));
    }
    if (status.tasks.done.length > 0) {
      console.log(chalk.green(`     ├─ DONE: ${status.tasks.done.length}개`));
    }
    if (status.tasks.blocked.length > 0) {
      console.log(chalk.red(`     ├─ BLOCKED: ${status.tasks.blocked.length}개`));
    }
    if (status.tasks.reject.length > 0) {
      console.log(chalk.red(`     └─ REJECT: ${status.tasks.reject.length}개`));
      status.tasks.reject.forEach(t => {
        console.log(chalk.red(`        └─ ${t.id}: ${truncate(t.title, 30)}`));
      });
    }
  } else {
    console.log(chalk.yellow('  🏃 활성 스프린트: 없음'));
  }

  // Backlog
  if (status.backlogTasks.length > 0) {
    console.log('');
    console.log(chalk.white(`  📋 전체 Backlog: ${status.backlogTasks.length}개`));
  }

  // 문제점
  if (status.issues.length > 0) {
    console.log('');
    console.log(chalk.white('  ⚠️  확인 필요'));
    status.issues.forEach(issue => {
      const icon = issue.type === 'error' ? chalk.red('❌') : chalk.yellow('⚡');
      console.log(`     ${icon} ${issue.message}`);
      console.log(chalk.gray(`        → ${issue.solution}`));
    });
  }

  // 다음 액션 제안
  console.log('');
  console.log(chalk.cyan('─'.repeat(50)));
  if (status.nextAction) {
    if (status.nextAction.action === 'manual') {
      console.log(chalk.yellow(`  💡 다음 단계: ${status.nextAction.reason}`));
    } else {
      console.log(chalk.green(`  💡 다음 단계: ${chalk.bold(status.nextAction.role)} 실행`));
      console.log(chalk.gray(`     이유: ${status.nextAction.reason}`));
    }
  } else {
    console.log(chalk.gray('  💡 다음 단계: 판단 불가'));
  }
  console.log('');
}

/**
 * 시나리오 0: 매니저 가이드 모드 (Guided Mode)
 * Manager AI가 상황을 판단하여 제안하고, 사용자가 승인하면 실행
 */
async function runGuidedMode() {
  console.log(chalk.cyan('\n🤝 매니저 가이드 모드'));
  console.log(chalk.gray('   프로젝트 상태를 분석하고 AI가 다음 작업을 제안합니다.\n'));

  // 1. 프로젝트 상태 체크
  const projectStatus = checkProjectReadiness();

  // 2. 상태 리포트 출력
  printStatusReport(projectStatus);

  // 3. 준비 안됐으면 종료
  if (!projectStatus.isReady) {
    console.log(chalk.red('❌ 가이드 모드를 시작할 수 없습니다.'));
    console.log(chalk.gray('   위의 문제를 해결한 후 다시 시도해주세요.\n'));
    return;
  }

  // 4. 수동 조치 필요하면 안내
  if (projectStatus.nextAction?.action === 'manual') {
    console.log(chalk.yellow('⚠️  시작 전 수동 조치가 필요합니다.'));
    console.log(chalk.gray(`   ${projectStatus.nextAction.reason}\n`));
    return;
  }

  // 5. 사용자 확인
  const { proceed } = await inquirer.prompt([{
    type: 'list',
    name: 'proceed',
    message: '어떻게 진행할까요?',
    choices: [
      { name: '🚀 가이드 모드 시작', value: 'guided' },
      { name: `▶️  ${projectStatus.nextAction?.role || 'developer'} 1회만 실행`, value: 'once' },
      { name: '❌ 취소', value: 'cancel' }
    ]
  }]);

  if (proceed === 'cancel') {
    console.log(chalk.gray('\n취소되었습니다.'));
    return;
  }

  const { getToolForRole } = await import('../utils/config.js');

  if (proceed === 'once') {
    // 1회만 실행
    const role = projectStatus.nextAction?.role || 'developer';
    const tool = getToolForRole(role);

    console.log(chalk.cyan(`\n🚀 ${role} (${tool}) 실행`));
    await executeAgentSession(role, tool, { headless: false });
    console.log(chalk.green(`\n✓ ${role} 작업 완료`));
    return;
  }

  const managerTool = getToolForRole('manager');
  if (!isAutomationCapableTool(managerTool)) {
    console.log(chalk.yellow(`\n⚠️  Manager 도구(${managerTool})는 가이드 모드에서 출력 캡처가 불가능합니다.`));
    console.log(chalk.gray('   가이드 모드에서는 claude/gemini/codex를 사용해주세요.'));
    console.log(chalk.gray('   예: ada config set roles.manager claude\n'));
    return;
  }

  // 6. 가이드 모드 루프 시작
  console.log(chalk.cyan('\n🔄 가이드 루프를 시작합니다.'));
  console.log(chalk.gray('   (종료하려면 Ctrl+C를 누르세요)\n'));

  // 상태 관리를 위한 변수들
  let consecutiveErrors = 0;          // 연속 에러 카운트
  const ERROR_THRESHOLD = 5;          // 최대 허용 연속 에러
  
  let lastAction = null;              // 직전 수행한 액션
  let repetitionCount = 0;            // 반복 횟수
  const REPETITION_LIMIT = 3;         // 최대 허용 반복 횟수 (회로 차단기)
  let safeMode = false;               // 안전 모드 여부

  // 무한 루프
  while (true) {
    try {
      if (safeMode) {
        const { resume } = await inquirer.prompt([{
          type: 'confirm',
          name: 'resume',
          message: '안전 모드입니다. 다시 시작할까요?',
          default: false
        }]);

        if (!resume) {
          console.log(chalk.gray('안전 모드를 유지합니다. 30초 후 다시 확인합니다.'));
          await wait(30000);
          continue;
        }

        console.log(chalk.green('재개합니다.'));
        safeMode = false;
      }

      // 0. 상태 동기화 (Task 파일 → meta.md)
      const workspace = getWorkspaceDir();
      const sprintsDir = path.join(workspace, 'artifacts', 'sprints');
      await syncSprint(sprintsDir, true);

      // 1. 현재 상태 및 활성 세션 수집
      const status = readStatus();
      const activeSessions = getActiveSessions();
      
      const context = {
        phase: status.currentPhase,
        activeSessions: status.activeSessions,
        pendingQuestions: status.pendingQuestions,
        recentFiles: [] // TODO: 파일 감시 연동
      };

      // 2. Manager에게 자문
      console.log(chalk.gray('\n🤔 Manager에게 다음 행동을 물어보는 중...'));
      let decision = await consultManager(context);

      // 2-1. 판단 실패 처리
      if (!decision) {
        console.log(chalk.yellow('   (판단 보류/실패 - 5초 후 재시도)'));
        await wait(5000);
        continue;
      }

      // [변경] 사용자 승인 단계 추가 (Human-in-the-loop)
      // ask_user가 아닌 경우(실행/대기)에만 사용자에게 확인
      if (decision.action === 'run_agent' || decision.action === 'wait') {
        console.log(chalk.cyan(`\n🤖 Manager의 제안:`));
        console.log(`   ${chalk.bold('Action')}: ${decision.action}`);
        if (decision.role) console.log(`   ${chalk.bold('Role')}:   ${decision.role}`);
        console.log(`   ${chalk.bold('Reason')}: ${decision.reason}`);

        const { userChoice } = await inquirer.prompt([{
          type: 'list',
          name: 'userChoice',
          message: 'Manager의 제안을 승인하시겠습니까?',
          choices: [
            { name: '✅ 승인 (진행)', value: 'approve' },
            { name: '✏️  변경 (직접 선택)', value: 'modify' },
            { name: '⏸️  대기 (건너뛰기)', value: 'skip' },
            { name: '❌ 종료', value: 'exit' }
          ]
        }]);

        if (userChoice === 'exit') {
          console.log(chalk.gray('오케스트레이션을 종료합니다.'));
          process.exit(0);
        } else if (userChoice === 'skip') {
          console.log(chalk.gray('   제안을 건너뛰고 5초 후 다시 분석합니다.'));
          await wait(5000);
          continue;
        } else if (userChoice === 'modify') {
          const { newRole } = await inquirer.prompt([{
            type: 'list',
            name: 'newRole',
            message: '실행할 역할을 선택하세요:',
            choices: ['planner', 'developer', 'reviewer', 'documenter', 'qa', 'improver', 'wait']
          }]);

          if (newRole === 'wait') {
            decision = { action: 'wait', reason: '사용자 요청으로 대기' };
          } else {
            decision = { action: 'run_agent', role: newRole, reason: '사용자 수동 선택' };
          }
        }
      }

      // 3. 회로 차단기 (Circuit Breaker) 점검
      // 동일한 역할 실행이 계속 반복되는지 확인
      const isSameAction = lastAction && 
                           lastAction.action === decision.action && 
                           lastAction.role === decision.role;

      if (isSameAction) {
        repetitionCount++;
      } else {
        repetitionCount = 0;
      }

      if (repetitionCount >= REPETITION_LIMIT) {
        console.log(chalk.red('\n🚫 [Circuit Breaker] 무한 루프 감지됨'));
        console.log(chalk.white(`   동일한 작업(${decision.role})이 ${repetitionCount}회 반복되었습니다.`));
        console.log(chalk.yellow('   사용자의 확인이 필요합니다.'));

        // 사용자 개입 요청
        const { resume } = await inquirer.prompt([{
          type: 'confirm',
          name: 'resume',
          message: '상태를 확인하셨나요? 다시 자동화를 시작할까요?',
          default: true
        }]);

        if (!resume) {
          console.log(chalk.gray('오케스트레이션을 종료합니다.'));
          process.exit(0);
        }

        // 카운터 리셋 후 계속
        repetitionCount = 0;
        lastAction = null;
      }

      // 상태 업데이트
      lastAction = decision;
      consecutiveErrors = 0; // 정상 진행 시 에러 카운트 초기화

      console.log(chalk.green(`\n💡 Manager의 결정: ${decision.action}`));
      console.log(chalk.white(`   이유: ${decision.reason}`));

      // 4. 결정 실행 및 동기화
      if (decision.action === 'run_agent') {
        const role = decision.role;

        // 4-1. 세션 락킹 (이미 실행 중인지 확인)
        const isRunning = activeSessions.some(s => s.role === role && s.status === 'active');
        if (isRunning) {
          console.log(chalk.yellow(`⚠️  ${role} 역할이 이미 다른 세션에서 실행 중입니다.`));
          console.log(chalk.gray('   중복 실행을 방지하기 위해 대기합니다.'));
          await wait(10000);
          continue;
        }

        const tool = getToolForRole(role);
        
        console.log(chalk.cyan(`\n🚀 ${role} (${tool}) 실행 시작`));
        
        // 실제 에이전트 실행
        await executeAgentSession(role, tool, { headless: false, exitOnSignal: false });
        
        console.log(chalk.green(`✓ ${role} 작업 완료`));
        
      } else if (decision.action === 'wait') {
        console.log(chalk.gray('   (대기 중... 10초)'));
        await wait(10000);
      } else if (decision.action === 'ask_user') {
        console.log(chalk.yellow(`\n❓ Manager의 질문: ${decision.reason}`));
        // 사용자에게 알림만 주고 대기 (실제 입력은 별도 구현 필요)
        await wait(5000);
      }

      // 루프 간 잠시 휴식
      await wait(2000);

    } catch (err) {
      consecutiveErrors++;
      console.error(chalk.red(`⚠️ 오류 발생 (${consecutiveErrors}/${ERROR_THRESHOLD}): ${err.message}`));

      if (consecutiveErrors >= ERROR_THRESHOLD) {
        console.error(chalk.bgRed.white.bold('\n🔥 치명적 오류: 연속된 에러로 인해 안전 모드로 전환합니다.'));
        safeMode = true;
        consecutiveErrors = 0;
        repetitionCount = 0;
        lastAction = null;
        await wait(2000);
        continue;
      }

      console.log(chalk.gray('   5초 후 재시도합니다...'));
      await wait(5000);
    }
  }
}

/**
 * 시나리오 1: 스프린트 루틴
 */
async function runSprintRoutine() {
  console.log(chalk.yellow('\n[시나리오] 스프린트 루틴 시작\n'));
  await runStep('Planner', 'planner', 'plan.md 및 백로그 정비');
  await runStep('Developer', 'developer', 'Task 구현');
  await runStep('Reviewer', 'reviewer', '코드 및 설계 검토');
  console.log(chalk.green('\n✅ 스프린트 루틴이 완료되었습니다.'));
}

/**
 * 시나리오 2: 기능 구현
 */
async function runFeatureImplementation() {
  console.log(chalk.yellow('\n[시나리오] 기능 구현 시작\n'));
  await runStep('Developer', 'developer', '기능 구현');
  await runStep('Reviewer', 'reviewer', '구현 검토');
  console.log(chalk.green('\n✅ 기능 구현 사이클이 완료되었습니다.'));
}

/**
 * 시나리오 3: QA 패스
 */
async function runQAPass() {
  console.log(chalk.yellow('\n[시나리오] QA 패스 시작\n'));
  await runStep('QA', 'qa', '테스트 수행');
  
  const { continueDev } = await inquirer.prompt([{
    type: 'confirm',
    name: 'continueDev',
    message: '버그가 발견되어 Developer 수정이 필요한가요?',
    default: false
  }]);

  if (continueDev) {
    await runStep('Developer', 'developer', '버그 수정');
    await runStep('QA', 'qa', '재테스트');
  }
  console.log(chalk.green('\n✅ QA 패스가 완료되었습니다.'));
}

/**
 * 시나리오 4: 문서화
 */
async function runDocumentation() {
  console.log(chalk.yellow('\n[시나리오] 문서화 시작\n'));
  await runStep('Documenter', 'documenter', '산출물 최신화');
  console.log(chalk.green('\n✅ 문서화가 완료되었습니다.'));
}

/**
 * 개별 단계 실행 헬퍼
 */
async function runStep(label, role, description) {
  console.log(chalk.cyan(`\n🔹 [Step] ${label} 시작`));
  console.log(chalk.gray(`   목표: ${description}`));

  const { getToolForRole } = await import('../utils/config.js');
  const tool = getToolForRole(role);

  console.log(chalk.gray(`   도구: ${tool} (자동 선택됨)`));
  await executeAgentSession(role, tool, { headless: false });
  console.log(chalk.green(`✓ ${label} 단계 완료`));
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isAutomationCapableTool(tool) {
  return tool === 'claude' || tool === 'gemini' || tool === 'codex';
}

/**
 * 문자열을 지정된 길이로 자르고 말줄임표 추가
 * @param {string} str - 원본 문자열
 * @param {number} maxLength - 최대 길이
 * @returns {string}
 */
function truncate(str, maxLength = 30) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + '…';
}
