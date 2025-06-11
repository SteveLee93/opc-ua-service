const { SecurityPolicy, MessageSecurityMode, UserTokenType } = require('node-opcua');
const path = require('path');

/**
 * OPC UA Part 2 보안 설정
 * 산업용 보안 표준을 준수하는 설정들
 */
module.exports = {
    // 서버 보안 설정
    server: {
        // 기본 보안 포트 (표준 OPC UA 보안 포트)
        securePort: 4843,
        
        // 인증서 설정
        certificate: {
            // 인증서 폴더 경로
            rootFolder: path.join(__dirname, '../../certificates'),
            
            // 서버 인증서 설정
            serverName: "HCR_Robot_Server",
            applicationUri: "urn:hcr-robot-secure-server",
            
            // 인증서 자동 승인 설정 (개발/테스트용 - true로 변경)
            automaticallyAcceptUnknownCertificate: true,
            
            // 인증서 유효 기간 (일)
            certificateLifetime: 365,
            
            // 키 크기 (비트)
            keySize: 2048,
            
            // 조직 정보
            organizationInfo: {
                organizationName: "HCR Robotics",
                organizationalUnitName: "Automation Division",
                localityName: "Seoul",
                stateOrProvinceName: "Seoul",
                countryName: "KR"
            }
        },
        
        // 지원할 보안 정책들 (OPC UA Part 2 표준 준수)
        securityPolicies: [
            // 테스트 및 개발용 (운영 환경에서는 제거 권장)
            SecurityPolicy.None,
            
            // 기본 보안 정책들
            SecurityPolicy.Basic128Rsa15,
            SecurityPolicy.Basic256,
            
            // 권장 보안 정책 (SHA-256 기반)
            SecurityPolicy.Basic256Sha256,
            
            // 고급 보안 정책들 (최신 암호화 알고리즘)
            SecurityPolicy.Aes128_Sha256_RsaOaep,
            SecurityPolicy.Aes256_Sha256_RsaPss
        ],
        
        // 지원할 보안 모드들
        securityModes: [
            // 암호화 없음 (테스트용만)
            MessageSecurityMode.None,
            
            // 메시지 서명만
            MessageSecurityMode.Sign,
            
            // 메시지 서명 및 암호화 (권장)
            MessageSecurityMode.SignAndEncrypt
        ],
        
        // 권장 보안 정책 (클라이언트가 선택할 수 있는 최고 보안 수준)
        recommendedSecurityPolicy: SecurityPolicy.Basic256Sha256,
        recommendedSecurityMode: MessageSecurityMode.SignAndEncrypt
    },
    
    // 사용자 인증 설정
    authentication: {
        // 지원할 사용자 토큰 정책들
        userTokenPolicies: [
            // 익명 접근
            {
                tokenType: UserTokenType.Anonymous,
                securityPolicyUri: null
            },
            // None 정책에서 사용자명/비밀번호 인증 (암호화 없음)
            {
                tokenType: UserTokenType.UserName,
                securityPolicyUri: null,
                encryptionAlgorithm: null
            },
            // 보안 정책에서 사용자명/비밀번호 인증 (암호화됨)
            {
                tokenType: UserTokenType.UserName,
                securityPolicyUri: SecurityPolicy.Basic256Sha256,
                encryptionAlgorithm: "http://www.w3.org/2001/04/xmlenc#aes256-cbc"
            },
            // 인증서 기반 인증
            {
                tokenType: UserTokenType.Certificate,
                securityPolicyUri: SecurityPolicy.Basic256Sha256
            }
        ],
        
        // 기본 사용자 계정들 (운영 환경에서는 외부 시스템 사용 권장)
        defaultUsers: {
            operator: {
                password: 'operator123',
                role: 'Operator',
                permissions: ['read'],
                description: '운영자 - 데이터 읽기 권한'
            },
            engineer: {
                password: 'engineer123',
                role: 'Engineer', 
                permissions: ['read', 'write'],
                description: '엔지니어 - 데이터 읽기/쓰기 권한'
            },
            admin: {
                password: 'admin123',
                role: 'Administrator',
                permissions: ['read', 'write', 'admin', 'configure'],
                description: '관리자 - 모든 권한'
            }
        },
        
        // 비밀번호 정책
        passwordPolicy: {
            minLength: 8,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: true,
            requireSpecialChars: false,
            hashAlgorithm: 'sha256'
        },
        
        // 세션 설정
        session: {
            // 세션 타임아웃 (밀리초)
            timeout: 30000,
            
            // 최대 세션 수
            maxSessionCount: 100,
            
            // 최대 구독 수 (세션당)
            maxSubscriptionsPerSession: 50
        }
    },
    
    // 감사(Audit) 설정
    audit: {
        // 감사 로깅 활성화
        enabled: true,
        
        // 감사할 이벤트들
        events: {
            // 보안 관련 이벤트
            sessionActivated: true,
            sessionClosed: true,
            authenticationFailure: true,
            authenticationSuccess: true,
            certificateRejected: true,
            
            // 데이터 액세스 이벤트
            dataRead: false,  // 읽기는 너무 많아서 기본적으로 비활성화
            dataWrite: true,
            methodCall: true,
            
            // 시스템 이벤트
            serverStart: true,
            serverStop: true,
            configurationChange: true
        },
        
        // 로그 파일 설정
        logFile: {
            path: path.join(__dirname, '../../logs/security-audit.log'),
            maxSize: '10MB',
            maxFiles: 5,
            rotation: 'daily'
        }
    },
    
    // 네트워크 보안 설정
    network: {
        // 허용된 클라이언트 IP 범위 (비어있으면 모든 IP 허용)
        allowedIpRanges: [
            // '192.168.1.0/24',
            // '10.0.0.0/8'
        ],
        
        // 차단된 클라이언트 IP
        blockedIps: [],
        
        // 연결 제한
        connectionLimits: {
            // IP당 최대 연결 수
            maxConnectionsPerIp: 10,
            
            // 전체 최대 연결 수
            maxTotalConnections: 100,
            
            // 연결 시도 제한 (DDoS 방지)
            rateLimiting: {
                enabled: true,
                maxAttemptsPerMinute: 30
            }
        }
    },
    
    // 암호화 설정
    encryption: {
        // 최소 키 길이
        minKeyLength: 2048,
        
        // 지원할 암호화 알고리즘들
        supportedAlgorithms: [
            'RSA-OAEP',
            'RSA-PKCS1-V1_5',
            'AES-128-CBC',
            'AES-256-CBC'
        ],
        
        // 해시 알고리즘들
        supportedHashAlgorithms: [
            'SHA-1',    // 호환성을 위해 유지 (보안상 권장하지 않음)
            'SHA-256',  // 권장
            'SHA-384',
            'SHA-512'
        ]
    },
    
    // 개발/디버깅 설정
    debug: {
        // 보안 관련 로깅
        enableSecurityLogging: true,
        logSecurityEvents: true,
        logCertificateValidation: true,
        logUserAuthentication: true,
        
        // 개발 모드 (테스트용으로 true로 변경)
        developmentMode: true,
        
        // 테스트 인증서 허용 (개발 시에만 true)
        allowTestCertificates: true
    },
    
    // 컴플라이언스 설정
    compliance: {
        // OPC UA Part 2 보안 프로파일
        securityProfile: "Basic256Sha256",
        
        // IEC 62541 표준 준수
        iec62541Compliance: true,
        
        // 보안 요구사항 레벨 (테스트용으로 MEDIUM으로 변경)
        securityLevel: "MEDIUM", // LOW, MEDIUM, HIGH
        
        // 산업 표준 준수
        industryStandards: {
            isa99: true,    // ISA/IEC 62443 (산업 보안)
            nist: true,     // NIST Cybersecurity Framework
            iso27001: true // ISO 27001 정보보안
        }
    }
}; 