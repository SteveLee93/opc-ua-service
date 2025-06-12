// OPC UA Part 2: Security Model - 보안 정책, 인증서 관리, 사용자 인증
// OPC UA Part 6: Mappings - 네트워크 보안 매핑
// OPC UA Part 7: Profiles - 보안 프로파일 준수
const { SecurityPolicy, MessageSecurityMode, UserTokenType } = require('node-opcua');
const path = require('path');

/**
 * OPC UA Part 2 보안 설정
 * 산업용 보안 표준을 준수하는 설정들
 */
module.exports = {
    // OPC UA Part 2: Security Model - 서버 보안 구성
    server: {
        // OPC UA Part 6: Mappings - 보안 TCP 포트 매핑
        securePort: 4843,
        
        // OPC UA Part 2: Security Model - X.509 인증서 관리
        certificate: {
            // OPC UA Part 2: Security Model - 인증서 저장소
            rootFolder: path.join(__dirname, '../../certificates'),
            
            // OPC UA Part 2: Security Model - 서버 인증서 식별
            serverName: "HCR_Robot_Server",
            applicationUri: "urn:hcr-robot-secure-server",
            
            // OPC UA Part 2: Security Model - 인증서 신뢰 정책
            automaticallyAcceptUnknownCertificate: true,
            
            // OPC UA Part 2: Security Model - 인증서 유효 기간
            certificateLifetime: 365,
            
            // OPC UA Part 2: Security Model - 암호화 키 길이
            keySize: 2048,
            
            // OPC UA Part 2: Security Model - 인증서 주체 정보
            organizationInfo: {
                organizationName: "HCR Robotics",
                organizationalUnitName: "Automation Division",
                localityName: "Seoul",
                stateOrProvinceName: "Seoul",
                countryName: "KR"
            }
        },
        
        // OPC UA Part 2: Security Model - 지원 보안 정책 목록
        securityPolicies: [
            // OPC UA Part 2: Security Model - 암호화 없음 (테스트용)
            SecurityPolicy.None,
            
            // OPC UA Part 2: Security Model - 기본 RSA 암호화
            SecurityPolicy.Basic128Rsa15,
            // OPC UA Part 2: Security Model - AES-256 암호화
            SecurityPolicy.Basic256,
            
            // OPC UA Part 2: Security Model - SHA-256 해시 기반
            SecurityPolicy.Basic256Sha256,
            
            // OPC UA Part 2: Security Model - 고급 AES-128 암호화
            SecurityPolicy.Aes128_Sha256_RsaOaep,
            // OPC UA Part 2: Security Model - 최신 AES-256 암호화
            SecurityPolicy.Aes256_Sha256_RsaPss
        ],
        
        // OPC UA Part 2: Security Model - 메시지 보안 모드
        securityModes: [
            // OPC UA Part 2: Security Model - 보안 없음
            MessageSecurityMode.None,
            
            // OPC UA Part 2: Security Model - 메시지 서명
            MessageSecurityMode.Sign,
            
            // OPC UA Part 2: Security Model - 서명 및 암호화
            MessageSecurityMode.SignAndEncrypt
        ],
        
        // OPC UA Part 7: Profiles - 권장 보안 프로파일
        recommendedSecurityPolicy: SecurityPolicy.Basic256Sha256,
        recommendedSecurityMode: MessageSecurityMode.SignAndEncrypt
    },
    
    // OPC UA Part 2: Security Model - 사용자 인증 정책
    authentication: {
        // OPC UA Part 2: Security Model - 사용자 토큰 정책 목록
        userTokenPolicies: [
            // OPC UA Part 2: Security Model - 익명 접근
            {
                tokenType: UserTokenType.Anonymous,
                securityPolicyUri: null
            },
            // OPC UA Part 2: Security Model - 사용자명/비밀번호 인증
            {
                tokenType: UserTokenType.UserName,
                securityPolicyUri: null,
                encryptionAlgorithm: null
            },
            // OPC UA Part 2: Security Model - 암호화된 사용자 인증
            {
                tokenType: UserTokenType.UserName,
                securityPolicyUri: SecurityPolicy.Basic256Sha256,
                encryptionAlgorithm: "http://www.w3.org/2001/04/xmlenc#aes256-cbc"
            },
            // OPC UA Part 2: Security Model - 인증서 기반 인증
            {
                tokenType: UserTokenType.Certificate,
                securityPolicyUri: SecurityPolicy.Basic256Sha256
            }
        ],
        
        // OPC UA Part 2: Security Model - 사용자 데이터베이스
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
        
        // OPC UA Part 2: Security Model - 비밀번호 보안 정책
        passwordPolicy: {
            minLength: 8,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: true,
            requireSpecialChars: false,
            hashAlgorithm: 'sha256'
        },
        
        // OPC UA Part 4: Services - 세션 보안 설정
        session: {
            // OPC UA Part 4: Services - 세션 타임아웃
            timeout: 30000,
            
            // OPC UA Part 4: Services - 동시 세션 제한
            maxSessionCount: 100,
            
            // OPC UA Part 4: Services - 구독 제한
            maxSubscriptionsPerSession: 50
        }
    },
    
    // OPC UA Part 2: Security Model - 보안 감사 로깅
    audit: {
        // OPC UA Part 2: Security Model - 감사 활성화
        enabled: true,
        
        // OPC UA Part 2: Security Model - 감사할 보안 이벤트 목록
        events: {
            // OPC UA Part 4: Services - 세션 생성 감사
            sessionActivated: true,
            // OPC UA Part 4: Services - 세션 종료 감사
            sessionClosed: true,
            // OPC UA Part 2: Security Model - 인증 실패 감사
            authenticationFailure: true,
            // OPC UA Part 2: Security Model - 인증 성공 감사
            authenticationSuccess: true,
            // OPC UA Part 2: Security Model - 인증서 거부 감사
            certificateRejected: true,
            
            // OPC UA Part 4: Services - 데이터 읽기 감사
            dataRead: false,
            // OPC UA Part 4: Services - 데이터 쓰기 감사
            dataWrite: true,
            // OPC UA Part 4: Services - 메서드 호출 감사
            methodCall: true,
            
            // OPC UA Part 1: Concepts - 서버 시작 감사
            serverStart: true,
            // OPC UA Part 1: Concepts - 서버 종료 감사
            serverStop: true,
            // OPC UA Part 2: Security Model - 설정 변경 감사
            configurationChange: true
        },
        
        // OPC UA Part 2: Security Model - 감사 로그 파일 설정
        logFile: {
            path: path.join(__dirname, '../../logs/security-audit.log'),
            maxSize: '10MB',
            maxFiles: 5,
            rotation: 'daily'
        }
    },
    
    // OPC UA Part 6: Mappings - 네트워크 보안 설정
    network: {
        // OPC UA Part 6: Mappings - IP 주소 기반 접근 제어
        allowedIpRanges: [
            // '192.168.1.0/24',
            // '10.0.0.0/8'
        ],
        
        // OPC UA Part 6: Mappings - IP 차단 목록
        blockedIps: [],
        
        // OPC UA Part 6: Mappings - 연결 제한 (DoS 방지)
        connectionLimits: {
            // OPC UA Part 6: Mappings - IP당 연결 제한
            maxConnectionsPerIp: 10,
            
            // OPC UA Part 6: Mappings - 총 연결 제한
            maxTotalConnections: 100,
            
            // OPC UA Part 6: Mappings - 요청 속도 제한
            rateLimiting: {
                enabled: true,
                maxAttemptsPerMinute: 30
            }
        }
    },
    
    // OPC UA Part 2: Security Model - 암호화 알고리즘 설정
    encryption: {
        // OPC UA Part 2: Security Model - 최소 키 길이
        minKeyLength: 2048,
        
        // OPC UA Part 2: Security Model - 지원 암호화 알고리즘
        supportedAlgorithms: [
            'RSA-OAEP',
            'RSA-PKCS1-V1_5',
            'AES-128-CBC',
            'AES-256-CBC'
        ],
        
        // OPC UA Part 2: Security Model - 지원 해시 알고리즘
        supportedHashAlgorithms: [
            'SHA-1',    // 호환성을 위해 유지 (보안상 권장하지 않음)
            'SHA-256',  // 권장
            'SHA-384',
            'SHA-512'
        ]
    },
    
    // OPC UA Part 1: Concepts - 디버깅 및 진단 설정
    debug: {
        // OPC UA Part 2: Security Model - 보안 로깅 활성화
        enableSecurityLogging: true,
        // OPC UA Part 2: Security Model - 보안 이벤트 로깅
        logSecurityEvents: true,
        // OPC UA Part 2: Security Model - 인증서 검증 로깅
        logCertificateValidation: true,
        // OPC UA Part 2: Security Model - 사용자 인증 로깅
        logUserAuthentication: true,
        
        // OPC UA Part 1: Concepts - 개발 모드
        developmentMode: true,
        
        // OPC UA Part 2: Security Model - 테스트 인증서 허용
        allowTestCertificates: true
    },
    
    // OPC UA Part 7: Profiles - 보안 프로파일 및 표준 준수
    compliance: {
        // OPC UA Part 7: Profiles - 보안 프로파일 식별
        securityProfile: "Basic256Sha256",
        
        // OPC UA Part 7: Profiles - IEC 62541 표준 준수
        iec62541Compliance: true,
        
        // OPC UA Part 7: Profiles - 보안 요구사항 레벨
        securityLevel: "MEDIUM",
        
        // OPC UA Part 7: Profiles - 산업 표준 준수
        industryStandards: {
            isa99: true,    // ISA/IEC 62443 (산업 보안)
            nist: true,     // NIST Cybersecurity Framework
            iso27001: true // ISO 27001 정보보안
        }
    }
}; 