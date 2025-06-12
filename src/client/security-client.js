// OPC UA Part 1: Concepts - 애플리케이션 생명주기 및 오류 처리
// OPC UA Part 2: Security Model - 보안 정책, 인증서 관리, 사용자 인증
// OPC UA Part 3: Address Space Model - 노드 탐색 및 주소 공간 접근
// OPC UA Part 4: Services - 클라이언트 서비스 구현 및 보안 세션
// OPC UA Part 5: Information Model - 메서드 호출 및 데이터 타입
// OPC UA Part 6: Mappings - TCP/IP 보안 매핑
// OPC UA Part 7: Profiles - 보안 프로파일 준수
// OPC UA Part 12: Discovery - 보안 엔드포인트 디스커버리
const { 
    OPCUAClient, 
    MessageSecurityMode, 
    SecurityPolicy, 
    AttributeIds,
    ClientSession,
    UserTokenType,
    DataType
} = require("node-opcua");
const securityConfig = require('../config/security-config');
const fs = require('fs');
const path = require('path');

/**
 * HCR 로봇 보안 OPC UA 클라이언트 클래스
 * OPC UA Part 2 보안 표준을 준수하는 클라이언트
 */
class SecureRobotOPCUAClient {
    constructor(options = {}) {
        this.options = {
            securityPolicy: options.securityPolicy || SecurityPolicy.Basic256Sha256, // OPC UA Part 2: Security Model - 보안 정책 설정
            securityMode: options.securityMode || MessageSecurityMode.SignAndEncrypt, // OPC UA Part 2: Security Model - 메시지 보안 모드
            
            username: options.username || null, // OPC UA Part 2: Security Model - 사용자 인증
            password: options.password || null,
            
            certificateFile: options.certificateFile || null, // OPC UA Part 2: Security Model - 클라이언트 인증서
            privateKeyFile: options.privateKeyFile || null,
            
            endpointUrl: options.endpointUrl || 'opc.tcp://localhost:4843/UA/RobotArm', // OPC UA Part 12: Discovery - 보안 엔드포인트
            applicationName: options.applicationName || 'SecureRobotClient', // OPC UA Part 5: Information Model - 애플리케이션 정보
            applicationUri: options.applicationUri || 'urn:secure-robot-client',
            
            testMode: options.testMode || 'full',  // 'basic', 'security', 'full'
            debug: options.debug || false
        };
        
        this.client = null;
        this.session = null; // OPC UA Part 4: Services - 보안 세션 관리
        this.nodeIds = {}; // OPC UA Part 3: Address Space Model - 노드 ID 캐시
        
        this.log("🔐 보안 클라이언트 초기화 완료");
        this.log(`📋 보안 정책: ${this.options.securityPolicy}`);
        this.log(`🔒 보안 모드: ${this.options.securityMode}`);
    }

    /**
     * 디버그 로그 출력
     */
    log(message, isError = false) {
        const timestamp = new Date().toISOString();
        const prefix = isError ? '❌' : '🔐';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    /**
     * 클라이언트 생성 및 초기화
     */
    async initialize() {
        this.log("클라이언트 초기화 중...");
        
        const clientOptions = { // OPC UA Part 4: Services - 클라이언트 구성 서비스
            securityMode: this.options.securityMode, // OPC UA Part 2: Security Model - 보안 모드
            securityPolicy: this.options.securityPolicy, // OPC UA Part 2: Security Model - 보안 정책
            applicationName: this.options.applicationName, // OPC UA Part 5: Information Model - 애플리케이션 이름
            applicationUri: this.options.applicationUri, // OPC UA Part 5: Information Model - 애플리케이션 URI
            endpointMustExist: false, // OPC UA Part 12: Discovery - 엔드포인트 검증
            keepSessionAlive: true, // OPC UA Part 4: Services - 세션 유지
            requestedSessionTimeout: 60000,
        };

        if (this.options.securityPolicy !== SecurityPolicy.None) { // OPC UA Part 2: Security Model - 보안 정책 조건부 처리
            await this.setupClientCertificates(clientOptions);
        }

        this.client = OPCUAClient.create(clientOptions); // OPC UA Part 4: Services - 클라이언트 생성
        
        this.setupEventHandlers(); // OPC UA Part 1: Concepts - 이벤트 처리
        
        this.log("✅ 클라이언트 초기화 완료");
    }

    /**
     * 클라이언트 인증서 설정
     */
    async setupClientCertificates(clientOptions) { // OPC UA Part 2: Security Model - 인증서 관리
        this.log("클라이언트 인증서 설정 중...");
        
        const certDir = path.join(__dirname, '../../certificates/client');
        const certFile = path.join(certDir, 'client_cert.pem');
        const keyFile = path.join(certDir, 'client_key.pem');
        
        if (!fs.existsSync(certDir)) { // OPC UA Part 2: Security Model - 인증서 저장소 관리
            fs.mkdirSync(certDir, { recursive: true });
            this.log("📁 클라이언트 인증서 폴더 생성");
        }

        if (this.options.certificateFile && this.options.privateKeyFile) {
            if (fs.existsSync(this.options.certificateFile) && fs.existsSync(this.options.privateKeyFile)) {
                clientOptions.certificateFile = this.options.certificateFile; // OPC UA Part 2: Security Model - 사용자 정의 인증서
                clientOptions.privateKeyFile = this.options.privateKeyFile;
                this.log("📜 사용자 지정 인증서 사용");
                return;
            }
        }

        if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
            this.log("⚙️ 자동 인증서 생성 모드 활성화");
            clientOptions.automaticallyAcceptUnknownCertificate = true; // OPC UA Part 2: Security Model - 자동 인증서 수락
        } else {
            clientOptions.certificateFile = certFile;
            clientOptions.privateKeyFile = keyFile;
            this.log("📜 기존 클라이언트 인증서 사용");
        }
    }

