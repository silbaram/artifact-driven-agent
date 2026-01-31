import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  getPackageRoot,
  getWorkspaceDir,
  getBackupDir,
  getPackageVersion,
  readVersion,
  writeVersion,
  compareVersions,
  getCurrentTemplate,
  isWorkspaceSetup,
  copyDirMerge,
} from '../utils/files.js';
import type { VersionInfo } from '../types/index.js';

export interface UpgradeOptions {
  force?: boolean;
  dryRun?: boolean;
  rollback?: boolean;
}

interface Change {
  type: 'ADD' | 'UPDATE';
  category: string;
  file: string;
}

export async function upgrade(options: UpgradeOptions = {}): Promise<void> {
  // 작업공간 확인
  if (!isWorkspaceSetup()) {
    console.log(chalk.red('❌ 작업공간이 세팅되어 있지 않습니다.'));
    console.log(chalk.gray('   ada setup 명령어로 먼저 세팅하세요.'));
    process.exit(1);
  }

  const packageVersion = getPackageVersion();
  let workspaceVersionInfo = readVersion();
  const currentTemplate = getCurrentTemplate();

  if (!workspaceVersionInfo) {
    console.log(chalk.yellow('⚠️  작업공간에 버전 정보가 없습니다.'));
    console.log(chalk.gray('   이전 버전에서 생성된 작업공간으로 추정됩니다.'));
    console.log('');

    if (!options.force) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: '업그레이드를 계속하시겠습니까?',
          default: true,
        },
      ]);

      if (!answer.continue) {
        console.log(chalk.gray('취소되었습니다.'));
        process.exit(0);
      }
    }

    // 버전 정보 초기화
    workspaceVersionInfo = {
      packageVersion: '0.0.0',
      workspaceVersion: '0.0.0',
      template: currentTemplate || '',
      lastUpgrade: '',
    };
  }

  const workspaceVersion =
    workspaceVersionInfo.workspaceVersion || workspaceVersionInfo.packageVersion;

  console.log('');
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.cyan.bold('🔄 ada 업그레이드'));
  console.log(chalk.cyan('━'.repeat(50)));
  console.log('');
  console.log(chalk.gray(`현재 작업공간 버전: ${workspaceVersion}`));
  console.log(chalk.gray(`최신 패키지 버전:   ${packageVersion}`));
  console.log('');

  // 버전 비교
  const versionDiff = compareVersions(packageVersion, workspaceVersion);

  if (versionDiff === 0) {
    console.log(chalk.green('✅ 이미 최신 버전입니다.'));
    process.exit(0);
  }

  if (versionDiff < 0) {
    console.log(chalk.yellow('⚠️  작업공간 버전이 패키지 버전보다 높습니다.'));
    console.log(
      chalk.gray('   개발 중이거나 다운그레이드된 패키지일 수 있습니다.')
    );

    if (!options.force) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: '그래도 업그레이드하시겠습니까?',
          default: false,
        },
      ]);

      if (!answer.continue) {
        console.log(chalk.gray('취소되었습니다.'));
        process.exit(0);
      }
    }
  }

  // 롤백 처리
  if (options.rollback) {
    await handleRollback();
    return;
  }

  // Dry-run 모드
  if (options.dryRun) {
    await performDryRun(workspaceVersion, packageVersion);
    return;
  }

  // 실제 업그레이드
  await performUpgrade(workspaceVersion, packageVersion);
}

/**
 * 롤백 처리
 */
