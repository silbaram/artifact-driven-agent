import chalk from 'chalk';
import inquirer from 'inquirer';
import { executeAgentSession } from './run.js';
import { getAvailableRoles } from '../utils/files.js';
import { consultManager } from '../orchestrator/consultant.js';
import { readStatus, getActiveSessions } from '../utils/sessionState.js';

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
        { name: '🤖 완전 자동화 모드 (Manager AI가 판단)', value: 'auto' },
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
      case 'auto':
        await runAutoMode();
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
 * 시나리오 0: 완전 자동화 (Auto Mode)
 * Manager AI가 상황을 판단하여 에이전트를 투입
 * + 개선: 회로 차단기, 에러 임계값, 세션 락킹
 */
async function runAutoMode() {
  console.log(chalk.cyan('\n🤖 완전 자동화 모드를 시작합니다.'));
  console.log(chalk.gray('   파일 변경을 감시하고, Manager AI에게 주기적으로 자문을 구합니다.'));
  console.log(chalk.gray('   (종료하려면 Ctrl+C를 누르세요)\n'));

  // 상태 관리를 위한 변수들
  let consecutiveErrors = 0;          // 연속 에러 카운트
  const ERROR_THRESHOLD = 5;          // 최대 허용 연속 에러
  
  let lastAction = null;              // 직전 수행한 액션
  let repetitionCount = 0;            // 반복 횟수
  const REPETITION_LIMIT = 3;         // 최대 허용 반복 횟수 (회로 차단기)

  // 무한 루프
  while (true) {
    try {
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
      const decision = await consultManager(context);

      // 2-1. 판단 실패 처리
      if (!decision) {
        console.log(chalk.yellow('   (판단 보류/실패 - 5초 후 재시도)'));
        await wait(5000);
        continue;
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

        const { getToolForRole } = await import('../utils/config.js');
        const tool = getToolForRole(role);
        
        console.log(chalk.cyan(`\n🚀 ${role} (${tool}) 실행 시작`));
        
        // 실제 에이전트 실행
        await executeAgentSession(role, tool, { headless: false });
        
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
        console.error(chalk.bgRed.white.bold('\n🔥 치명적 오류: 연속된 에러로 인해 시스템을 종료합니다.'));
        process.exit(1);
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
