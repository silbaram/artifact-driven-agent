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
    case 'create': {
      const skillName = args[0];

      if (!skillName) {
        console.log(chalk.red('스킬 이름을 지정해주세요.'));
        console.log(chalk.gray('예시: ada skills create spring-boot'));
        process.exit(1);
      }

      // 스킬 이름 검증 (소문자, 숫자, 하이픈만)
      if (!/^[a-z0-9-]+$/.test(skillName)) {
        console.log(chalk.red('스킬 이름은 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.'));
        process.exit(1);
      }

      const skillPath = path.join(skillsDir, skillName);

      if (fs.existsSync(skillPath)) {
        console.log(chalk.yellow(`⚠️  스킬이 이미 존재합니다: ${skillName}`));
        process.exit(1);
      }

      // 스킬 디렉토리 생성
      fs.ensureDirSync(skillPath);

      // SKILL.md 템플릿 생성
      const template = `---
name: ${skillName}
description: ${skillName} 관련 전문 지식과 패턴
---

# ${skillName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

이 스킬은 ${skillName} 관련 작업 시 적용됩니다.

## 주요 규칙

1. **규칙 1**: 설명
2. **규칙 2**: 설명
3. **규칙 3**: 설명

## 패턴 및 예시

### 패턴 1

\`\`\`
// 예시 코드
\`\`\`

### 패턴 2

\`\`\`
// 예시 코드
\`\`\`

## 참고 사항

- 추가 설명
- 주의사항

## 추가 리소스

필요 시 이 디렉토리에 추가 파일을 포함할 수 있습니다:
- examples/ - 예시 코드
- references/ - 참조 문서
- scripts/ - 유틸리티 스크립트
`;

      fs.writeFileSync(path.join(skillPath, 'SKILL.md'), template);

      console.log(chalk.green(`✓ 스킬 생성 완료: ${skillName}`));
      console.log(chalk.gray(`\n편집: ${path.join(skillPath, 'SKILL.md')}`));
      console.log(chalk.gray(`역할에 추가: ada config set-skills <role> ${skillName}`));
      break;
    }

    case 'list': {
      if (!fs.existsSync(skillsDir)) {
        console.log(chalk.yellow('⚠️  skills 디렉토리가 없습니다.'));
        console.log(chalk.gray('스킬 생성: ada skills create <name>'));
        return;
      }

      const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
        .map(dirent => dirent.name);

      if (skillDirs.length === 0) {
        console.log(chalk.yellow('⚠️  생성된 스킬이 없습니다.'));
        console.log(chalk.gray('스킬 생성: ada skills create <name>'));
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
      console.log(chalk.gray('  ada skills create <name>  - 새 스킬 생성'));
      console.log(chalk.gray('  ada skills list           - 스킬 목록'));
      console.log(chalk.gray('  ada skills info <name>    - 스킬 상세 정보'));
      process.exit(1);
  }
}
