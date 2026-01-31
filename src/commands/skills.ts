import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getWorkspaceDir, isWorkspaceSetup } from '../utils/files.js';

/**
 * 스킬 명령어
 */
export async function skills(action: string, ...args: string[]): Promise<void> {
  // Workspace 확인
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 작업공간이 세팅되지 않았습니다.'));
    console.log(chalk.gray('먼저 ada setup을 실행하세요.'));
    process.exit(1);
  }

  const workspace = getWorkspaceDir();
  const skillsDir = path.join(workspace, 'skills');

  switch (action) {
    case 'list': {
      if (!fs.existsSync(skillsDir)) {
        console.log(chalk.yellow('⚠️  skills 디렉토리가 없습니다.'));
        console.log(chalk.gray('커뮤니티에서 스킬을 다운로드하여 ai-dev-team/skills/ 디렉토리에 추가하세요.'));
        return;
      }

      const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
        .map(dirent => dirent.name);

      if (skillDirs.length === 0) {
        console.log(chalk.yellow('⚠️  스킬이 없습니다.'));
        console.log(chalk.gray('커뮤니티에서 스킬을 다운로드하여 ai-dev-team/skills/ 디렉토리에 추가하세요.'));
        console.log(chalk.gray('예: ai-dev-team/skills/spring-boot/SKILL.md'));
        return;
      }

      console.log(chalk.blue('━'.repeat(50)));
      console.log(chalk.bold('📚 사용 가능한 스킬'));
      console.log(chalk.blue('━'.repeat(50)));

      for (const skillName of skillDirs) {
        const skillPath = path.join(skillsDir, skillName, 'SKILL.md');

        if (fs.existsSync(skillPath)) {
          try {
            const content = fs.readFileSync(skillPath, 'utf-8');

            // YAML 프론트매터에서 description 추출
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            let description = '';

            if (frontmatterMatch) {
              const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/);
              if (descMatch) {
                description = descMatch[1].trim();
              }
            }

            console.log(`\n${chalk.cyan(skillName)}`);
            if (description) {
              console.log(`  ${chalk.gray(description)}`);
            }
            console.log(chalk.gray(`  경로: ${skillPath}`));
          } catch (err) {
            console.log(`\n${chalk.cyan(skillName)} ${chalk.red('(읽기 실패)')}`);
          }
        } else {
          console.log(`\n${chalk.cyan(skillName)} ${chalk.yellow('(SKILL.md 없음)')}`);
        }
      }

      console.log('');
      break;
    }

    case 'info': {
      const skillName = args[0];

      if (!skillName) {
        console.log(chalk.red('스킬 이름을 지정해주세요.'));
        console.log(chalk.gray('예시: ada skills info spring-boot'));
        process.exit(1);
      }

      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');

      if (!fs.existsSync(skillPath)) {
        console.log(chalk.red(`❌ 스킬을 찾을 수 없습니다: ${skillName}`));
        process.exit(1);
      }

      try {
        const content = fs.readFileSync(skillPath, 'utf-8');

        console.log(chalk.blue('━'.repeat(50)));
        console.log(chalk.bold(`📄 스킬: ${skillName}`));
        console.log(chalk.blue('━'.repeat(50)));
        console.log('');
        console.log(content);
      } catch (err) {
        console.log(chalk.red(`❌ 파일 읽기 실패: ${skillPath}`));
        process.exit(1);
      }
      break;
    }

    default:
      console.log(chalk.red(`알 수 없는 액션: ${action}`));
      console.log('');
      console.log(chalk.bold('사용 가능한 명령어:'));
      console.log(chalk.gray('  ada skills list           - 스킬 목록'));
      console.log(chalk.gray('  ada skills info <name>    - 스킬 상세 정보'));
      console.log('');
      console.log(chalk.bold('💡 스킬 추가 방법:'));
      console.log(chalk.gray('  커뮤니티에서 스킬을 다운로드하여 ai-dev-team/skills/ 디렉토리에 추가'));
      console.log(chalk.gray('  예: ai-dev-team/skills/spring-boot/SKILL.md'));
      process.exit(1);
  }
}