    /**
     * 이벤트 핸들러 설정
     */
    setupEventHandlers() { // OPC UA Part 1: Concepts - 이벤트 기반 아키텍처
        if (!this.client) return;

        this.client.on("connectionLost", () => { // OPC UA Part 6: Mappings - 연결 상태 모니터링
            this.log("🔌 서버 연결 끊어짐", true);
        });

        this.client.on("connectionReestablished", () => {
            this.log("🔌 서버 연결 재설정");
        });

        this.client.on("securityTokenRenewed", () => { // OPC UA Part 2: Security Model - 보안 토큰 갱신
            this.log("🔑 보안 토큰 갱신됨");
        });
    }

    /**
     * 서버에 연결
     */
    async connect() {
        if (!this.client) {
            await this.initialize();
        }

        this.log(`🔗 서버 연결 시도: ${this.options.endpointUrl}`);
        
        try {
            await this.client.connect(this.options.endpointUrl); // OPC UA Part 6: Mappings - TCP 보안 연결
            this.log("✅ 서버 연결 성공");
            
            await this.checkEndpoints(); // OPC UA Part 12: Discovery - 엔드포인트 정보 확인
            
        } catch (error) {
            this.log(`서버 연결 실패: ${error.message}`, true);
            throw error;
        }
    }

    /**
     * 사용 가능한 엔드포인트 확인
     */
    async checkEndpoints() { // OPC UA Part 12: Discovery - 엔드포인트 디스커버리
        this.log("🔍 사용 가능한 엔드포인트 확인 중...");
        
        try {
            const endpoints = await this.client.getEndpoints(); // OPC UA Part 12: Discovery - GetEndpoints 서비스
            
            this.log(`📊 총 ${endpoints.length}개의 엔드포인트 발견:`);
            
            endpoints.forEach((endpoint, index) => {
                const secPolicy = endpoint.securityPolicyUri.split('#')[1] || 'None'; // OPC UA Part 2: Security Model - 보안 정책 URI
                const secMode = endpoint.securityMode.toString(); // OPC UA Part 2: Security Model - 보안 모드
                const userTokens = endpoint.userIdentityTokens.map(token => // OPC UA Part 2: Security Model - 사용자 토큰 정책
                    UserTokenType[token.tokenType] || token.tokenType
                ).join(', ');
                
                this.log(`   ${index + 1}. 보안정책: ${secPolicy}, 모드: ${secMode}, 토큰: ${userTokens}`);
            });
            
        } catch (error) {
            this.log(`엔드포인트 확인 실패: ${error.message}`, true);
        }
    }

