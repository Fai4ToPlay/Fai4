using UnityEngine;
namespace Skyline
{
    [RequireComponent(typeof(Camera))]
    public sealed class PlayerCamera : MonoBehaviour
    {
        public Transform target;public Rigidbody targetBody;public GameInput input;public float sensitivity=.12f,distance=7,height=2.2f,lag=10;float yaw,pitch=15;Camera cam;
        void Awake(){cam=GetComponent<Camera>();}
        void LateUpdate(){if(!target)return;yaw+=input.Look.x*sensitivity;pitch=Mathf.Clamp(pitch-input.Look.y*sensitivity,-25,70);Quaternion orbit=Quaternion.Euler(pitch,yaw,0);Vector3 desired=target.position+Vector3.up*height-orbit*Vector3.forward*distance;transform.position=Vector3.Lerp(transform.position,desired,1-Mathf.Exp(-lag*Time.deltaTime));transform.rotation=Quaternion.LookRotation(target.position+Vector3.up-height*.15f-transform.position);float speed=targetBody?targetBody.linearVelocity.magnitude:0;cam.fieldOfView=Mathf.Lerp(cam.fieldOfView,Mathf.Lerp(65,82,Mathf.InverseLerp(8,60,speed)),Time.deltaTime*4);}
    }
}
