// Part 1: Concepts - 애플리케이션 생명주기 및 오류 처리
// Part 3: Address Space Model - 주소 공간 구성
// Part 4: Services - 서버 서비스 구현 및 초기화
// Part 5: Information Model - 표준 노드셋 및 디바이스 정보 모델
// Part 6: Mappings - TCP/IP 네트워크 바인딩
// Part 12: Discovery - 엔드포인트 URL 제공
const { OPCUAServer, nodesets } = require('node-opcua');
const { constructAddressSpace } = require('./address-space');
const config = require('../config/config');

/**
 * HCR 로봇 OPC UA 서버 클래스
 */
class RobotOPCUAServer {
    constructor() {
        this.server = new OPCUAServer({
            port: config.server.port,
            resourcePath: config.server.resourcePath,
            buildInfo: config.server.buildInfo,
            nodeset_filename: [
                nodesets.standard,
                nodesets.di // Device Information 모델
            ]
        });
    }

    /**
     * 서버 시작
     */
    async start() {
        try {
            console.log("🚀 HCR 로봇 OPC UA 서버 시작 중...");
            
            await this.server.initialize();
            console.log("⚙️  서버 초기화 완료");
            
            constructAddressSpace(this.server);
            
            await this.server.start();
            
            console.log("✅ 서버 시작 완료");
            console.log(`📍 엔드포인트: ${this.server.getEndpointUrl()}`);
            console.log("🛑 종료하려면 Ctrl+C를 누르세요");
            
        } catch (error) {
            console.error("❌ 서버 시작 실패:", error.message);
            process.exit(1);
        }
    }

    /**
     * 서버 정상 종료
     */
    async stop() {
        console.log("\n🛑 서버 종료 중...");
        if (this.server) {
            await this.server.shutdown();
            console.log("✅ 서버 종료 완료");
        }
        process.exit(0);
    }
}

// 서버 인스턴스 생성 및 시작
const robotServer = new RobotOPCUAServer();

// 종료 신호 처리
process.on('SIGINT', () => robotServer.stop());
process.on('SIGTERM', () => robotServer.stop());

// 미처리 예외 처리
process.on('uncaughtException', (error) => {
    console.error('미처리 예외:', error);
    robotServer.stop();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('미처리 Promise 거부:', reason);
    robotServer.stop();
});

// 서버 시작
robotServer.start();


