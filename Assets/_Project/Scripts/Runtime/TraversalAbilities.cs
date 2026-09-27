using System.Collections;
using UnityEngine;
namespace Skyline
{
    [RequireComponent(typeof(Rigidbody))]
    public sealed class TraversalAbilities : MonoBehaviour
    {
        public WebSwingSettings settings; public Transform cameraTransform; public LayerMask worldMask=~0;
        public bool IsZipping{get;private set;} public bool IsWallMoving{get;private set;} Rigidbody body; Vector3 zipTarget,wallNormal; float zipTimer;
        void Awake()=>body=GetComponent<Rigidbody>();
        public bool TryZip(){if(IsZipping||!Physics.SphereCast(transform.position,.35f,cameraTransform.forward,out var hit,65,worldMask,QueryTriggerInteraction.Ignore))return false;zipTarget=hit.point+hit.normal;IsZipping=true;zipTimer=0;return true;}
        public void PointLaunch(){Vector3 launch=(cameraTransform.forward+Vector3.up*.55f).normalized*settings.pointLaunchForce;body.AddForce(launch,ForceMode.VelocityChange);IsZipping=false;}
        public void Dive(bool active){if(active&&!Physics.Raycast(transform.position,Vector3.down,2))body.AddForce(Vector3.down*18,ForceMode.Acceleration);}
        public void WallTick(Vector2 move,bool jump)
        {
            IsWallMoving=false;if(body.linearVelocity.magnitude<5)return;
            if(!Physics.SphereCast(transform.position,.45f,transform.right,out var h,1.15f,worldMask)&&!Physics.SphereCast(transform.position,.45f,-transform.right,out h,1.15f,worldMask))return;
            if(Mathf.Abs(Vector3.Dot(h.normal,Vector3.up))>.25f)return;wallNormal=h.normal;IsWallMoving=true;
            Vector3 along=Vector3.Cross(Vector3.up,wallNormal);if(Vector3.Dot(along,body.linearVelocity)<0)along=-along;
            body.AddForce(along*8+Vector3.up*move.y*9-Physics.gravity*.72f,ForceMode.Acceleration);
            if(jump)body.AddForce((wallNormal+Vector3.up*.45f).normalized*10,ForceMode.VelocityChange);
        }
        void FixedUpdate(){if(!IsZipping)return;zipTimer+=Time.fixedDeltaTime;Vector3 delta=zipTarget-transform.position;if(delta.magnitude<2||zipTimer>1.2f){PointLaunch();return;}Vector3 desired=delta.normalized*settings.webZipForce;body.linearVelocity=Vector3.Lerp(body.linearVelocity,desired,Time.fixedDeltaTime*5);}
    }
}
