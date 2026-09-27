#if UNITY_EDITOR
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using Skyline;

[InitializeOnLoad]
public static class ProjectBootstrap
{
    const string ScenePath="Assets/_Project/Scenes/WebSwingPlayground.unity";
    static ProjectBootstrap(){EditorApplication.delayCall+=EnsureProject;}
    [MenuItem("Skyline/Rebuild WebSwing Playground")]
    public static void EnsureProject()
    {
        if(File.Exists(ScenePath))return;Directory.CreateDirectory("Assets/_Project/Scenes");Directory.CreateDirectory("Assets/_Project/Settings");
        var settings=ScriptableObject.CreateInstance<WebSwingSettings>();AssetDatabase.CreateAsset(settings,"Assets/_Project/Settings/WebSwingSettings.asset");
        BuildScene(settings);ConfigureAndroid();AssetDatabase.SaveAssets();
    }
    static void BuildScene(WebSwingSettings settings)
    {
        var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        var input=new GameObject("GameInput").AddComponent<GameInput>();
        var player=GameObject.CreatePrimitive(PrimitiveType.Capsule);player.name="Original Hero";player.transform.position=new Vector3(0,145,-20);Object.DestroyImmediate(player.GetComponent<CapsuleCollider>());var capsule=player.AddComponent<CapsuleCollider>();capsule.height=2;capsule.radius=.45f;
        var body=player.AddComponent<Rigidbody>();body.mass=75;body.linearDamping=0;body.angularDamping=.05f;
        var detector=player.AddComponent<WebAnchorDetector>();var assist=player.AddComponent<SwingAssist>();var momentum=player.AddComponent<MomentumController>();var move=player.AddComponent<PlayerMovement>();var swing=player.AddComponent<WebSwingController>();var traversal=player.AddComponent<TraversalAbilities>();var controller=player.AddComponent<PlayerController>();var auto=player.AddComponent<AutoSwingController>();
        var webObject=new GameObject("Web Line");webObject.transform.SetParent(player.transform);var line=webObject.AddComponent<LineRenderer>();line.startWidth=.045f;line.endWidth=.025f;line.material=new Material(Shader.Find("Sprites/Default"));line.startColor=Color.white;line.endColor=new Color(.7f,.9f,1);var web=webObject.AddComponent<WebRenderer>();
        Transform left=Hand(player.transform,"LeftWeb",new Vector3(-.45f,.55f,.2f)),right=Hand(player.transform,"RightWeb",new Vector3(.45f,.55f,.2f));
        var cameraObject=new GameObject("Main Camera");cameraObject.tag="MainCamera";var camera=cameraObject.AddComponent<Camera>();cameraObject.AddComponent<AudioListener>();var follow=cameraObject.AddComponent<PlayerCamera>();cameraObject.transform.position=player.transform.position+new Vector3(0,3,-8);
        move.input=input;move.cameraTransform=camera.transform;controller.input=input;swing.settings=settings;swing.cameraTransform=camera.transform;swing.leftHand=left;swing.rightHand=right;swing.web=web;traversal.settings=settings;traversal.cameraTransform=camera.transform;follow.target=player.transform;follow.targetBody=body;follow.input=input;auto.input=input;auto.swing=swing;auto.body=body;
        var cityObject=new GameObject("Streamed City");var city=cityObject.AddComponent<CityGenerator>();city.Generate();var streaming=cityObject.AddComponent<WorldStreamingManager>();streaming.player=player.transform;streaming.body=body;
        var sunObject=new GameObject("Sun");var sun=sunObject.AddComponent<Light>();sun.type=LightType.Directional;sun.intensity=1.2f;sunObject.transform.rotation=Quaternion.Euler(48,-35,0);RenderSettings.sun=sun;RenderSettings.ambientIntensity=.8f;
        var managerObject=new GameObject("GameManager");var manager=managerObject.AddComponent<GameManager>();manager.player=controller;manager.swing=swing;manager.body=body;
        EditorSceneManager.SaveScene(scene,ScenePath);EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};
    }
    static Transform Hand(Transform parent,string name,Vector3 local){var o=new GameObject(name);o.transform.SetParent(parent);o.transform.localPosition=local;return o.transform;}
    static void ConfigureAndroid()
    {
        PlayerSettings.companyName="Independent Prototype";PlayerSettings.productName="Skyline Web Runner";PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android,"com.indie.skylinewebrunner");
        PlayerSettings.defaultInterfaceOrientation=UIOrientation.LandscapeLeft;PlayerSettings.Android.targetArchitectures=AndroidArchitecture.ARM64;PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android,ScriptingImplementation.IL2CPP);PlayerSettings.colorSpace=ColorSpace.Linear;
        PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Android,ManagedStrippingLevel.High);
        EditorUserBuildSettings.buildAppBundle=false;
    }
    [MenuItem("Skyline/Build Android APK")]
    public static void BuildAndroid()
    {
        EnsureProject();
        ConfigureAndroid();
        AssetDatabase.SaveAssets();
        string[] scenes=EditorBuildSettings.scenes.Where(scene=>scene.enabled&&File.Exists(scene.path)).Select(scene=>scene.path).ToArray();
        if(scenes.Length==0)
            throw new BuildFailedException("No enabled, existing scene is configured for the Android build.");
        Directory.CreateDirectory("Builds/Android");
        string output=Path.GetFullPath("Builds/Android/SkylineWebRunner.apk");
        var options=new BuildPlayerOptions
        {
            scenes=scenes,
            locationPathName=output,
            target=BuildTarget.Android,
            targetGroup=BuildTargetGroup.Android,
            options=BuildOptions.CompressWithLz4HC
        };
        BuildReport report=BuildPipeline.BuildPlayer(options);
        if(report.summary.result!=BuildResult.Succeeded)
            throw new BuildFailedException($"Android build failed: {report.summary.result}, {report.summary.totalErrors} error(s)");
        Debug.Log($"Android APK built successfully: {output} ({report.summary.totalSize} bytes)");
    }
}
#endif
