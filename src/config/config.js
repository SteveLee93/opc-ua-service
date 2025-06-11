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
