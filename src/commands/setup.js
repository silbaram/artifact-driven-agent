import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getPackageRoot,
  getWorkspaceDir,
  getCurrentTemplateFile,
  getAvailableTemplates,
  copyDirMerge,
  getPackageVersion,
  writeVersion
} from '../utils/files.js';

export async function setup(template) {
  const templates = getAvailableTemplates();
  
  if (templates.length === 0) {
    console.log(chalk.red('❌ 사용 가능한 템플릿이 없습니다.'));
    process.exit(1);
  }

  // 템플릿 선택
  if (!template) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: '프로젝트 템플릿을 선택하세요:',
        choices: templates.map(t => ({
          name: getTemplateDescription(t),
          value: t
        }))
      }
    ]);
    template = answer.template;
  }

  // 별칭 처리
  const aliases = {
    'web': 'web-dev',
    'lib': 'library'
  };
  if (aliases[template]) {
    template = aliases[template];
  }

  // 템플릿 유효성 검사
  if (!templates.includes(template)) {
    console.log(chalk.red(`❌ 알 수 없는 템플릿: ${template}`));
    console.log(chalk.gray(`사용 가능: ${templates.join(', ')}`));
    console.log(chalk.gray(`별칭: web → web-dev, lib → library`));
    process.exit(1);
  }

  const packageRoot = getPackageRoot();
  const workspace = getWorkspaceDir();
  const coreDir = path.join(packageRoot, 'core');
  const templateDir = path.join(packageRoot, 'templates', template);

  console.log('');
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.cyan.bold(`📦 ${template} 템플릿으로 세팅 중...`));
  console.log(chalk.cyan('━'.repeat(50)));
  console.log('');

  // ai-dev-team 디렉토리 생성
  fs.ensureDirSync(path.join(workspace, 'roles'));
  fs.ensureDirSync(path.join(workspace, 'artifacts'));
  fs.ensureDirSync(path.join(workspace, 'rules'));
  fs.ensureDirSync(path.join(workspace, 'artifacts', 'backlog'));
  fs.ensureDirSync(path.join(workspace, 'artifacts', 'sprints'));
  fs.ensureDirSync(path.join(workspace, 'artifacts', 'features', '_template'));
  fs.ensureDirSync(path.join(workspace, 'artifacts', 'rfc'));
  fs.ensureDirSync(path.join(workspace, 'artifacts', 'improvement-reports'));

  // Core 복사
  console.log(chalk.gray('📁 Core 파일 복사 중...'));
  copyDirMerge(path.join(coreDir, 'roles'), path.join(workspace, 'roles'));
  copyDirMerge(path.join(coreDir, 'artifacts'), path.join(workspace, 'artifacts'));
  copyDirMerge(path.join(coreDir, 'rules'), path.join(workspace, 'rules'));

  // Template 복사 (머지)
  console.log(chalk.gray(`📁 ${template} 템플릿 복사 중...`));
  copyDirMerge(path.join(templateDir, 'roles'), path.join(workspace, 'roles'));
  copyDirMerge(path.join(templateDir, 'artifacts'), path.join(workspace, 'artifacts'));
  copyDirMerge(path.join(templateDir, 'rules'), path.join(workspace, 'rules'));

  // Feature 템플릿 복사
  const featureTemplateDir = path.join(packageRoot, 'ai-dev-team', 'artifacts', 'features', '_template');
  if (fs.existsSync(featureTemplateDir)) {
    copyDirMerge(featureTemplateDir, path.join(workspace, 'artifacts', 'features', '_template'));
  }

  // RFC 템플릿 복사
  const rfcTemplateFile = path.join(packageRoot, 'ai-dev-team', 'artifacts', 'rfc', 'RFC-0000-template.md');
  if (fs.existsSync(rfcTemplateFile)) {
    fs.copyFileSync(rfcTemplateFile, path.join(workspace, 'artifacts', 'rfc', 'RFC-0000-template.md'));
  }

  // Improvement Reports 템플릿 복사
  const improvementTemplateFile = path.join(packageRoot, 'ai-dev-team', 'artifacts', 'improvement-reports', 'IMP-0000-template.md');
  if (fs.existsSync(improvementTemplateFile)) {
    fs.copyFileSync(improvementTemplateFile, path.join(workspace, 'artifacts', 'improvement-reports', 'IMP-0000-template.md'));
  }

  // 현재 템플릿 저장
  fs.writeFileSync(getCurrentTemplateFile(), template);

  // 버전 정보 저장
  const packageVersion = getPackageVersion();
  const versionInfo = {
    packageVersion: packageVersion,
    workspaceVersion: packageVersion,
    template: template,
    lastUpgrade: new Date().toISOString()
  };
  writeVersion(versionInfo);

  // 결과 출력
  console.log('');
  console.log(chalk.green('✅ 세팅 완료!'));
  console.log('');
  
  // 세팅된 파일 목록
  const roles = fs.readdirSync(path.join(workspace, 'roles')).filter(f => f.endsWith('.md'));
  const artifacts = fs.readdirSync(path.join(workspace, 'artifacts')).filter(f => f.endsWith('.md'));
  const rules = fs.readdirSync(path.join(workspace, 'rules')).filter(f => f.endsWith('.md'));

  console.log(chalk.white.bold('📂 ai-dev-team/'));
  console.log(chalk.gray(`   roles/     ${roles.length}개 역할`));
  console.log(chalk.gray(`   artifacts/ ${artifacts.length}개 산출물`));
  console.log(chalk.gray(`   rules/     ${rules.length}개 규칙`));
  console.log('');
  console.log(chalk.cyan('다음 단계:'));
  console.log(chalk.gray('  ada status          # 상태 확인'));
  console.log(chalk.gray('  ada planner claude  # AI 에이전트 실행'));
  console.log('');
}

function getTemplateDescription(template) {
  const descriptions = {
    'web-dev': 'web-dev    - 웹 서비스 개발 (Backend + Frontend)',
    'library': 'library    - 라이브러리/SDK 개발',
    'game': 'game       - 게임 개발',
    'cli': 'cli        - CLI 도구 개발'
  };
  return descriptions[template] || template;
}
