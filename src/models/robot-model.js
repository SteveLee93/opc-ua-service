const config = require('../config/config');

/**
 * 6축 로봇팔 모델 클래스
 * 관절 위치 관리 및 이동 로직을 담당
 */
class RobotModel {
    constructor() {
        this.jointPositions = [...config.robot.defaultPositions];
        this.isMoving = false;
    }

    /**
     * 특정 관절의 현재 위치를 반환
     * @param {number} index - 관절 인덱스 (0-5)
     * @returns {number} 관절 위치 (도)
     */
    getJointPosition(index) {
        if (index < 0 || index >= config.robot.jointCount) {
            throw new Error(`잘못된 관절 인덱스: ${index}`);
        }
        return this.jointPositions[index];
    }

    /**
     * 모든 관절의 현재 위치를 반환
     * @returns {number[]} 관절 위치 배열
     */
    getAllJointPositions() {
        return [...this.jointPositions];
    }

    /**
     * 특정 관절의 위치를 설정
     * @param {number} index - 관절 인덱스
     * @param {number} value - 설정할 위치 값
     */
    setJointPosition(index, value) {
        if (index >= 0 && index < config.robot.jointCount) {
            this.jointPositions[index] = value;
        }
    }

    /**
     * 로봇을 지정된 위치로 이동
     * @param {number[]} targetPositions - 목표 위치 배열
     * @returns {Promise<{success: boolean, positions: number[]}>}
     */
    async moveToPosition(targetPositions) {
        if (!Array.isArray(targetPositions) || targetPositions.length !== config.robot.jointCount) {
            throw new Error(`목표 위치는 ${config.robot.jointCount}개의 배열이어야 합니다.`);
        }

        // 위치 범위 검증
        for (let i = 0; i < targetPositions.length; i++) {
            if (targetPositions[i] < config.robot.minPosition || targetPositions[i] > config.robot.maxPosition) {
                throw new Error(`관절 ${i + 1} 위치가 범위를 벗어났습니다: ${targetPositions[i]} (범위: ${config.robot.minPosition}° ~ ${config.robot.maxPosition}°)`);
            }
        }

        this.isMoving = true;
        
        if (config.debug.logPositionUpdates) {
            console.log(`🤖 로봇 이동 시작: [${targetPositions.join(', ')}]°`);
        }

        // 실제 환경에서는 점진적 이동 구현 가능
        // 여기서는 즉시 이동으로 시뮬레이션
        this.jointPositions = [...targetPositions];
        this.isMoving = false;
        
        if (config.debug.logPositionUpdates) {
            console.log(`✅ 로봇 이동 완료: [${this.jointPositions.join(', ')}]°`);
        }

        return { 
            success: true, 
            positions: this.getAllJointPositions() 
        };
    }

    /**
     * 로봇의 현재 상태를 반환
     * @returns {object} 로봇 상태 정보
     */
    getStatus() {
        return {
            isMoving: this.isMoving,
            positions: this.getAllJointPositions(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 로봇을 홈 포지션으로 이동
     * @returns {Promise<{success: boolean, positions: number[]}>}
     */
    async moveToHome() {
        return await this.moveToPosition(config.robot.defaultPositions);
    }
}

// 싱글톤 인스턴스
const robotInstance = new RobotModel();

module.exports = robotInstance;
