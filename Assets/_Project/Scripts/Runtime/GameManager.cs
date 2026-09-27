using UnityEngine;
namespace Skyline
{
    public sealed class GameManager : MonoBehaviour
    {
        public PlayerController player;public WebSwingController swing;public Rigidbody body;float smoothFps;bool mainMenu=true,settingsMenu;
        void Awake(){Application.targetFrameRate=PlayerPrefs.GetInt("fps",60);QualitySettings.vSyncCount=0;Time.timeScale=0;}
        void Update(){smoothFps=Mathf.Lerp(smoothFps,1/Mathf.Max(.0001f,Time.unscaledDeltaTime),.08f);if(UnityEngine.InputSystem.Keyboard.current?.escapeKey.wasPressedThisFrame==true)Time.timeScale=Time.timeScale>0?0:1;}
        void OnGUI(){if(!player||!body)return;if(mainMenu){DrawMenu();return;}GUI.Box(new Rect(10,10,300,215),"DEVELOPER HUD");Vector3 v=body.linearVelocity;string anchor=swing.IsSwinging?swing.Anchor.ToString("F1"):"none";GUI.Label(new Rect(22,38,280,180),$"FPS {smoothFps:F0}\nState {player.States.Current}\nSpeed {v.magnitude:F1} m/s  {v.magnitude*3.6f:F0} km/h\nVelocity {v:F1}\nHorizontal {new Vector3(v.x,0,v.z).magnitude:F1}\nVertical {v.y:F1}\nMomentum {v.magnitude:F1}\nAnchor {anchor}\nDistance {(swing.IsSwinging?Vector3.Distance(player.transform.position,swing.Anchor):0):F1}\nRope {swing.RopeLength:F1}  Score {swing.AnchorScore:F2}\nAssist {(swing.settings?swing.settings.swingAssistStrength:0):F2}\nHand {swing.CurrentHand}");DrawMobileHints();}
        void DrawMenu(){float x=Screen.width*.5f-130,y=Screen.height*.5f-145;GUI.Box(new Rect(x,y,260,290),settingsMenu?"SETTINGS":"SKYLINE WEB RUNNER");if(!settingsMenu){if(GUI.Button(new Rect(x+35,y+55,190,50),"PLAY")){mainMenu=false;Time.timeScale=1;}if(GUI.Button(new Rect(x+35,y+115,190,50),"SETTINGS"))settingsMenu=true;if(GUI.Button(new Rect(x+35,y+175,190,50),"EXIT"))Application.Quit();}else{GUI.Label(new Rect(x+25,y+45,210,25),$"FPS LIMIT: {Application.targetFrameRate}");if(GUI.Button(new Rect(x+25,y+75,210,40),"30 / 60 / 90 / 120")){int f=Application.targetFrameRate;f=f<60?60:f<90?90:f<120?120:30;Application.targetFrameRate=f;PlayerPrefs.SetInt("fps",f);}if(GUI.Button(new Rect(x+25,y+125,210,40),$"AUTO SWING: {(player.input.AutoSwing?"ON":"OFF")}"))player.input.AutoSwing=!player.input.AutoSwing;if(GUI.Button(new Rect(x+25,y+175,210,40),"BACK")){PlayerPrefs.Save();settingsMenu=false;}}}
        void DrawMobileHints(){if(!Application.isMobilePlatform)return;GUI.Box(new Rect(25,Screen.height-170,145,145),"MOVE");GUI.Box(new Rect(Screen.width-190,Screen.height-190,165,165),"SWING");GUI.Box(new Rect(Screen.width-190,25,75,60),"ZIP");GUI.Box(new Rect(Screen.width-100,25,75,60),"JUMP");}
        void OnApplicationPause(bool paused){if(paused&&player){Vector3 p=player.transform.position;PlayerPrefs.SetFloat("px",p.x);PlayerPrefs.SetFloat("py",p.y);PlayerPrefs.SetFloat("pz",p.z);PlayerPrefs.Save();}}
    }
}
