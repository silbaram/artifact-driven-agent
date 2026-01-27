import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { getPackageRoot, getWorkspaceDir, isWorkspaceSetup } from '../utils/files.js';

/**
 * 문서 관리 명령어
 * @param {string} action - init / generate / publish / serve
 * @param {Object} options - 명령어 옵션
 */
export default async function docs(action, options = {}) {
  if (!isWorkspaceSetup() && action !== 'init') {
    console.log(chalk.red('❌ 워크스페이스가 설정되지 않았습니다.'));
    console.log(chalk.gray('   ada setup [template]을 먼저 실행하세요.'));
    process.exit(1);
  }

  switch (action) {
    case 'init':
      await initDocs(options);
      break;
    case 'generate':
      await generateDocs(options);
      break;
    case 'publish':
      await publishDocs(options);
      break;
    case 'serve':
      await serveDocs(options);
      break;
    default:
      console.log(chalk.red('❌ 알 수 없는 명령어입니다.'));
      console.log('');
      console.log(chalk.cyan('사용법:'));
      console.log(chalk.gray('  ada docs init              - 문서 구조 초기화'));
      console.log(chalk.gray('  ada docs generate          - 문서 생성/업데이트 (Documenter 실행)'));
      console.log(chalk.gray('  ada docs publish           - GitHub Pages 배포'));
      console.log(chalk.gray('  ada docs serve             - 로컬 문서 서버 실행'));
      process.exit(1);
  }
}

/**
 * 문서 구조 초기화
 */
async function initDocs(options) {
  const projectRoot = process.cwd();
  const docsDir = path.join(projectRoot, 'docs');

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('📚 문서 구조 초기화'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  // 이미 docs/ 디렉토리가 있는지 확인
  if (fs.existsSync(docsDir)) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'docs/ 디렉토리가 이미 존재합니다. 덮어쓰시겠습니까?',
        default: false
      }
    ]);

    if (!answer.overwrite) {
      console.log(chalk.yellow('⚠️  초기화가 취소되었습니다.'));
      return;
    }

    // 백업 생성
    const backupDir = path.join(projectRoot, `docs-backup-${Date.now()}`);
    fs.moveSync(docsDir, backupDir);
    console.log(chalk.yellow(`📦 기존 문서를 백업했습니다: ${path.basename(backupDir)}`));
    console.log('');
  }

  // 생성기 선택
  let generator = options.generator;
  if (!generator) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'generator',
        message: '문서 생성기를 선택하세요:',
        choices: [
          { name: 'MkDocs Material (추천) - 강력한 검색, 다국어, 버전 관리', value: 'mkdocs' },
          { name: 'Jekyll - GitHub Pages 기본 지원', value: 'jekyll' }
        ],
        default: 'mkdocs'
      }
    ]);
    generator = answer.generator;
  }

  // 템플릿 복사
  const packageRoot = getPackageRoot();
  const templateDir = path.join(packageRoot, 'core', 'docs-templates', generator);

  if (!fs.existsSync(templateDir)) {
    console.log(chalk.red(`❌ 템플릿을 찾을 수 없습니다: ${generator}`));
    process.exit(1);
  }

  console.log(chalk.gray(`📁 ${generator} 템플릿 복사 중...`));
  fs.copySync(templateDir, docsDir);

  // mkdocs.yml 또는 _config.yml 업데이트 (프로젝트 이름)
  let configFile;
  if (generator === 'mkdocs') {
    configFile = path.join(docsDir, 'mkdocs.yml');
  } else if (generator === 'jekyll') {
    configFile = path.join(docsDir, '_config.yml');
  }

  if (configFile && fs.existsSync(configFile)) {
    const packageJson = path.join(projectRoot, 'package.json');
    if (fs.existsSync(packageJson)) {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
      let config = fs.readFileSync(configFile, 'utf-8');

      if (generator === 'mkdocs') {
        config = config.replace('site_name: Project Documentation', `site_name: ${pkg.name || 'Project'} Documentation`);
        config = config.replace('site_description: Project documentation powered by ADA',
          `site_description: ${pkg.description || 'Project documentation'}`);

        if (pkg.repository && pkg.repository.url) {
          const repoUrl = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
          config = config.replace('repo_url: https://github.com/username/repo', `repo_url: ${repoUrl}`);

          const repoName = repoUrl.split('github.com/')[1];
          if (repoName) {
            config = config.replace('repo_name: username/repo', `repo_name: ${repoName}`);
          }
        }
      }

      fs.writeFileSync(configFile, config);
    }
  }

  // README.md 생성
  const readmeFile = path.join(docsDir, 'README.md');
  const readmeContent = `# Documentation

This directory contains the project documentation.

## Building Documentation

### MkDocs

\`\`\`bash
# 가상환경 생성 및 활성화 (권장)
python -m venv venv
venv\\Scripts\\activate        # Windows
source venv/bin/activate     # macOS/Linux

# MkDocs 설치
pip install mkdocs mkdocs-material

# Serve locally
mkdocs serve

# Build static site
mkdocs build
\`\`\`

### Deploy to GitHub Pages

\`\`\`bash
# Using CLI
ada docs publish

# Or manually
mkdocs gh-deploy
\`\`\`

## Documentation Structure

- \`getting-started/\` - Installation and quick start guides
- \`guides/\` - User and developer guides
- \`architecture/\` - Architecture documentation
- \`contributing/\` - Contributing guidelines
- \`changelog.md\` - Project changelog

## Updating Documentation

Use the Documenter role to update documentation:

\`\`\`bash
ada documenter claude
\`\`\`
`;

  fs.writeFileSync(readmeFile, readmeContent);

  console.log('');
  console.log(chalk.green('✅ 문서 구조 초기화 완료!'));
  console.log('');
  console.log(chalk.cyan('📂 생성된 구조:'));
  console.log(chalk.gray('  docs/'));
  console.log(chalk.gray('  ├── index.md                 # 홈페이지'));
  console.log(chalk.gray('  ├── getting-started/         # 시작 가이드'));
  console.log(chalk.gray('  ├── guides/                  # 사용 가이드'));
  console.log(chalk.gray('  ├── architecture/            # 아키텍처 문서'));
  console.log(chalk.gray('  ├── contributing/            # 기여 가이드'));
  console.log(chalk.gray(`  └── ${generator === 'mkdocs' ? 'mkdocs.yml' : '_config.yml'}           # 설정 파일`));
  console.log('');
  console.log(chalk.cyan('다음 단계:'));
  console.log(chalk.gray('  1. ada documenter claude     # 문서 내용 생성'));
  console.log(chalk.gray('  2. ada docs serve            # 로컬 미리보기'));
  console.log(chalk.gray('  3. ada docs publish          # GitHub Pages 배포'));
  console.log('');

  // .gitignore 업데이트
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    let gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('site/')) {
      gitignore += '\n# MkDocs build output\nsite/\n';
      fs.writeFileSync(gitignorePath, gitignore);
      console.log(chalk.gray('✓ .gitignore 업데이트됨'));
      console.log('');
    }
  }
}

