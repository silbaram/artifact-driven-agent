# Escalation Rules (역할 간 에스컬레이션 규칙)

> 이 문서는 각 역할이 언제, 어떻게 Manager에게 에스컬레이션해야 하는지 정의한다.
> 모든 역할은 이 규칙을 따라야 한다.

---

## 1. 에스컬레이션 원칙

- 에스컬레이션은 **진행 불가 시에만** 수행한다
- 에스컬레이션 전에 **본인 역할 범위 내에서 해결 시도**를 한다
- 에스컬레이션은 **문서로 기록**한다
- Manager 응답 전까지 **해당 작업을 중단**한다

---

## 2. 즉시 에스컬레이션 (BLOCK)

다음 상황은 발견 즉시 Manager에게 에스컬레이션한다.

### 2.1 기술적 BLOCK
| 상황                                | 발생 역할         | 에스컬레이션 대상   |
| ----------------------------------- | ----------------- | ------------------- |
| project.md에 없는 기술 도입 필요    | Backend, Frontend | Manager             |
| Breaking API change 필요            | Backend           | Manager             |
| 성능/확장 한계로 아키텍처 변경 필요 | Backend, Frontend | Manager → Architect |
| 외부 서비스 의존성 추가 필요        | Backend           | Manager             |

### 2.2 기획적 BLOCK
| 상황                                  | 발생 역할         | 에스컬레이션 대상 |
| ------------------------------------- | ----------------- | ----------------- |
| plan.md 요구사항이 모호하여 구현 불가 | Backend, Frontend | Manager → Planner |
| plan.md에 없는 기능 요청 발생         | 모든 역할         | Manager → Planner |
| 사용자 흐름에 논리적 모순 발견        | QA                | Manager → Planner |

### 2.3 역할 간 충돌
| 상황                                    | 발생 역할         | 에스컬레이션 대상 |
| --------------------------------------- | ----------------- | ----------------- |
| api.md 해석 불일치 (Backend ↔ Frontend) | Backend, Frontend | Manager           |
| 리뷰 판정에 이의                        | Backend, Frontend | Manager           |
| QA 결과에 이의                          | Backend, Frontend | Manager           |

---

## 3. 작업 완료 후 보고

다음 상황은 작업 완료 후 Manager에게 보고한다.

| 상황                      | 발생 역할         | 보고 내용                       |
| ------------------------- | ----------------- | ------------------------------- |
| ⚠️ WARN 항목 발생          | Reviewer          | review-report.md에 기록 후 보고 |
| ⚠️ BLOCK 항목 발생         | QA                | qa-report.md에 기록 후 보고     |
| 예상보다 규모가 커진 경우 | Backend, Frontend | 규모 재산정 요청                |
| 일정 지연 예상            | 모든 역할         | 지연 사유 및 예상 일정          |

---

## 4. 에스컬레이션 형식

### 4.1 BLOCK 에스컬레이션 (즉시)

### Closing Action (종료 프로토콜)
BLOCK 에스컬레이션 메시지를 출력한 후, 반드시 다음 멘트를 남기고 세션을 종료한다:

"⛔ 에스컬레이션이 발생하여 작업을 중단합니다.
다음 명령어로 Manager를 실행하여 결정을 내려주세요:
./ai/scripts/ai-role.sh manager [claude|codex|gemini]"

artifacts/decision.md 또는 별도 이슈로 기록:

```markdown
## Issue: [제목]

- Date: YYYY-MM-DD
- From: [역할]
- Type: BLOCK
- Stage: [현재 단계]

### Context
[상황 설명 - 사실만 기술]

### Problem
[진행 불가 사유]

### Options (있다면)
- A: [옵션 설명] - 장점/단점
- B: [옵션 설명] - 장점/단점

### Recommendation (있다면)
[권장 옵션과 사유]

### Waiting For
- Manager 판단
```

### 4.2 일반 보고 (작업 후)

```markdown
## Report: [제목]

- Date: YYYY-MM-DD
- From: [역할]
- Type: REPORT
- Stage: [현재 단계]

### Summary
[보고 내용 요약]

### Impact
[영향도: 없음 / 낮음 / 중간 / 높음]

### Action Required
[필요한 조치 - 없으면 "정보 공유"]
```

---

## 5. 역할별 에스컬레이션 권한

### Planner
- 기술 관련 질문 수신 시 → Architect로 전달 요청 (Manager 경유)
- 요구사항 범위 확대 요청 시 → Manager에게 범위 변경 승인 요청

### Architect  
- 규모 예측 변경 필요 시 → Manager 승인 필요
- project.md Freeze 해제 필요 시 → Manager 승인 필수

### Backend / Frontend
- 기술 스택 변경 → Manager 승인 필수
- API 계약 변경 → 상대 역할 + Manager 동시 통보
- 구현 불가 판단 → Manager에게 대안 제시와 함께 에스컬레이션

### Reviewer
- ❌ REJECT 판정 → 해당 역할에 직접 전달 (Manager 통보)
- 아키텍처 수준 문제 발견 → Manager → Architect

### QA
- ❌ FAIL 판정 → Manager에게 원인 분석과 함께 보고
- 기획 모호로 검증 불가 → Manager → Planner

### Manager
- 에스컬레이션 최종 수신자
- 필요 시 특정 역할로 재배정

---

## 6. 에스컬레이션 금지 사항

- ❌ 본인 역할 범위 내 문제를 에스컬레이션하지 말 것
- ❌ 해결 시도 없이 바로 에스컬레이션하지 말 것
- ❌ 감정적 판단으로 에스컬레이션하지 말 것
- ❌ Manager 우회하여 다른 역할에 직접 지시하지 말 것
- ❌ 에스컬레이션 없이 임의로 범위/기술 변경하지 말 것

---

## 7. 에스컬레이션 응답 시간 기대치

| 유형            | 기대 응답 시간          | 미응답 시             |
| --------------- | ----------------------- | --------------------- |
| BLOCK (즉시)    | 가능한 빨리             | 작업 중단 유지        |
| REPORT (보고)   | 다음 단계 진입 전       | 다음 단계 대기        |
| QUESTION (질문) | 작업 진행하며 대기 가능 | 가정하고 진행 후 검증 |

---

## 8. 에스컬레이션 흐름도

```
문제 발생
    ↓
본인 역할 범위 내 해결 가능?
    ├── Yes → 해결 후 진행
    └── No → 에스컬레이션 유형 판단
                ↓
        ┌───────┴───────┐
        ↓               ↓
    BLOCK           REPORT
    (즉시)          (작업 후)
        ↓               ↓
    작업 중단       작업 완료
        ↓               ↓
    Manager 판단 대기   Manager 통보
        ↓               ↓
    판단 수신       필요 시 조치
        ↓
    지시에 따라 진행
```
