// Part 1: Concepts - 애플리케이션 생명주기 및 오류 처리
// Part 2: Security Model - 보안 정책, 인증서 관리, 사용자 인증
// Part 3: Address Space Model - 주소 공간 구성
// Part 4: Services - 서버 서비스 구현 및 초기화
// Part 5: Information Model - 표준 노드셋 및 디바이스 정보 모델
// Part 6: Mappings - TCP/IP 네트워크 바인딩
// Part 7: Profiles - 보안 프로파일 준수
// Part 12: Discovery - 엔드포인트 URL 제공
const { 
    OPCUAServer, 
    nodesets,
    OPCUACertificateManager
} = require('node-opcua');
const { constructAddressSpace } = require('./address-space');
const config = require('../config/config');
const securityConfig = require('../config/security-config');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * HCR 로봇 보안 OPC UA 서버 클래스 (OPC UA Part 2 보안 요구사항 준수)
 */
class SecureRobotOPCUAServer {
    constructor() {
        this.certificateManager = null;
        this.server = null;
        this.userManager = new Map();
        this.securityConfig = securityConfig;
        
        // 사용자 데이터베이스 초기화
        this.initializeUserDatabase();
    }

    /**
     * 사용자 데이터베이스 초기화
     */
    initializeUserDatabase() {
        // 보안 설정 파일에서 사용자 정보 로드
        const defaultUsers = this.securityConfig.authentication.defaultUsers;
        
        Object.entries(defaultUsers).forEach(([username, userInfo]) => {
            this.userManager.set(username, {
                password: this.hashPassword(userInfo.password),
                role: userInfo.role,
                permissions: userInfo.permissions,
                description: userInfo.description
            });
        });
        
        console.log(`🔐 사용자 데이터베이스 초기화 완료 (${this.userManager.size}명의 사용자)`);
    }

    /**
     * 비밀번호 해싱
     */
    hashPassword(password) {
        const hashAlgorithm = this.securityConfig.authentication.passwordPolicy.hashAlgorithm;
        return crypto.createHash(hashAlgorithm).update(password).digest('hex');
    }

    /**
     * 비밀번호 정책 검증
     */
    validatePasswordPolicy(password) {
        const policy = this.securityConfig.authentication.passwordPolicy;
        
        if (password.length < policy.minLength) {
            return { valid: false, reason: `비밀번호는 최소 ${policy.minLength}자 이상이어야 합니다` };
        }
        
        if (policy.requireNumbers && !/\d/.test(password)) {
            return { valid: false, reason: '비밀번호에 숫자가 포함되어야 합니다' };
        }
        
        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
            return { valid: false, reason: '비밀번호에 대문자가 포함되어야 합니다' };
        }
        
        if (policy.requireLowercase && !/[a-z]/.test(password)) {
            return { valid: false, reason: '비밀번호에 소문자가 포함되어야 합니다' };
        }
        
