import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import {
  getWorkspaceDir,
  getCurrentTemplate,
  isWorkspaceSetup,
  getPackageVersion,
  readVersion,
  compareVersions
} from '../utils/files.js';

export async function status() {
  const workspace = getWorkspaceDir();
  
  console.log('');
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.cyan.bold('📊 현재 상태'));
  console.log(chalk.cyan('━'.repeat(50)));
  console.log('');

  if (!isWorkspaceSetup()) {
    console.log(chalk.yellow('⚠️  세팅되지 않음'));
    console.log('');
    console.log(chalk.gray('세팅하려면:'));
    console.log(chalk.white('  ada setup'));
    console.log('');
    return;
  }

  const template = getCurrentTemplate();
  const rolesDir = path.join(workspace, 'roles');
  const artifactsDir = path.join(workspace, 'artifacts');
  const rulesDir = path.join(workspace, 'rules');

  // 버전 정보 확인
  const packageVersion = getPackageVersion();
  const versionInfo = readVersion();
  const workspaceVersion = versionInfo ? (versionInfo.workspaceVersion || versionInfo.packageVersion) : null;

  console.log(chalk.white.bold('버전:'));
  console.log(chalk.gray(`  패키지: ${packageVersion}`));
  if (workspaceVersion) {
    console.log(chalk.gray(`  작업공간: ${workspaceVersion}`));

    // 버전 비교
    const versionDiff = compareVersions(packageVersion, workspaceVersion);
    if (versionDiff > 0) {
      console.log('');
      console.log(chalk.yellow('⚠️  새 버전이 있습니다!'));
      console.log(chalk.gray(`   현재: ${workspaceVersion} → 최신: ${packageVersion}`));
      console.log(chalk.gray('   업그레이드하려면: ada upgrade'));
    } else if (versionDiff < 0) {
      console.log('');
      console.log(chalk.yellow('⚠️  작업공간 버전이 패키지 버전보다 높습니다.'));
      console.log(chalk.gray('   개발 버전이거나 패키지 다운그레이드됨'));
    }
  } else {
    console.log(chalk.gray(`  작업공간: 버전 정보 없음`));
    console.log('');
    console.log(chalk.yellow('⚠️  이전 버전에서 생성된 작업공간입니다.'));
    console.log(chalk.gray('   업그레이드 권장: ada upgrade'));
  }
  console.log('');

  // 템플릿 정보
  console.log(chalk.white.bold('템플릿:'), chalk.green(template || '알 수 없음'));
  console.log('');

  // 역할 목록
  const roles = fs.readdirSync(rolesDir).filter(f => f.endsWith('.md'));
  console.log(chalk.white.bold('역할 (Roles):'));
  roles.forEach(r => {
    console.log(chalk.gray(`  • ${r.replace('.md', '')}`));
  });
  console.log('');

  // 산출물 목록
  const artifacts = fs.readdirSync(artifactsDir).filter(f => f.endsWith('.md'));
  console.log(chalk.white.bold('산출물 (Artifacts):'));
  artifacts.forEach(a => {
    const filePath = path.join(artifactsDir, a);
    const content = fs.readFileSync(filePath, 'utf-8');
    const status = getDocumentStatus(content);
    console.log(chalk.gray(`  • ${a.replace('.md', '')} ${status}`));
  });
  console.log('');

  // 규칙 목록
  const rules = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'));
  console.log(chalk.white.bold('규칙 (Rules):'));
  rules.forEach(r => {
    console.log(chalk.gray(`  • ${r.replace('.md', '')}`));
  });
  console.log('');
}

function getDocumentStatus(content) {
  if (content.includes('Frozen') || content.includes('🔒')) {
    return chalk.blue('[Frozen]');
  }
  if (content.includes('Confirmed') || content.includes('확정')) {
    return chalk.green('[Confirmed]');
  }
  if (content.includes('Draft') || content.includes('초안')) {
    return chalk.yellow('[Draft]');
  }
  return '';
}
