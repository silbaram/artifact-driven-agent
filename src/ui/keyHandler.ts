import readline from 'readline';
import { QUICK_ACTIONS } from './quickActions.js';

/**
 * 키 입력 핸들러 옵션
 */
export interface KeyHandlerOptions {
  onKey?: (key: string) => void;
  onRefresh?: () => void;
  onQuit?: () => void;
}

/**
 * readline Key 타입
 */
interface KeyInfo {
  ctrl?: boolean;
  name?: string;
}

/**
 * 키 입력 핸들러 클래스
 * 터미널에서 단일 키 입력을 감지하여 콜백 실행
 */
export class KeyHandler {
  private onKey: (key: string) => void;
  private onRefresh: () => void;
  private onQuit: () => void;
  private paused: boolean;

  constructor(options: KeyHandlerOptions = {}) {
    this.onKey = options.onKey || (() => {});
    this.onRefresh = options.onRefresh || (() => {});
    this.onQuit = options.onQuit || (() => {});
    this.paused = false;
  }

  /**
   * 키 입력 감지 시작
   */
  start(): void {
    // Raw mode 설정 (한 글자씩 즉시 입력)
    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
      process.stdin.resume();

      process.stdin.on('keypress', (str: string | undefined, key: KeyInfo) => {
        this.handleKeypress(str, key);
      });
    }
  }

  /**
   * 키 입력 감지 중지
   */
  stop(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
  }

  /**
   * 일시 정지 (에이전트 실행 중)
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * 재개
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * 키 입력 처리
   */
  private handleKeypress(str: string | undefined, key: KeyInfo): void {
    // Ctrl+C 처리
    if (key && key.ctrl && key.name === 'c') {
      this.onQuit();
      return;
    }

    // 일시 정지 상태면 무시 (일부 키만 허용)
    if (this.paused) {
      // 일시 정지 중에도 q는 허용
      if (str === 'q' || str === 'Q') {
        this.onQuit();
      }
      return;
    }

    // 키 처리
    const lowerKey = str ? str.toLowerCase() : '';

    // 특수 키 처리
    if (lowerKey === 'q') {
      this.onQuit();
      return;
    }

    // Quick Action 키 확인 (숫자, 알파벳 모두)
    if (QUICK_ACTIONS[lowerKey]) {
      this.onKey(lowerKey);
      return;
    }

    // 알파벳 키 처리 (s, l, t)
    if (str && /^[slt]$/i.test(str)) {
      this.onKey(lowerKey);
      return;
    }
  }
}

/**
 * 단일 키 입력 대기 (Promise 기반)
 */
export function waitForKey(): Promise<string> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      // TTY가 아닌 경우 즉시 반환
      resolve('');
      return;
    }

    const wasRaw = process.stdin.isRaw;
    const wasPaused =
      typeof process.stdin.isPaused === 'function'
        ? process.stdin.isPaused()
        : false;
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const handler = (str: string | undefined, key: KeyInfo): void => {
      process.stdin.removeListener('keypress', handler);
      if (!wasRaw) {
        process.stdin.setRawMode(false);
      }
      if (wasPaused) {
        process.stdin.pause();
      } else {
        process.stdin.resume();
      }

      // Ctrl+C
      if (key && key.ctrl && key.name === 'c') {
        process.exit(0);
      }

      resolve(str || '');
    };

    process.stdin.on('keypress', handler);
  });
}

/**
 * stdin이 TTY인지 확인
 */
export function isTTY(): boolean {
  return !!process.stdin.isTTY;
}
