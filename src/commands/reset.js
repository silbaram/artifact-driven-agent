import fs from 'fs-extra';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getWorkspaceDir, isWorkspaceSetup } from '../utils/files.js';

export async function reset(options = {}) {
  const workspace = getWorkspaceDir();

  if (!isWorkspaceSetup()) {
    console.log(chalk.yellow('⚠️  이미 초기화 상태입니다.'));
    return;
  }

  // 확인
  if (!options.force) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('ai-dev-team 디렉토리를 초기화하시겠습니까? (모든 작업 내용이 삭제됩니다)'),
        default: false
      }
    ]);

    if (!answer.confirm) {
      console.log(chalk.gray('취소되었습니다.'));
      return;
    }
  }

  console.log('');
  console.log(chalk.yellow('🗑️  초기화 중...'));

  // roles, artifacts, rules 내용 삭제 (.gitkeep 유지)
  const dirs = ['roles', 'artifacts', 'rules'];
  
  for (const dir of dirs) {
    const dirPath = `${workspace}/${dir}`;
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.removeSync(`${dirPath}/${file}`);
        }
      }
    }
  }

  // .current-template 삭제
  const templateFile = `${workspace}/.current-template`;
  if (fs.existsSync(templateFile)) {
    fs.removeSync(templateFile);
  }

  // .sessions 삭제
  const sessionsDir = `${workspace}/.sessions`;
  if (fs.existsSync(sessionsDir)) {
    fs.removeSync(sessionsDir);
  }

  console.log(chalk.green('✅ 초기화 완료'));
  console.log('');
  console.log(chalk.gray('다시 세팅하려면:'));
  console.log(chalk.white('  ada setup'));
  console.log('');
}