async function handleRollback(): Promise<void> {
  const backupDir = getBackupDir();

  if (!fs.existsSync(backupDir)) {
    console.log(chalk.red('❌ 백업이 없습니다.'));
    process.exit(1);
  }

  const backups = fs
    .readdirSync(backupDir)
    .filter((d) => d.startsWith('upgrade-'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.log(chalk.red('❌ 백업이 없습니다.'));
    process.exit(1);
  }

  console.log(chalk.cyan('사용 가능한 백업:'));
  backups.forEach((backup, index) => {
    const backupPath = path.join(backupDir, backup);
    const versionFile = path.join(backupPath, '.ada-version');
    let versionInfo = 'unknown';
    if (fs.existsSync(versionFile)) {
      const info = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
      versionInfo = info.workspaceVersion || info.packageVersion;
    }
    console.log(chalk.gray(`  ${index + 1}. ${backup} (v${versionInfo})`));
  });

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'backup',
      message: '복원할 백업을 선택하세요:',
      choices: backups.map((b, i) => ({ name: `${i + 1}. ${b}`, value: b })),
    },
  ]);

  const selectedBackup = path.join(backupDir, answer.backup);
  const workspace = getWorkspaceDir();

  console.log('');
  console.log(chalk.yellow('⚠️  현재 작업공간을 백업으로 덮어씁니다.'));

  const confirm = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '계속하시겠습니까?',
      default: false,
    },
  ]);

  if (!confirm.confirm) {
    console.log(chalk.gray('취소되었습니다.'));
    process.exit(0);
  }

  // 롤백 실행
  console.log(chalk.gray('복원 중...'));

  // roles, rules 복원
  ['roles', 'rules'].forEach((dir) => {
    const backupPath = path.join(selectedBackup, dir);
    const workspacePath = path.join(workspace, dir);

    if (fs.existsSync(backupPath)) {
      fs.removeSync(workspacePath);
      fs.copySync(backupPath, workspacePath);
    }
  });

  // 버전 정보 복원
  const backupVersionFile = path.join(selectedBackup, '.ada-version');
  if (fs.existsSync(backupVersionFile)) {
    fs.copyFileSync(backupVersionFile, path.join(workspace, '.ada-version'));
  }

  console.log('');
  console.log(chalk.green('✅ 롤백 완료!'));
}

/**
 * Dry-run 수행
 */
async function performDryRun(
  workspaceVersion: string,
  packageVersion: string
): Promise<void> {
  const packageRoot = getPackageRoot();
  const workspace = getWorkspaceDir();
  const template = getCurrentTemplate();

  console.log(chalk.cyan('🔍 변경 사항 미리보기 (실제 변경 없음)'));
  console.log('');

  const changes: Change[] = [];

  // roles 디렉토리 비교
  const coreRoles = path.join(packageRoot, 'core', 'roles');
  const templateRoles = path.join(packageRoot, 'templates', template || '', 'roles');
  const workspaceRoles = path.join(workspace, 'roles');

  if (fs.existsSync(coreRoles)) {
    const coreFiles = fs.readdirSync(coreRoles).filter((f) => f.endsWith('.md'));
    coreFiles.forEach((file) => {
      const workspaceFile = path.join(workspaceRoles, file);
      if (fs.existsSync(workspaceFile)) {
        changes.push({ type: 'UPDATE', category: 'roles', file });
      } else {
        changes.push({ type: 'ADD', category: 'roles', file });
      }
    });
  }

  if (fs.existsSync(templateRoles)) {
    const templateFiles = fs
      .readdirSync(templateRoles)
      .filter((f) => f.endsWith('.md'));
    templateFiles.forEach((file) => {
      const workspaceFile = path.join(workspaceRoles, file);
      if (fs.existsSync(workspaceFile)) {
        changes.push({ type: 'UPDATE', category: 'roles', file });
      } else {
        changes.push({ type: 'ADD', category: 'roles', file });
      }
    });
  }

  // rules 디렉토리 비교
  const coreRules = path.join(packageRoot, 'core', 'rules');
  const templateRules = path.join(packageRoot, 'templates', template || '', 'rules');
  const workspaceRules = path.join(workspace, 'rules');

  if (fs.existsSync(coreRules)) {
    const coreFiles = fs.readdirSync(coreRules).filter((f) => f.endsWith('.md'));
    coreFiles.forEach((file) => {
      const workspaceFile = path.join(workspaceRules, file);
      if (fs.existsSync(workspaceFile)) {
        changes.push({ type: 'UPDATE', category: 'rules', file });
      } else {
        changes.push({ type: 'ADD', category: 'rules', file });
      }
    });
  }

  if (fs.existsSync(templateRules)) {
    const templateFiles = fs
      .readdirSync(templateRules)
      .filter((f) => f.endsWith('.md'));
    templateFiles.forEach((file) => {
      const workspaceFile = path.join(workspaceRules, file);
      if (fs.existsSync(workspaceFile)) {
        changes.push({ type: 'UPDATE', category: 'rules', file });
      } else {
        changes.push({ type: 'ADD', category: 'rules', file });
      }
    });
  }

  // 중복 제거
  const uniqueChanges = Array.from(
    new Map(changes.map((c) => [`${c.category}/${c.file}`, c])).values()
  );

  if (uniqueChanges.length === 0) {
    console.log(chalk.gray('변경 사항이 없습니다.'));
    return;
  }

  console.log(chalk.white.bold('📋 변경될 파일:'));
  console.log('');

  const addedFiles = uniqueChanges.filter((c) => c.type === 'ADD');
  const updatedFiles = uniqueChanges.filter((c) => c.type === 'UPDATE');

  if (addedFiles.length > 0) {
    console.log(chalk.green('  추가될 파일:'));
    addedFiles.forEach((c) => {
      console.log(chalk.gray(`    + ${c.category}/${c.file}`));
    });
    console.log('');
  }

  if (updatedFiles.length > 0) {
    console.log(chalk.yellow('  업데이트될 파일:'));
    updatedFiles.forEach((c) => {
      console.log(chalk.gray(`    ↻ ${c.category}/${c.file}`));
    });
    console.log('');
  }

  console.log(chalk.gray(`총 ${uniqueChanges.length}개 파일이 변경됩니다.`));
  console.log('');
  console.log(chalk.cyan('실제 업그레이드를 실행하려면:'));
  console.log(chalk.gray('  ada upgrade'));
}

