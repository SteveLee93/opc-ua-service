# HCR 6축 로봇팔 OPC UA 서비스

Industry 4.0 표준을 준수하는 6축 로봇팔 제어를 위한 OPC UA 서버 및 클라이언트 구현

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![OPC UA](https://img.shields.io/badge/OPC%20UA-Standard-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 프로젝트 개요

이 프로젝트는 6축 로봇팔을 OPC UA 프로토콜을 통해 제어하고 모니터링할 수 있는 완전한 솔루션을 제공합니다. 실제 산업 환경에서 사용 가능한 수준의 안정성과 확장성을 갖추고 있습니다.

### ✨ 주요 특징

- 🤖 **6축 로봇팔 모델링**: 실제 로봇팔 구조를 반영한 관절별 제어
- 🌐 **OPC UA 표준 준수**: Industry 4.0 호환 통신 프로토콜
- 📊 **실시간 모니터링**: 각 관절의 위치를 실시간으로 추적
- 🛡️ **안전 기능**: 위치 범위 검증 및 에러 처리
- ⚡ **고성능**: TypedArray 지원으로 최적화된 데이터 처리
- 🔧 **유연한 설정**: 환경별 맞춤 설정 가능
- 📝 **포괄적 로깅**: 개발/운영 모드별 로그 레벨 제어

## 📁 프로젝트 구조

```
opc-ua-service/
├── src/
│   ├── config/
│   │   └── config.js              # 중앙화된 설정 관리
│   ├── models/
│   │   └── robot-model.js         # 로봇 비즈니스 로직
│   ├── server/
│   │   ├── server.js              # OPC UA 서버 메인
│   │   └── address-space.js       # 주소 공간 구성
│   └── client/
│       └── client.js              # 테스트 클라이언트
├── package.json
└── README.md
```

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 18.0 이상
- npm 또는 yarn

### 설치

```bash
# 프로젝트 클론
git clone <repository-url>
cd opc-ua-service

# 의존성 설치
npm install node-opcua
```

### 실행

1. **서버 시작**
   ```bash
   node src/server/server.js
   ```
   
   성공 시 다음과 같은 메시지가 출력됩니다:
   ```
   🚀 HCR 로봇 OPC UA 서버 시작 중...
   ⚙️  서버 초기화 완료
   🏗️  OPC UA 주소 공간 구성 시작...
   ✅ 서버 시작 완료
   📍 엔드포인트: opc.tcp://localhost:4840/UA/RobotArm
   ```

2. **클라이언트 테스트** (새 터미널)
   ```bash
   node src/client/client.js
   ```

## 🏗️ OPC UA 주소 공간 구조

```
Root
└── Objects
    └── Robot (ns=1;i=1000)
        ├── Joint1 (ns=1;i=1001)
        │   └── CurrentPosition (ns=1;i=1002) [Double, °]
        ├── Joint2 (ns=1;i=1003)
        │   └── CurrentPosition (ns=1;i=1004) [Double, °]
        ├── Joint3 (ns=1;i=1005)
        │   └── CurrentPosition (ns=1;i=1006) [Double, °]
        ├── Joint4 (ns=1;i=1007)
        │   └── CurrentPosition (ns=1;i=1008) [Double, °]
        ├── Joint5 (ns=1;i=1009)
        │   └── CurrentPosition (ns=1;i=1010) [Double, °]
        ├── Joint6 (ns=1;i=1011)
        │   └── CurrentPosition (ns=1;i=1012) [Double, °]
        ├── IsMoving (ns=1;i=1013) [Boolean]
        └── MoveToPosition (ns=1;i=1014) [Method]
            ├── 입력: targetPositions [Double[6]]
            └── 출력: success [Boolean]
```

## ⚙️ 설정

`src/config/config.js`에서 다음 항목들을 설정할 수 있습니다:

```javascript
module.exports = {
    server: {
        port: 4840,                    // OPC UA 서버 포트
        resourcePath: '/UA/RobotArm',  // 엔드포인트 경로
        // ...
    },
    robot: {
        jointCount: 6,                 // 관절 개수
        maxPosition: 180,              // 최대 회전각 (도)
        minPosition: -180,             // 최소 회전각 (도)
        // ...
    },
    debug: {
        enableVerboseLogging: false,   // 상세 로깅 활성화
        logMethodCalls: true,          // 메서드 호출 로깅
        logPositionUpdates: true       // 위치 업데이트 로깅
    }
};
```

## 🔌 API 사용법

### 클라이언트에서 로봇 제어

```javascript
const { OPCUAClient } = require("node-opcua");

const client = OPCUAClient.create({ /* 설정 */ });

// 서버 연결
await client.withSessionAsync("opc.tcp://localhost:4840/UA/RobotArm", async (session) => {
    
    // 1. 현재 위치 읽기
    const result = await session.read({
        nodeId: "ns=1;i=1002", // Joint1.CurrentPosition
        attributeId: AttributeIds.Value
    });
    console.log("Joint1 위치:", result.value.value, "°");
    
    // 2. 로봇 이동
    const moveResult = await session.call({
        objectId: "ns=1;i=1000",        // Robot 객체
        methodId: "ns=1;i=1014",        // MoveToPosition 메서드
        inputArguments: [{
            dataType: "Double",
            arrayType: "Array",
            value: [45, -30, 60, 0, -45, 90] // 목표 위치 (도)
        }]
    });
    
    if (moveResult.statusCode.isGood()) {
        console.log("이동 성공!");
    }
});
```

### UaExpert로 테스트

1. [UaExpert](https://www.unified-automation.com/products/development-tools/uaexpert.html) 다운로드 및 설치
2. 서버 추가: `opc.tcp://localhost:4840/UA/RobotArm`
3. Objects → Robot에서 각 관절의 CurrentPosition 값 모니터링
4. MoveToPosition 메서드 호출로 로봇 제어

## 🧪 테스트 시나리오

클라이언트는 다음 테스트 시퀀스를 자동 실행합니다:

1. **노드 탐색**: 서버의 모든 로봇 관련 노드 발견
2. **초기 상태 확인**: 모든 관절의 현재 위치 읽기 (초기값: 0°)
3. **이동 테스트**: 목표 위치 `[45, -30, 60, 0, -45, 90]`로 이동
4. **결과 확인**: 이동 후 실제 위치 검증
5. **홈 복귀**: 모든 관절을 0° 위치로 복귀
6. **최종 확인**: 홈 포지션 도달 여부 확인

## 🛡️ 안전 기능

- **위치 범위 검증**: 각 관절의 회전각을 -180° ~ +180° 범위로 제한
- **입력 검증**: 메서드 호출 시 매개변수 타입 및 범위 확인
- **에러 처리**: 포괄적인 예외 처리 및 상태 코드 반환
- **타임아웃 처리**: 네트워크 연결 및 응답 타임아웃 관리

## 📊 로깅 및 모니터링

### 서버 로그 예시
```
🚀 HCR 로봇 OPC UA 서버 시작 중...
🤖 로봇 객체 생성: ns=1;i=1000
🛠️  MoveToPosition 메서드 생성: ns=1;i=1014
🎯 MoveToPosition 메서드 호출
✅ 관절 위치 업데이트: [45, -30, 60, 0, -45, 90]
```

### 클라이언트 로그 예시
```
🔗 로봇 서버에 연결 중...
🤖 Robot 객체 발견: ns=1;i=1000
📍 Joint1.CurrentPosition 발견
🎯 로봇 이동 테스트:
✅ 이동 성공
```

## 🔧 확장 가능성

### 실제 로봇 연동
```javascript
// robot-model.js에서 실제 하드웨어 연동
async moveToPosition(targetPositions) {
    // 실제 로봇 드라이버 호출
    await robotDriver.moveTo(targetPositions);
    // 센서 피드백 대기
    await this.waitForMovementComplete();
}
```

### 추가 기능
- 🔄 **실시간 구독**: OPC UA 구독을 통한 실시간 데이터 스트리밍
- 📈 **히스토리**: 위치 변화 히스토리 저장 및 조회
- 🚨 **알람**: 위험 상황 감지 및 알림
- 🔐 **보안**: 사용자 인증 및 권한 관리

## 🐛 문제 해결

### 일반적인 문제

1. **포트 사용 중 오류**
   ```bash
   Error: listen EADDRINUSE :::4840
   ```
   해결: 다른 프로세스가 4840 포트를 사용 중입니다. 포트를 변경하거나 해당 프로세스를 종료하세요.

2. **연결 실패**
   ```bash
   ❌ 클라이언트 오류: connect ECONNREFUSED
   ```
   해결: 서버가 실행 중인지 확인하고, 방화벽 설정을 점검하세요.

3. **노드를 찾을 수 없음**
   ```bash
   ❌ Robot 객체를 찾을 수 없습니다.
   ```
   해결: 서버가 완전히 초기화된 후 클라이언트를 실행하세요.

