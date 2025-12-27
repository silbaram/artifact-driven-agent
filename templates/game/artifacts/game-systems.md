# Game Systems Specification

> 게임 시스템 설계 문서
> 모든 게임 로직의 단일 진실

---

## 0. 문서 메타

| 항목 | 값 |
|------|-----|
| 게임명 | [게임명] |
| 버전 | v1.0 |
| 최종 수정 | YYYY-MM-DD |

---

## 1. 시스템 개요

| 시스템 | 설명 | 상태 | Task |
|--------|------|:----:|------|
| Core | 게임 루프, 상태 관리 | ✅ | TASK-001 |
| Combat | 전투 시스템 | ⏳ | TASK-002 |
| Inventory | 아이템 관리 | 📋 | TASK-003 |
| Progression | 레벨/스킬 성장 | 📋 | TASK-004 |

---

## 2. Core System

### 2.1 게임 상태

| 상태 | 설명 | 전환 조건 |
|------|------|----------|
| INIT | 초기화 중 | 로딩 완료 → READY |
| READY | 준비 완료 | 시작 → PLAYING |
| PLAYING | 게임 진행 중 | 일시정지 → PAUSED |
| PAUSED | 일시 정지 | 재개 → PLAYING |
| GAME_OVER | 게임 종료 | 재시작 → INIT |

### 2.2 게임 루프

```
while (state === PLAYING) {
    processInput()
    updateSystems()
    render()
}
```

### 2.3 이벤트 버스

| 이벤트 | 발생 조건 | 데이터 |
|--------|----------|--------|
| GAME_START | 게임 시작 | - |
| GAME_PAUSE | 일시정지 | - |
| GAME_OVER | 게임 종료 | score, reason |

---

## 3. Combat System

### 3.1 개요

[전투 시스템 설명]

### 3.2 엔티티 속성

| 속성 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| health | number | 현재 체력 | 100 |
| maxHealth | number | 최대 체력 | 100 |
| attack | number | 공격력 | 10 |
| defense | number | 방어력 | 5 |

### 3.3 전투 공식

```
# 데미지 계산
damage = max(1, attacker.attack - defender.defense)

# 크리티컬 데미지
if (random() < critRate):
    damage = damage * critMultiplier
```

### 3.4 전투 이벤트

| 이벤트 | 발생 조건 | 데이터 |
|--------|----------|--------|
| ATTACK | 공격 시 | attacker, target, damage |
| DAMAGE | 피격 시 | target, damage, isCritical |
| DEATH | 체력 0 | entity |
| HEAL | 회복 시 | target, amount |

### 3.5 상태 이상

| 상태 | 효과 | 지속 시간 |
|------|------|----------|
| POISON | 틱당 5 데미지 | 5초 |
| STUN | 행동 불가 | 2초 |
| BUFF_ATK | 공격력 +20% | 10초 |

---

## 4. Inventory System

### 4.1 개요

[인벤토리 시스템 설명]

### 4.2 아이템 구조

```
Item {
    id: string
    name: string
    type: ItemType
    stackable: boolean
    maxStack: number
}
```

### 4.3 아이템 타입

| 타입 | 설명 | 스택 가능 |
|------|------|:--------:|
| CONSUMABLE | 소비 아이템 | ✅ |
| EQUIPMENT | 장비 | ❌ |
| MATERIAL | 재료 | ✅ |
| KEY | 키 아이템 | ❌ |

### 4.4 인벤토리 이벤트

| 이벤트 | 발생 조건 | 데이터 |
|--------|----------|--------|
| ITEM_ADD | 아이템 획득 | item, quantity |
| ITEM_REMOVE | 아이템 제거 | item, quantity |
| ITEM_USE | 아이템 사용 | item |

---

## 5. Progression System

### 5.1 레벨 시스템

```
# 필요 경험치
requiredExp = baseExp * (level ^ expMultiplier)

# 예시 (baseExp=100, expMultiplier=1.5)
Level 1 → 2: 100 exp
Level 2 → 3: 283 exp
Level 3 → 4: 520 exp
```

### 5.2 스탯 성장

| 레벨업 시 | 증가량 |
|----------|--------|
| maxHealth | +10 |
| attack | +2 |
| defense | +1 |

### 5.3 진행 이벤트

| 이벤트 | 발생 조건 | 데이터 |
|--------|----------|--------|
| EXP_GAIN | 경험치 획득 | amount |
| LEVEL_UP | 레벨 상승 | newLevel, statGains |

---

## 6. 시스템 간 상호작용

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Combat System                                                  │
│       │                                                         │
│       ├── DEATH 이벤트 ──→ Progression: EXP_GAIN               │
│       │                                                         │
│       └── DAMAGE 이벤트 ──→ Rendering: 데미지 이펙트           │
│                                                                 │
│  Inventory System                                               │
│       │                                                         │
│       └── ITEM_USE ──→ Combat: 회복/버프                       │
│                                                                 │
│  Progression System                                             │
│       │                                                         │
│       └── LEVEL_UP ──→ Rendering: 레벨업 이펙트                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 밸런스 파라미터

> 별도 설정 파일로 관리되는 값들

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| BASE_HEALTH | 100 | 기본 체력 |
| BASE_ATTACK | 10 | 기본 공격력 |
| EXP_MULTIPLIER | 1.5 | 경험치 증가율 |
| CRIT_RATE | 0.1 | 크리티컬 확률 |
| CRIT_MULTIPLIER | 2.0 | 크리티컬 배율 |

---

## 8. 변경 이력

| Task | 날짜 | 변경 내용 |
|------|------|----------|
| [TASK-001] | YYYY-MM-DD | Core System 초기 설계 |
| [TASK-002] | YYYY-MM-DD | Combat System 추가 |
