const opcua = require("node-opcua");

(async () => {
  try {
    const server_options = {
      port: 4840,
      resourcePath: "/UA/Robotics",
      nodeset_filename: [
        opcua.nodesets.standard,
        "./Opc.Ua.Di.NodeSet2.xml",
        "./Opc.Ua.Robotics.NodeSet2.xml"
      ]
    };

    const server = new opcua.OPCUAServer(server_options);

    await server.initialize();

    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();
    const roboticsNamespace = addressSpace.getNamespace("http://opcfoundation.org/UA/Robotics/");

    // MotionDeviceSystemType 인스턴스 생성
    const motionDeviceSystem = namespace.addObject({
      organizedBy: addressSpace.rootFolder.objects,
      browseName: "RobotCell1",
      typeDefinition: addressSpace.findObjectType("MotionDeviceSystemType", roboticsNamespace.index)
    });

    // MotionDeviceType 인스턴스 추가
    const motionDevice = namespace.addObject({
      componentOf: motionDeviceSystem,
      browseName: "Robot1",
      typeDefinition: addressSpace.findObjectType("MotionDeviceType", roboticsNamespace.index)
    });

    // AxisType 인스턴스 추가
    const axis1 = namespace.addObject({
      componentOf: motionDevice,
      browseName: "Axis1",
      typeDefinition: addressSpace.findObjectType("AxisType", roboticsNamespace.index)
    });

    const variable = namespace.addVariable({
      componentOf: axis1,
      browseName: "Position",
      dataType: "Double",
      value: {
        dataType: opcua.DataType.Double,
        value: 0.0
      }
    });

    // PowerTrainType 인스턴스 추가
    const powerTrain = namespace.addObject({
      componentOf: motionDevice,
      browseName: "Drive1",
      typeDefinition: addressSpace.findObjectType("PowerTrainType", roboticsNamespace.index)
    });

    // MotorType 인스턴스 추가
    const motor1 = namespace.addObject({
      componentOf: powerTrain,
      browseName: "Motor1",
      typeDefinition: addressSpace.findObjectType("MotorType", roboticsNamespace.index)
    });

    // GearType 인스턴스 추가
    const gear1 = namespace.addObject({
      componentOf: powerTrain,
      browseName: "Gear1",
      typeDefinition: addressSpace.findObjectType("GearType", roboticsNamespace.index)
    });

    // ControllerType 인스턴스 추가
    const controller = namespace.addObject({
      componentOf: motionDeviceSystem,
      browseName: "Controller1",
      typeDefinition: addressSpace.findObjectType("ControllerType", roboticsNamespace.index)
    });

    // SafetyStateType 인스턴스 추가
    const safetyState = namespace.addObject({
      componentOf: motionDeviceSystem,
      browseName: "SafetyState1",
      typeDefinition: addressSpace.findObjectType("SafetyStateType", roboticsNamespace.index)
    });

    // 참조 연결 예시 (Controls, Moves 등은 실제 타입 ID로 연결)
    // addressSpace.addReference({
    //   source: controller.nodeId,
    //   referenceType: "Controls",
    //   target: motionDevice.nodeId
    // });

    await server.start();

    console.log("Server is now listening... (press CTRL+C to stop)");
    const endpointUrl = server.getEndpointUrl();
    console.log("Server endpoint URL is:", endpointUrl);

    // 1초마다 Position 변수 값 업데이트
    setInterval(() => {
        const currentValue = variable.readValue().value.value;
        const newValue = currentValue + 0.1;
        variable.setValueFromSource({
          dataType: opcua.DataType.Double,
          value: newValue > 100 ? 0.0 : newValue
        });
      }, 1000);

  } catch (err) {
    console.error("An error has occurred:", err);
    process.exit(1);
  }
})();