/**
 * 문서 생성 (Documenter 역할 실행)
 */
async function generateDocs(options) {
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('📝 문서 생성'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  // Documenter 역할 실행을 위한 안내
  console.log(chalk.yellow('💡 문서를 생성하려면 Documenter 역할을 실행하세요:'));
  console.log('');
  console.log(chalk.cyan('  ada documenter claude'));
  console.log('');
  console.log(chalk.gray('Documenter가 다음 작업을 수행합니다:'));
  console.log(chalk.gray('  - 프로젝트 전체 분석'));
  console.log(chalk.gray('  - docs/ 문서 생성/업데이트'));
  console.log(chalk.gray('  - API 레퍼런스 자동 생성'));
  console.log(chalk.gray('  - Changelog 업데이트'));
  console.log('');
}

/**
 * GitHub Pages 배포
 */
async function publishDocs(options) {
  const projectRoot = process.cwd();
  const docsDir = path.join(projectRoot, 'docs');

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('🚀 GitHub Pages 배포'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  // docs/ 디렉토리 확인
  if (!fs.existsSync(docsDir)) {
    console.log(chalk.red('❌ docs/ 디렉토리가 없습니다.'));
    console.log(chalk.gray('   먼저 ada docs init을 실행하세요.'));
    process.exit(1);
  }

  // MkDocs인지 Jekyll인지 확인
  const isMkDocs = fs.existsSync(path.join(docsDir, 'mkdocs.yml'));
  const isJekyll = fs.existsSync(path.join(docsDir, '_config.yml'));

  if (isMkDocs) {
    console.log(chalk.cyan('📘 MkDocs 문서 배포'));
    
    // 배포 확인
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'GitHub Pages에 문서를 배포하시겠습니까? (gh-pages 브랜치에 푸시됩니다)',
        default: false
      }
    ]);

    if (!answer.confirm) {
      console.log(chalk.yellow('⚠️  배포가 취소되었습니다.'));
      return;
    }

    // 가상환경 내의 mkdocs 실행 파일 확인 (venv 및 .venv 지원)
    const venvCandidates = [
      path.join(projectRoot, 'venv', 'Scripts', 'mkdocs.exe'),    // Windows venv
      path.join(projectRoot, 'venv', 'bin', 'mkdocs'),            // Unix venv
      path.join(projectRoot, '.venv', 'Scripts', 'mkdocs.exe'),   // Windows .venv
      path.join(projectRoot, '.venv', 'bin', 'mkdocs')            // Unix .venv
    ];
    
    let mkdocsCmd = 'mkdocs';
    let usingVenv = false;
    for (const candidate of venvCandidates) {
      if (fs.existsSync(candidate)) {
        mkdocsCmd = candidate;
        usingVenv = true;
        break;
      }
    }

    if (usingVenv) {
      console.log(chalk.gray(`   가상환경 사용: ${mkdocsCmd}`));
    } else {
      console.log(chalk.gray('   시스템 전역 mkdocs 사용 시도...'));
    }
    console.log('');

    // mkdocs gh-deploy 실행
    const mkdocs = spawn(mkdocsCmd, ['gh-deploy'], {
      cwd: docsDir,
      stdio: 'inherit',
      shell: true
    });

    mkdocs.on('error', (err) => {
      console.log('');
      console.log(chalk.red('❌ MkDocs 실행 실패'));
      console.log(chalk.yellow('💡 MkDocs가 설치되어 있는지 확인하세요.'));
      process.exit(1);
    });

    mkdocs.on('close', (code) => {
      if (code === 0) {
        console.log('');
        console.log(chalk.green('✅ 배포가 완료되었습니다!'));
        console.log(chalk.gray('   잠시 후 GitHub Pages 설정된 주소에서 확인할 수 있습니다.'));
      } else {
        console.log('');
        console.log(chalk.red(`❌ 배포 중 오류가 발생했습니다 (코드: ${code})`));
      }
    });

  } else if (isJekyll) {
    console.log(chalk.cyan('📗 Jekyll 문서 배포'));
    console.log('');
    console.log(chalk.yellow('GitHub Pages 설정:'));
    console.log('');
    console.log(chalk.white('  1. GitHub 저장소 설정으로 이동'));
    console.log(chalk.white('  2. Pages 섹션에서 "Branch" 선택'));
    console.log(chalk.white('  3. "main" 브랜치의 "/docs" 폴더 선택'));
    console.log(chalk.white('  4. Save'));
    console.log('');
  } else {
    console.log(chalk.yellow('⚠️  문서 생성기를 인식할 수 없습니다.'));
  }

  // 기존에는 여기서 함수가 끝났지만, spawn은 비동기이므로
  // MkDocs의 경우 이벤트 핸들러에서 처리가 완료됩니다.
}

