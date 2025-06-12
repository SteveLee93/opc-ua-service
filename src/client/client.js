// OPC UA Part 4: Services - 클라이언트 서비스 구현
// OPC UA Part 6: Mappings - TCP/IP 클라이언트 매핑
// OPC UA Part 12: Discovery - 엔드포인트 디스커버리
const { OPCUAClient, MessageSecurityMode, SecurityPolicy, AttributeIds } = require("node-opcua");
const config = require('../config/config');

/**
 * HCR 로봇 OPC UA 클라이언트 클래스
 */
class RobotOPCUAClient {
    constructor() {
        this.client = OPCUAClient.create({ // OPC UA Part 4: Services - 클라이언트 생성 서비스
            securityMode: MessageSecurityMode.None, // OPC UA Part 2: Security Model - 보안 모드 설정
            securityPolicy: SecurityPolicy.None, // OPC UA Part 2: Security Model - 보안 정책 설정
            endpointMustExist: false // OPC UA Part 12: Discovery - 엔드포인트 존재 검증
        });
        
        this.nodeIds = {}; // OPC UA Part 3: Address Space Model - 노드 ID 캐시
    }

    /**
     * 서버에 연결하고 테스트 수행
     */
    async connect() {
        console.log("🔗 로봇 서버에 연결 중...");
        
        await this.client.withSessionAsync(config.server.endpointUrl, async (session) => { // OPC UA Part 4: Services - 세션 관리 서비스
            console.log("✅ 연결 및 세션 생성 완료");
            
            await this.discoverNodes(session); // OPC UA Part 3: Address Space Model - 노드 탐색
            await this.runTests(session); // OPC UA Part 4: Services - 클라이언트 서비스 실행
        });
        
        console.log("🔌 연결 종료");
    }

    /**
     * 서버에서 노드들을 탐색하여 NodeId 수집
     * @param {Object} session - OPC UA 세션
     */
    async discoverNodes(session) {
        console.log("\n🔍 노드 탐색 중...");
        
        const browseResult = await session.browse("i=85"); // OPC UA Part 4: Services - Browse 서비스
        let robotNodeId = null;
        
        for (const ref of browseResult.references) {
            if (ref.browseName.name === "Robot") {
                robotNodeId = ref.nodeId;
                break;
            }
        }

        if (!robotNodeId) {
            throw new Error("Robot 객체를 찾을 수 없습니다.");
        }

        this.nodeIds.robot = robotNodeId.toString();
        console.log("🤖 Robot 객체 발견:", this.nodeIds.robot);

        const robotBrowseResult = await session.browse(robotNodeId); // OPC UA Part 4: Services - Browse 서비스
        
        for (const ref of robotBrowseResult.references) {
            const nodeName = ref.browseName.name;
            
            if (config.robot.jointNames.includes(nodeName)) {
                const jointBrowseResult = await session.browse(ref.nodeId); // OPC UA Part 3: Address Space Model - 계층적 탐색
                for (const jointRef of jointBrowseResult.references) {
                    if (jointRef.browseName.name === "CurrentPosition") {
                        this.nodeIds[`${nodeName}.CurrentPosition`] = jointRef.nodeId.toString();
                        console.log(`📍 ${nodeName}.CurrentPosition 발견`);
                        break;
                    }
                }
            } else if (nodeName === "MoveToPosition") {
                this.nodeIds.moveToPosition = ref.nodeId.toString();
                console.log("🛠️  MoveToPosition 메서드 발견");
            } else if (nodeName === "IsMoving") {
                this.nodeIds.isMoving = ref.nodeId.toString();
                console.log("🔄 IsMoving 변수 발견");
            }
        }
    }

    /**
     * 테스트 시퀀스 실행
     * @param {Object} session - OPC UA 세션
     */
    async runTests(session) {
        await this.readPositions(session); // OPC UA Part 4: Services - Read 서비스
        await this.testMovement(session); // OPC UA Part 4: Services - Call 서비스
        await this.readPositions(session);
        await this.moveToHome(session);
        await this.readPositions(session);
    }

    /**
     * 모든 관절의 현재 위치 읽기
     * @param {Object} session - OPC UA 세션
     */
    async readPositions(session) {
        console.log("\n📖 현재 관절 위치:");
        
        for (const jointName of config.robot.jointNames) {
            const nodeId = this.nodeIds[`${jointName}.CurrentPosition`];
            if (nodeId) {
                const result = await session.read({ // OPC UA Part 4: Services - Read 서비스
                    nodeId: nodeId,
                    attributeId: AttributeIds.Value // OPC UA Part 3: Address Space Model - 속성 접근
                });
                
                if (result.statusCode.isGood()) { // OPC UA Part 4: Services - 상태 코드 처리
                    console.log(`   ${jointName}: ${result.value.value}°`);
                } else {
                    console.log(`   ${jointName}: 읽기 실패 - ${result.statusCode.toString()}`);
                }
            }
        }
    }

    /**
     * 로봇 이동 테스트
     * @param {Object} session - OPC UA 세션
     */
    async testMovement(session) {
        console.log("\n🎯 로봇 이동 테스트:");
        
        if (!this.nodeIds.moveToPosition) {
            console.log("❌ MoveToPosition 메서드를 찾을 수 없습니다.");
            return;
        }
        
        const testPositions = [45, -30, 60, 0, -45, 90];
        console.log(`목표 위치: [${testPositions.join(', ')}]°`);

        try {
            const result = await session.call({ // OPC UA Part 4: Services - Call 서비스 (메서드 호출)
                objectId: this.nodeIds.robot,
                methodId: this.nodeIds.moveToPosition,
                inputArguments: [{ // OPC UA Part 5: Information Model - 메서드 인수 정의
                    dataType: "Double",
                    arrayType: "Array",
                    value: testPositions
                }]
            });

            if (result.statusCode.isGood() && result.outputArguments?.length > 0) { // OPC UA Part 4: Services - 응답 처리
                const success = result.outputArguments[0].value;
                console.log(`✅ 이동 ${success ? '성공' : '실패'}`);
            } else {
                console.log("❌ 메서드 호출 실패:", result.statusCode.toString());
            }
            
        } catch (error) {
            console.error("❌ 이동 중 예외 발생:", error.message);
        }
    }

    /**
     * 홈 포지션으로 이동
     * @param {Object} session - OPC UA 세션
     */
    async moveToHome(session) {
        console.log("\n🏠 홈 포지션으로 복귀:");
        
        if (!this.nodeIds.moveToPosition) return;

        try {
            const result = await session.call({ // OPC UA Part 4: Services - Call 서비스
                objectId: this.nodeIds.robot,
                methodId: this.nodeIds.moveToPosition,
                inputArguments: [{ // OPC UA Part 5: Information Model - 기본값 사용
                    dataType: "Double",
                    arrayType: "Array",
                    value: config.robot.defaultPositions
                }]
            });

            if (result.statusCode.isGood() && result.outputArguments?.length > 0) {
                const success = result.outputArguments[0].value;
                console.log(`✅ 홈 복귀 ${success ? '성공' : '실패'}`);
            }
        } catch (error) {
            console.error("❌ 홈 복귀 중 오류:", error.message);
        }
    }
}

/**
 * 메인 함수
 */
async function main() {
    const client = new RobotOPCUAClient();
    
    try {
        await client.connect(); // OPC UA Part 6: Mappings - TCP 연결 수립
    } catch (error) {
        console.error("❌ 클라이언트 오류:", error.message);
    }
}

main(); // OPC UA Part 1: Concepts - 애플리케이션 실행
