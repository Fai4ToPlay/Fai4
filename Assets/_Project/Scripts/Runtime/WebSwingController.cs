using System;
using UnityEngine;

namespace Skyline
{
    [RequireComponent(typeof(Rigidbody),typeof(WebAnchorDetector),typeof(SwingAssist))]
    public sealed class WebSwingController : MonoBehaviour
    {
        public WebSwingSettings settings; public Transform cameraTransform,leftHand,rightHand; public WebRenderer web;
        public bool IsSwinging { get; private set; } public Vector3 Anchor { get; private set; } public float RopeLength { get; private set; }
        public float AnchorScore { get; private set; } public string CurrentHand => useLeft?"LEFT":"RIGHT";
        public event Action<bool> SwingChanged;
        Rigidbody body; WebAnchorDetector detector; SwingAssist assist; bool useLeft=true;
        void Awake(){body=GetComponent<Rigidbody>();detector=GetComponent<WebAnchorDetector>();assist=GetComponent<SwingAssist>();}
        public bool TryAttach()
        {
            if(IsSwinging||!settings||!cameraTransform)return false;
            if(!detector.Find(cameraTransform,body.linearVelocity,settings,out var hit))return false;
            Anchor=hit.point;AnchorScore=hit.score;RopeLength=Mathf.Clamp(Vector3.Distance(transform.position,Anchor)*.96f,settings.minimumRopeLength,settings.maximumRopeLength);
            IsSwinging=true;web?.Attach(useLeft?leftHand:rightHand,Anchor);SwingChanged?.Invoke(true);return true;
        }
        public void Release()
        {
            if(!IsSwinging)return; IsSwinging=false;
            Vector3 radial=(transform.position-Anchor).normalized; Vector3 tangent=RopePhysics.TangentVelocity(body.linearVelocity,radial);
            body.linearVelocity=tangent + Vector3.Project(body.linearVelocity,radial)*Mathf.Clamp01(settings.momentumRetention);
            if(tangent.sqrMagnitude>.01f)body.AddForce(tangent.normalized*settings.releaseBoost,ForceMode.VelocityChange);
            useLeft=!useLeft;web?.Release();SwingChanged?.Invoke(false);
        }
        void FixedUpdate()
        {
            if(!IsSwinging||!settings)return;
            Vector3 rope=transform.position-Anchor;float distance=rope.magnitude;if(distance<.001f)return;Vector3 radial=rope/distance;
            body.AddForce(Physics.gravity*(settings.gravityMultiplier-1),ForceMode.Acceleration);
            body.AddForce(assist.Calculate(transform.position,body.linearVelocity,Anchor,cameraTransform.forward,settings),ForceMode.Acceleration);
            body.AddForce(-body.linearVelocity*settings.airResistance,ForceMode.Acceleration);
            // Unilateral inextensible rope: remove only outward radial velocity; tangent momentum remains intact.
            if(distance>=RopeLength){body.linearVelocity=RopePhysics.ConstrainVelocity(body.linearVelocity,radial);float error=distance-RopeLength;if(error>0)body.position-=radial*error;}
            if(body.linearVelocity.magnitude>settings.maximumSwingSpeed)body.linearVelocity=body.linearVelocity.normalized*settings.maximumSwingSpeed;
        }
        void OnDisable()=>Release();
        void OnDrawGizmosSelected(){if(!IsSwinging)return;Gizmos.color=Color.white;Gizmos.DrawWireSphere(Anchor,RopeLength);Gizmos.color=Color.yellow;Gizmos.DrawLine(transform.position,transform.position+(body?body.linearVelocity:Vector3.zero));}
    }
}
