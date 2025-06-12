// Part 1: Concepts - 디버깅 및 진단 개념 정의
// Part 3: Address Space Model - 로봇 관절 주소 공간 모델링
// Part 4: Services - 클라이언트-서버 통신 서비스 설정
// Part 5: Information Model - 서버 정보 모델 정의
// Part 6: Mappings - TCP 바이너리 매핑 설정
// Part 12: Discovery - 엔드포인트 디스커버리 설정
module.exports = {
    server: {
        port: 4840,
        resourcePath: '/UA/RobotArm',
        buildInfo: {
            productName: 'HCR OPC UA Robot Server',
            productUri: 'urn:hcr-opcua-robot-server',
            manufacturerName: 'HCR',
        },
        endpointUrl: 'opc.tcp://localhost:4840/UA/RobotArm'
    },
    
    robot: {
        jointCount: 6,
        jointNames: ['Joint1', 'Joint2', 'Joint3', 'Joint4', 'Joint5', 'Joint6'],
        defaultPositions: [0, 0, 0, 0, 0, 0],
        maxPosition: 180,
        minPosition: -180
    },
    
    client: {
        monitoringInterval: 1000, // ms
        testDuration: 10000 // ms
    },

    // 디버깅 설정
    debug: {
        enableVerboseLogging: false, // 운영 시 false로 설정
        logMethodCalls: true,
        logPositionUpdates: true
    }
};
