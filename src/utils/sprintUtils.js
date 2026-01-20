import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { parseTaskMetadata } from './taskParser.js';

/**
 * 현재 활성 스프린트 찾기
 * @param {string} sprintsDir 
 */
export function findActiveSprint(sprintsDir) {
  if (!fs.existsSync(sprintsDir)) return null;

  const sprints = fs.readdirSync(sprintsDir).filter(d => {
    return fs.statSync(path.join(sprintsDir, d)).isDirectory() && !d.startsWith('_');
  });

  for (const sprint of sprints) {
    const metaPath = path.join(sprintsDir, sprint, 'meta.md');
    if (fs.existsSync(metaPath)) {
      const content = fs.readFileSync(metaPath, 'utf-8');
      if (content.includes('상태 | active')) {
        return sprint;
      }
    }
  }

  return null;
}

/**
 * 스프린트 동기화 (Task 파일 상태 → meta.md)
 * @param {string} sprintsDir 
 * @param {boolean} silent 
 */
export async function syncSprint(sprintsDir, silent = false) {
  const activeSprint = findActiveSprint(sprintsDir);
  if (!activeSprint) {
    if (!silent) console.log(chalk.red('❌ 활성 스프린트가 없습니다.'));
    return;
  }

  const sprintPath = path.join(sprintsDir, activeSprint);
  const tasksDir = path.join(sprintPath, 'tasks');
  const tasks = [];

  if (fs.existsSync(tasksDir)) {
    const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
    
    for (const file of taskFiles) {
      const content = fs.readFileSync(path.join(tasksDir, file), 'utf-8');
      const taskInfo = parseTaskMetadata(content, file);
      tasks.push(taskInfo);
    }
  }

  // meta.md 업데이트
  updateSprintMeta(sprintPath, tasks);

  if (!silent) {
    console.log(chalk.green(`✅ ${activeSprint} 메타데이터 동기화 완료`));
    console.log(chalk.gray(`   총 ${tasks.length}개 Task 상태 반영됨`));
  }
}

/**
 * sprint meta.md 업데이트
 * @param {string} sprintPath 
 * @param {Array} tasks 
 */
export function updateSprintMeta(sprintPath, tasks) {
  const metaPath = path.join(sprintPath, 'meta.md');
  if (!fs.existsSync(metaPath)) return;
  
  let metaContent = fs.readFileSync(metaPath, 'utf-8');

  // Task 목록/요약 섹션 찾기
  // 기존 정규식이 좀 약할 수 있으므로 보완
  const taskSectionRegex = /## Task (?:목록|요약)\s*\n[\s\S]*?\n\n(?=##|$)|## Task (?:목록|요약)\s*\n[\s\S]*?$/;
  const taskSectionTitle = metaContent.includes('## Task 요약') ? '## Task 요약' : '## Task 목록';

  // 새로운 Task 목록 생성
  let taskListContent = `${taskSectionTitle}\n\n`;
  taskListContent += '| Task | 제목 | 상태 | 우선순위 | 크기 |\n';
  taskListContent += '|------|------|:----:|:--------:|:----:|\n';

  for (const task of tasks) {
    taskListContent += `| ${task.id} | ${task.title} | ${task.status} | ${task.priority} | ${task.size} |\n`;
  }

  taskListContent += '\n';

  // 기존 Task 목록 섹션 교체
  if (metaContent.match(/## Task 목록/)) {
    // 섹션이 존재하면 교체
    // 단순히 replace를 쓰면 첫번째 매칭만 되는데, 정규식을 잘 썼으므로 괜찮음.
    // 다만 섹션 뒤에 아무것도 없는 경우를 대비해 regex를 위에서 수정함.
    metaContent = metaContent.replace(taskSectionRegex, taskListContent);
  } else {
    // Task 목록 섹션이 없으면 '## 참고' 섹션 앞이나 파일 끝에 추가
    if (metaContent.includes('## 참고')) {
      metaContent = metaContent.replace(/## 참고/, taskListContent + '## 참고');
    } else {
      metaContent += '\n' + taskListContent;
    }
  }

  fs.writeFileSync(metaPath, metaContent);
}
