using UnityEngine;
namespace Skyline
{
    [RequireComponent(typeof(Rigidbody))]
    public sealed class PlayerMovement : MonoBehaviour
    {
        public GameInput input; public Transform cameraTransform; public float runAcceleration=32,sprintAcceleration=46,maxGroundSpeed=13,jumpVelocity=9,airControl=7;
        public bool Grounded {get;private set;} Rigidbody body; CapsuleCollider capsule;
        void Awake(){body=GetComponent<Rigidbody>();capsule=GetComponent<CapsuleCollider>();body.freezeRotation=true;body.interpolation=RigidbodyInterpolation.Interpolate;body.collisionDetectionMode=CollisionDetectionMode.ContinuousDynamic;}
        public void Tick(bool movementLocked)
        {
            Grounded=Physics.SphereCast(transform.position+Vector3.up*.25f,.38f,Vector3.down,out _,.65f,~0,QueryTriggerInteraction.Ignore);
            if(movementLocked||input==null)return;Vector3 forward=Vector3.ProjectOnPlane(cameraTransform.forward,Vector3.up).normalized;Vector3 right=Vector3.Cross(Vector3.up,forward);Vector3 desired=(forward*input.Move.y+right*input.Move.x).normalized;
            float acceleration=input.SprintHeld?sprintAcceleration:runAcceleration;
            if(Grounded){Vector3 horizontal=Vector3.ProjectOnPlane(body.linearVelocity,Vector3.up);body.AddForce(desired*acceleration,ForceMode.Acceleration);float max=input.SprintHeld?maxGroundSpeed*1.45f:maxGroundSpeed;if(horizontal.magnitude>max)body.linearVelocity=horizontal.normalized*max+Vector3.up*body.linearVelocity.y;if(input.JumpPressed){body.AddForce(Vector3.up*jumpVelocity,ForceMode.VelocityChange);}}
            else body.AddForce(desired*airControl,ForceMode.Acceleration);
            if(desired.sqrMagnitude>.1f)transform.rotation=Quaternion.Slerp(transform.rotation,Quaternion.LookRotation(desired),Time.fixedDeltaTime*9);
        }
    }
}