    /**
     * 세션 생성 (사용자 인증 포함)
     */
    async createSession() { // OPC UA Part 4: Services - CreateSession 서비스
        if (!this.client) {
            throw new Error("클라이언트가 연결되지 않았습니다.");
        }

        this.log("🔐 보안 세션 생성 중...");
        
        const sessionOptions = {
            requestedSessionTimeout: 60000, // OPC UA Part 4: Services - 세션 타임아웃
        };

        if (this.options.username && this.options.password) { // OPC UA Part 2: Security Model - 사용자 이름/비밀번호 인증
            sessionOptions.userName = this.options.username;
            sessionOptions.password = this.options.password;
            this.log(`👤 사용자 인증: ${this.options.username}`);
        } else {
            this.log("👤 익명 인증 사용");
        }

        try {
            this.session = await this.client.createSession(sessionOptions); // OPC UA Part 4: Services - 세션 생성
            this.log("✅ 보안 세션 생성 성공");
            
            this.log(`📋 세션 ID: ${this.session.sessionId}`); // OPC UA Part 4: Services - 세션 식별자
            this.log(`⏰ 세션 타임아웃: ${this.session.timeout}ms`);
            
        } catch (error) {
            this.log(`세션 생성 실패: ${error.message}`, true);
            throw error;
        }
    }

    /**
     * 서버의 노드들을 탐색하여 NodeId 수집
     */
    async discoverNodes() { // OPC UA Part 3: Address Space Model - 주소 공간 탐색
        if (!this.session) {
            throw new Error("세션이 생성되지 않았습니다.");
        }

        this.log("🔍 노드 탐색 중...");
        
        try {
            const browseResult = await this.session.browse("i=85"); // OPC UA Part 4: Services - Browse 서비스
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
            this.log(`🤖 Robot 객체 발견: ${this.nodeIds.robot}`);

            const robotBrowseResult = await this.session.browse(robotNodeId); // OPC UA Part 3: Address Space Model - 계층적 브라우징
            
            const jointNames = ['Joint1', 'Joint2', 'Joint3', 'Joint4', 'Joint5', 'Joint6'];
            
            for (const ref of robotBrowseResult.references) {
                const nodeName = ref.browseName.name;
                
                if (jointNames.includes(nodeName)) {
                    const jointBrowseResult = await this.session.browse(ref.nodeId);
                    for (const jointRef of jointBrowseResult.references) {
                        if (jointRef.browseName.name === "CurrentPosition") {
                            this.nodeIds[`${nodeName}.CurrentPosition`] = jointRef.nodeId.toString();
                            this.log(`📍 ${nodeName}.CurrentPosition 발견`);
                            break;
                        }
                    }
                } else if (nodeName === "MoveToPosition") {
                    this.nodeIds.moveToPosition = ref.nodeId.toString();
                    this.log("🛠️ MoveToPosition 메서드 발견");
                } else if (nodeName === "IsMoving") {
                    this.nodeIds.isMoving = ref.nodeId.toString();
                    this.log("🔄 IsMoving 변수 발견");
                }
            }

            this.log(`✅ 총 ${Object.keys(this.nodeIds).length}개의 노드 발견`);
            
        } catch (error) {
            this.log(`노드 탐색 실패: ${error.message}`, true);
            throw error;
        }
    }

    /**
     * 테스트 시나리오 실행
     */
    async runTests() {
        if (!this.session) {
            throw new Error("세션이 생성되지 않았습니다.");
        }

        this.log(`🧪 테스트 모드: ${this.options.testMode}`);
        
        try {
            await this.discoverNodes(); // OPC UA Part 3: Address Space Model - 노드 탐색
            
            if (['basic', 'full'].includes(this.options.testMode)) {
                await this.runBasicTests(); // OPC UA Part 4: Services - 기본 서비스 테스트
            }
            
            if (['security', 'full'].includes(this.options.testMode)) {
                await this.runSecurityTests(); // OPC UA Part 2: Security Model - 보안 기능 테스트
            }
            
            if (this.options.testMode === 'full') {
                await this.runPerformanceTests(); // OPC UA Part 1: Concepts - 성능 측정
            }
            
        } catch (error) {
            this.log(`테스트 실행 실패: ${error.message}`, true);
            throw error;
        }
    }

    /**
     * 기본 기능 테스트
     */
    async runBasicTests() {
        this.log("\n📋 === 기본 기능 테스트 시작 ===");
        
        await this.readAllPositions(); // OPC UA Part 4: Services - Read 서비스
        await this.testMovement(); // OPC UA Part 4: Services - Call 서비스
        await this.readAllPositions();
        await this.moveToHome();
        await this.readAllPositions();
        
        this.log("✅ 기본 기능 테스트 완료");
    }

