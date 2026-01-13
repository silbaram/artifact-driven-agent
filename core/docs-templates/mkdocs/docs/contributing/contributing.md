# 기여 가이드

## 기여자 환영!

[프로젝트명]에 기여를 고려해주셔서 감사합니다!

## 기여 방법

### 버그 보고

1. [이슈](https://github.com/username/repo/issues)에 이미 보고된 버그인지 확인
2. 보고되지 않았다면 다음 정보와 함께 새 이슈 생성:
   - 명확한 제목
   - 상세한 설명
   - 재현 단계
   - 예상 동작 vs 실제 동작
   - 환경 정보

### 기능 제안

1. [토론](https://github.com/username/repo/discussions) 확인
2. 다음 정보와 함께 새 토론 생성:
   - 기능 설명
   - 사용 사례
   - 제안 구현 (선택 사항)

### Pull Request 제출

1. 저장소 Fork
2. 기능 브랜치 생성: `git checkout -b feature/your-feature`
3. 변경사항 작성
4. 테스트 작성 또는 업데이트
5. 테스트 실행: `npm test`
6. 명확한 메시지로 커밋: `git commit -m "Add feature X"`
7. Push: `git push origin feature/your-feature`
8. Pull Request 생성

## 개발 환경 설정

[개발 가이드](development.md)를 참고하세요.

## 코드 스타일

- 기존 코드 스타일 준수
- 린터 실행: `npm run lint`
- 코드 포맷팅: `npm run format`

## 테스트

```bash
# 전체 테스트 실행
npm test

# 특정 테스트 실행
npm test -- tests/specific.test.js
```

## 행동 강령

[행동 강령](code-of-conduct.md)을 참고하세요.
