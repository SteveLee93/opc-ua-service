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
    const diNamespace = addressSpace.getNamespace("http://opcfoundation.org/UA/DI/");

    // 7.1 The root object
    const motionDeviceSystemType = addressSpace.findObjectType("MotionDeviceSystemType", roboticsNamespace.index);
    const robot = motionDeviceSystemType.instantiate({
      organizedBy: addressSpace.rootFolder.objects,
      browseName: "Robot",
    });

    // 7.2 MotionDevices -> RobotArm
    const motionDeviceType = addressSpace.findObjectType("MotionDeviceType", roboticsNamespace.index);
    const robotArm = motionDeviceType.instantiate({
        browseName: "RobotArm",
        componentOf: robot.motionDevices, // 자동 생성된 폴더 사용
        optionals: ["SerialNumber", "PowerTrains", "ProductCode"] // ProductCode도 표준 optional 속성
    });

    robotArm.getChildByName("Manufacturer").setValueFromSource({dataType: opcua.DataType.LocalizedText, value: { text: "Hanwha Robotics" }});
    robotArm.getChildByName("Model").setValueFromSource({dataType: opcua.DataType.LocalizedText, value: { text: "HCR-15" }});
    robotArm.getChildByName("SerialNumber").setValueFromSource({dataType: opcua.DataType.String, value: "1234567890"});
    robotArm.getChildByName("ProductCode").setValueFromSource({dataType: opcua.DataType.String, value: "HCR-15"});
    robotArm.getChildByName("MotionDeviceCategory").setValueFromSource({dataType: opcua.DataType.Int32, value: 1}); // ARTICULATED_ROBOT
    robotArm.parameterSet.getChildByName("SpeedOverride").setValueFromSource({dataType: opcua.DataType.Double, value: 100.0});

    // 7.2.1 Axes
    const axisType = addressSpace.findObjectType("AxisType", roboticsNamespace.index);
    const axisNames = ["Base", "Shoulder", "Elbow", "Wrist1", "Wrist2", "Wrist3"];
    for (const axisName of axisNames) {
        const axis = axisType.instantiate({ browseName: axisName, componentOf: robotArm.axes });
        axis.getChildByName("MotionProfile").setValueFromSource({dataType: opcua.DataType.Int32, value: 1}); // ROTARY
        
        // 'instantiate'가 선택적 변수를 생성하지 않는 경우가 있으므로 수동으로 추가합니다.
        namespace.addVariable({ componentOf: axis.parameterSet, browseName: "ActualSpeed", dataType: "Double", value: { dataType: opcua.DataType.Double, value: 0.0 } });
    }

    // 7.2.2 PowerTrains
    const powerTrainType = addressSpace.findObjectType("MotorType", roboticsNamespace.index);
    for (const ptName of axisNames) {
        const powerTrain = powerTrainType.instantiate({
            browseName: ptName,
            componentOf: robotArm.powerTrains,
            optionals: ["Manufacturer", "Model", "SerialNumber", "ParameterSet"]
        });
        powerTrain.getChildByName("Manufacturer").setValueFromSource({dataType: opcua.DataType.LocalizedText, value: { text: "Hanwha Robotics" }});
        powerTrain.getChildByName("Model").setValueFromSource({dataType: opcua.DataType.LocalizedText, value: { text: "Size 0" }});
        powerTrain.getChildByName("SerialNumber").setValueFromSource({dataType: opcua.DataType.String, value: "1234567890"});
    }

    // 7.3 Controllers -> ControlBox
    const controllerType = addressSpace.findObjectType("ControllerType", roboticsNamespace.index);
    const controlBox = controllerType.instantiate({
        browseName: "ControlBox",
        componentOf: robot.controllers, // 자동 생성된 폴더 사용
        optionals: ["Manufacturer", "Model", "SerialNumber", "Software", "TaskControls", "ProductCode"]
    });
    controlBox.getChildByName("Manufacturer").setValueFromSource({dataType: opcua.DataType.LocalizedText, value: { text: "Hanwha Robotics" }});
    controlBox.getChildByName("Model").setValueFromSource({dataType: opcua.DataType.LocalizedText, value: { text: "Size 0" }});
    controlBox.getChildByName("SerialNumber").setValueFromSource({dataType: opcua.DataType.String, value: "1234567890"});
    // 수동 추가 대신, 자동 생성된 노드에 값 설정
    controlBox.getChildByName("ProductCode").setValueFromSource({ dataType: opcua.DataType.String, value: "1234567890" });
    
    // 7.3.1 Software
    const softwareType = addressSpace.findObjectType("SoftwareType", diNamespace.index);
    const addSoftware = (browseName, manufacturer, model, revision) => {
        const software = softwareType.instantiate({
            browseName,
            componentOf: controlBox.software,
            optionals: ["Manufacturer", "Model", "SoftwareRevision"]
        });
        software.getChildByName("Manufacturer").setValueFromSource({dataType: opcua.DataType.LocalizedText, value: { text: manufacturer }});
        software.getChildByName("Model").setValueFromSource({dataType: opcua.DataType.LocalizedText, value: { text: model }});
        software.getChildByName("SoftwareRevision").setValueFromSource({dataType: opcua.DataType.String, value: revision});
    };
    addSoftware("Backend", "Hanwha Robotics", "RODI", "1.0.0");
    addSoftware("Frontend", "Hanwha Robotics", "RODI", "1.0.0");
    addSoftware("OperatingSystem", "Microsoft", "Windows", "1.0.0");

    // 7.3.2 TaskControls
    const taskControlType = addressSpace.findObjectType("TaskControlType", roboticsNamespace.index);
    const robotProgram = taskControlType.instantiate({
        browseName: "RobotProgram",
        componentOf: controlBox.taskControls
    });
    robotProgram.getChildByName("ComponentName").setValueFromSource({dataType: opcua.DataType.LocalizedText, value: { text: "RobotProgram" }});
    // 수동 추가 대신, 자동 생성된 노드에 값 설정
    robotProgram.parameterSet.getChildByName("TaskProgramLoaded").setValueFromSource({ dataType: opcua.DataType.Boolean, value: false });
    robotProgram.parameterSet.getChildByName("TaskProgramName").setValueFromSource({ dataType: opcua.DataType.String, value: "RobotProgram" });

    // 7.4 SafetyStates
    const safetyStateType = addressSpace.findObjectType("SafetyStateType", roboticsNamespace.index);
    const safetyState = safetyStateType.instantiate({
        browseName: "SafetyState",
        componentOf: robot.safetyStates, // 자동 생성된 폴더 사용
    });
    const safetyParameterSet = safetyState.parameterSet;
    safetyParameterSet.getChildByName("EmergencyStop").setValueFromSource({ dataType: opcua.DataType.Boolean, value: false });
    safetyParameterSet.getChildByName("ProtectiveStop").setValueFromSource({ dataType: opcua.DataType.Boolean, value: false });
    safetyParameterSet.getChildByName("OperationalMode").setValueFromSource({ dataType: opcua.DataType.Int32, value: 0 });
    
    await server.start();

    console.log("Server is now listening... (press CTRL+C to stop)");
    const endpointUrl = server.getEndpointUrl();
    console.log("Server endpoint URL is:", endpointUrl);

  } catch (err) {
    console.error("An error has occurred:", err);
    process.exit(1);
  }
})();