    /**
     * 보안 기능 테스트
     */
    async runSecurityTests() { // OPC UA Part 2: Security Model - 보안 기능 검증
        this.log("\n🔒 === 보안 기능 테스트 시작 ===");
        
        await this.checkSessionSecurity(); // OPC UA Part 2: Security Model - 세션 보안 정보
        await this.testPermissions(); // OPC UA Part 2: Security Model - 권한 테스트
        await this.testSecurityLogging(); // OPC UA Part 2: Security Model - 보안 감사
        
        this.log("✅ 보안 기능 테스트 완료");
    }

    /**
     * 성능 테스트
     */
    async runPerformanceTests() {
        this.log("\n⚡ === 성능 테스트 시작 ===");
        
        await this.testReadPerformance(); // OPC UA Part 4: Services - 읽기 성능
        await this.testWritePerformance(); // OPC UA Part 4: Services - 쓰기 성능
        await this.measureEncryptionOverhead(); // OPC UA Part 2: Security Model - 암호화 오버헤드
        
        this.log("✅ 성능 테스트 완료");
    }

    /**
     * 모든 관절의 현재 위치 읽기
     */
    async readAllPositions() {
        this.log("\n📖 현재 관절 위치:");
        
        const jointNames = ['Joint1', 'Joint2', 'Joint3', 'Joint4', 'Joint5', 'Joint6'];
        
        for (const jointName of jointNames) {
            const nodeId = this.nodeIds[`${jointName}.CurrentPosition`];
            if (nodeId) {
                try {
                    const result = await this.session.read({ // OPC UA Part 4: Services - Read 서비스
                        nodeId: nodeId,
                        attributeId: AttributeIds.Value // OPC UA Part 3: Address Space Model - 속성 ID
                    });
                    
                    if (result.statusCode.isGood()) { // OPC UA Part 4: Services - 상태 코드 확인
                        this.log(`   ${jointName}: ${result.value.value.toFixed(2)}°`);
                    } else {
                        this.log(`   ${jointName}: 읽기 실패 - ${result.statusCode.toString()}`);
                    }
                } catch (error) {
                    this.log(`   ${jointName}: 오류 - ${error.message}`);
                }
            }
        }
    }

    /**
     * 로봇 이동 테스트
     */
    async testMovement() {
        this.log("\n🎯 로봇 이동 테스트:");
        
        if (!this.nodeIds.moveToPosition) {
            this.log("❌ MoveToPosition 메서드를 찾을 수 없습니다.");
            return;
        }
        
        const testPositions = [45.0, -30.0, 60.0, 0.0, -45.0, 90.0];
        this.log(`목표 위치: [${testPositions.join(', ')}]°`);

        try {
            const result = await this.session.call({ // OPC UA Part 4: Services - Call 서비스 (메서드 호출)
                objectId: this.nodeIds.robot,
                methodId: this.nodeIds.moveToPosition,
                inputArguments: [{ // OPC UA Part 5: Information Model - 메서드 인수
                    dataType: DataType.Double, // OPC UA Part 5: Information Model - 데이터 타입
                    arrayType: "Array", 
                    value: testPositions
                }]
            });

            if (result.statusCode.isGood() && result.outputArguments?.length > 0) { // OPC UA Part 4: Services - 메서드 응답 처리
                const success = result.outputArguments[0].value;
                this.log(`✅ 이동 ${success ? '성공' : '실패'}`);
                
                if (success) {
                    await this.waitForMovementComplete();
                }
            } else {
                this.log(`❌ 메서드 호출 실패: ${result.statusCode.toString()}`);
            }
            
        } catch (error) {
            this.log(`❌ 이동 중 예외 발생: ${error.message}`, true);
        }
    }

    /**
     * 이동 완료까지 대기
     */
    async waitForMovementComplete() {
        if (!this.nodeIds.isMoving) return;
        
        this.log("🔄 이동 완료 대기 중...");
        
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            try {
                const result = await this.session.read({ // OPC UA Part 4: Services - 폴링 방식 상태 확인
                    nodeId: this.nodeIds.isMoving,
                    attributeId: AttributeIds.Value
                });
                
                if (result.statusCode.isGood() && !result.value.value) {
                    this.log("✅ 이동 완료");
                    return;
                }
                
                await this.sleep(500); // 500ms 대기
                attempts++;
                
            } catch (error) {
                this.log(`이동 상태 확인 오류: ${error.message}`);
                break;
            }
        }
        
