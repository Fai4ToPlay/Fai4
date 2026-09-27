using UnityEngine;

namespace Skyline
{
    public readonly struct WebAnchor { public readonly Vector3 point, normal; public readonly Collider collider; public readonly float score; public WebAnchor(RaycastHit h,float s){point=h.point;normal=h.normal;collider=h.collider;score=s;} }
    public sealed class WebAnchorDetector : MonoBehaviour
    {
        [SerializeField] LayerMask anchorMask = ~0; [SerializeField] int radialSamples = 28;
        public WebAnchor? Best { get; private set; }
        public bool Find(Transform cameraTransform, Vector3 velocity, WebSwingSettings settings, out WebAnchor anchor)
        {
            Best = null; float best = float.NegativeInfinity; Vector3 origin = transform.position;
            for (int i=0;i<radialSamples;i++) {
                float a = (i/(float)radialSamples-.5f)*110f; float elevation = Mathf.Lerp(-5,55,(i%7)/6f);
                Vector3 direction = Quaternion.AngleAxis(a,Vector3.up)*Quaternion.AngleAxis(-elevation,cameraTransform.right)*cameraTransform.forward;
                if (!Physics.SphereCast(origin,.45f,direction,out var hit,settings.maximumAnchorDistance,anchorMask,QueryTriggerInteraction.Ignore)) continue;
                Vector3 delta=hit.point-origin; float distance=delta.magnitude; float height=delta.y;
                if(height < settings.minimumAnchorHeight || hit.collider.attachedRigidbody == GetComponent<Rigidbody>()) continue;
                float directionScore=Mathf.Clamp01(Vector3.Dot(cameraTransform.forward,delta.normalized))*2.2f;
                float heightScore=Mathf.Clamp01(height/settings.anchorSearchRadius)*1.3f;
                float distanceScore=1-Mathf.Abs(distance-settings.ropeLength)/settings.maximumAnchorDistance;
                float velocityScore=velocity.sqrMagnitude<1?.5f:Mathf.Clamp01(Vector3.Dot(velocity.normalized,delta.normalized));
                float trajectoryScore=Mathf.Clamp01(Vector3.Dot(Vector3.ProjectOnPlane(velocity,delta.normalized).normalized,cameraTransform.forward));
                float score=directionScore+heightScore+distanceScore+velocityScore+trajectoryScore;
                if(score>best && HasLineOfSight(origin,hit)){best=score;Best=new WebAnchor(hit,score);}
            }
            anchor=Best.GetValueOrDefault(); return Best.HasValue;
        }
        bool HasLineOfSight(Vector3 origin, RaycastHit candidate) => Physics.Linecast(origin,candidate.point,out var block,anchorMask,QueryTriggerInteraction.Ignore) && block.collider==candidate.collider;
        void OnDrawGizmosSelected(){if(!Best.HasValue)return;Gizmos.color=Color.cyan;Gizmos.DrawSphere(Best.Value.point,.6f);Gizmos.DrawLine(transform.position,Best.Value.point);}
    }
}
