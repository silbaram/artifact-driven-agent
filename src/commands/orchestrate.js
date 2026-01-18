import chalk from 'chalk';
import inquirer from 'inquirer';
import { executeAgentSession } from './run.js';
import { getAvailableRoles } from '../utils/files.js';
import { consultManager } from '../orchestrator/consultant.js';
import { readStatus } from '../utils/sessionState.js';

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
 */
async function runAutoMode() {
  console.log(chalk.cyan('\n🤖 완전 자동화 모드를 시작합니다.'));
  console.log(chalk.gray('   파일 변경을 감시하고, Manager AI에게 주기적으로 자문을 구합니다.'));
  console.log(chalk.gray('   (종료하려면 Ctrl+C를 누르세요)\n'));

  // 무한 루프
  while (true) {
    try {
      // 1. 현재 상태 수집
      const status = readStatus();
      const context = {
        phase: status.currentPhase,
        activeSessions: status.activeSessions,
        pendingQuestions: status.pendingQuestions,
        recentFiles: [] // TODO: 최근 변경 파일 감지 로직 추가 필요
      };

      // 2. Manager에게 자문
      console.log(chalk.gray('\n🤔 Manager에게 다음 행동을 물어보는 중...'));
      const decision = await consultManager(context);

      if (!decision) {
        console.log(chalk.yellow('   (판단 보류/실패 - 5초 후 재시도)'));
        await wait(5000);
        continue;
      }

      console.log(chalk.green(`\n💡 Manager의 결정: ${decision.action}`));
      console.log(chalk.white(`   이유: ${decision.reason}`));

      // 3. 결정 실행
      if (decision.action === 'run_agent') {
        const role = decision.role;
        // 동적 임포트로 순환 참조 방지
        const { getToolForRole } = await import('../utils/config.js');
        const tool = getToolForRole(role);
        
        console.log(chalk.cyan(`\n🚀 ${role} (${tool}) 실행 시작`));
        // 실제 에이전트 실행 시에는 화면 출력 (headless: false)
        await executeAgentSession(role, tool, { headless: false });
        console.log(chalk.green(`✓ ${role} 작업 완료`));
        
      } else if (decision.action === 'wait') {
        console.log(chalk.gray('   (대기 중... 10초)'));
        await wait(10000);
      } else if (decision.action === 'ask_user') {
        console.log(chalk.yellow(`\n❓ Manager의 질문: ${decision.reason}`));
        // 사용자 응답을 받을 방법이 현재 구조상 마땅치 않으므로 로그만 출력
        // 실제로는 여기서 inquirer로 입력을 받아 .ada-status.json에 기록하는 것이 좋음
        await wait(5000);
      }

      // 루프 간 잠시 휴식
      await wait(2000);

    } catch (err) {
      console.error(chalk.red(`⚠️ 오류 발생: ${err.message}`));
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