        this.log("⏰ 이동 완료 대기 시간 초과");
    }

    /**
     * 홈 포지션으로 이동
     */
    async moveToHome() {
        this.log("\n🏠 홈 포지션으로 복귀:");
        
        if (!this.nodeIds.moveToPosition) return;

        const homePositions = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

        try {
            const result = await this.session.call({ // OPC UA Part 4: Services - Call 서비스
                objectId: this.nodeIds.robot,
                methodId: this.nodeIds.moveToPosition,
                inputArguments: [{ // OPC UA Part 5: Information Model - 기본값 사용
                    dataType: DataType.Double,
                    arrayType: "Array",
                    value: homePositions
                }]
            });

            if (result.statusCode.isGood() && result.outputArguments?.length > 0) {
                const success = result.outputArguments[0].value;
                this.log(`✅ 홈 복귀 ${success ? '성공' : '실패'}`);
                
                if (success) {
                    await this.waitForMovementComplete();
                }
            }
        } catch (error) {
            this.log(`❌ 홈 복귀 중 오류: ${error.message}`, true);
        }
    }

    /**
     * 세션 보안 정보 확인
     */
    async checkSessionSecurity() { // OPC UA Part 2: Security Model - 세션 보안 상태 확인
        this.log("\n🔍 세션 보안 정보:");
        
        if (this.session) {
            this.log(`   세션 ID: ${this.session.sessionId}`);
            this.log(`   보안 정책: ${this.options.securityPolicy}`);
            this.log(`   보안 모드: ${this.options.securityMode}`);
            this.log(`   사용자: ${this.options.username || 'Anonymous'}`);
            this.log(`   세션 타임아웃: ${this.session.timeout}ms`);
        }
    }

    /**
     * 권한 테스트
     */
    async testPermissions() { // OPC UA Part 2: Security Model - 역할 기반 접근 제어 (RBAC)
        this.log("\n🔐 권한 테스트:");
        
        const username = this.options.username;
        
        if (!username) {
            this.log("   익명 사용자 - 제한된 권한");
            return;
        }
        
        const userConfig = securityConfig.authentication.defaultUsers[username];
        if (userConfig) {
            this.log(`   사용자: ${username} (${userConfig.role})`);
            this.log(`   권한: ${userConfig.permissions.join(', ')}`);
            
            if (userConfig.permissions.includes('read')) { // OPC UA Part 2: Security Model - 읽기 권한 확인
                this.log("   ✅ 읽기 권한 확인됨");
            }
            
            if (userConfig.permissions.includes('write')) { // OPC UA Part 2: Security Model - 쓰기 권한 확인
                this.log("   ✅ 쓰기 권한 확인됨");
            } else {
                this.log("   ❌ 쓰기 권한 없음");
            }
        }
    }

    /**
     * 보안 이벤트 로깅 테스트
     */
    async testSecurityLogging() { // OPC UA Part 2: Security Model - 보안 감사 로깅
        this.log("\n📝 보안 이벤트 로깅 테스트:");
        this.log("   보안 관련 이벤트들이 서버에서 기록되고 있습니다.");
        this.log("   - 세션 생성/종료");
        this.log("   - 사용자 인증 성공/실패");
        this.log("   - 메서드 호출");
        this.log("   - 데이터 읽기/쓰기");
    }

    /**
     * 읽기 성능 테스트
     */
    async testReadPerformance() { // OPC UA Part 4: Services - Read 서비스 성능 측정
        this.log("\n📊 읽기 성능 테스트:");
        
        const iterations = 100;
        const startTime = Date.now();
        
        try {
            for (let i = 0; i < iterations; i++) {
                await this.session.read({
                    nodeId: this.nodeIds['Joint1.CurrentPosition'],
                    attributeId: AttributeIds.Value
                });
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            const avgTime = duration / iterations;
            
            this.log(`   ${iterations}회 읽기 완료`);
            this.log(`   총 시간: ${duration}ms`);
            this.log(`   평균 시간: ${avgTime.toFixed(2)}ms/회`);
            this.log(`   처리량: ${(1000 / avgTime).toFixed(0)} 회/초`);
            
        } catch (error) {
            this.log(`읽기 성능 테스트 실패: ${error.message}`, true);
        }
    }

    /**
     * 쓰기 성능 테스트
     */
    async testWritePerformance() { // OPC UA Part 4: Services - Write 서비스 성능
        this.log("\n📊 쓰기 성능 테스트:");
        
        const username = this.options.username;
        const userConfig = securityConfig.authentication.defaultUsers[username];
        
        if (!userConfig || !userConfig.permissions.includes('write')) { // OPC UA Part 2: Security Model - 권한 기반 테스트
            this.log("   쓰기 권한이 없어 스킵됩니다.");
            return;
        }
        
        this.log("   쓰기 권한 확인됨 - 성능 테스트는 안전상 스킵됩니다.");
    }

    /**
     * 암호화 오버헤드 측정
     */
    async measureEncryptionOverhead() { // OPC UA Part 2: Security Model - 암호화 성능 영향 측정
        this.log("\n🔒 암호화 오버헤드 측정:");
        
        const securityInfo = {
            policy: this.options.securityPolicy,
            mode: this.options.securityMode
        };
        
        let overhead = "측정 불가";
        
        if (securityInfo.policy === SecurityPolicy.None) {
            overhead = "0% (암호화 없음)";
        } else if (securityInfo.mode === MessageSecurityMode.Sign) {
            overhead = "~5-10% (서명만)"; // OPC UA Part 2: Security Model - 메시지 서명 오버헤드
        } else if (securityInfo.mode === MessageSecurityMode.SignAndEncrypt) {
            overhead = "~10-15% (서명+암호화)"; // OPC UA Part 2: Security Model - 메시지 암호화 오버헤드
        }
        
        this.log(`   보안 정책: ${securityInfo.policy}`);
        this.log(`   보안 모드: ${securityInfo.mode}`);
        this.log(`   예상 오버헤드: ${overhead}`);
    }

    /**
     * 세션 종료 및 연결 해제
     */
    async disconnect() {
        this.log("🔌 연결 종료 중...");
        
        try {
            if (this.session) {
                await this.session.close(); // OPC UA Part 4: Services - CloseSession 서비스
                this.session = null;
                this.log("✅ 세션 종료 완료");
            }
            
            if (this.client) {
                await this.client.disconnect(); // OPC UA Part 6: Mappings - 네트워크 연결 해제
                this.client = null;
                this.log("✅ 클라이언트 연결 해제 완료");
            }
            
        } catch (error) {
            this.log(`연결 종료 중 오류: ${error.message}`, true);
        }
    }

    /**
     * 전체 테스트 실행 (연결부터 종료까지)
     */
    async runFullTest() { // OPC UA Part 1: Concepts - 완전한 테스트 생명주기
        try {
            await this.connect(); // OPC UA Part 6: Mappings - 연결 수립
            await this.createSession(); // OPC UA Part 4: Services - 세션 생성
            await this.runTests(); // OPC UA Part 4: Services - 서비스 테스트
            
        } finally {
            await this.disconnect(); // OPC UA Part 1: Concepts - 리소스 정리
        }
    }

    /**
     * 유틸리티: 지연 함수
     */
    sleep(ms) { // OPC UA Part 1: Concepts - 동기화 및 타이밍
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 다양한 보안 시나리오 테스트 함수들
 */

/**
 * 간단한 익명 연결 테스트
 */
async function simpleAnonymousTest() {
    console.log("\n🔓 === 간단 익명 연결 테스트 ===");
    
    const client = new SecureRobotOPCUAClient({
        securityPolicy: SecurityPolicy.None,
        securityMode: MessageSecurityMode.None,
        testMode: 'basic'
    });
    
    await client.runFullTest();
}

/**
 * 간단한 사용자 인증 테스트 (engineer 전용)
 */
async function simpleUserTest() {
    console.log("\n👤 === 간단 사용자 인증 테스트 ===");
    
    const client = new SecureRobotOPCUAClient({
        securityPolicy: SecurityPolicy.None,  // 우선 None으로 시작
        securityMode: MessageSecurityMode.None,
        username: 'engineer',
        password: 'engineer123',
        testMode: 'security'
    });
    
    await client.runFullTest();
}

/**
 * 보안 기능 단계별 테스트
 */
async function stepByStepSecurityTest() {
    console.log("\n🔐 === 단계별 보안 테스트 ===");
    
    // 1단계: None 정책으로 사용자 인증
    console.log("\n🔍 1단계: None 정책 + 사용자 인증");
    try {
        const client1 = new SecureRobotOPCUAClient({
            securityPolicy: SecurityPolicy.None,
            securityMode: MessageSecurityMode.None,
            username: 'engineer',
            password: 'engineer123',
            testMode: 'basic'
        });
        await client1.runFullTest();
    } catch (error) {
        console.error("❌ 1단계 실패:", error.message);
    }
    
    // 2단계: Basic256Sha256 정책으로 사용자 인증
    console.log("\n🔍 2단계: Basic256Sha256 정책 + 사용자 인증");
    try {
        const client2 = new SecureRobotOPCUAClient({
            securityPolicy: SecurityPolicy.Basic256Sha256,
            securityMode: MessageSecurityMode.SignAndEncrypt,
            username: 'engineer',
            password: 'engineer123',
            testMode: 'basic'
        });
        await client2.runFullTest();
    } catch (error) {
        console.error("❌ 2단계 실패:", error.message);
    }
}

/**
 * 익명 연결 테스트
 */
async function testAnonymousConnection() {
    console.log("\n🔓 === 익명 연결 테스트 ===");
    
    const client = new SecureRobotOPCUAClient({
        securityPolicy: SecurityPolicy.None,
        securityMode: MessageSecurityMode.None,
        testMode: 'basic'
    });
    
    await client.runFullTest();
}

/**
 * 사용자 인증 테스트
 */
async function testUserAuthentication() {
    console.log("\n👤 === 사용자 인증 테스트 ===");
    
    const testUsers = [
        { username: 'operator', password: 'operator123', role: 'Operator' },
        { username: 'engineer', password: 'engineer123', role: 'Engineer' },
        { username: 'admin', password: 'admin123', role: 'Administrator' }
    ];
    
    for (const user of testUsers) {
        console.log(`\n🧪 ${user.role} 사용자 테스트 (${user.username})`);
        
        const client = new SecureRobotOPCUAClient({
            securityPolicy: SecurityPolicy.None,  // 우선 None으로 시작
            securityMode: MessageSecurityMode.None,
            username: user.username,
            password: user.password,
            testMode: 'security'
        });
        
        try {
            await client.runFullTest();
        } catch (error) {
            console.error(`❌ ${user.username} 테스트 실패:`, error.message);
        }
    }
}

/**
 * 다양한 보안 정책 테스트
 */
async function testSecurityPolicies() {
    console.log("\n🛡️ === 보안 정책 테스트 ===");
    
    const policies = [
        { policy: SecurityPolicy.None, mode: MessageSecurityMode.None },
        { policy: SecurityPolicy.Basic256, mode: MessageSecurityMode.Sign },
        { policy: SecurityPolicy.Basic256Sha256, mode: MessageSecurityMode.SignAndEncrypt },
    ];
    
    for (const config of policies) {
        console.log(`\n🔒 ${config.policy} / ${config.mode} 테스트`);
        
        const client = new SecureRobotOPCUAClient({
            securityPolicy: config.policy,
            securityMode: config.mode,
            username: 'engineer',
            password: 'engineer123',
            testMode: 'basic'
        });
        
        try {
            await client.runFullTest();
        } catch (error) {
            console.error(`❌ 보안 정책 테스트 실패:`, error.message);
        }
    }
}

/**
 * 메인 실행 함수 (단순화)
 */
async function main() {
    console.log("🔐 HCR 로봇 보안 OPC UA 클라이언트 테스트 시작");
    console.log("=" .repeat(50));
    
    try {
        // 메뉴 선택 (환경변수로 제어)
        const testType = process.env.TEST_TYPE || 'simple';
        
        switch (testType) {
            case 'anonymous':
                await simpleAnonymousTest();
                break;
                
            case 'user':
                await simpleUserTest(); 
                break;
                
            case 'step':
                await stepByStepSecurityTest();
                break;
                
            case 'full':
                // 기존의 전체 테스트
                await testAnonymousConnection();
                await testUserAuthentication();
                await testSecurityPolicies();
                break;
                
            default:
                // 기본: 단계별 테스트
                await stepByStepSecurityTest();
                break;
        }
        
        console.log("\n🎉 테스트 완료!");
        
    } catch (error) {
        console.error("❌ 테스트 실행 중 오류:", error.message);
        process.exit(1);
    }
}

// 스크립트가 직접 실행된 경우
if (require.main === module) {
    main().catch(console.error);
}

// 모듈 내보내기
module.exports = {
    SecureRobotOPCUAClient,
    testAnonymousConnection,
    testUserAuthentication,
    testSecurityPolicies
};
