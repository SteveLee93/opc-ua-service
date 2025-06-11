const { 
    Variant, 
    StatusCodes, 
    DataType 
} = require("node-opcua");
const robotModel = require('../models/robot-model');
const config = require('../config/config');

/**
 * OPC UA 서버의 주소 공간을 구성하는 함수
 * 로봇 객체, 관절 변수, 제어 메서드를 생성
 * @param {Object} server - OPC UA 서버 인스턴스
 */
function constructAddressSpace(server) {
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

    console.log("🏗️  OPC UA 주소 공간 구성 시작...");

    // 루트 로봇 객체 생성
    const robotObject = namespace.addObject({
        organizedBy: addressSpace.rootFolder.objects,
        browseName: 'Robot',
        description: 'HCR 6축 로봇팔'
    });

    console.log("🤖 로봇 객체 생성:", robotObject.nodeId.toString());

    // 관절 변수들을 저장할 배열
    const jointVariables = [];

    // 각 관절 객체 및 현재 위치 변수 생성
    config.robot.jointNames.forEach((jointName, index) => {
        const jointObject = namespace.addObject({
            componentOf: robotObject,
            browseName: jointName,
            description: `로봇 ${jointName} 관절`
        });

        const positionVariable = namespace.addVariable({
            componentOf: jointObject,
            browseName: "CurrentPosition",
            dataType: "Double",
            description: "현재 관절 위치 (도)",
            accessLevel: "CurrentRead",
            userAccessLevel: "CurrentRead"
        });

        // 초기 값 설정
        positionVariable.setValueFromSource({
            dataType: DataType.Double,
            value: robotModel.getJointPosition(index)
        });

        jointVariables.push(positionVariable);
        
        if (config.debug.enableVerboseLogging) {
            console.log(`   ⚙️  ${jointName}: ${positionVariable.nodeId.toString()}`);
        }
    });

    // 로봇 이동 상태 변수
    const isMovingVariable = namespace.addVariable({
        componentOf: robotObject,
        browseName: "IsMoving",
        dataType: "Boolean",
        description: "로봇 이동 중 여부",
        accessLevel: "CurrentRead",
        userAccessLevel: "CurrentRead"
    });

    isMovingVariable.setValueFromSource({
        dataType: DataType.Boolean,
        value: robotModel.isMoving
    });

    // 로봇 이동 메서드 생성 - 수정된 방식
    try {
        console.log("🛠️  MoveToPosition 메서드 생성 중...");
        
        // 메서드 실행 함수를 먼저 정의
        const methodHandler = function(inputArguments, context, callback) {
            if (config.debug.logMethodCalls) {
                console.log("🎯 MoveToPosition 메서드 호출");
            }

            try {
                // 입력 인수 검증
                if (!inputArguments || inputArguments.length === 0) {
                    console.error("❌ 입력 인수가 없습니다.");
                    return callback(null, {
                        statusCode: StatusCodes.BadInvalidArgument,
                        outputArguments: [new Variant({ dataType: DataType.Boolean, value: false })]
                    });
                }

                const positions = inputArguments[0].value;
                
                if (config.debug.enableVerboseLogging) {
                    console.log("🎯 받은 위치:", positions);
                    console.log("🎯 위치 타입:", typeof positions);
                    console.log("🎯 위치 생성자:", positions.constructor.name);
                }
                
                // TypedArray 또는 Array 지원
                if (positions && typeof positions === 'object' && positions.length !== undefined) {
                    // robotModel 업데이트
                    for (let i = 0; i < Math.min(positions.length, config.robot.jointCount); i++) {
                        robotModel.jointPositions[i] = positions[i];
                        
                        // OPC UA 변수 값 업데이트
                        jointVariables[i].setValueFromSource({
                            dataType: DataType.Double,
                            value: positions[i]
                        });
                    }

                    if (config.debug.logPositionUpdates) {
                        console.log("✅ 관절 위치 업데이트:", Array.from(positions));
                    }

                    // 성공 응답
                    callback(null, {
                        statusCode: StatusCodes.Good,
                        outputArguments: [new Variant({ dataType: DataType.Boolean, value: true })]
                    });
                } else {
                    console.error("❌ 올바른 배열 형태가 아님");
                    callback(null, {
                        statusCode: StatusCodes.BadInvalidArgument,
                        outputArguments: [new Variant({ dataType: DataType.Boolean, value: false })]
                    });
                }
            } catch (error) {
                console.error("❌ 메서드 실행 오류:", error.message);
                callback(null, {
                    statusCode: StatusCodes.BadInternalError,
                    outputArguments: [new Variant({ dataType: DataType.Boolean, value: false })]
                });
            }
        };

        // 메서드 추가 - namespace.addMethod 사용
        const method = namespace.addMethod(robotObject, {
            browseName: "MoveToPosition",
            description: "로봇을 지정된 위치로 이동",
            inputArguments: [{
                name: "targetPositions",
                dataType: DataType.Double,
                valueRank: 1,
                arrayDimensions: [config.robot.jointCount],
                description: "목표 관절 위치 배열 (도)"
            }],
            outputArguments: [{
                name: "success",
                dataType: DataType.Boolean,
                description: "이동 성공 여부"
            }]
        }, methodHandler); // 핸들러를 직접 전달

        console.log("🛠️  MoveToPosition 메서드 생성:", method.nodeId.toString());
        
        // 추가 바인딩 시도 (일부 버전에서 필요할 수 있음)
        if (method.bindMethod && typeof method.bindMethod === 'function') {
            console.log("🔗 추가 메서드 바인딩 시도...");
            method.bindMethod(methodHandler);
        }
        
    } catch (error) {
        console.error("❌ 메서드 생성 실패:", error);
    }

    console.log("✅ OPC UA 주소 공간 구성 완료");
}

module.exports = {
    constructAddressSpace,
};


