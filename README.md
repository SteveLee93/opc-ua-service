# HCR 6축 로봇팔 OPC UA 서비스

Industry 4.0 표준을 준수하는 6축 로봇팔 제어를 위한 OPC UA 서버/클라이언트 구현

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![OPC UA](https://img.shields.io/badge/OPC%20UA-Standard-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 프로젝트 개요

이 프로젝트는 6축 로봇팔을 OPC UA 프로토콜을 통해 제어하고 모니터링할 수 있는 테스트용 구현체입니다. 실제 OPC UA 서버/클라이언트 구조를 보여주는 데모 프로젝트입니다.

### ✨ 주요 특징

- 🤖 **6축 로봇팔 시뮬레이션**: 관절별 위치 제어 및 모니터링
- 🌐 **OPC UA 표준 준수**: Industry 4.0 호환 통신 프로토콜
- 📊 **실시간 데이터**: 각 관절의 위치를 실시간으로 추적
- 🛠️ **메서드 호출**: MoveToPosition으로 로봇 제어
- 🔧 **모듈화된 구조**: 확장 가능한 아키텍처

## 📁 프로젝트 구조

```
opc-ua-service/
├── src/
│   ├── config/
│   │   └── config.js              # 설정 관리
│   ├── models/
│   │   └── robot-model.js         # 로봇 비즈니스 로직
│   ├── server/
│   │   ├── server.js              # OPC UA 서버
│   │   └── address-space.js       # 주소 공간 구성
│   └── client/
│       └── client.js              # 테스트 클라이언트
├── package.json
└── README.md
```

## 🚀 설치 및 실행

### 사전 요구사항
- Node.js 18.0 이상
- npm

### 설치
```bash
npm install node-opcua
```

### 1단계: 서버 시작
```bash
node src/server/server.js
```

**성공 시 출력:**
```
🚀 HCR 로봇 OPC UA 서버 시작 중...
🏗️  OPC UA 주소 공간 구성 시작...
✅ 서버 시작 완료
📍 엔드포인트: opc.tcp://localhost:4840/UA/RobotArm
```

### 2단계: 클라이언트 테스트 (새 터미널)
```bash
node src/client/client.js
```

**성공 시 출력:**
```
🔗 로봇 서버에 연결 중...
🤖 Robot 객체 발견: ns=1;i=1000
📍 현재 관절 위치: [0, 0, 0, 0, 0, 0]°
🎯 로봇 이동 테스트: [45, -30, 60, 0, -45, 90]°
✅ 이동 성공! 새 위치: [45, -30, 60, 0, -45, 90]°
```

## 🏗️ OPC UA 주소 공간

```
Root/Objects/Robot (ns=1;i=1000)
├── Joint1/CurrentPosition (ns=1;i=1002) [Double, °]
├── Joint2/CurrentPosition (ns=1;i=1004) [Double, °] 
├── Joint3/CurrentPosition (ns=1;i=1006) [Double, °]
├── Joint4/CurrentPosition (ns=1;i=1008) [Double, °]
├── Joint5/CurrentPosition (ns=1;i=1010) [Double, °]
├── Joint6/CurrentPosition (ns=1;i=1012) [Double, °]
├── IsMoving (ns=1;i=1013) [Boolean]
└── MoveToPosition (ns=1;i=1014) [Method]
    ├── 입력: targetPositions [Double[6]] 
    └── 출력: success [Boolean]
```

## 🔧 주요 파일 설명

### `config.js` - 설정 관리
```javascript
module.exports = {
    server: {
        port: 4840,
        resourcePath: '/UA/RobotArm',
        endpointUrl: 'opc.tcp://localhost:4840/UA/RobotArm'
    },
    robot: {
        jointCount: 6,
        jointNames: ['Joint1', 'Joint2', 'Joint3', 'Joint4', 'Joint5', 'Joint6'],
        maxPosition: 180,
        minPosition: -180
    }
};
```

### `robot-model.js` - 로봇 로직
- 관절 위치 저장 및 관리
- 위치 범위 검증 (-180° ~ +180°)
- 이동 시뮬레이션

### `server.js` - OPC UA 서버
- OPC UA 서버 생성 및 설정
- 표준 노드셋 로드 (standard, di, robotics)
- 주소 공간 구성 호출

### `address-space.js` - 주소 공간 구성
- 로봇 객체 및 관절 변수 생성
- MoveToPosition 메서드 구현
- 실시간 데이터 업데이트

### `client.js` - 테스트 클라이언트
- 서버 연결 및 노드 탐색
- 현재 위치 읽기
- 이동 명령 테스트
- 결과 검증

## 🧪 테스트 시나리오

클라이언트는 다음 순서로 테스트를 진행합니다:

1. **연결**: OPC UA 서버에 연결
2. **탐색**: Robot 객체 및 관절 노드 발견
3. **읽기**: 모든 관절의 현재 위치 확인
4. **이동**: 목표 위치 `[45, -30, 60, 0, -45, 90]`로 이동
5. **검증**: 이동 후 실제 위치 확인
6. **복귀**: 홈 포지션 `[0, 0, 0, 0, 0, 0]`으로 복귀

## 🛠️ UaExpert로 테스트

1. [UaExpert 다운로드](https://www.unified-automation.com/products/development-tools/uaexpert.html)
2. 서버 추가: `opc.tcp://localhost:4840/UA/RobotArm`
3. Objects → Robot → Joint1~6 → CurrentPosition 값 모니터링
4. MoveToPosition 메서드 직접 호출 테스트

## ⚙️ 설정 변경

`src/config/config.js`에서 다음을 수정할 수 있습니다:

- **포트 변경**: `server.port` (기본: 4840)
- **관절 개수**: `robot.jointCount` (기본: 6)
- **회전 범위**: `robot.maxPosition/minPosition` (기본: ±180°)
- **디버그 모드**: `debug.enableVerboseLogging`

## 🐛 문제 해결

### 포트 사용 중 오류
```
Error: listen EADDRINUSE :::4840
```
**해결**: `config.js`에서 다른 포트로 변경하거나 기존 프로세스 종료

### 연결 실패
```
❌ 클라이언트 오류: connect ECONNREFUSED
```
**해결**: 서버가 실행 중인지 확인

### 메서드 호출 실패
```
Method has not been bound
```
**해결**: 서버 완전 초기화 대기 후 클라이언트 실행

## 📈 확장 아이디어

- **실제 로봇 연동**: 하드웨어 드라이버 인터페이스 추가
- **보안 강화**: 사용자 인증 및 암호화 통신
- **히스토리 데이터**: 위치 변화 기록 및 조회
- **웹 대시보드**: 실시간 모니터링 UI
- **알람 시스템**: 이상 상황 감지 및 알림

## 📄 라이선스

MIT License