/**
 * 실제 업그레이드 수행
 */
async function performUpgrade(
  workspaceVersion: string,
  packageVersion: string
): Promise<void> {
  const packageRoot = getPackageRoot();
  const workspace = getWorkspaceDir();
  const template = getCurrentTemplate();

  // 백업 생성
  const backupId = `upgrade-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}`;
  const backupPath = path.join(getBackupDir(), backupId);

  console.log(chalk.gray('📦 백업 생성 중...'));
  fs.ensureDirSync(backupPath);

  // roles, rules 백업
  ['roles', 'rules'].forEach((dir) => {
    const srcPath = path.join(workspace, dir);
    const destPath = path.join(backupPath, dir);
    if (fs.existsSync(srcPath)) {
      fs.copySync(srcPath, destPath);
    }
  });

  // 버전 정보 백업
  const versionFile = path.join(workspace, '.ada-version');
  if (fs.existsSync(versionFile)) {
    fs.copyFileSync(versionFile, path.join(backupPath, '.ada-version'));
  }

  console.log(chalk.green(`✅ 백업 완료: ${backupId}`));
  console.log('');

  // 업그레이드 실행
  console.log(chalk.gray('🔄 업그레이드 중...'));

  try {
    // Core 파일 복사
    const coreRoles = path.join(packageRoot, 'core', 'roles');
    const coreRules = path.join(packageRoot, 'core', 'rules');

    if (fs.existsSync(coreRoles)) {
      copyDirMerge(coreRoles, path.join(workspace, 'roles'));
    }

    if (fs.existsSync(coreRules)) {
      copyDirMerge(coreRules, path.join(workspace, 'rules'));
    }

    // Template 파일 복사
    const templateRoles = path.join(packageRoot, 'templates', template || '', 'roles');
    const templateRules = path.join(packageRoot, 'templates', template || '', 'rules');
    const templateArtifacts = path.join(
      packageRoot,
      'templates',
      template || '',
      'artifacts'
    );

    if (fs.existsSync(templateRoles)) {
      copyDirMerge(templateRoles, path.join(workspace, 'roles'));
    }

    if (fs.existsSync(templateRules)) {
      copyDirMerge(templateRules, path.join(workspace, 'rules'));
    }

    // 템플릿 아티팩트 (사용자 데이터 아닌 것만)
    if (fs.existsSync(templateArtifacts)) {
      const artifactFiles = fs
        .readdirSync(templateArtifacts)
        .filter((f) => f.endsWith('.md'));
      artifactFiles.forEach((file) => {
        const srcFile = path.join(templateArtifacts, file);
        const destFile = path.join(workspace, 'artifacts', file);
        // 기존 사용자 데이터가 있으면 건너뜀
        if (!fs.existsSync(destFile)) {
          fs.copyFileSync(srcFile, destFile);
        }
      });
    }

    // 버전 정보 업데이트
    const newVersionInfo: VersionInfo = {
      packageVersion: packageVersion,
      workspaceVersion: packageVersion,
      template: template || '',
      lastUpgrade: new Date().toISOString(),
    };

    writeVersion(newVersionInfo);

    console.log('');
    console.log(chalk.green('✅ 업그레이드 완료!'));
    console.log('');
    console.log(chalk.gray(`${workspaceVersion} → ${packageVersion}`));
    console.log('');
    console.log(chalk.cyan('롤백이 필요한 경우:'));
    console.log(chalk.gray('  ada upgrade --rollback'));
    console.log('');
  } catch (error) {
    console.log('');
    console.log(chalk.red('❌ 업그레이드 중 오류 발생!'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));
    console.log('');
    console.log(chalk.yellow('백업에서 복원하려면:'));
    console.log(chalk.gray('  ada upgrade --rollback'));
    console.log('');
    process.exit(1);
  }
}