/**
 * 로컬 문서 서버 실행
 */
async function serveDocs(options) {
  const projectRoot = process.cwd();
  const docsDir = path.join(projectRoot, 'docs');

  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('🌐 로컬 문서 서버'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  if (!fs.existsSync(docsDir)) {
    console.log(chalk.red('❌ docs/ 디렉토리가 없습니다.'));
    console.log(chalk.gray('   먼저 ada docs init을 실행하세요.'));
    process.exit(1);
  }

  const isMkDocs = fs.existsSync(path.join(docsDir, 'mkdocs.yml'));
  const isJekyll = fs.existsSync(path.join(docsDir, '_config.yml'));

  if (isMkDocs) {
    console.log(chalk.cyan('📘 MkDocs 서버 시작 중...'));

    // 가상환경 내의 mkdocs 실행 파일 확인 (venv 및 .venv 지원)
    const venvCandidates = [
      path.join(projectRoot, 'venv', 'Scripts', 'mkdocs.exe'),    // Windows venv
      path.join(projectRoot, 'venv', 'bin', 'mkdocs'),            // Unix venv
      path.join(projectRoot, '.venv', 'Scripts', 'mkdocs.exe'),   // Windows .venv
      path.join(projectRoot, '.venv', 'bin', 'mkdocs')            // Unix .venv
    ];
    
    let mkdocsCmd = 'mkdocs';
    for (const candidate of venvCandidates) {
      if (fs.existsSync(candidate)) {
        mkdocsCmd = candidate;
        console.log(chalk.gray(`   가상환경 사용: ${mkdocsCmd}`));
        break;
      }
    }

    console.log(chalk.gray('   문서: http://127.0.0.1:8000'));
    console.log(chalk.gray('   종료: Ctrl+C'));
    console.log('');

    // mkdocs serve 실행
    const mkdocs = spawn(mkdocsCmd, ['serve'], {
      cwd: docsDir,
      stdio: 'inherit',
      shell: true
    });

    mkdocs.on('error', (err) => {
      console.log('');
      console.log(chalk.red('❌ MkDocs 실행 실패'));
      console.log(chalk.yellow('💡 MkDocs가 설치되어 있는지 확인하세요:'));
      console.log('');
      console.log(chalk.gray('가상환경을 사용하여 설치하세요 (권장):'));
      console.log('');
      console.log(chalk.white('  python -m venv venv'));
      console.log(chalk.white('  venv\\Scripts\\activate        # Windows'));
      console.log(chalk.white('  source venv/bin/activate     # macOS/Linux'));
      console.log(chalk.white('  pip install mkdocs mkdocs-material'));
      console.log('');
      process.exit(1);
    });

    mkdocs.on('close', (code) => {
      if (code === 127) {
        // command not found
        console.log('');
        console.log(chalk.red('❌ MkDocs가 설치되어 있지 않습니다.'));
        console.log('');
        console.log(chalk.yellow('💡 가상환경을 사용하여 설치하세요 (권장):'));
        console.log('');
        console.log(chalk.white('  python -m venv venv'));
        console.log(chalk.white('  venv\\Scripts\\activate        # Windows'));
        console.log(chalk.white('  source venv/bin/activate     # macOS/Linux'));
        console.log(chalk.white('  pip install mkdocs mkdocs-material'));
        console.log('');
        console.log(chalk.gray('Python 3.x가 설치되지 않았다면 먼저 설치하세요:'));
        console.log(chalk.gray('  Windows: https://www.python.org/downloads/'));
        console.log(chalk.gray('  macOS:   brew install python'));
        console.log('');
        process.exit(1);
      } else if (code !== 0 && code !== null) {
        console.log('');
        console.log(chalk.yellow(`⚠️  서버가 종료되었습니다 (코드: ${code})`));
      }
    });

  } else if (isJekyll) {
    console.log(chalk.cyan('📗 Jekyll 서버 시작 중...'));
    console.log(chalk.gray('   종료: Ctrl+C'));
    console.log('');

    // bundle exec jekyll serve 실행
    const jekyll = spawn('bundle', ['exec', 'jekyll', 'serve'], {
      cwd: docsDir,
      stdio: 'inherit',
      shell: true
    });

    jekyll.on('error', (err) => {
      console.log('');
      console.log(chalk.red('❌ Jekyll 실행 실패'));
      console.log(chalk.yellow('💡 Jekyll이 설치되어 있는지 확인하세요:'));
      console.log('');
      console.log(chalk.white('  gem install bundler jekyll'));
      console.log(chalk.white('  cd docs && bundle install'));
      console.log('');
      process.exit(1);
    });

    jekyll.on('close', (code) => {
      if (code === 127) {
        // command not found
        console.log('');
        console.log(chalk.red('❌ Jekyll이 설치되어 있지 않습니다.'));
        console.log('');
        console.log(chalk.yellow('💡 다음 명령어로 설치하세요:'));
        console.log('');
        console.log(chalk.white('  gem install bundler jekyll'));
        console.log(chalk.white('  cd docs && bundle install'));
        console.log('');
        process.exit(1);
      } else if (code !== 0 && code !== null) {
        console.log('');
        console.log(chalk.yellow(`⚠️  서버가 종료되었습니다 (코드: ${code})`));
      }
    });

  } else {
    console.log(chalk.yellow('⚠️  문서 생성기를 인식할 수 없습니다.'));
    console.log(chalk.gray('   mkdocs.yml 또는 _config.yml 파일이 필요합니다.'));
    console.log('');
  }
}
