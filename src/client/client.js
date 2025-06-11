const { OPCUAClient, MessageSecurityMode, SecurityPolicy, AttributeIds } = require("node-opcua");
const config = require('../config/config');

/**
 * HCR 로봇 OPC UA 클라이언트 클래스
 */
class RobotOPCUAClient {
    constructor() {
        this.client = OPCUAClient.create({
            securityMode: MessageSecurityMode.None,
            securityPolicy: SecurityPolicy.None,
            endpointMustExist: false
        });
        
        this.nodeIds = {};
    }

    /**
     * 서버에 연결하고 테스트 수행
     */
    async connect() {
        console.log("🔗 로봇 서버에 연결 중...");
        
        await this.client.withSessionAsync(config.server.endpointUrl, async (session) => {
            console.log("✅ 연결 및 세션 생성 완료");
            
            await this.discoverNodes(session);
            await this.runTests(session);
        });
        
        console.log("🔌 연결 종료");
    }

    /**
     * 서버에서 노드들을 탐색하여 NodeId 수집
     * @param {Object} session - OPC UA 세션
     */
    async discoverNodes(session) {
        console.log("\n🔍 노드 탐색 중...");
        
        // Objects 폴더에서 Robot 객체 찾기
        const browseResult = await session.browse("i=85");
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

        // Robot 객체의 하위 노드들 탐색
        const robotBrowseResult = await session.browse(robotNodeId);
        
        for (const ref of robotBrowseResult.references) {
            const nodeName = ref.browseName.name;
            
            if (config.robot.jointNames.includes(nodeName)) {
                // 관절 객체의 CurrentPosition 변수 찾기
                const jointBrowseResult = await session.browse(ref.nodeId);
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
        // 1. 초기 상태 읽기
        await this.readPositions(session);
        
        // 2. 로봇 이동 테스트
        await this.testMovement(session);
        
        // 3. 결과 확인
        await this.readPositions(session);
        
        // 4. 홈 포지션으로 복귀
        await this.moveToHome(session);
        
        // 5. 최종 상태 확인
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
                const result = await session.read({
                    nodeId: nodeId,
                    attributeId: AttributeIds.Value
                });
                
                if (result.statusCode.isGood()) {
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
            const result = await session.call({
                objectId: this.nodeIds.robot,
                methodId: this.nodeIds.moveToPosition,
                inputArguments: [{
                    dataType: "Double",
                    arrayType: "Array",
                    value: testPositions
                }]
            });

            if (result.statusCode.isGood() && result.outputArguments?.length > 0) {
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
            const result = await session.call({
                objectId: this.nodeIds.robot,
                methodId: this.nodeIds.moveToPosition,
                inputArguments: [{
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
        await client.connect();
    } catch (error) {
        console.error("❌ 클라이언트 오류:", error.message);
    }
}

main();