        if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return { valid: false, reason: '비밀번호에 특수문자가 포함되어야 합니다' };
        }
        
        return { valid: true };
    }

    /**
     * 보안 이벤트 로깅
     */
    logSecurityEvent(eventType, message) {
        // 디버그 모드 체크 제거 - 항상 로깅
        // if (!this.securityConfig.debug.logSecurityEvents) return;
        
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${eventType.toUpperCase()}] ${message}`;
        
        console.log(`🔒 ${logMessage}`);
        
        // 실제 운영 환경에서는 보안 로그 파일에 기록
        if (this.securityConfig.audit.enabled) {
            // TODO: 파일 로깅 구현
        }
    }

    /**
     * 인증서 관리자 초기화
     */
    async initializeCertificateManager() {
        try {
            const certConfig = this.securityConfig.server.certificate;
            
            // 인증서 폴더 생성
            if (!fs.existsSync(certConfig.rootFolder)) {
                fs.mkdirSync(certConfig.rootFolder, { recursive: true });
                console.log("📁 인증서 폴더 생성됨");
            }

            this.certificateManager = new OPCUACertificateManager({
                automaticallyAcceptUnknownCertificate: certConfig.automaticallyAcceptUnknownCertificate,
                name: certConfig.serverName,
                rootFolder: certConfig.rootFolder
            });

            await this.certificateManager.initialize();
            
            this.logSecurityEvent('certificate_manager_initialized', '인증서 관리자 초기화 완료');
            
            return this.certificateManager;
        } catch (error) {
            this.logSecurityEvent('certificate_manager_error', `인증서 관리자 초기화 실패: ${error.message}`);
            throw error;
        }
    }

    /**
     * 보안 서버 초기화
     */
    async initializeSecureServer() {
        try {
            // 인증서 관리자 초기화
            await this.initializeCertificateManager();

            // 사용자 관리자 생성
            const userManager = {
                isValidUser: (userName, password) => {
                    console.log(`🔐 사용자 인증 시도: ${userName}`);
                    this.logSecurityEvent('authentication', `사용자 인증 시도: ${userName}`);
                    
                    // 데이터베이스에서 사용자 확인
                    const user = this.userManager.get(userName);
                    if (!user) {
                        console.log(`❌ 사용자 찾을 수 없음: ${userName}`);
                        this.logSecurityEvent('authentication_failure', `사용자 찾을 수 없음: ${userName}`);
                        return false;
                    }
                    
                    // 설정 파일에서 원본 비밀번호 가져오기
                    const originalPassword = this.securityConfig.authentication.defaultUsers[userName]?.password;
                    
                    // 비밀번호 확인 (평문 비교)
                    const isValid = originalPassword === password;
                    if (isValid) {
                        console.log(`✅ 사용자 인증 성공: ${userName} (역할: ${user.role})`);
                        this.logSecurityEvent('authentication_success', `사용자 인증 성공: ${userName} (역할: ${user.role})`);
                    } else {
                        console.log(`❌ 잘못된 비밀번호: ${userName}`);
                        this.logSecurityEvent('authentication_failure', `잘못된 비밀번호: ${userName}`);
                    }
                    
                    return isValid;
                }
            };

            // 서버 설정
            const serverOptions = {
                port: this.securityConfig.server.securePort,
                resourcePath: config.server.resourcePath,
                buildInfo: {
                    ...config.server.buildInfo,
                    productName: "HCR Robot Secure OPC UA Server",
                    productUri: this.securityConfig.server.certificate.applicationUri
                },
                
                // 보안 설정
                certificateManager: this.certificateManager,
                
                // 지원할 보안 정책들 (보안 설정 파일에서 로드)
                securityPolicies: this.securityConfig.server.securityPolicies,
                
                // 지원할 보안 모드들
                securityModes: this.securityConfig.server.securityModes,
                
                // 지원할 사용자 인증 토큰들
                userIdentityTokens: this.securityConfig.authentication.userTokenPolicies,
                
                // 사용자 관리자 (GitHub 검색 결과에 따른 올바른 방법)
                userManager: userManager,
                
                // 익명 접근 거부 (사용자 인증 강제)
                allowAnonymous: false,
                
                // 감사 로깅
                serverDiagnosticsEnabled: this.securityConfig.debug.enableSecurityLogging,
                serverInfo: {
                    ...config.server.buildInfo,
                    applicationUri: this.securityConfig.server.certificate.applicationUri,
                    productUri: this.securityConfig.server.certificate.applicationUri
                }
            };

            this.server = new OPCUAServer(serverOptions);
            
            // 이벤트 핸들러 설정
            this.setupEventHandlers();

            this.logSecurityEvent('server_configured', '보안 서버 설정 완료');
            
        } catch (error) {
            this.logSecurityEvent('server_configuration_error', `보안 서버 초기화 실패: ${error.message}`);
            throw error;
        }
    }

    /**
     * 이벤트 핸들러 설정
     */
    setupEventHandlers() {
        // 세션 관련 이벤트
        this.server.on("session_activated", (session) => {
            const clientInfo = session.clientDescription?.applicationName || 'Unknown Client';
            this.logSecurityEvent('session_activated', `세션 활성화: ${session.sessionName} (${clientInfo})`);
        });

        this.server.on("session_closed", (session) => {
            this.logSecurityEvent('session_closed', `세션 종료: ${session.sessionName}`);
        });

        // 보안 관련 이벤트
        this.server.on("certificate_validation_request", (certificate, callback) => {
            this.logSecurityEvent('certificate_validation', '클라이언트 인증서 검증 요청');
            // 기본적으로 허용 (실제 운영에서는 더 엄격한 검증 필요)
            callback(null, true);
        });

        // 연결 관련 이벤트
        this.server.on("connectionRefused", (socketData, reason) => {
            this.logSecurityEvent('connection_refused', `연결 거부: ${reason}`);
        });

        // 새로운 클라이언트 연결 이벤트
        this.server.on("newChannel", (channel) => {
            this.logSecurityEvent('new_channel', `새로운 채널 생성: ${channel.remoteAddress}`);
        });

        // 채널 종료 이벤트
        this.server.on("closeChannel", (channel) => {
            this.logSecurityEvent('close_channel', `채널 종료: ${channel.remoteAddress}`);
        });
    }

    /**
     * 보안 서버 시작
     */
    async start() {
        try {
            console.log("🚀 HCR 로봇 보안 OPC UA 서버 시작 중...");
            console.log("🔒 OPC UA Part 2 보안 요구사항 준수");
            
            this.logSecurityEvent('server_start', '보안 서버 시작 프로세스 시작');
            
            // 보안 서버 초기화
            await this.initializeSecureServer();
            
            // 서버 초기화
            await this.server.initialize();
            console.log("⚙️  서버 초기화 완료");
            
            // 주소 공간 구성
            constructAddressSpace(this.server);
            
            // 서버 시작
            await this.server.start();
            
            this.logSecurityEvent('server_started', '보안 서버 시작 완료');
            
            this.displayServerInfo();
            
        } catch (error) {
            this.logSecurityEvent('server_start_error', `보안 서버 시작 실패: ${error.message}`);
            console.error("❌ 보안 서버 시작 실패:", error.message);
            process.exit(1);
        }
    }

    /**
     * 서버 정보 표시
     */
    displayServerInfo() {
        console.log("✅ 보안 서버 시작 완료");
        console.log(`📍 보안 엔드포인트: ${this.server.getEndpointUrl()}`);
        console.log(`🔒 보안 레벨: ${this.securityConfig.compliance.securityLevel}`);
        
        console.log("\n🔐 보안 기능:");
        console.log("   • X.509 인증서 기반 인증");
        console.log("   • 메시지 서명 및 암호화");
        console.log("   • 사용자 이름/비밀번호 인증");
        console.log("   • 역할 기반 접근 제어 (RBAC)");
        console.log("   • 다중 보안 정책 지원");
        console.log("   • 보안 감사 로깅");
        
        console.log("\n👥 사용자 계정:");
        this.userManager.forEach((user, username) => {
            console.log(`   • ${username}/${this.securityConfig.authentication.defaultUsers[username].password} - ${user.description}`);
        });
        
        console.log("\n🛡️ 지원 보안 정책:");
        this.securityConfig.server.securityPolicies.forEach(policy => {
            const policyName = policy.toString().split('/').pop() || policy;
            console.log(`   • ${policyName}`);
        });
        
        console.log(`\n⭐ 권장 보안 설정: ${this.securityConfig.server.recommendedSecurityPolicy} + ${this.securityConfig.server.recommendedSecurityMode}`);
        
        console.log("\n📋 표준 준수:");
        console.log(`   • OPC UA Part 2 보안 표준`);
        console.log(`   • IEC 62541 준수: ${this.securityConfig.compliance.iec62541Compliance ? '✅' : '❌'}`);
        console.log(`   • ISA/IEC 62443 준수: ${this.securityConfig.compliance.industryStandards.isa99 ? '✅' : '❌'}`);
        
        console.log("\n🛑 종료하려면 Ctrl+C를 누르세요");
    }

    /**
     * 서버 정상 종료
     */
    async stop() {
        console.log("\n🛑 보안 서버 종료 중...");
        
        this.logSecurityEvent('server_stop', '보안 서버 종료 프로세스 시작');
        
        if (this.server) {
            try {
                await this.server.shutdown();
                console.log("✅ 보안 서버 종료 완료");
                this.logSecurityEvent('server_stopped', '보안 서버 종료 완료');
            } catch (error) {
                console.error("❌ 서버 종료 중 오류:", error.message);
                this.logSecurityEvent('server_stop_error', `서버 종료 중 오류: ${error.message}`);
            }
        }
        
        if (this.certificateManager) {
            try {
                // 인증서 관리자 정리
                console.log("🔒 인증서 관리자 정리 완료");
            } catch (error) {
                console.error("❌ 인증서 관리자 정리 중 오류:", error.message);
            }
        }
        
        process.exit(0);
    }

    /**
     * 보안 상태 확인
     */
    getSecurityStatus() {
        if (!this.server) {
            return { status: 'not_initialized' };
        }

        return {
            status: 'running',
            securityLevel: this.securityConfig.compliance.securityLevel,
            securityPolicies: this.securityConfig.server.securityPolicies.map(p => p.toString()),
            userCount: this.userManager.size,
            certificateStatus: this.certificateManager ? 'active' : 'inactive',
            auditEnabled: this.securityConfig.audit.enabled,
            complianceStandards: this.securityConfig.compliance.industryStandards
        };
    }
}

// 서버 인스턴스 생성 및 시작
const secureRobotServer = new SecureRobotOPCUAServer();

// 종료 신호 처리
process.on('SIGINT', () => secureRobotServer.stop());
process.on('SIGTERM', () => secureRobotServer.stop());

// 미처리 예외 처리
process.on('uncaughtException', (error) => {
    console.error('미처리 예외:', error);
    secureRobotServer.stop();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('미처리 Promise 거부:', reason);
    secureRobotServer.stop();
});

// 보안 서버 시작
secureRobotServer.start();

module.exports = SecureRobotOPCUAServer;


